'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import {
  Clock3,
  CheckCircle2,
  XCircle,
  Lock,
  Paperclip,
  ChevronDown,
  ChevronUp,
  ClipboardList,
} from 'lucide-react';
import { ROLE_LABELS } from '@/components/FacultyReview';

type Contribution = {
  id: string;
  title: string;
  description: string | null;
  file_url: string | null;
  user_id: string;
  skill_id: string | null;
  status: string;
  score: number | null;

  is_frozen: boolean;

  verified_by: string | null;
  verified_by_role: string | null;

  frozen_by: string | null;
  frozen_by_role: string | null;

  verifier: {
    name: string;
  } | null;

  freezer: {
    name: string;
  } | null;

  skills: {
    name: string;
  } | null;
};

type Tab = 'pending' | 'reviewed' | 'rejected' | 'frozen';

export default function MemberContributionView({
  clubId,
}: {
  clubId: string;
}) {
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>('pending');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  /*
   * ---------------------------------------------------------
   * LOAD MEMBER CONTRIBUTIONS
   * ---------------------------------------------------------
   */

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setLoading(true);
      setError('');

      try {
        /*
         * Get the currently authenticated Supabase account.
         */
        const { data: sessionData, error: sessionError } =
          await supabase.auth.getSession();

        if (sessionError) {
          throw sessionError;
        }

        const email = sessionData.session?.user.email;

        if (!email) {
          if (mounted) {
            setError('Please log in again to view your contributions.');
          }

          return;
        }

        /*
         * IMPORTANT:
         *
         * The application uses the `users` table as the user identity
         * for club_members and contributions.
         *
         * Therefore we resolve the application user through email
         * instead of assuming Supabase auth.user.id === users.id.
         */
        const { data: userRow, error: userError } = await supabase
          .from('users')
          .select('id')
          .eq('email', email)
          .maybeSingle();

        if (userError) {
          throw userError;
        }

        if (!userRow?.id) {
          if (mounted) {
            setError(
              'Your account could not be linked to ClubConnect. Please refresh and try again.'
            );
          }

          return;
        }

        /*
         * Load only this member's contributions for this club.
         *
         * We intentionally include:
         * pending
         * verified
         * rejected
         *
         * Frozen contributions remain status='verified' but have
         * is_frozen=true, so they can be separated in the UI.
         */
        const { data, error: contributionError } = await supabase
          .from('contributions')
          .select(
            `
              id,
              title,
              description,
              file_url,
              user_id,
              skill_id,
              status,
              score,
              is_frozen,
              verified_by,
              verified_by_role,
              frozen_by,
              frozen_by_role,

              skills!contributions_skill_id_fkey (
                name
              ),

              verifier:users!contributions_verified_by_fkey (
                name
              ),

              freezer:users!contributions_frozen_by_fkey (
                name
              )
            `
          )
          .eq('club_id', clubId)
          .eq('user_id', userRow.id)
          .in('status', ['pending', 'verified', 'rejected'])
          .order('created_at', { ascending: false });

        if (contributionError) {
          throw contributionError;
        }

        if (mounted) {
          setContributions(
            (data as unknown as Contribution[]) ?? []
          );
        }
      } catch (err) {
        console.error(
          'Failed to load member contributions:',
          err
        );

        if (mounted) {
          setError(
            'Could not load your contributions. Please try again.'
          );
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      mounted = false;
    };
  }, [clubId]);

  /*
   * ---------------------------------------------------------
   * DERIVED DATA
   * ---------------------------------------------------------
   */

  const pending = useMemo(
    () =>
      contributions.filter(
        (contribution) =>
          contribution.status === 'pending'
      ),
    [contributions]
  );

  const reviewed = useMemo(
    () =>
      contributions.filter(
        (contribution) =>
          contribution.status === 'verified' &&
          !contribution.is_frozen
      ),
    [contributions]
  );

  const rejected = useMemo(
    () =>
      contributions.filter(
        (contribution) =>
          contribution.status === 'rejected'
      ),
    [contributions]
  );

  const frozen = useMemo(
    () =>
      contributions.filter(
        (contribution) =>
          contribution.status === 'verified' &&
          contribution.is_frozen
      ),
    [contributions]
  );

  const visibleContributions =
    activeTab === 'pending'
      ? pending
      : activeTab === 'reviewed'
        ? reviewed
        : activeTab === 'rejected'
          ? rejected
          : frozen;

  const totalCount = contributions.length;

  /*
   * ---------------------------------------------------------
   * ROLE LABEL
   * ---------------------------------------------------------
   */

  const getRoleLabel = (
    role: string | null
  ) => {
    if (!role) return '';

    return (
      ROLE_LABELS[
        role as keyof typeof ROLE_LABELS
      ] ?? role
    );
  };

  /*
   * ---------------------------------------------------------
   * LOADING
   * ---------------------------------------------------------
   */

  if (loading) {
    return (
      <div className="border border-[var(--border)] rounded-2xl bg-[var(--bg)] overflow-hidden">
        <div className="px-5 py-4 border-b border-[var(--border)] flex items-center gap-3">
          <ClipboardList
            size={17}
            className="text-[var(--peach-ink)]"
          />

          <span className="text-sm font-semibold">
            My Contributions
          </span>
        </div>

        <div className="px-5 py-10 text-center">
          <p className="text-sm text-[var(--ink-dim)]">
            Loading your contributions...
          </p>
        </div>
      </div>
    );
  }

  /*
   * ---------------------------------------------------------
   * ERROR
   * ---------------------------------------------------------
   */

  if (error) {
    return (
      <div className="border border-red-200 rounded-2xl bg-[rgba(239,68,68,0.03)] overflow-hidden">
        <div className="px-5 py-4 flex items-center gap-3">
          <XCircle
            size={18}
            className="text-red-500 shrink-0"
          />

          <p className="text-sm text-red-600">
            {error}
          </p>
        </div>
      </div>
    );
  }

  /*
   * ---------------------------------------------------------
   * TAB CONFIG
   * ---------------------------------------------------------
   */

  const tabs: {
    id: Tab;
    label: string;
    count: number;
    icon: React.ReactNode;
  }[] = [
    {
      id: 'pending',
      label: 'Under Review',
      count: pending.length,
      icon: <Clock3 size={15} />,
    },
    {
      id: 'reviewed',
      label: 'Reviewed',
      count: reviewed.length,
      icon: <CheckCircle2 size={15} />,
    },
    {
      id: 'rejected',
      label: 'Rejected',
      count: rejected.length,
      icon: <XCircle size={15} />,
    },
    {
      id: 'frozen',
      label: 'Frozen',
      count: frozen.length,
      icon: <Lock size={15} />,
    },
  ];

  /*
   * ---------------------------------------------------------
   * EMPTY MESSAGE
   * ---------------------------------------------------------
   */

  const emptyMessage = {
    pending:
      'No contributions are currently under review.',
    reviewed:
      'No reviewed contributions yet.',
    rejected:
      'No contributions have been rejected.',
    frozen:
      'No contributions have been frozen.',
  }[activeTab];

  /*
   * ---------------------------------------------------------
   * MAIN UI
   * ---------------------------------------------------------
   */

  return (
    <div className="w-full">
      {/* ---------------------------------------------------
          SUMMARY HEADER
          --------------------------------------------------- */}

      <div className="border border-[var(--border)] rounded-2xl bg-[var(--bg)] overflow-hidden">
        <div className="px-5 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="
                w-9
                h-9
                rounded-lg
                bg-[var(--peach)]
                flex
                items-center
                justify-center
                shrink-0
              "
            >
              <ClipboardList
                size={17}
                className="text-[var(--peach-ink)]"
              />
            </div>

            <div className="min-w-0">
              <p className="text-sm font-semibold text-[var(--ink)]">
                My Contributions
              </p>

              <p className="text-xs text-[var(--ink-dim)] mt-0.5">
                Your submitted work and review status
              </p>
            </div>
          </div>

          <div
            className="
              shrink-0
              min-w-8
              h-7
              px-2.5
              rounded-full
              bg-[var(--peach)]
              text-[var(--peach-ink)]
              text-xs
              font-semibold
              flex
              items-center
              justify-center
            "
          >
            {totalCount}
          </div>
        </div>

        {/* -------------------------------------------------
            SMALL SUMMARY STRIP
            ------------------------------------------------- */}

        <div className="border-t border-[var(--border)] grid grid-cols-4">
          <div className="px-4 py-3 border-r border-[var(--border)]">
            <p className="text-[11px] text-[var(--ink-dim)]">
              Under Review
            </p>

            <p className="font-display text-lg text-[var(--peach-ink)] mt-0.5">
              {pending.length}
            </p>
          </div>

          <div className="px-4 py-3 border-r border-[var(--border)]">
            <p className="text-[11px] text-[var(--ink-dim)]">
              Reviewed
            </p>

            <p className="font-display text-lg text-[var(--mint-ink)] mt-0.5">
              {reviewed.length}
            </p>
          </div>

          <div className="px-4 py-3 border-r border-[var(--border)]">
            <p className="text-[11px] text-[var(--ink-dim)]">
              Rejected
            </p>

            <p className="font-display text-lg text-red-500 mt-0.5">
              {rejected.length}
            </p>
          </div>

          <div className="px-4 py-3">
            <p className="text-[11px] text-[var(--ink-dim)]">
              Frozen
            </p>

            <p className="font-display text-lg text-[var(--lavender-ink)] mt-0.5">
              {frozen.length}
            </p>
          </div>
        </div>
      </div>

      {/* ---------------------------------------------------
          TABS
          --------------------------------------------------- */}

      <div className="mt-4 border-b border-[var(--border)]">
        <div className="flex items-center gap-1 overflow-x-auto">
          {tabs.map((tab) => {
            const active = activeTab === tab.id;

            const activeClasses =
              tab.id === 'pending'
                ? 'text-[var(--peach-ink)] border-[var(--peach-ink)]'
                : tab.id === 'reviewed'
                  ? 'text-[var(--mint-ink)] border-[var(--mint-ink)]'
                  : tab.id === 'rejected'
                    ? 'text-red-600 border-red-500'
                    : 'text-[var(--lavender-ink)] border-[var(--lavender-ink)]';

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setActiveTab(tab.id);
                  setExpandedId(null);
                }}
                className={`
                  relative
                  px-4
                  py-3
                  -mb-px
                  border-b-2
                  text-sm
                  font-medium
                  inline-flex
                  items-center
                  gap-2
                  whitespace-nowrap
                  transition-colors
                  cursor-pointer
                  ${
                    active
                      ? activeClasses
                      : 'border-transparent text-[var(--ink-dim)] hover:text-[var(--ink)]'
                  }
                `}
              >
                {tab.icon}

                {tab.label}

                {tab.count > 0 && (
                  <span
                    className={`
                      text-[10px]
                      font-semibold
                      px-1.5
                      py-0.5
                      rounded-full
                      ${
                        tab.id === 'pending'
                          ? 'bg-[var(--peach)] text-[var(--peach-ink)]'
                          : tab.id === 'reviewed'
                            ? 'bg-[var(--mint)] text-[var(--mint-ink)]'
                            : tab.id === 'rejected'
                              ? 'bg-red-100 text-red-600'
                              : 'bg-[var(--lavender)] text-[var(--lavender-ink)]'
                      }
                    `}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ---------------------------------------------------
          CONTENT
          --------------------------------------------------- */}

      <div className="mt-4">
        {visibleContributions.length === 0 ? (
          <div
            className="
              border
              border-[var(--border)]
              rounded-2xl
              bg-[var(--bg)]
              px-6
              py-12
              text-center
            "
          >
            <div
              className="
                w-11
                h-11
                mx-auto
                rounded-full
                bg-[var(--surface)]
                border
                border-[var(--border)]
                flex
                items-center
                justify-center
                mb-3
              "
            >
              {activeTab === 'pending' && (
                <Clock3
                  size={19}
                  className="text-[var(--peach-ink)]"
                />
              )}

              {activeTab === 'reviewed' && (
                <CheckCircle2
                  size={19}
                  className="text-[var(--mint-ink)]"
                />
              )}

              {activeTab === 'rejected' && (
                <XCircle
                  size={19}
                  className="text-red-500"
                />
              )}

              {activeTab === 'frozen' && (
                <Lock
                  size={19}
                  className="text-[var(--lavender-ink)]"
                />
              )}
            </div>

            <p className="text-sm font-medium text-[var(--ink)]">
              {emptyMessage}
            </p>

            <p className="text-xs text-[var(--ink-dim)] mt-1">
              {activeTab === 'pending'
                ? 'You’ll see your submitted work here while the club reviews it.'
                : activeTab === 'reviewed'
                  ? 'Verified contributions will appear here with their score and reviewer.'
                  : activeTab === 'rejected'
                    ? 'Rejected submissions will remain visible here for your reference.'
                    : 'Frozen scores are final and cannot be changed.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {visibleContributions.map(
              (contribution) => {
                const expanded =
                  expandedId === contribution.id;

                return (
                  <div
                    key={contribution.id}
                    className="
                      border
                      border-[var(--border)]
                      rounded-2xl
                      bg-[var(--bg)]
                      overflow-hidden
                      transition-shadow
                      hover:shadow-sm
                    "
                  >
                    {/* Main contribution row */}

                    <button
                      type="button"
                      onClick={() =>
                        setExpandedId(
                          expanded
                            ? null
                            : contribution.id
                        )
                      }
                      className="
                        w-full
                        text-left
                        px-5
                        py-4
                        flex
                        items-center
                        gap-4
                        cursor-pointer
                      "
                    >
                      {/* Status indicator */}

                      <div
                        className={`
                          w-9
                          h-9
                          rounded-lg
                          flex
                          items-center
                          justify-center
                          shrink-0
                          ${
                            activeTab === 'pending'
                              ? 'bg-[var(--peach)] text-[var(--peach-ink)]'
                              : activeTab === 'reviewed'
                                ? 'bg-[var(--mint)] text-[var(--mint-ink)]'
                                : activeTab === 'rejected'
                                  ? 'bg-red-100 text-red-500'
                                  : 'bg-[var(--lavender)] text-[var(--lavender-ink)]'
                          }
                        `}
                      >
                        {activeTab ===
                          'pending' && (
                          <Clock3 size={17} />
                        )}

                        {activeTab ===
                          'reviewed' && (
                          <CheckCircle2
                            size={17}
                          />
                        )}

                        {activeTab ===
                          'rejected' && (
                          <XCircle size={17} />
                        )}

                        {activeTab ===
                          'frozen' && (
                          <Lock size={17} />
                        )}
                      </div>

                      {/* Text */}

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium text-sm text-[var(--ink)] truncate">
                            {contribution.title}
                          </p>

                          {contribution.skills
                            ?.name && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--surface)] border border-[var(--border)] text-[var(--ink-dim)]">
                              {
                                contribution
                                  .skills.name
                              }
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 mt-1">
                          {activeTab ===
                            'pending' && (
                            <span className="text-xs text-[var(--peach-ink)]">
                              Awaiting review
                            </span>
                          )}

                          {activeTab ===
                            'reviewed' && (
                            <span className="text-xs text-[var(--mint-ink)]">
                              Verified
                            </span>
                          )}

                          {activeTab ===
                            'rejected' && (
                            <span className="text-xs text-red-500">
                              Not verified
                            </span>
                          )}

                          {activeTab ===
                            'frozen' && (
                            <span className="text-xs text-[var(--lavender-ink)]">
                              Final score
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Score */}

                      {(activeTab ===
                        'reviewed' ||
                        activeTab ===
                          'frozen') &&
                        contribution.score !==
                          null && (
                          <div className="text-right shrink-0">
                            <p className="font-display text-lg text-[var(--ink)]">
                              {contribution.score}
                            </p>

                            <p className="text-[10px] text-[var(--ink-dim)]">
                              / 100
                            </p>
                          </div>
                        )}

                      {/* Expand icon */}

                      <div className="shrink-0 text-[var(--ink-dim)]">
                        {expanded ? (
                          <ChevronUp size={17} />
                        ) : (
                          <ChevronDown size={17} />
                        )}
                      </div>
                    </button>

                    {/* -------------------------------------------------
                        EXPANDED DETAILS
                        ------------------------------------------------- */}

                    {expanded && (
                      <div className="border-t border-[var(--border)] px-5 py-4">
                        {/* Description */}

                        {contribution.description ? (
                          <p className="text-sm text-[var(--ink)] leading-6">
                            {
                              contribution.description
                            }
                          </p>
                        ) : (
                          <p className="text-sm text-[var(--ink-dim)] italic">
                            No description provided.
                          </p>
                        )}

                        {/* Submitted file */}

                        {contribution.file_url && (
                          <a
                            href={
                              contribution.file_url
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                            className="
                              mt-3
                              inline-flex
                              items-center
                              gap-1.5
                              text-xs
                              text-[var(--peach-ink)]
                              hover:underline
                            "
                          >
                            <Paperclip
                              size={13}
                            />
                            View submitted file
                          </a>
                        )}

                        {/* -------------------------------------------------
                            REVIEW INFORMATION
                            ------------------------------------------------- */}

                        {activeTab ===
                          'reviewed' && (
                          <div className="mt-4 pt-3 border-t border-[var(--border)]">
                            <p className="text-xs text-[var(--ink-dim)]">
                              Reviewed by
                            </p>

                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-sm font-medium text-[var(--ink)]">
                                {contribution
                                  .verifier
                                  ?.name ??
                                  'Unknown'}
                              </span>

                              {contribution.verified_by_role && (
                                <span className="text-[11px] px-2 py-0.5 rounded-full bg-[var(--mint)] text-[var(--mint-ink)]">
                                  {getRoleLabel(
                                    contribution.verified_by_role
                                  )}
                                </span>
                              )}
                            </div>
                          </div>
                        )}

                        {/* -------------------------------------------------
                            FROZEN INFORMATION
                            ------------------------------------------------- */}

                        {activeTab ===
                          'frozen' && (
                          <div className="mt-4 pt-3 border-t border-[var(--border)] space-y-2">
                            <div>
                              <p className="text-xs text-[var(--ink-dim)]">
                                Originally reviewed by
                              </p>

                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-sm font-medium text-[var(--ink)]">
                                  {contribution
                                    .verifier
                                    ?.name ??
                                    'Unknown'}
                                </span>

                                {contribution.verified_by_role && (
                                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-[var(--mint)] text-[var(--mint-ink)]">
                                    {getRoleLabel(
                                      contribution.verified_by_role
                                    )}
                                  </span>
                                )}
                              </div>
                            </div>

                            <div>
                              <p className="text-xs text-[var(--ink-dim)]">
                                Frozen by
                              </p>

                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-sm font-medium text-[var(--ink)]">
                                  {contribution
                                    .freezer
                                    ?.name ??
                                    'Unknown'}
                                </span>

                                {contribution.frozen_by_role && (
                                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-[var(--lavender)] text-[var(--lavender-ink)]">
                                    {getRoleLabel(
                                      contribution.frozen_by_role
                                    )}
                                  </span>
                                )}
                              </div>
                            </div>

                            <p className="text-xs text-[var(--lavender-ink)] font-medium pt-1">
                              This score is permanently
                              frozen.
                            </p>
                          </div>
                        )}

                        {/* -------------------------------------------------
                            REJECTED INFORMATION
                            ------------------------------------------------- */}

                        {activeTab ===
                          'rejected' && (
                          <div className="mt-4 pt-3 border-t border-[var(--border)]">
                            <p className="text-xs text-red-500">
                              This contribution was not
                              verified by the club.
                            </p>
                          </div>
                        )}

                        {/* -------------------------------------------------
                            PENDING INFORMATION
                            ------------------------------------------------- */}

                        {activeTab ===
                          'pending' && (
                          <div className="mt-4 pt-3 border-t border-[var(--border)]">
                            <div className="flex items-center gap-2 text-xs text-[var(--peach-ink)]">
                              <Clock3 size={13} />
                              <span>
                                Waiting for the club
                                to review your
                                submission.
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              }
            )}
          </div>
        )}
      </div>
    </div>
  );
}