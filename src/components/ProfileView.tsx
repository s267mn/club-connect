'use client';

import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import {
  CheckCircle2,
  FileCheck,
  TrendingUp,
  Paperclip,
  Lock,
  Clock,
  X as XIcon,
} from 'lucide-react';
import AvatarUpload from './AvatarUpload';
import RatingHistoryChart from './RatingHistoryChart';
import ResumeGenerator from './ResumeGenerator';
import { calculateOverallRating } from '@/lib/ratingFormula';
import { ROLE_LABELS } from './FacultyReview';
import { Pencil, Check, X as CloseIcon } from 'lucide-react';

interface Contribution {
  id: string;
  title: string;
  score: number;
  skill_id?: string;
  file_url?: string;
  clubs?: { name: string };
  skills?: { name: string };
}

interface HistoryItem {
  id: string;
  title: string;
  description: string | null;
  status: string;
  score: number | null;
  is_frozen: boolean;
  file_url: string | null;
  verified_by: string | null;
  frozen_by: string | null;
  verified_by_role: string | null;
  frozen_by_role: string | null;
  club_id: string | null;
  skill_id: string | null;

  clubs: { name: string } | null;
  skills: { name: string } | null;

  verifier: { name: string } | null;
  freezer: { name: string } | null;
}

interface SkillRating {
  skillName: string;
  averageScore: number;
}

interface ClubMembershipInfo {
  clubName: string;
  role: 'faculty' | 'lead' | 'member';
}

function normalizeResumeRole(
  role: string | null
): 'faculty' | 'lead' | 'member' {
  const normalized = (role ?? '').toLowerCase().trim();

  if (normalized === 'faculty') return 'faculty';
  if (normalized === 'admin' || normalized === 'lead') return 'lead';

  return 'member';
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
      const progress = Math.min(
        (now - start) / duration,
        1
      );

      setDisplay(Math.round(progress * value));

      if (progress < 1) {
        frame = requestAnimationFrame(tick);
      }
    };

    frame = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(frame);
  }, [value]);

  return <>{display}</>;
}

function EmptyIllustration() {
  return (
    <svg
      viewBox="0 0 120 90"
      className="w-28 h-auto mx-auto mb-3 opacity-80"
    >
      <ellipse
        cx="60"
        cy="78"
        rx="42"
        ry="6"
        fill="#EEE8DD"
      />

      <path
        d="M60 20 C68 20 74 28 74 38 C74 50 60 62 60 62 C60 62 46 50 46 38 C46 28 52 20 60 20 Z"
        fill="#FCEEE6"
        stroke="#D9764A"
        strokeWidth="1.5"
      />

      <circle
        cx="60"
        cy="36"
        r="7"
        fill="#D9764A"
        opacity="0.5"
      />

      <path
        d="M30 66 Q35 50 42 66"
        stroke="#6B5FC7"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
      />

      <path
        d="M78 66 Q83 52 90 66"
        stroke="#3B9A6B"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );
}

function statusBadge(item: HistoryItem) {
  if (item.status === 'pending') {
    return (
      <span className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full bg-[var(--peach)] text-[var(--peach-ink)] inline-flex items-center gap-1 shrink-0">
        <Clock size={10} />
        Pending
      </span>
    );
  }

  if (item.status === 'rejected') {
    return (
      <span className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full bg-red-100 text-red-700 inline-flex items-center gap-1 shrink-0">
        <XIcon size={10} />
        Rejected
      </span>
    );
  }

  if (item.is_frozen) {
    return (
      <span className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full bg-[var(--lavender)] text-[var(--lavender-ink)] inline-flex items-center gap-1 shrink-0">
        <Lock size={10} />
        Final
      </span>
    );
  }

  return (
    <span className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full bg-[var(--mint)] text-[var(--mint-ink)] inline-flex items-center gap-1 shrink-0">
      <CheckCircle2 size={10} />
      Verified
    </span>
  );
}

