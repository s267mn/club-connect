'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { ScrollText, Paperclip } from 'lucide-react';
import LikeCommentSection from '@/components/LikeCommentSection';
import { useImageViewer } from '@/context/ImageViewerContext';

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
  const { openViewer } = useImageViewer();
  const searchParams = useSearchParams();
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [selectedSkillId, setSelectedSkillId] = useState('');
  const [loading, setLoading] = useState(true);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);

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

  // Structured deep-link targeting: ?contribution=<id>&comment=<id>
  // No hash parsing, no string splitting — just real query params.
  useEffect(() => {
    if (loading || contributions.length === 0) return;

    const targetContributionId = searchParams.get('contribution');
    if (!targetContributionId) return;

    const el = document.getElementById(`contribution-${targetContributionId}`);
    if (!el) return;

    const targetCommentId = searchParams.get('comment');

    setTimeout(() => {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setHighlightedId(targetContributionId);
      setTimeout(() => setHighlightedId(null), 2000);

      if (targetCommentId) {
        window.dispatchEvent(new CustomEvent('focus-comment', {
          detail: { contributionId: targetContributionId, commentId: targetCommentId },
        }));
      }
    }, 200);
  }, [loading, contributions, searchParams]);

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
              <div
                key={c.id}
                id={`contribution-${c.id}`}
                className={`card p-5 transition-shadow ${highlightedId === c.id ? 'pulse-highlight' : ''}`}
              >
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex items-center gap-3">
                    <button
                       onClick={() => router.push(`/profile/${c.user_id}`)}
                        className="avatar w-11 h-11 text-sm overflow-hidden shrink-0 transition-transform hover:scale-105 cursor-pointer"
                        title={`View ${c.users?.name}'s profile`}
                    >
                      {c.users?.avatar_url ? (
                        <img
                          src={c.users.avatar_url}
                          alt={c.users?.name ?? "Profile"}
                          className="w-full h-full object-cover"
                         />
                      ) : (
                       initials
                     )}
                      </button>
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
                  <img
                    src={c.file_url}
                    alt={c.title}
                    onClick={() => openViewer([c.file_url], 0)}
                    className="
                    max-h-64
                    rounded-xl
                    border
                    border-[var(--border)]
                    object-cover
                    cursor-zoom-in
                    transition-all
                    duration-300
                    hover:scale-[1.015]
                    hover:brightness-105
                    active:scale-[0.98]
                    "
                  />
                )}

                {c.file_url && !isImage && (
                  <a href={c.file_url} target="_blank" rel="noopener noreferrer" className="text-xs text-[var(--peach-ink)] hover:underline inline-flex items-center gap-1">
                    <Paperclip size={11} /> View submitted file
                  </a>
                )}

                <LikeCommentSection
                  contributionId={c.id}
                  contributionOwnerId={c.user_id}
                  contributionTitle={c.title}
                  clubId={clubId}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}