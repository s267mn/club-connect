'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import {
  GraduationCap,
  Lock,
  Pencil,
  CheckSquare,
  Square,
  ChevronDown,
  ChevronUp,
  Paperclip,
} from 'lucide-react';

import ConfirmDialog from './ConfirmDialog';

type ScoredContribution = {
  id: string;
  title: string;
  description: string | null;
  file_url: string | null;
  score: number;
  is_frozen: boolean;

  verified_by: string | null;
  verified_by_role: string | null;

  frozen_by: string | null;
  frozen_by_role: string | null;

  user_id: string;

  users: {
    name: string;
    email: string;
  } | null;

  skills: {
    name: string;
  } | null;

  verifier: {
    name: string;
  } | null;

  freezer: {
    name: string;
  } | null;
};

export const ROLE_LABELS: Record<string, string> = {
  member: 'Member',
  admin: 'Lead',
  faculty: 'Faculty Advisor',
  founder_fallback: 'Club Founder',
};

type AccessResult = {
  uid: string;
  facultyTier: boolean;
  actualRole: string;
};

type PendingAction =
  | {
      type: 'overwrite';
      contributionId: string;
      newScore: number;
    }
  | {
      type: 'freeze';
      contributionIds: string[];
    }
  | null;

export default function FacultyReview({
  clubId,
}: {
  clubId: string;
}) {
  const [authUserId, setAuthUserId] =
    useState<string | null>(null);

  const [isFacultyTier, setIsFacultyTier] =
    useState(false);

  const [myActualRole, setMyActualRole] =
    useState('faculty');

  const [contributions, setContributions] =
    useState<ScoredContribution[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [editingId, setEditingId] =
    useState<string | null>(null);

  const [expandedId, setExpandedId] =
    useState<string | null>(null);

  const [draftScore, setDraftScore] =
    useState('');

  const [selectedIds, setSelectedIds] =
    useState<string[]>([]);

  const [processing, setProcessing] =
    useState(false);

  const [activeTab, setActiveTab] =
    useState<'pending' | 'frozen'>('pending');

  const [error, setError] =
    useState('');

  const [pendingAction, setPendingAction] =
    useState<PendingAction>(null);

  /*
   * --------------------------------------------------
   * ACCESS CONTROL
   * --------------------------------------------------
   */

  const checkAccess =
    async (): Promise<AccessResult | null> => {
      const {
        data: sessionData,
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        console.error(
          'Failed to get session:',
          sessionError
        );
        return null;
      }

      const uid =
        sessionData.session?.user.id;

      if (!uid) {
        return null;
      }

      /*
       * First check whether the user is an actual
       * Faculty Advisor for this club.
       */
      const {
        data: membership,
        error: membershipError,
      } = await supabase
        .from('club_members')
        .select('role')
        .eq('club_id', clubId)
        .eq('user_id', uid)
        .maybeSingle();

      if (membershipError) {
        console.error(
          'Failed to check club membership:',
          membershipError
        );
        return null;
      }

      if (membership?.role === 'faculty') {
        return {
          uid,
          facultyTier: true,
          actualRole: 'faculty',
        };
      }

      /*
       * Founder fallback only exists when the club
       * currently has NO Faculty Advisor.
       */
      const {
        data: facultyRows,
        error: facultyError,
      } = await supabase
        .from('club_members')
        .select('user_id')
        .eq('club_id', clubId)
        .eq('role', 'faculty')
        .limit(1);

      if (facultyError) {
        console.error(
          'Failed to check Faculty membership:',
          facultyError
        );
        return null;
      }

      /*
       * A real Faculty Advisor exists.
       * Founder fallback is therefore disabled.
       */
      if (
        facultyRows &&
        facultyRows.length > 0
      ) {
        return {
          uid,
          facultyTier: false,
          actualRole:
            membership?.role ?? 'member',
        };
      }

      /*
       * No Faculty Advisor exists.
       * Check whether this user created the club.
       */
      const {
        data: club,
        error: clubError,
      } = await supabase
        .from('clubs')
        .select('created_by')
        .eq('id', clubId)
        .maybeSingle();

      if (clubError) {
        console.error(
          'Failed to load club creator:',
          clubError
        );
        return null;
      }

      const isFounder =
        club?.created_by === uid;

      return {
        uid,
        facultyTier: isFounder,
        actualRole: isFounder
          ? 'founder_fallback'
          : membership?.role ?? 'member',
      };
    };

  /*
   * --------------------------------------------------
   * LOAD VERIFIED CONTRIBUTIONS
   * --------------------------------------------------
   */

  const load = async () => {
    setLoading(true);
    setError('');

    const access =
      await checkAccess();

    if (!access) {
      setAuthUserId(null);
      setIsFacultyTier(false);
      setContributions([]);
      setLoading(false);
      return;
    }

    setAuthUserId(access.uid);
    setIsFacultyTier(access.facultyTier);
    setMyActualRole(access.actualRole);

    if (!access.facultyTier) {
      setLoading(false);
      return;
    }

    /*
     * FacultyReview only operates on contributions
     * that have already passed Lead verification.
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
          score,
          is_frozen,
          verified_by,
          verified_by_role,
          frozen_by,
          frozen_by_role,
          user_id,

          users!contributions_user_id_fkey(
            name,
            email
          ),

          skills!contributions_skill_id_fkey(
            name
          ),

          verifier:users!contributions_verified_by_fkey(
            name
          ),

          freezer:users!contributions_frozen_by_fkey(
            name
          )
        `
      )
      .eq('club_id', clubId)
      .eq('status', 'verified')
      .order('created_at', {
        ascending: false,
      });

    if (contributionError) {
      console.error(
        'Failed to load scored contributions:',
        contributionError
      );

      setError(
        'Could not load reviewed contributions.'
      );

      setContributions([]);
      setLoading(false);
      return;
    }

    setContributions(
      (data ?? []) as unknown as ScoredContribution[]
    );

    setSelectedIds([]);
    setEditingId(null);
    setExpandedId(null);

    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [clubId]);

  /*
   * --------------------------------------------------
   * SELECTION
   * --------------------------------------------------
   */

  const toggleSelect = (
    id: string
  ) => {
    setSelectedIds((previous) =>
      previous.includes(id)
        ? previous.filter(
            (item) => item !== id
          )
        : [...previous, id]
    );
  };

  const toggleSelectAll = () => {
    const freezableIds =
      contributions
        .filter(
          (contribution) =>
            !contribution.is_frozen
        )
        .map(
          (contribution) =>
            contribution.id
        );

    const allSelected =
      freezableIds.length > 0 &&
      freezableIds.every((id) =>
        selectedIds.includes(id)
      );

    setSelectedIds(
      allSelected
        ? []
        : freezableIds
    );
  };

  /*
   * --------------------------------------------------
   * EXPANSION
   * --------------------------------------------------
   */

  const toggleExpand = (
    id: string
  ) => {
    setExpandedId((previous) =>
      previous === id
        ? null
        : id
    );
  };

  /*
   * --------------------------------------------------
   * SCORE EDITING
   * --------------------------------------------------
   */

  const startEdit = (
    contribution: ScoredContribution
  ) => {
    if (contribution.is_frozen) {
      return;
    }

    setEditingId(
      contribution.id
    );

    setDraftScore(
      String(contribution.score)
    );

    setError('');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setDraftScore('');
  };

  const requestOverwrite = (
    contributionId: string
  ) => {
    const newScore =
      Number.parseInt(
        draftScore,
        10
      );

    if (
      !Number.isInteger(newScore) ||
      newScore < 0 ||
      newScore > 100
    ) {
      setError(
        'Please enter a valid score between 0 and 100.'
      );
      return;
    }

    const contribution =
      contributions.find(
        (item) =>
          item.id ===
          contributionId
      );

    if (
      !contribution ||
      contribution.is_frozen
    ) {
      return;
    }

    if (
      newScore ===
      contribution.score
    ) {
      cancelEdit();
      return;
    }

    setError('');

    setPendingAction({
      type: 'overwrite',
      contributionId,
      newScore,
    });
  };

  /*
   * --------------------------------------------------
   * FREEZE
   * --------------------------------------------------
   */

  const requestFreeze = (
    contributionIds: string[]
  ) => {
    const validIds =
      contributionIds.filter(
        (id) => {
          const contribution =
            contributions.find(
              (item) =>
                item.id === id
            );

          return Boolean(
            contribution &&
              !contribution.is_frozen
          );
        }
      );

    if (validIds.length === 0) {
      return;
    }

    setError('');

    setPendingAction({
      type: 'freeze',
      contributionIds: validIds,
    });
  };

  /*
   * --------------------------------------------------
   * OVERWRITE SCORE
   * --------------------------------------------------
   */

  const runOverwrite = async (
    contributionId: string,
    newScore: number
  ) => {
    if (
      !authUserId ||
      !isFacultyTier
    ) {
      return;
    }

    const contribution =
      contributions.find(
        (item) =>
          item.id ===
          contributionId
      );

    if (
      !contribution ||
      contribution.is_frozen
    ) {
      setPendingAction(null);
      return;
    }

    const oldScore =
      contribution.score;

    setProcessing(true);
    setError('');

    /*
     * Defense in depth:
     *
     * Only verified + unfrozen contributions
     * can have their score changed.
     */
    const {
      error: updateError,
    } = await supabase
      .from('contributions')
      .update({
        score: newScore,
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
        'verified'
      )
      .eq(
        'is_frozen',
        false
      );

    if (updateError) {
      console.error(
        'Failed to overwrite score:',
        updateError
      );

      setError(
        'Could not update the score. It may already be frozen or you may not have permission.'
      );

      setProcessing(false);
      setPendingAction(null);
      return;
    }

    /*
     * Audit trail.
     */
    const {
      error: logError,
    } = await supabase
      .from('score_change_log')
      .insert({
        contribution_id:
          contributionId,
        old_score: oldScore,
        new_score: newScore,
        changed_by:
          authUserId,
        changed_by_role:
          myActualRole,
      });

    if (logError) {
      console.error(
        'Failed to write score change log:',
        logError
      );
    }

    /*
     * Notify both:
     * - the student
     * - the original scorer
     *
     * Duplicate IDs are removed.
     */
    const notifyTargets = [
      contribution.user_id,
      contribution.verified_by,
    ].filter(
      (
        id,
        index,
        array
      ): id is string =>
        Boolean(id) &&
        array.indexOf(id) ===
          index
    );

    if (
      notifyTargets.length > 0
    ) {
      const notificationRows =
        notifyTargets.map(
          (targetId) => ({
            user_id:
              targetId,

            message:
              `The score for "${contribution.title}" was changed from ${oldScore} to ${newScore} by ${
                ROLE_LABELS[
                  myActualRole
                ] ??
                myActualRole
              }.`,

            activity_type:
              'score_overwritten',

            club_id:
              clubId,

            contribution_id:
              contributionId,

            actor_id:
              authUserId,
          })
        );

      const {
        error:
          notificationError,
      } = await supabase
        .from('notifications')
        .insert(
          notificationRows
        );

      if (notificationError) {
        console.error(
          'Failed to notify score overwrite:',
          notificationError
        );
      }
    }

    /*
     * Update local state immediately.
     */
    setContributions(
      (previous) =>
        previous.map(
          (item) =>
            item.id ===
            contributionId
              ? {
                  ...item,
                  score: newScore,
                }
              : item
        )
    );

    cancelEdit();
    setProcessing(false);
    setPendingAction(null);
  };

  /*
   * --------------------------------------------------
   * FREEZE SCORES
   * --------------------------------------------------
   */

  const runFreeze = async (
    contributionIds: string[]
  ) => {
    if (
      !authUserId ||
      !isFacultyTier
    ) {
      return;
    }

    const freezeTargets =
      contributions.filter(
        (contribution) =>
          contributionIds.includes(
            contribution.id
          ) &&
          !contribution.is_frozen
      );

    if (
      freezeTargets.length === 0
    ) {
      setPendingAction(null);
      return;
    }

    const ids =
      freezeTargets.map(
        (contribution) =>
          contribution.id
      );

    setProcessing(true);
    setError('');

    const frozenAt =
      new Date().toISOString();

    /*
     * Only verified + currently unfrozen
     * contributions can be frozen.
     */
    const {
      error: updateError,
    } = await supabase
      .from('contributions')
      .update({
        is_frozen: true,
        frozen_by:
          authUserId,
        frozen_by_role:
          myActualRole,
        frozen_at:
          frozenAt,
      })
      .in(
        'id',
        ids
      )
      .eq(
        'club_id',
        clubId
      )
      .eq(
        'status',
        'verified'
      )
      .eq(
        'is_frozen',
        false
      );

    if (updateError) {
      console.error(
        'Failed to freeze contributions:',
        updateError
      );

      setError(
        'Could not freeze one or more contributions. They may already be frozen or you may not have permission.'
      );

      setProcessing(false);
      setPendingAction(null);
      return;
    }

    /*
     * Notify students.
     */
    const notificationRows =
      freezeTargets.map(
        (contribution) => ({
          user_id:
            contribution.user_id,

          message:
            `Your contribution "${contribution.title}" has been reviewed and its score is now final.`,

          activity_type:
            'contribution_frozen',

          club_id:
            clubId,

          contribution_id:
            contribution.id,

          actor_id:
            authUserId,
        })
      );

    if (
      notificationRows.length > 0
    ) {
      const {
        error:
          notificationError,
      } = await supabase
        .from('notifications')
        .insert(
          notificationRows
        );

      if (notificationError) {
        console.error(
          'Failed to notify students about freeze:',
          notificationError
        );
      }
    }

    /*
     * Update local state.
     */
    setContributions(
      (previous) =>
        previous.map(
          (contribution) =>
            ids.includes(
              contribution.id
            )
              ? {
                  ...contribution,
                  is_frozen: true,
                  frozen_by:
                    authUserId,
                  frozen_by_role:
                    myActualRole,
                }
              : contribution
        )
    );

    setSelectedIds(
      (previous) =>
        previous.filter(
          (id) =>
            !ids.includes(id)
        )
    );

    setProcessing(false);
    setPendingAction(null);
  };

  /*
   * --------------------------------------------------
   * CONFIRMATION
   * --------------------------------------------------
   */

  const handleConfirm = () => {
    if (!pendingAction) {
      return;
    }

    if (
      pendingAction.type ===
      'overwrite'
    ) {
      runOverwrite(
        pendingAction.contributionId,
        pendingAction.newScore
      );

      return;
    }

    runFreeze(
      pendingAction.contributionIds
    );
  };

  /*
   * --------------------------------------------------
   * DERIVED VALUES
   * --------------------------------------------------
   */

  const freezableCount =
    contributions.filter(
      (contribution) =>
        !contribution.is_frozen
    ).length;

  const frozenCount =
    contributions.length -
    freezableCount;

  const allSelected =
    freezableCount > 0 &&
    selectedIds.length ===
      freezableCount;

  const visibleContributions =
    contributions.filter(
      (contribution) =>
        activeTab === 'pending'
          ? !contribution.is_frozen
          : contribution.is_frozen
    );

  /*
   * --------------------------------------------------
   * LOADING
   * --------------------------------------------------
   */

  if (loading) {
    return (
      <div className="text-sm text-[var(--ink-dim)]">
        Loading faculty review...
      </div>
    );
  }

  /*
   * --------------------------------------------------
   * ACCESS DENIED
   * --------------------------------------------------
   */

  if (!isFacultyTier) {
    return null;
  }

  /*
   * --------------------------------------------------
   * UI
   * --------------------------------------------------
   */

  return (
    <div className="mb-8 fade-up w-full">

      {/* Header */}
      <div className="card w-full p-4 mb-3">
        <div className="flex items-center gap-2">
          <GraduationCap
            className="text-[var(--lavender-ink)]"
            size={18}
          />

          <span className="text-sm font-semibold text-[var(--ink-dim)] uppercase tracking-wide">
            {ROLE_LABELS.faculty}{' '}
            Review
          </span>

          {myActualRole ===
            'founder_fallback' && (
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[var(--peach)] text-[var(--peach-ink)]">
              Founder fallback
            </span>
          )}

          {freezableCount > 0 && (
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[var(--peach)] text-[var(--peach-ink)]">
              {freezableCount}{' '}
              to freeze
            </span>
          )}

          {freezableCount === 0 &&
            contributions.length > 0 && (
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[var(--mint)] text-[var(--mint-ink)]">
                All reviewed
              </span>
            )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

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
          Yet to Freeze

          {freezableCount >
            0 && (
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-[var(--peach)] text-[var(--peach-ink)]">
              {freezableCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() =>
            setActiveTab(
              'frozen'
            )
          }
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors cursor-pointer inline-flex items-center gap-2 ${
            activeTab ===
            'frozen'
              ? 'border-[var(--lavender-ink)] text-[var(--lavender-ink)]'
              : 'border-transparent text-[var(--ink-dim)] hover:text-[var(--ink)]'
          }`}
        >
          Frozen

          {frozenCount >
            0 && (
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-[var(--lavender)] text-[var(--lavender-ink)]">
              {frozenCount}
            </span>
          )}
        </button>
      </div>

      {/* Bulk actions */}
      {activeTab ===
        'pending' &&
        freezableCount > 0 && (
          <div className="flex items-center justify-end gap-3 mb-3">

            <button
              type="button"
              onClick={
                toggleSelectAll
              }
              className="text-xs text-[var(--peach-ink)] hover:underline inline-flex items-center gap-1 cursor-pointer"
            >
              {allSelected ? (
                <CheckSquare
                  size={13}
                />
              ) : (
                <Square
                  size={13}
                />
              )}

              {allSelected
                ? 'Deselect all'
                : 'Select all'}
            </button>

            {selectedIds.length >
              0 && (
              <button
                type="button"
                onClick={() =>
                  requestFreeze(
                    selectedIds
                  )
                }
                disabled={
                  processing
                }
                className="btn-primary px-3 py-1.5 text-sm inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
              >
                <Lock
                  size={13}
                />

                Freeze{' '}
                {
                  selectedIds.length
                }{' '}
                selected
              </button>
            )}
          </div>
        )}

      {/* Empty state */}
      {visibleContributions.length ===
        0 && (
        <p className="text-sm text-[var(--ink-dim)] text-center py-6">
          {activeTab ===
          'pending'
            ? 'Nothing left to review — all caught up.'
            : 'No frozen contributions yet.'}
        </p>
      )}

      {/* Contribution cards */}
      <div className="space-y-3">
        {visibleContributions.map(
          (contribution) => {
            const selected =
              selectedIds.includes(
                contribution.id
              );

            const editing =
              editingId ===
              contribution.id;

            return (
              <div
                key={
                  contribution.id
                }
                className="card p-5"
              >
                <div className="flex items-start gap-3">

                  {/* Selection */}
                  {!contribution.is_frozen && (
                    <button
                      type="button"
                      onClick={() =>
                        toggleSelect(
                          contribution.id
                        )
                      }
                      disabled={
                        processing
                      }
                      className="mt-0.5 shrink-0 text-[var(--ink-dim)] hover:text-[var(--peach-ink)] cursor-pointer disabled:opacity-50"
                      aria-label={
                        selected
                          ? 'Deselect contribution'
                          : 'Select contribution'
                      }
                    >
                      {selected ? (
                        <CheckSquare
                          size={16}
                          className="text-[var(--peach-ink)]"
                        />
                      ) : (
                        <Square
                          size={16}
                        />
                      )}
                    </button>
                  )}

                  {/* Main content */}
                  <div className="flex-1 min-w-0">

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

                    <p className="text-xs text-[var(--ink-dim)] mt-0.5">
                      {contribution.users?.name ??
                        'Student'}

                      {contribution.skills?.name
                        ? ` · ${contribution.skills.name}`
                        : ''}
                    </p>
                  </div>

                  {/* Score / actions */}
                  <div className="flex items-center gap-2 shrink-0">

                    {editing ? (
                      <>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={
                            draftScore
                          }
                          onChange={(
                            event
                          ) =>
                            setDraftScore(
                              event
                                .target
                                .value
                            )
                          }
                          disabled={
                            processing
                          }
                          className="w-16 p-1.5 bg-transparent border border-[var(--border)] rounded-lg text-sm focus:border-[var(--peach-ink)] focus:outline-none disabled:opacity-50"
                          autoFocus
                        />

                        <button
                          type="button"
                          onClick={() =>
                            requestOverwrite(
                              contribution.id
                            )
                          }
                          disabled={
                            processing
                          }
                          className="btn-primary px-2.5 py-1.5 text-xs cursor-pointer disabled:opacity-50"
                        >
                          Save
                        </button>

                        <button
                          type="button"
                          onClick={
                            cancelEdit
                          }
                          disabled={
                            processing
                          }
                          className="btn-ghost px-2.5 py-1.5 text-xs cursor-pointer disabled:opacity-50"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <span className="font-display text-lg">
                          {
                            contribution.score
                          }
                        </span>

                        {!contribution.is_frozen && (
                          <>
                            <button
                              type="button"
                              onClick={() =>
                                startEdit(
                                  contribution
                                )
                              }
                              disabled={
                                processing
                              }
                              title="Overwrite score"
                              className="p-1.5 rounded-lg text-[var(--ink-dim)] hover:text-[var(--peach-ink)] hover:bg-[var(--border)] transition-colors cursor-pointer disabled:opacity-50"
                            >
                              <Pencil
                                size={
                                  14
                                }
                              />
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                requestFreeze(
                                  [
                                    contribution.id,
                                  ]
                                )
                              }
                              disabled={
                                processing
                              }
                              title="Freeze this score"
                              className="p-1.5 rounded-lg text-[var(--ink-dim)] hover:text-[var(--lavender-ink)] hover:bg-[var(--border)] transition-colors cursor-pointer disabled:opacity-50"
                            >
                              <Lock
                                size={
                                  14
                                }
                              />
                            </button>
                          </>
                        )}
                      </>
                    )}

                    <button
                      type="button"
                      onClick={() =>
                        toggleExpand(
                          contribution.id
                        )
                      }
                      title="View details"
                      className="p-1.5 rounded-lg text-[var(--ink-dim)] hover:text-[var(--ink)] hover:bg-[var(--border)] transition-colors cursor-pointer"
                    >
                      {expandedId ===
                      contribution.id ? (
                        <ChevronUp
                          size={14}
                        />
                      ) : (
                        <ChevronDown
                          size={14}
                        />
                      )}
                    </button>
                  </div>
                </div>

                {/* Expanded details */}
                {expandedId ===
                  contribution.id && (
                  <div className="mt-3 pt-3 border-t border-[var(--border)] pl-7">

                    {contribution.description ? (
                      <p className="text-sm text-[var(--ink)] mb-2">
                        {
                          contribution.description
                        }
                      </p>
                    ) : (
                      <p className="text-sm text-[var(--ink-dim)] italic mb-2">
                        No description
                        provided.
                      </p>
                    )}

                    {contribution.file_url ? (
                      <a
                        href={
                          contribution.file_url
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-[var(--peach-ink)] hover:underline inline-flex items-center gap-1"
                      >
                        <Paperclip
                          size={12}
                        />
                        View submitted
                        file
                      </a>
                    ) : (
                      <p className="text-xs text-[var(--ink-dim)]">
                        No file attached.
                      </p>
                    )}

                    <div className="mt-3 pt-2 border-t border-[var(--border)] text-xs text-[var(--ink-dim)] space-y-1">

                      <p>
                        Verified by{' '}
                        <span className="font-medium text-[var(--ink)]">
                          {contribution.verifier?.name ??
                            'Unknown'}
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
                        <>
                          <p>
                            Frozen by{' '}
                            <span className="font-medium text-[var(--ink)]">
                              {contribution.freezer?.name ??
                                'Unknown'}
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

                          <p className="text-[var(--lavender-ink)] font-medium">
                            This score is permanently
                            frozen.
                          </p>
                        </>
                      )}
                    </div>
                  </div>
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
          processing
        }
        title={
          pendingAction?.type ===
          'overwrite'
            ? 'Overwrite this score?'
            : pendingAction?.type ===
                'freeze' &&
              pendingAction
                .contributionIds
                .length > 1
            ? `Freeze ${pendingAction.contributionIds.length} contributions?`
            : 'Freeze this score?'
        }
        message={
          pendingAction?.type ===
          'overwrite'
            ? 'This replaces the existing score. The student and original scorer will both be notified, and the change will be recorded in the score history.'
            : 'Freezing is permanent. Once frozen, this score can never be changed by anyone, including you.'
        }
        confirmLabel={
          pendingAction?.type ===
          'overwrite'
            ? 'Overwrite'
            : 'Freeze permanently'
        }
        variant={
          pendingAction?.type ===
          'freeze'
            ? 'destructive'
            : 'neutral'
        }
        onConfirm={
          handleConfirm
        }
        onCancel={() => {
          if (!processing) {
            setPendingAction(
              null
            );
          }
        }}
      />
    </div>
  );
}