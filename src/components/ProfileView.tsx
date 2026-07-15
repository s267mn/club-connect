'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { FileCheck, TrendingUp, CheckCircle2, Paperclip } from 'lucide-react';
import { calculateOverallRating } from '@/lib/ratingFormula';
import RatingHistoryChart from '@/components/RatingHistoryChart';
import AvatarUpload from '@/components/AvatarUpload';

type Contribution = {
  id: string;
  title: string;
  description: string;
  file_url: string;
  score: number;
  skills: { name: string } | null;
  clubs: { name: string } | null;
};

type SkillRating = { skillName: string; averageScore: number; contributionCount: number };

function CountUp({ value }: { value: number }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    let frame: number;
    const duration = 700;
    const start = performance.now();

    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      setDisplay(Math.round(progress * value));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value]);

  return <>{display}</>;
}

function EmptyIllustration() {
  return (
    <svg viewBox="0 0 120 90" className="w-28 h-auto mx-auto mb-3 opacity-80">
      <ellipse cx="60" cy="78" rx="42" ry="6" fill="#EEE8DD" />
      <path d="M60 20 C68 20 74 28 74 38 C74 50 60 62 60 62 C60 62 46 50 46 38 C46 28 52 20 60 20 Z" fill="#FCEEE6" stroke="#D9764A" strokeWidth="1.5" />
      <circle cx="60" cy="36" r="7" fill="#D9764A" opacity="0.5" />
      <path d="M30 66 Q35 50 42 66" stroke="#6B5FC7" strokeWidth="2" fill="none" strokeLinecap="round" />
      <path d="M78 66 Q83 52 90 66" stroke="#3B9A6B" strokeWidth="2" fill="none" strokeLinecap="round" />
    </svg>
  );
}

export default function ProfileView({ userId, isOwnProfile }: { userId: string; isOwnProfile: boolean }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [skillRatings, setSkillRatings] = useState<SkillRating[]>([]);
  const [clubsJoined, setClubsJoined] = useState(0);
  const [loading, setLoading] = useState(true);
  const [barsReady, setBarsReady] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);

      const { data: userRow, error: userError } = await supabase.from('users').select('id, name, email, avatar_url').eq('id', userId).single();
      if (userError || !userRow) { setNotFound(true); setLoading(false); return; }

      setName(userRow.name);
      setEmail(userRow.email);
      setAvatarUrl(userRow.avatar_url ?? null);

      const { data: contribs } = await supabase
        .from('contributions')
        .select('id, title, description, file_url, score, skills(name), clubs(name)')
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

      const ratings: SkillRating[] = Object.entries(skillMap)
        .map(([skillName, { total, count }]) => ({ skillName, averageScore: Math.round(total / count), contributionCount: count }))
        .sort((a, b) => b.averageScore - a.averageScore);

      setSkillRatings(ratings);

      const { count: clubCount } = await supabase
        .from('club_members')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userRow.id);

      setClubsJoined(clubCount ?? 0);

      setLoading(false);
      requestAnimationFrame(() => setTimeout(() => setBarsReady(true), 100));
    };

    load();
  }, [userId]);

  if (loading) return <div className="min-h-screen flex items-center justify-center text-sm text-[var(--ink-dim)]">Loading...</div>;
  if (notFound) return <div className="min-h-screen flex items-center justify-center text-sm text-red-600">Student not found.</div>;

  const initials = name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase();
  const totalVerified = contributions.length;
  const avgScoreAcrossAll = totalVerified > 0 ? contributions.reduce((s, c) => s + c.score, 0) / totalVerified : 0;

  const overallRating = calculateOverallRating({
    avgScore: avgScoreAcrossAll,
    contributionCount: totalVerified,
    distinctSkills: skillRatings.length,
    clubsJoined,
  });

  return (
    <div>
      <div className="card p-6 md:p-8 mb-6 fade-up flex items-center gap-5">
        <div className="avatar w-16 h-16 text-xl overflow-hidden">
          {avatarUrl ? (
            <img src={avatarUrl} alt={name} className="w-full h-full object-cover" />
          ) : (
            initials
          )}
        </div>
        <div>
          <p className="text-xs text-[var(--ink-dim)] mb-1">{isOwnProfile ? 'Welcome back' : 'Student Profile'}</p>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="font-display text-2xl">{name}</h1>
            <span className="pill-verified scale-in" style={{ animationDelay: '0.3s' }}>
              <CheckCircle2 size={13} /> Verified
            </span>
          </div>
          <p className="text-sm text-[var(--ink-dim)] mt-1">{email}</p>
          {isOwnProfile && (
            <div className="mt-2">
              <AvatarUpload userId={userId} currentAvatarUrl={avatarUrl} onUploaded={(url) => setAvatarUrl(url)} />
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="card-tint bg-[var(--lavender)] p-6 fade-up relative overflow-hidden">
          <FileCheck className="absolute top-5 right-5 text-[var(--lavender-ink)] opacity-40" size={22} />
          <p className="text-sm text-[var(--ink-dim)] mb-2">Verified Contributions</p>
          <p className="font-display text-3xl text-[var(--lavender-ink)]"><CountUp value={totalVerified} /></p>
        </div>
        <div className="card-tint bg-[var(--mint)] p-6 fade-up relative overflow-hidden">
          <TrendingUp className="absolute top-5 right-5 text-[var(--mint-ink)] opacity-40" size={22} />
          <p className="text-sm text-[var(--ink-dim)] mb-2">Overall Rating</p>
          <p className="font-display text-3xl text-[var(--mint-ink)]"><CountUp value={overallRating} /></p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="card p-6 fade-up">
          <h2 className="text-sm font-semibold text-[var(--ink-dim)] mb-4 uppercase tracking-wide">Skill Ratings</h2>
          {skillRatings.length === 0 ? (
            <div className="text-center py-4">
              <EmptyIllustration />
              <p className="text-sm text-[var(--ink-dim)]">No verified contributions yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {skillRatings.map((r) => (
                <div key={r.skillName}>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span>{r.skillName}</span>
                    <span className="font-semibold">{r.averageScore}</span>
                  </div>
                  <div className="h-2 bg-[var(--border)] rounded-full overflow-hidden">
                    <div className="bar-fill h-full bg-[var(--peach-ink)] rounded-full" style={{ width: barsReady ? `${r.averageScore}%` : '0%' }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card p-6 fade-up">
          <h2 className="text-sm font-semibold text-[var(--ink-dim)] mb-4 uppercase tracking-wide">Contribution History</h2>
          {contributions.length === 0 ? (
            <div className="text-center py-4">
              <EmptyIllustration />
              <p className="text-sm text-[var(--ink-dim)]">Nothing here yet &mdash; join a club and submit your work.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {contributions.map((c, i) => (
                <div key={c.id} className={`pb-4 ${i !== contributions.length - 1 ? 'border-b border-[var(--border)]' : ''}`}>
                  <div className="flex justify-between items-start gap-3">
                    <div>
                      <p className="font-medium text-sm">{c.title}</p>
                      <p className="text-xs text-[var(--ink-dim)] mt-0.5">{c.clubs?.name} &middot; {c.skills?.name}</p>
                    </div>
                    <span className="font-display text-lg shrink-0">{c.score}</span>
                  </div>
                  {c.file_url && (
                    <a href={c.file_url} target="_blank" rel="noopener noreferrer" className="text-xs text-[var(--peach-ink)] hover:underline mt-1 inline-flex items-center gap-1">
                      <Paperclip size={11} /> View proof
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mt-4">
        <RatingHistoryChart userId={userId} />
      </div>
    </div>
  );
}