export default function UserProfileContainer({
  userId,
}: UserProfileProps) {
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [barsReady, setBarsReady] = useState(false);

  const [authUserId, setAuthUserId] = useState<string | null>(
    null
  );

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<
    string | undefined
  >(undefined);

  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [nameError, setNameError] = useState('');

  const [clubMemberships, setClubMemberships] = useState<
    ClubMembershipInfo[]
  >([]);

  const [lastResumeGeneratedAt, setLastResumeGeneratedAt] =
    useState<string | null>(null);

  const [totalVerified, setTotalVerified] = useState(0);
  const [overallRating, setOverallRating] = useState(0);

  const [skillRatings, setSkillRatings] = useState<
    SkillRating[]
  >([]);

  const [contributions, setContributions] = useState<
    Contribution[]
  >([]);

  const [history, setHistory] = useState<HistoryItem[]>([]);

  const isOwnProfile = useMemo(() => {
    return Boolean(
      authUserId && authUserId === userId
    );
  }, [authUserId, userId]);

  useEffect(() => {
    let isMounted = true;

    async function load() {
      setBarsReady(false);
      setLoading(true);
      setNotFound(false);

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (isMounted) {
          setAuthUserId(user?.id ?? null);
        }

        /*
         * Load the profile itself first.
         */
        let { data: userRow, error: userError } =
          await supabase
            .from('users')
            .select(
              'id, name, email, avatar_url, last_resume_generated_at'
            )
            .eq('id', userId)
            .single();

        if (
          userError &&
          userError.code !== 'PGRST116'
        ) {
          throw userError;
        }

        /*
         * If the authenticated user's public row doesn't
         * exist yet, create it using the same fallback
         * behaviour as the previous implementation.
         */
        if (!userRow && user?.id === userId) {
          const { error: upsertError } =
            await supabase
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

          await new Promise((resolve) =>
            setTimeout(resolve, 100)
          );

          const {
            data: retryRow,
            error: retryError,
          } = await supabase
            .from('users')
            .select(
              'id, name, email, avatar_url, last_resume_generated_at'
            )
            .eq('id', userId)
            .single();

          if (retryError) {
            throw retryError;
          }

          userRow = retryRow;
        }

        if (!userRow) {
          if (isMounted) {
            setNotFound(true);
          }

          return;
        }

        if (isMounted) {
          setName(userRow.name);
          setEmail(userRow.email);
          setAvatarUrl(
            userRow.avatar_url ?? undefined
          );
          setLastResumeGeneratedAt(
            (userRow as { last_resume_generated_at?: string | null })
              .last_resume_generated_at ?? null
          );
        }

        /*
         * IMPORTANT:
         *
         * Verified contributions are kept completely
         * separate from history.
         *
         * Rating calculations MUST only use verified
         * contributions.
         */
        const [
          contributionRes,
          historyRes,
          clubCountRes,
          membershipRes,
        ] = await Promise.all([
          supabase
            .from('contributions')
            .select(
              'id, title, score, skill_id, file_url, club_id'
            )
            .eq('user_id', userId)
            .eq('status', 'verified')
            .order('created_at', {
              ascending: false,
            }),

          supabase
            .from('contributions')
            .select(
              'id, title, description, status, score, is_frozen, file_url, verified_by, frozen_by, verified_by_role, frozen_by_role, club_id, skill_id'
            )
            .eq('user_id', userId)
            .in('status', [
              'pending',
              'verified',
              'rejected',
            ])
            .order('created_at', {
              ascending: false,
            }),

          supabase
            .from('club_members')
            .select('*', {
              count: 'exact',
              head: true,
            })
            .eq('user_id', userId),

          supabase
            .from('club_members')
            .select('role, clubs (name)')
            .eq('user_id', userId),
        ]);

        if (contributionRes.error) {
          throw contributionRes.error;
        }

        if (historyRes.error) {
          console.error(
            'Failed to load contribution history:',
            historyRes.error
          );
        }

        const verifiedRows =
          (contributionRes.data ?? []) as Array<{
            id: string;
            title: string;
            score: number;
            skill_id: string | null;
            file_url: string | null;
            club_id: string | null;
          }>;

        const historyRows =
          (historyRes.data ?? []) as Array<{
            id: string;
            title: string;
            description: string | null;
            status: string;
            score: number | null;
            is_frozen: boolean;
            file_url: string | null;
            verified_by: string | null;
            frozen_by: string | null;
            verified_by_role: string | null;
            frozen_by_role: string | null;
            club_id: string | null;
            skill_id: string | null;
          }>;

        /*
         * Hydrate related data separately.
         *
         * This intentionally avoids the problematic
         * multi-relationship users embedding that caused
         * the PostgREST ambiguity.
         */
        const allUserIds = Array.from(
          new Set(
            historyRows.flatMap((row) =>
              [
                row.verified_by,
                row.frozen_by,
              ].filter(Boolean) as string[]
            )
          )
        );

        const allClubIds = Array.from(
          new Set(
            [
              ...verifiedRows.map(
                (row) => row.club_id
              ),
              ...historyRows.map(
                (row) => row.club_id
              ),
            ].filter(Boolean) as string[]
          )
        );

        const allSkillIds = Array.from(
          new Set(
            [
              ...verifiedRows.map(
                (row) => row.skill_id
              ),
              ...historyRows.map(
                (row) => row.skill_id
              ),
            ].filter(Boolean) as string[]
          )
        );

        const userMap = new Map<
          string,
          { name: string }
        >();

        const clubMap = new Map<
          string,
          { name: string }
        >();

        const skillMap = new Map<
          string,
          { name: string }
        >();

        /*
         * Load verifier/freezer names.
         */
        if (allUserIds.length > 0) {
          const { data: relatedUsers, error } =
            await supabase
              .from('users')
              .select('id, name')
              .in('id', allUserIds);

          if (error) {
            console.error(
              'Failed to load verifier/freezer users:',
              error
            );
          }

          for (const relatedUser of
            relatedUsers ?? []) {
            userMap.set(relatedUser.id, {
              name: relatedUser.name,
            });
          }
        }

        /*
         * Load clubs.
         */
        if (allClubIds.length > 0) {
          const { data: clubs, error } =
            await supabase
              .from('clubs')
              .select('id, name')
              .in('id', allClubIds);

          if (error) {
            console.error(
              'Failed to load contribution clubs:',
              error
            );
          }

          for (const club of clubs ?? []) {
            clubMap.set(club.id, {
              name: club.name,
            });
          }
        }

        /*
         * Load skills.
         */
        if (allSkillIds.length > 0) {
          const { data: skills, error } =
            await supabase
              .from('skills')
              .select('id, name')
              .in('id', allSkillIds);

          if (error) {
            console.error(
              'Failed to load contribution skills:',
              error
            );
          }

          for (const skill of skills ?? []) {
            skillMap.set(skill.id, {
              name: skill.name,
            });
          }
        }

        /*
         * Rebuild the verified contribution objects.
         */
        const hydratedContributions: Contribution[] =
          verifiedRows.map((row) => ({
            id: row.id,
            title: row.title,
            score: row.score,
            skill_id: row.skill_id ?? undefined,
            file_url: row.file_url ?? undefined,
            clubs: row.club_id
              ? clubMap.get(row.club_id)
              : undefined,
            skills: row.skill_id
              ? skillMap.get(row.skill_id)
              : undefined,
          }));

        /*
         * Rebuild complete history objects.
         */
        const hydratedHistory: HistoryItem[] =
          historyRows.map((row) => ({
            id: row.id,
            title: row.title,
            description: row.description,
            status: row.status,
            score: row.score,
            is_frozen: row.is_frozen,
            file_url: row.file_url,
            verified_by: row.verified_by,
            frozen_by: row.frozen_by,
            verified_by_role:
              row.verified_by_role,
            frozen_by_role:
              row.frozen_by_role,
            club_id: row.club_id,
            skill_id: row.skill_id,

            clubs: row.club_id
              ? clubMap.get(row.club_id) ?? null
              : null,

            skills: row.skill_id
              ? skillMap.get(row.skill_id) ?? null
              : null,

            verifier: row.verified_by
              ? userMap.get(row.verified_by) ?? null
              : null,

            freezer: row.frozen_by
              ? userMap.get(row.frozen_by) ?? null
              : null,
          }));

        if (!isMounted) return;

        setContributions(
          hydratedContributions
        );

        setTotalVerified(
          hydratedContributions.length
        );

        setHistory(hydratedHistory);

        if (membershipRes.error) {
          console.error(
            'Failed to load club memberships:',
            membershipRes.error
          );
        }

        const membershipRows =
          (membershipRes.data as unknown as Array<{
            role: string | null;
            clubs: { name: string } | { name: string }[] | null;
          }>) ?? [];

        const hydratedMemberships: ClubMembershipInfo[] =
          membershipRows.map((row) => {
            const clubEntry = Array.isArray(row.clubs)
              ? row.clubs[0]
              : row.clubs;

            return {
              clubName: clubEntry?.name ?? 'Unknown Club',
              role: normalizeResumeRole(row.role),
            };
          });

        if (isMounted) {
          setClubMemberships(hydratedMemberships);
        }

        /*
         * Skill ratings are calculated ONLY from verified
         * contributions.
         */
        const ratingSkillMap: {
          [skillName: string]: {
            total: number;
            count: number;
          };
        } = {};

        hydratedContributions.forEach(
          (contribution) => {
            const skillName =
              contribution.skills?.name ??
              'Unknown Skill';

            if (!ratingSkillMap[skillName]) {
              ratingSkillMap[skillName] = {
                total: 0,
                count: 0,
              };
            }

            ratingSkillMap[skillName].total +=
              contribution.score;

            ratingSkillMap[skillName].count += 1;
          }
        );

        const ratings: SkillRating[] =
          Object.entries(ratingSkillMap)
            .map(
              ([
                skillName,
                { total, count },
              ]) => ({
                skillName,
                averageScore: Math.round(
                  total / count
                ),
              })
            )
            .sort(
              (a, b) =>
                b.averageScore -
                a.averageScore
            );

        setSkillRatings(ratings);

        /*
         * Overall rating remains exactly based on the
         * verified contribution set.
         */
        const avgScoreAcrossAll =
          hydratedContributions.length > 0
            ? hydratedContributions.reduce(
                (sum, contribution) =>
                  sum + contribution.score,
                0
              ) /
              hydratedContributions.length
            : 0;

        const rating =
          calculateOverallRating({
            avgScore: avgScoreAcrossAll,
            contributionCount:
              hydratedContributions.length,
            distinctSkills:
              Object.keys(ratingSkillMap)
                .length,
            clubsJoined:
              clubCountRes.count ?? 0,
          });

        setOverallRating(rating);
      } catch (err) {
        console.error(
          'Error loading profile:',
          err
        );

        if (isMounted) {
          setErrorState();
        }
      } finally {
        if (isMounted) {
          setLoading(false);

          setTimeout(
            () => setBarsReady(true),
            50
          );
        }
      }
    }

    load();

    return () => {
      isMounted = false;
    };
  }, [userId]);

  const setErrorState = () => {
    setNotFound(true);
  };

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

  /*
   * Group complete history by club.
   */
  const historyByClub = history.reduce(
    (
      acc: Record<string, HistoryItem[]>,
      item
    ) => {
      const clubName =
        item.clubs?.name ??
        'Unknown Club';

      if (!acc[clubName]) {
        acc[clubName] = [];
      }

      acc[clubName].push(item);

      return acc;
    },
    {}
  );

  const pendingCount = history.filter(
    (h) => h.status === 'pending'
  ).length;

  const frozenCount = history.filter(
    (h) =>
      h.status === 'verified' &&
      h.is_frozen
  ).length;

  return (
    <div>
      {/* Profile header */}
      <div className="card p-6 md:p-8 mb-6 fade-up flex items-center gap-5">
        <div className="avatar w-16 h-16 text-xl overflow-hidden flex items-center justify-center bg-[var(--border)] font-display shrink-0">
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

        <div className="min-w-0 flex-1">
          <p className="text-xs text-[var(--ink-dim)] mb-1">
            {isOwnProfile
              ? 'Welcome back'
              : 'Student Profile'}
          </p>

          <div className="flex items-center gap-3 flex-wrap">
            {editingName ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={nameDraft}
                  onChange={(e) =>
                    setNameDraft(e.target.value)
                  }
                  maxLength={100}
                  autoFocus
                  className="font-display text-2xl bg-transparent border-b-2 border-[var(--peach-ink)] outline-none px-0.5 min-w-0"
                  style={{ width: `${Math.max(nameDraft.length, 4)}ch` }}
                />

                <button
                  type="button"
                  disabled={savingName}
                  onClick={async () => {
                    const trimmed = nameDraft.trim();

                    if (!trimmed) {
                      setNameError('Name cannot be empty.');
                      return;
                    }

                    if (trimmed.length > 100) {
                      setNameError('Name is too long.');
                      return;
                    }

                    setSavingName(true);
                    setNameError('');

                    const { error: nameUpdateError } =
                      await supabase
                        .from('users')
                        .update({ name: trimmed })
                        .eq('id', userId);

                    setSavingName(false);

                    if (nameUpdateError) {
                      setNameError(
                        nameUpdateError.message
                      );
                      return;
                    }

                    setName(trimmed);
                    setEditingName(false);
                  }}
                  className="p-1.5 rounded-lg text-[var(--mint-ink)] hover:bg-[var(--mint)] transition-colors disabled:opacity-50"
                  aria-label="Save name"
                >
                  <Check size={16} />
                </button>

                <button
                  type="button"
                  disabled={savingName}
                  onClick={() => {
                    setEditingName(false);
                    setNameError('');
                  }}
                  className="p-1.5 rounded-lg text-[var(--ink-dim)] hover:bg-[var(--border)] transition-colors disabled:opacity-50"
                  aria-label="Cancel editing name"
                >
                  <CloseIcon size={16} />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 group">
                <h1 className="font-display text-2xl">
                  {name}
                </h1>

                {isOwnProfile && (
                  <button
                    type="button"
                    onClick={() => {
                      setNameDraft(name);
                      setNameError('');
                      setEditingName(true);
                    }}
                    className="p-1 rounded-lg text-[var(--ink-dim)] hover:bg-[var(--border)] hover:text-[var(--ink)] transition-all"
                    aria-label="Edit name"
                  >
                    <Pencil size={14} />
                  </button>
                )}
              </div>
            )}

            <span
              className="pill-verified scale-in inline-flex items-center gap-1"
              style={{
                animationDelay: '0.3s',
              }}
            >
              <CheckCircle2 size={13} />
              Verified
            </span>
          </div>

          {nameError && (
            <p className="text-red-600 text-xs mt-1">
              {nameError}
            </p>
          )}

          <p className="text-sm text-[var(--ink-dim)] mt-1">
            {email}
          </p>

          {isOwnProfile && (
            <div className="mt-3 flex items-center gap-2 flex-wrap">
              <AvatarUpload
                userId={userId}
                currentAvatarUrl={
                  avatarUrl ?? null
                }
                onUploaded={setAvatarUrl}
              />

              <ResumeGenerator
                userId={userId}
                name={name}
                email={email}
                avatarUrl={avatarUrl}
                overallRating={overallRating}
                totalVerified={totalVerified}
                memberships={clubMemberships}
                contributions={contributions.map((c) => ({
                  title: c.title,
                  score: c.score,
                  clubName: c.clubs?.name ?? 'Unknown Club',
                  skillName: c.skills?.name ?? 'Unknown Skill',
                }))}
                skillRatings={skillRatings}
                lastResumeGeneratedAt={lastResumeGeneratedAt}
                onGenerated={setLastResumeGeneratedAt}
              />
            </div>
          )}
        </div>
      </div>

      {/* Stats */}
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

      {/* Skill ratings + verified contribution history */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="card p-6 fade-up flex flex-col h-[420px]">
          <h2 className="text-sm font-semibold text-[var(--ink-dim)] mb-4 uppercase tracking-wide shrink-0">
            Skill Ratings
          </h2>

          {skillRatings.length === 0 ? (
            <div className="text-center py-4 m-auto">
              <EmptyIllustration />

              <p className="text-sm text-[var(--ink-dim)]">
                No verified contributions yet.
              </p>
            </div>
          ) : (
            <div className="space-y-4 overflow-y-auto pr-2 scrollbar-thin">
              {skillRatings.map((rating) => (
                <div key={rating.skillName}>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span>
                      {rating.skillName}
                    </span>

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

        <div className="card p-6 fade-up flex flex-col h-[420px]">
          <h2 className="text-sm font-semibold text-[var(--ink-dim)] mb-4 uppercase tracking-wide shrink-0">
            Contribution History
          </h2>

          {contributions.length === 0 ? (
            <div className="text-center py-4 m-auto">
              <EmptyIllustration />

              <p className="text-sm text-[var(--ink-dim)]">
                Nothing here yet — join a club and
                submit your work.
              </p>
            </div>
          ) : (
            <div className="space-y-4 overflow-y-auto pr-2 scrollbar-thin">
              {contributions.map(
                (contribution, index) => (
                  <div
                    key={contribution.id}
                    className={`pb-4 ${
                      index !==
                      contributions.length - 1
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
                          {contribution.clubs
                            ?.name}{' '}
                          &middot;{' '}
                          {contribution.skills
                            ?.name}
                        </p>
                      </div>

                      <span className="font-display text-lg shrink-0">
                        {contribution.score}
                      </span>
                    </div>

                    {contribution.file_url && (
                      <a
                        href={
                          contribution.file_url
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-[var(--peach-ink)] hover:underline mt-1 inline-flex items-center gap-1"
                      >
                        <Paperclip size={11} />
                        View proof
                      </a>
                    )}
                  </div>
                )
              )}
            </div>
          )}
        </div>
      </div>

      {/* Full contribution history — owner only */}
      {isOwnProfile && (
        <div className="card p-6 fade-up mt-4 flex flex-col max-h-[560px] w-full">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2 shrink-0">
            <h2 className="text-sm font-semibold text-[var(--ink-dim)] uppercase tracking-wide">
              My Contributions — All Clubs
            </h2>

            <div className="flex items-center gap-2">
              {pendingCount > 0 && (
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[var(--peach)] text-[var(--peach-ink)]">
                  {pendingCount} pending
                </span>
              )}

              {frozenCount > 0 && (
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[var(--lavender)] text-[var(--lavender-ink)] inline-flex items-center gap-1">
                  <Lock size={10} />
                  {frozenCount} final
                </span>
              )}
            </div>
          </div>

          {history.length === 0 ? (
            <div className="text-center py-4">
              <EmptyIllustration />

              <p className="text-sm text-[var(--ink-dim)]">
                No submissions yet across any club.
              </p>
            </div>
          ) : (
            <div className="space-y-6 overflow-y-auto pr-2 scrollbar-thin">
              {Object.entries(
                historyByClub
              ).map(([clubName, items]) => (
                <div key={clubName}>
                  <p className="text-xs font-semibold text-[var(--ink-dim)] uppercase tracking-wide mb-2">
                    {clubName}
                  </p>

                  <div className="space-y-3">
                    {items.map((item) => (
                      <div
                        key={item.id}
                        className="border border-[var(--border)] rounded-xl p-4"
                      >
                        <div className="flex justify-between items-start gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-medium text-sm">
                                {item.title}
                              </p>

                              {statusBadge(item)}
                            </div>

                            <p className="text-xs text-[var(--ink-dim)] mt-0.5">
                              {item.skills?.name}
                            </p>
                          </div>

                          {item.status ===
                            'verified' && (
                            <span className="font-display text-lg shrink-0">
                              {item.score}
                            </span>
                          )}
                        </div>

                        {item.file_url && (
                          <a
                            href={
                              item.file_url
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-[var(--peach-ink)] hover:underline mt-2 inline-flex items-center gap-1"
                          >
                            <Paperclip size={11} />
                            View proof
                          </a>
                        )}

                        {item.status ===
                          'verified' && (
                          <div className="mt-2 pt-2 border-t border-[var(--border)] text-xs text-[var(--ink-dim)] space-y-0.5">
                            <p>
                              Verified by{' '}
                              <span className="font-medium text-[var(--ink)]">
                                {item.verifier
                                  ?.name ??
                                  'Unknown'}
                              </span>

                              {item.verified_by_role &&
                                ` (${
                                  ROLE_LABELS[
                                    item
                                      .verified_by_role
                                  ] ??
                                  item.verified_by_role
                                })`}
                            </p>

                            {item.is_frozen && (
                              <p>
                                Frozen by{' '}
                                <span className="font-medium text-[var(--ink)]">
                                  {item.freezer
                                    ?.name ??
                                    'Unknown'}
                                </span>

                                {item.frozen_by_role &&
                                  ` (${
                                    ROLE_LABELS[
                                      item
                                        .frozen_by_role
                                    ] ??
                                    item.frozen_by_role
                                  })`}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="mt-4">
        <RatingHistoryChart
          userId={userId}
        />
      </div>
    </div>
  );
}