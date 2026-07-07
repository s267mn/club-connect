'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

type Contribution = {
  id: string;
  title: string;
  description: string;
  file_url: string;
  score: number;
  skill_id: string;
  club_id: string;
  skills: { name: string } | null;
  clubs: { name: string } | null;
};

type SkillRating = { skillName: string; averageScore: number; contributionCount: number };

export default function ProfilePage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [skillRatings, setSkillRatings] = useState<SkillRating[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const load = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const userEmail = sessionData.session?.user.email;

      if (!userEmail) {
        router.push('/login');
        return;
      }

      const { data: userRow } = await supabase.from('users').select('id, name, email').eq('email', userEmail).single();

      if (!userRow) {
        setLoading(false);
        return;
      }

      setName(userRow.name);
      setEmail(userRow.email);

      const { data: contribs } = await supabase
        .from('contributions')
        .select('id, title, description, file_url, score, skill_id, club_id, skills(name), clubs(name)')
        .eq('user_id', userRow.id)
        .eq('status', 'verified')
        .order('created_at', { ascending: false });

      const contribList = (contribs as any) ?? [];
      setContributions(contribList);

      const skillMap: { [skillName: string]: { total: number; count: number } } = {};
      contribList.forEach((c: Contribution) => {
        const skillName = c.skills?.name ?? 'Unknown Skill';
        if (!skillMap[skillName]) skillMap[skillName] = { total: 0, count: 0 };
        skillMap[skillName].total += c.score;
        skillMap[skillName].count += 1;
      });

      const ratings: SkillRating[] = Object.entries(skillMap).map(([skillName, { total, count }]) => ({
        skillName,
        averageScore: Math.round(total / count),
        contributionCount: count,
      }));

      setSkillRatings(ratings);
      setLoading(false);
    };

    load();
  }, [router]);

  if (loading) return <div className="min-h-screen flex items-center justify-center font-mono text-sm text-[var(--steel)]">Loading profile...</div>;

  return (
    <main className="min-h-screen px-8 py-16 md:px-16">
      <div className="max-w-3xl mb-12 fade-up">
        <p className="font-mono text-xs tracking-[0.3em] uppercase text-[var(--steel)] mb-2">Verified Record</p>
        <h1 className="font-display text-3xl md:text-4xl text-[var(--cyan)] glow-cyan mb-1">{name}</h1>
        <p className="text-[var(--steel)] font-mono text-sm">{email}</p>
      </div>

      <div className="max-w-3xl mb-12 fade-up">
        <h2 className="font-display text-xl text-[var(--gold)] glow-gold mb-4">Skill Ratings</h2>
        {skillRatings.length === 0 ? (
          <p className="text-[var(--steel)] panel rounded-lg p-6">No verified contributions yet.</p>
        ) : (
          <div className="grid gap-3">
            {skillRatings.map((r) => (
              <div key={r.skillName} className="panel rounded-lg p-5 flex justify-between items-center">
                <div>
                  <p className="font-medium">{r.skillName}</p>
                  <p className="text-xs text-[var(--steel)] font-mono">{r.contributionCount} verified contribution{r.contributionCount !== 1 ? 's' : ''}</p>
                </div>
                <div className="font-mono text-2xl text-[var(--cyan)] glow-cyan">{r.averageScore}<span className="text-sm text-[var(--steel)]">/100</span></div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="max-w-3xl fade-up">
        <h2 className="font-display text-xl text-[var(--text)] mb-4">Verified Contributions</h2>
        {contributions.length === 0 ? (
          <p className="text-[var(--steel)] panel rounded-lg p-6">Nothing here yet — go join a club and submit your work.</p>
        ) : (
          <div className="grid gap-3">
            {contributions.map((c) => (
              <div key={c.id} className="panel rounded-lg p-5">
                <div className="flex justify-between items-start gap-4">
                  <div className="flex gap-3 items-start">
                    <span className="badge-verified">OK</span>
                    <div>
                      <p className="font-medium">{c.title}</p>
                      <p className="text-sm text-[var(--steel)]">{c.clubs?.name} &middot; {c.skills?.name}</p>
                      {c.description && <p className="text-sm text-[var(--text)] mt-1">{c.description}</p>}
                    </div>
                  </div>
                  <div className="font-mono text-lg text-[var(--cyan)] whitespace-nowrap">{c.score}/100</div>
                </div>
                {c.file_url && (
                  <a href={c.file_url} target="_blank" rel="noopener noreferrer" className="text-sm text-[var(--cyan)] hover:underline mt-3 inline-block ml-[52px]">View proof</a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}