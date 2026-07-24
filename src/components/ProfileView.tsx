'use client';

import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import {
  CheckCircle2,
  FileCheck,
  TrendingUp,
  Paperclip
} from 'lucide-react';
import AvatarUpload from './AvatarUpload';
import RatingHistoryChart from './RatingHistoryChart';
import { calculateOverallRating } from '@/lib/ratingFormula';

interface Contribution {
  id: string;
  title: string;
  score: number;
  skill_id?: string;
  file_url?: string;
  clubs?: { name: string };
  skills?: { name: string };
}

interface SkillRating {
  skillName: string;
  averageScore: number;
}

interface UserProfileProps {
  userId: string;
}

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

export default function UserProfileContainer({ userId }: UserProfileProps) {
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [barsReady, setBarsReady] = useState(false);

  const [authUserId, setAuthUserId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(undefined);
  const [totalVerified, setTotalVerified] = useState(0);
  const [overallRating, setOverallRating] = useState(0);
  const [skillRatings, setSkillRatings] = useState<SkillRating[]>([]);
  const [contributions, setContributions] = useState<Contribution[]>([]);

  const isOwnProfile = useMemo(() => {
    return Boolean(authUserId && authUserId === userId);
  }, [authUserId, userId]);

  useEffect(() => {
    let isMounted = true;

    async function load() {
      setBarsReady(false);
      setLoading(true);
      setNotFound(false);

      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (isMounted) {
          setAuthUserId(user?.id ?? null);
        }

        let { data: userRow, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('id', userId)
          .single();

        if (userError && userError.code !== 'PGRST116') {
          throw userError;
        }

        if (!userRow && user?.id === userId) {
          const { error: upsertError } = await supabase
            .from('users')
            .upsert({
              id: user.id,
              email: user.email!,
              name:
                user.user_metadata?.pending_name ??
                user.email?.split('@')[0] ??
                'Student',
            });

          if (upsertError) {
            throw upsertError;
          }

          await new Promise((r) => setTimeout(r, 100));

          const { data: retryRow, error: retryError } = await supabase
            .from('users')
            .select('*')
            .eq('id', userId)
            .single();

          if (retryError) {
            throw retryError;
          }
          userRow = retryRow;
        }

        if (!userRow) {
          if (isMounted) setNotFound(true);
          return;
        }

        if (isMounted) {
          setName(userRow.name);
          setEmail(userRow.email);
          setAvatarUrl(userRow.avatar_url);
        }

        const [contribRes, clubCountRes] = await Promise.all([
          supabase
            .from('contributions')
            .select(`
              id,
              title,
              score,
              skill_id,
              file_url,
              clubs ( name ),
              skills ( name )
            `)
            .eq('user_id', userId)
            .eq('status', 'verified')
            .order('created_at', { ascending: false }),
          supabase
            .from('club_members')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId),
        ]);

        if (contribRes.error) {
          throw contribRes.error;
        }

        if (isMounted) {
          const contribList = (contribRes.data ?? []) as unknown as Contribution[];
          setContributions(contribList);
          setTotalVerified(contribList.length);

          // Compute skill ratings directly from contributions —
          // same source of truth the Leaderboard uses, so numbers agree.
          const skillMap: { [skillName: string]: { total: number; count: number } } = {};
          contribList.forEach((c) => {
            const skillName = c.skills?.name ?? 'Unknown Skill';
            if (!skillMap[skillName]) skillMap[skillName] = { total: 0, count: 0 };
            skillMap[skillName].total += c.score;
            skillMap[skillName].count += 1;
          });

          const ratings: SkillRating[] = Object.entries(skillMap)
            .map(([skillName, { total, count }]) => ({ skillName, averageScore: Math.round(total / count) }))
            .sort((a, b) => b.averageScore - a.averageScore);

          setSkillRatings(ratings);

          const avgScoreAcrossAll = contribList.length > 0
            ? contribList.reduce((s, c) => s + c.score, 0) / contribList.length
            : 0;

          const rating = calculateOverallRating({
            avgScore: avgScoreAcrossAll,
            contributionCount: contribList.length,
            distinctSkills: Object.keys(skillMap).length,
            clubsJoined: clubCountRes.count ?? 0,
          });

          setOverallRating(rating);
        }
      } catch (err) {
        console.error('Error loading profile:', err);
      } finally {
        if (isMounted) {
          setLoading(false);
          setTimeout(() => setBarsReady(true), 50);
        }
      }
    }

    load();

    return () => {
      isMounted = false;
    };
  }, [userId]);

  if (loading) {
    return (
      <div className="card p-8 text-center text-[var(--ink-dim)]">
        Loading profile...
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="card p-8 text-center text-[var(--ink-dim)]">
        Profile not found.
      </div>
    );
  }

  const initials = name
    ? name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'U';

  return (
    <div>
      <div className="card p-6 md:p-8 mb-6 fade-up flex items-center gap-5">
        <div className="avatar w-16 h-16 text-xl overflow-hidden flex items-center justify-center bg-[var(--border)] font-display">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={name}
              className="w-full h-full object-cover"
            />
          ) : (
            initials
          )}
        </div>

        <div>
          <p className="text-xs text-[var(--ink-dim)] mb-1">
            {isOwnProfile ? 'Welcome back' : 'Student Profile'}
          </p>

          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="font-display text-2xl">{name}</h1>

            <span
              className="pill-verified scale-in inline-flex items-center gap-1"
              style={{ animationDelay: '0.3s' }}
            >
              <CheckCircle2 size={13} />
              Verified
            </span>
          </div>

          <p className="text-sm text-[var(--ink-dim)] mt-1">
            {email}
          </p>

          {isOwnProfile && (
            <div className="mt-2">
              <AvatarUpload
                userId={userId}
                currentAvatarUrl={avatarUrl ?? null}
                onUploaded={setAvatarUrl}
              />
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="card-tint bg-[var(--lavender)] p-6 fade-up relative overflow-hidden">
          <FileCheck
            className="absolute top-5 right-5 text-[var(--lavender-ink)] opacity-40"
            size={22}
          />

          <p className="text-sm text-[var(--ink-dim)] mb-2">
            Verified Contributions
          </p>

          <p className="font-display text-3xl text-[var(--lavender-ink)]">
            <CountUp value={totalVerified} />
          </p>
        </div>

        <div className="card-tint bg-[var(--mint)] p-6 fade-up relative overflow-hidden">
          <TrendingUp
            className="absolute top-5 right-5 text-[var(--mint-ink)] opacity-40"
            size={22}
          />

          <p className="text-sm text-[var(--ink-dim)] mb-2">
            Overall Rating
          </p>

          <p className="font-display text-3xl text-[var(--mint-ink)]">
            <CountUp value={overallRating} />
          </p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">

        <div className="card p-6 fade-up">
          <h2 className="text-sm font-semibold text-[var(--ink-dim)] mb-4 uppercase tracking-wide">
            Skill Ratings
          </h2>

          {skillRatings.length === 0 ? (
            <div className="text-center py-4">
              <EmptyIllustration />

              <p className="text-sm text-[var(--ink-dim)]">
                No verified contributions yet.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {skillRatings.map((rating) => (
                <div key={rating.skillName}>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span>{rating.skillName}</span>

                    <span className="font-semibold">
                      {rating.averageScore}
                    </span>
                  </div>

                  <div className="h-2 bg-[var(--border)] rounded-full overflow-hidden">
                    <div
                      className="bar-fill h-full bg-[var(--peach-ink)] rounded-full transition-all duration-500"
                      style={{
                        width: barsReady
                          ? `${rating.averageScore}%`
                          : '0%',
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card p-6 fade-up">
          <h2 className="text-sm font-semibold text-[var(--ink-dim)] mb-4 uppercase tracking-wide">
            Contribution History
          </h2>

          {contributions.length === 0 ? (
            <div className="text-center py-4">
              <EmptyIllustration />

              <p className="text-sm text-[var(--ink-dim)]">
                Nothing here yet — join a club and submit your work.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {contributions.map((contribution, index) => (
                <div
                  key={contribution.id}
                  className={`pb-4 ${
                    index !== contributions.length - 1
                      ? 'border-b border-[var(--border)]'
                      : ''
                  }`}
                >
                  <div className="flex justify-between items-start gap-3">
                    <div>
                      <p className="font-medium text-sm">
                        {contribution.title}
                      </p>

                      <p className="text-xs text-[var(--ink-dim)] mt-0.5">
                        {contribution.clubs?.name} &middot;{' '}
                        {contribution.skills?.name}
                      </p>
                    </div>

                    <span className="font-display text-lg shrink-0">
                      {contribution.score}
                    </span>
                  </div>

                  {contribution.file_url && (
                    <a
                      href={contribution.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-[var(--peach-ink)] hover:underline mt-1 inline-flex items-center gap-1"
                    >
                      <Paperclip size={11} />
                      View proof
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