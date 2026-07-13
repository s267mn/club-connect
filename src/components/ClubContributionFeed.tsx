'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { ScrollText, Paperclip } from 'lucide-react';

type Contribution = {
  id: string;
  title: string;
  description: string;
  file_url: string;
  score: number;
  user_id: string;
  skill_id: string;
  users: { name: string; avatar_url: string | null } | null;
  skills: { name: string } | null;
};

type Skill = { id: string; name: string };

export default function ClubContributionFeed({ clubId }: { clubId: string }) {
  const router = useRouter();
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [selectedSkillId, setSelectedSkillId] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);

      const { data: contribs, error } = await supabase
        .from('contributions')
        .select('id, title, description, file_url, score, user_id, skill_id, users!contributions_user_id_fkey(name, avatar_url), skills(name)')
        .eq('club_id', clubId)
        .eq('status', 'verified')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Failed to load contribution feed:', error);
      } else {
        setContributions((contribs as any) ?? []);
      }

      const { data: skillList } = await supabase.from('skills').select('id, name');
      setSkills(skillList ?? []);

      setLoading(false);
    };

    load();
  }, [clubId]);

  const filtered = selectedSkillId
    ? contributions.filter((c) => c.skill_id === selectedSkillId)
    : contributions;

  return (
    <div className="mt-8 fade-up">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <ScrollText className="text-[var(--peach-ink)]" size={18} />
          <h2 className="text-sm font-semibold text-[var(--ink-dim)] uppercase tracking-wide">Contribution Feed</h2>
        </div>

        <select
          value={selectedSkillId}
          onChange={(e) => setSelectedSkillId(e.target.value)}
          className="p-2 bg-[var(--bg)] border border-[var(--border)] rounded-lg text-sm focus:border-[var(--peach-ink)] focus:outline-none"
        >
          <option value="">All skills</option>
          {skills.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>

      {loading ? (
        <p className="text-sm text-[var(--ink-dim)]">Loading...</p>
      ) : filtered.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="text-sm text-[var(--ink-dim)]">No verified contributions yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((c) => {
            const initials = (c.users?.name ?? '?').split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase();
            const isImage = /\.(jpe?g|png|gif|webp|avif)$/i.test(c.file_url ?? '');

            return (
              <div key={c.id} className="card p-5">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex items-center gap-3">
                    <span className="avatar w-11 h-11 text-sm overflow-hidden shrink-0">
                      {c.users?.avatar_url ? (
                        <img src={c.users.avatar_url} alt={c.users.name} className="w-full h-full object-cover" />
                      ) : (
                        initials
                      )}
                    </span>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-sm">{c.title}</p>
                        {c.skills?.name && (
                          <span className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full bg-[var(--border)] text-[var(--ink-dim)]">
                            {c.skills.name}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => router.push(`/profile/${c.user_id}`)}
                        className="text-xs text-[var(--peach-ink)] hover:underline"
                      >
                        {c.users?.name ?? 'Unknown'}
                      </button>
                    </div>
                  </div>

                  <span className="font-display text-lg shrink-0">{c.score}</span>
                </div>

                {c.description && (
                  <p className="text-sm text-[var(--ink)] mb-2 leading-relaxed">{c.description}</p>
                )}

                {c.file_url && isImage && (
                  <a href={c.file_url} target="_blank" rel="noopener noreferrer" className="block mb-2">
                    <img src={c.file_url} alt={c.title} className="max-h-64 rounded-xl border border-[var(--border)] object-cover" />
                  </a>
                )}

                {c.file_url && !isImage && (
                  <a href={c.file_url} target="_blank" rel="noopener noreferrer" className="text-xs text-[var(--peach-ink)] hover:underline inline-flex items-center gap-1">
                    <Paperclip size={11} /> View submitted file
                  </a>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}