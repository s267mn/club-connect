'use client';

import {
  useEffect,
  useState,
} from 'react';

import { supabase } from '@/lib/supabase';

import {
  ClipboardCheck,
  Paperclip,
  Check,
  X,
  Lock,
} from 'lucide-react';

import { ROLE_LABELS } from '@/components/FacultyReview';
import ConfirmDialog from '@/components/ConfirmDialog';

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

  users: {
    name: string;
    email: string;
  } | null;

  skills: {
    name: string;
  } | null;
};

type Tab =
  | 'pending'
  | 'verified'
  | 'rejected';

type PendingAction =
  | {
      type: 'verify';
      contributionId: string;
      score: number;
    }
  | {
      type: 'reject';
      contributionId: string;
    }
  | null;

type VerifyContributionsProps = {
  clubId: string;
  initialTab?: Tab;
};

export default function VerifyContributions({
  clubId,
  initialTab,
}: VerifyContributionsProps) {
  const [
    contributions,
    setContributions,
  ] = useState<Contribution[]>(
    []
  );

  const [scores, setScores] =
    useState<
      Record<string, string>
    >({});

  const [
    processingIds,
    setProcessingIds,
  ] = useState<string[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [
    activeTab,
    setActiveTab,
  ] = useState<Tab>(
    initialTab ?? 'pending'
  );

  const [myRole, setMyRole] =
    useState<string | null>(
      null
    );

  const [error, setError] =
    useState('');

  const [
    pendingAction,
    setPendingAction,
  ] = useState<PendingAction>(
    null
  );

  /*
   * IMPORTANT:
   *
   * When Club Management is opened from a
   * notification, it passes initialTab="pending".
   *
   * This makes the correct tab open automatically.
   */
  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  /*
   * --------------------------------------------------
   * LOAD CONTRIBUTIONS
   * --------------------------------------------------
   */

  const loadAll = async () => {
    setLoading(true);
    setError('');

    const {
      data: sessionData,
    } =
      await supabase.auth.getSession();

    const uid =
      sessionData.session?.user.id;

    if (!uid) {
      setMyRole(null);
      setContributions([]);
      setLoading(false);
      return;
    }

    /*
     * Verify that current user is the
     * Lead/admin for this club.
     */
    const {
      data: memberRow,
      error: memberError,
    } = await supabase
      .from('club_members')
      .select('role')
      .eq('club_id', clubId)
      .eq('user_id', uid)
      .maybeSingle();

    if (memberError) {
      console.error(
        'Failed to load club membership:',
        memberError
      );
    }

    const currentRole =
      memberRow?.role ?? null;

    setMyRole(currentRole);

    /*
     * Lead verification stage.
     */
    if (
      currentRole !== 'admin'
    ) {
      setContributions([]);
      setLoading(false);
      return;
    }

    /*
     * Load contributions.
     */
    const {
      data,
      error: contributionError,
    } = await supabase
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
          frozen_by_role
        `
      )
      .eq('club_id', clubId)
      .in('status', [
        'pending',
        'verified',
        'rejected',
      ])
      .order(
        'created_at',
        {
          ascending: false,
        }
      );

    if (contributionError) {
      console.error(
        'Error loading contributions:',
        JSON.stringify(
          contributionError,
          null,
          2
        )
      );

      setError(
        contributionError.message ||
          'Could not load contributions.'
      );

      setContributions([]);
      setLoading(false);
      return;
    }

    const rows =
      (data ?? []) as Array<{
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
      }>;

    /*
     * Collect user IDs.
     */
    const userIds =
      Array.from(
        new Set(
          rows.flatMap(
            (row) =>
              [
                row.user_id,
                row.verified_by,
                row.frozen_by,
              ].filter(
                Boolean
              ) as string[]
          )
        )
      );

    /*
     * Collect skill IDs.
     */
    const skillIds =
      Array.from(
        new Set(
          rows
            .map(
              (row) =>
                row.skill_id
            )
            .filter(
              Boolean
            ) as string[]
        )
      );

    const usersById =
      new Map<
        string,
        {
          name: string;
          email: string;
        }
      >();

    const skillsById =
      new Map<
        string,
        {
          name: string;
        }
      >();

    /*
     * Load users.
     */
    if (userIds.length > 0) {
      const {
        data: users,
        error: usersError,
      } = await supabase
        .from('users')
        .select(
          'id, name, email'
        )
        .in(
          'id',
          userIds
        );

      if (usersError) {
        console.error(
          'Failed to load contribution users:',
          usersError
        );
      }

      for (
        const user of
        users ?? []
      ) {
        usersById.set(
          user.id,
          {
            name: user.name,
            email: user.email,
          }
        );
      }
    }

    /*
     * Load skills.
     */
    if (skillIds.length > 0) {
      const {
        data: skills,
        error: skillsError,
      } = await supabase
        .from('skills')
        .select(
          'id, name'
        )
        .in(
          'id',
          skillIds
        );

      if (skillsError) {
        console.error(
          'Failed to load contribution skills:',
          skillsError
        );
      }

      for (
        const skill of
        skills ?? []
      ) {
        skillsById.set(
          skill.id,
          {
            name: skill.name,
          }
        );
      }
    }

    /*
     * Hydrate contributions.
     */
    const hydrated: Contribution[] =
      rows.map(
        (row) => ({
          id: row.id,
          title: row.title,
          description:
            row.description,
          file_url:
            row.file_url,
          user_id:
            row.user_id,
          skill_id:
            row.skill_id,
          status:
            row.status,
          score:
            row.score,
          is_frozen:
            row.is_frozen,

          verified_by:
            row.verified_by,

          verified_by_role:
            row.verified_by_role,

          frozen_by:
            row.frozen_by,

          frozen_by_role:
            row.frozen_by_role,

          users:
            usersById.get(
              row.user_id
            ) ?? null,

          skills:
            row.skill_id
              ? skillsById.get(
                  row.skill_id
                ) ?? null
              : null,

          verifier:
            row.verified_by
              ? usersById.get(
                  row.verified_by
                ) ?? null
              : null,

          freezer:
            row.frozen_by
              ? usersById.get(
                  row.frozen_by
                ) ?? null
              : null,
        })
      );

    setContributions(
      hydrated
    );

    setLoading(false);
  };

  useEffect(() => {
    loadAll();
  }, [clubId]);

  /*
   * --------------------------------------------------
   * ACTION REQUESTS
   * --------------------------------------------------
   */

  const requestVerify = (
    contributionId: string
  ) => {
    const score =
      Number.parseInt(
        scores[
          contributionId
        ] ?? '',
        10
      );

    if (
      Number.isNaN(score) ||
      score < 0 ||
      score > 100
    ) {
      setError(
        'Please enter a valid score between 0 and 100.'
      );
      return;
    }

    const contribution =
      contributions.find(
        (c) =>
          c.id ===
          contributionId
      );

    if (!contribution) {
      setError(
        'Contribution could not be found.'
      );
      return;
    }

    if (
      contribution.status !==
      'pending'
    ) {
      setError(
        'This contribution is no longer pending.'
      );
      return;
    }

    if (
      contribution.is_frozen
    ) {
      setError(
        'This contribution is already frozen and cannot be changed.'
      );
      return;
    }

    setError('');

    setPendingAction({
      type: 'verify',
      contributionId,
      score,
    });
  };

  const requestReject = (
    contributionId: string
  ) => {
    const contribution =
      contributions.find(
        (c) =>
          c.id ===
          contributionId
      );

    if (!contribution) {
      setError(
        'Contribution could not be found.'
      );
      return;
    }

    if (
      contribution.status !==
      'pending'
    ) {
      setError(
        'This contribution is no longer pending.'
      );
      return;
    }

    if (
      contribution.is_frozen
    ) {
      setError(
        'This contribution is frozen and cannot be changed.'
      );
      return;
    }

    setError('');

    setPendingAction({
      type: 'reject',
      contributionId,
    });
  };

  /*
   * --------------------------------------------------
   * PROCESSING
   * --------------------------------------------------
   */

  const addProcessing = (
    id: string
  ) => {
    setProcessingIds(
      (previous) =>
        previous.includes(id)
          ? previous
          : [
              ...previous,
              id,
            ]
    );
  };

  const removeProcessing = (
    id: string
  ) => {
    setProcessingIds(
      (previous) =>
        previous.filter(
          (item) =>
            item !== id
        )
    );
  };

  /*
   * --------------------------------------------------
   * VERIFY
   * --------------------------------------------------
   */

  const runVerify = async (
    contributionId: string,
    score: number
  ) => {
    const contribution =
      contributions.find(
        (c) =>
          c.id ===
          contributionId
      );

    if (!contribution) {
      setPendingAction(null);
      return;
    }

    if (
      contribution.status !==
      'pending'
    ) {
      setError(
        'This contribution is no longer pending.'
      );
      setPendingAction(null);
      return;
    }

    if (
      contribution.is_frozen
    ) {
      setError(
        'This contribution is already frozen and cannot be changed.'
      );
      setPendingAction(null);
      return;
    }

    const {
      data: sessionData,
    } =
      await supabase.auth.getSession();

    const uid =
      sessionData.session?.user.id;

    if (!uid) {
      setError(
        'Session expired. Please log in again.'
      );
      setPendingAction(null);
      return;
    }

    setError('');
    addProcessing(
      contributionId
    );

    const {
      error: updateError,
    } = await supabase
      .from('contributions')
      .update({
        status: 'verified',
        score,
        verified_by: uid,
        verified_by_role:
          'admin',
      })
      .eq(
        'id',
        contributionId
      )
      .eq(
        'club_id',
        clubId
      )
      .eq(
        'status',
        'pending'
      )
      .eq(
        'is_frozen',
        false
      );

    if (updateError) {
      console.error(
        'Failed to verify contribution:',
        updateError
      );

      setError(
        'Could not verify this contribution. It may have already been processed.'
      );

      removeProcessing(
        contributionId
      );

      setPendingAction(null);
      return;
    }

    /*
     * Log score change.
     */
    const {
      error: logError,
    } = await supabase
      .from(
        'score_change_log'
      )
      .insert({
        contribution_id:
          contributionId,
        old_score:
          contribution.score,
        new_score:
          score,
        changed_by:
          uid,
        changed_by_role:
          'admin',
      });

    if (logError) {
      console.error(
        'Failed to write score_change_log:',
        logError
      );
    }

    /*
     * Notify student.
     */
    const {
      error: notificationError,
    } = await supabase
      .from(
        'notifications'
      )
      .insert({
        user_id:
          contribution.user_id,

        message: `Your contribution "${contribution.title}" was verified with a score of ${score}/100.`,

        activity_type:
          'contribution_verified',

        club_id:
          clubId,

        contribution_id:
          contributionId,

        actor_id:
          uid,
      });

    if (notificationError) {
      console.error(
        'Failed to notify student:',
        notificationError
      );
    }

    setScores(
      (previous) => {
        const next = {
          ...previous,
        };

        delete next[
          contributionId
        ];

        return next;
      }
    );

    removeProcessing(
      contributionId
    );

    setPendingAction(null);

    await loadAll();
  };

  /*
   * --------------------------------------------------
   * REJECT
   * --------------------------------------------------
   */

  const runReject = async (
    contributionId: string
  ) => {
    const contribution =
      contributions.find(
        (c) =>
          c.id ===
          contributionId
      );

    if (!contribution) {
      setPendingAction(null);
      return;
    }

    if (
      contribution.status !==
      'pending'
    ) {
      setError(
        'This contribution is no longer pending.'
      );
      setPendingAction(null);
      return;
    }

    if (
      contribution.is_frozen
    ) {
      setError(
        'This contribution is frozen and cannot be changed.'
      );
      setPendingAction(null);
      return;
    }

    const {
      data: sessionData,
    } =
      await supabase.auth.getSession();

    const uid =
      sessionData.session?.user.id;

    if (!uid) {
      setError(
        'Session expired. Please log in again.'
      );
      setPendingAction(null);
      return;
    }

    setError('');
    addProcessing(
      contributionId
    );

    const {
      error: updateError,
    } = await supabase
      .from('contributions')
      .update({
        status: 'rejected',
      })
      .eq(
        'id',
        contributionId
      )
      .eq(
        'club_id',
        clubId
      )
      .eq(
        'status',
        'pending'
      )
      .eq(
        'is_frozen',
        false
      );

    if (updateError) {
      console.error(
        'Failed to reject contribution:',
        updateError
      );

      setError(
        'Could not reject this contribution. It may have already been processed.'
      );

      removeProcessing(
        contributionId
      );

      setPendingAction(null);
      return;
    }

    /*
     * Notify student.
     */
    const {
      error: notificationError,
    } = await supabase
      .from(
        'notifications'
      )
      .insert({
        user_id:
          contribution.user_id,

        message: `Your contribution "${contribution.title}" was not verified.`,

        activity_type:
          'contribution_rejected',

        club_id:
          clubId,

        contribution_id:
          contributionId,

        actor_id:
          uid,
      });

    if (notificationError) {
      console.error(
        'Failed to notify student:',
        notificationError
      );
    }

    setScores(
      (previous) => {
        const next = {
          ...previous,
        };

        delete next[
          contributionId
        ];

        return next;
      }
    );

    removeProcessing(
      contributionId
    );

    setPendingAction(null);

    await loadAll();
  };

  /*
   * --------------------------------------------------
   * CONFIRM
   * --------------------------------------------------
   */

  const handleConfirm =
    () => {
      if (!pendingAction) {
        return;
      }

      if (
        pendingAction.type ===
        'verify'
      ) {
        runVerify(
          pendingAction.contributionId,
          pendingAction.score
        );

        return;
      }

      runReject(
        pendingAction.contributionId
      );
    };

  /*
   * --------------------------------------------------
   * LOADING / ACCESS
   * --------------------------------------------------
   */

  if (loading) {
    return (
      <div className="text-sm text-[var(--ink-dim)]">
        Loading contributions...
      </div>
    );
  }

  if (
    myRole !== 'admin'
  ) {
    return null;
  }

  /*
   * --------------------------------------------------
   * TABS
   * --------------------------------------------------
   */

  const pending =
    contributions.filter(
      (contribution) =>
        contribution.status ===
        'pending'
    );

  const verified =
    contributions.filter(
      (contribution) =>
        contribution.status ===
        'verified'
    );

  const rejected =
    contributions.filter(
      (contribution) =>
        contribution.status ===
        'rejected'
    );

  const visible =
    activeTab ===
    'pending'
      ? pending
      : activeTab ===
          'verified'
        ? verified
        : rejected;

  return (
    <div className="mb-8 fade-up w-full">
      {/* Header */}
      <div className="card w-full p-4 mb-3">
        <div className="flex items-center gap-2">
          <ClipboardCheck
            className="text-[var(--peach-ink)]"
            size={18}
          />

          <span className="text-sm font-semibold text-[var(--ink-dim)] uppercase tracking-wide">
            Contribution Review
          </span>

          {pending.length >
          0 ? (
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[var(--peach)] text-[var(--peach-ink)]">
              {
                pending.length
              }{' '}
              to review
            </span>
          ) : (
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[var(--mint)] text-[var(--mint-ink)]">
              All caught up
            </span>
          )}
        </div>

        {error && (
          <p className="text-sm text-red-600 mt-3">
            {error}
          </p>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-4 border-b border-[var(--border)]">
        <button
          type="button"
          onClick={() =>
            setActiveTab(
              'pending'
            )
          }
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors cursor-pointer inline-flex items-center gap-2 ${
            activeTab ===
            'pending'
              ? 'border-[var(--peach-ink)] text-[var(--peach-ink)]'
              : 'border-transparent text-[var(--ink-dim)] hover:text-[var(--ink)]'
          }`}
        >
          Pending

          {pending.length >
            0 && (
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-[var(--peach)] text-[var(--peach-ink)]">
              {
                pending.length
              }
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() =>
            setActiveTab(
              'verified'
            )
          }
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors cursor-pointer inline-flex items-center gap-2 ${
            activeTab ===
            'verified'
              ? 'border-[var(--mint-ink)] text-[var(--mint-ink)]'
              : 'border-transparent text-[var(--ink-dim)] hover:text-[var(--ink)]'
          }`}
        >
          Verified

          {verified.length >
            0 && (
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-[var(--mint)] text-[var(--mint-ink)]">
              {
                verified.length
              }
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() =>
            setActiveTab(
              'rejected'
            )
          }
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors cursor-pointer inline-flex items-center gap-2 ${
            activeTab ===
            'rejected'
              ? 'border-red-500 text-red-600'
              : 'border-transparent text-[var(--ink-dim)] hover:text-[var(--ink)]'
          }`}
        >
          Rejected

          {rejected.length >
            0 && (
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-red-100 text-red-700">
              {
                rejected.length
              }
            </span>
          )}
        </button>
      </div>

      {/* Empty state */}
      {visible.length ===
        0 && (
        <p className="text-sm text-[var(--ink-dim)] text-center py-6">
          {activeTab ===
            'pending' &&
            'No pending contributions right now — nice and quiet.'}

          {activeTab ===
            'verified' &&
            'Nothing verified yet.'}

          {activeTab ===
            'rejected' &&
            'Nothing rejected.'}
        </p>
      )}

      {/* Contributions */}
      <div className="space-y-3">
        {visible.map(
          (contribution) => {
            const isProcessing =
              processingIds.includes(
                contribution.id
              );

            return (
              <div
                key={
                  contribution.id
                }
                className="card p-5"
              >
                {/* Title */}
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-medium text-sm">
                    {
                      contribution.title
                    }
                  </p>

                  {contribution.is_frozen && (
                    <span className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full bg-[var(--lavender)] text-[var(--lavender-ink)] inline-flex items-center gap-1">
                      <Lock
                        size={10}
                      />
                      Frozen
                    </span>
                  )}
                </div>

                {/* Student / skill */}
                <p className="text-xs text-[var(--ink-dim)] mt-0.5 mb-2">
                  {
                    contribution
                      .users
                      ?.name ??
                    'Student'
                  }

                  {contribution.skills
                    ?.name
                    ? ` · ${contribution.skills.name}`
                    : ''}
                </p>

                {/* Description */}
                {contribution.description && (
                  <p className="text-sm text-[var(--ink)] mb-2">
                    {
                      contribution.description
                    }
                  </p>
                )}

                {/* Attachment */}
                {contribution.file_url && (
                  <a
                    href={
                      contribution.file_url
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-[var(--peach-ink)] hover:underline inline-flex items-center gap-1 mb-2"
                  >
                    <Paperclip
                      size={12}
                    />
                    View submitted
                    file
                  </a>
                )}

                {/* Pending controls */}
                {activeTab ===
                  'pending' && (
                  <div className="flex gap-2 items-center mt-3">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      placeholder="0-100"
                      value={
                        scores[
                          contribution.id
                        ] ?? ''
                      }
                      onChange={(
                        event
                      ) =>
                        setScores(
                          (
                            previous
                          ) => ({
                            ...previous,
                            [contribution.id]:
                              event
                                .target
                                .value,
                          })
                        )
                      }
                      disabled={
                        isProcessing
                      }
                      className="w-20 p-2 bg-transparent border border-[var(--border)] rounded-lg text-sm focus:border-[var(--peach-ink)] focus:outline-none disabled:opacity-50"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        requestVerify(
                          contribution.id
                        )
                      }
                      disabled={
                        isProcessing
                      }
                      className="btn-primary px-3 py-1.5 text-sm inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
                    >
                      <Check
                        size={14}
                      />
                      Verify
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        requestReject(
                          contribution.id
                        )
                      }
                      disabled={
                        isProcessing
                      }
                      className="btn-ghost px-3 py-1.5 text-sm inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
                    >
                      <X
                        size={14}
                      />
                      Reject
                    </button>
                  </div>
                )}

                {/* Verified information */}
                {activeTab ===
                  'verified' && (
                  <div className="mt-2 pt-2 border-t border-[var(--border)] text-xs text-[var(--ink-dim)] space-y-1">
                    <p>
                      <span className="font-semibold text-[var(--ink)]">
                        {
                          contribution.score ??
                          '—'
                        }
                      </span>{' '}
                      pts · Verified by{' '}
                      <span className="font-medium text-[var(--ink)]">
                        {
                          contribution
                            .verifier
                            ?.name ??
                          'Unknown'
                        }
                      </span>

                      {contribution.verified_by_role &&
                        ` (${
                          ROLE_LABELS[
                            contribution
                              .verified_by_role
                          ] ??
                          contribution.verified_by_role
                        })`}
                    </p>

                    {contribution.is_frozen && (
                      <p>
                        Frozen by{' '}
                        <span className="font-medium text-[var(--ink)]">
                          {
                            contribution
                              .freezer
                              ?.name ??
                            'Unknown'
                          }
                        </span>

                        {contribution.frozen_by_role &&
                          ` (${
                            ROLE_LABELS[
                              contribution
                                .frozen_by_role
                            ] ??
                            contribution.frozen_by_role
                          })`}
                      </p>
                    )}
                  </div>
                )}

                {/* Rejected information */}
                {activeTab ===
                  'rejected' && (
                  <p className="mt-2 pt-2 border-t border-[var(--border)] text-xs text-[var(--ink-dim)]">
                    Not verified.
                  </p>
                )}
              </div>
            );
          }
        )}
      </div>

      {/* Confirmation dialog */}
      <ConfirmDialog
        open={
          pendingAction !==
          null
        }
        submitting={
          pendingAction !==
            null &&
          processingIds.includes(
            pendingAction.contributionId
          )
        }
        title={
          pendingAction?.type ===
          'verify'
            ? 'Verify this contribution?'
            : 'Reject this contribution?'
        }
        message={
          pendingAction?.type ===
          'verify'
            ? `This will verify the contribution with a score of ${pendingAction.score}/100. The student will be notified, and the contribution will move to the Faculty review stage.`
            : 'This will reject the contribution and notify the student. Make sure you have reviewed the submitted work before continuing.'
        }
        confirmLabel={
          pendingAction?.type ===
          'verify'
            ? 'Verify contribution'
            : 'Reject contribution'
        }
        variant={
          pendingAction?.type ===
          'reject'
            ? 'destructive'
            : 'neutral'
        }
        onConfirm={
          handleConfirm
        }
        onCancel={() => {
          if (
            !pendingAction ||
            !processingIds.includes(
              pendingAction.contributionId
            )
          ) {
            setPendingAction(
              null
            );
          }
        }}
      />
    </div>
  );
}