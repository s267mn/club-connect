'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import SubmitContribution from './SubmitContribution';
import ConfirmDialog from '@/components/ConfirmDialog';
import { enforceWordLimit, TEXT_LIMITS } from '@/lib/textLimits';
import {
  UserPlus,
  Clock,
  Check,
  X,
  ShieldPlus,
  ShieldMinus,
} from 'lucide-react';

type Member = {
  user_id: string;
  role: string;
  users: {
    name: string;
    email: string;
    avatar_url: string | null;
  } | null;
};

type JoinRequest = {
  id: string;
  user_id: string;
  role_requested: string;
  message: string | null;
  users: {
    name: string;
    email: string;
  } | null;
};

const ROLE_LABELS: Record<string, string> = {
  admin: 'Lead',
  faculty: 'Faculty Advisor',
  member: 'Member',
};

export default function ClubMembers({
  clubId,
}: {
  clubId: string;
}) {
  const [userId, setUserId] = useState<string | null>(null);

  const [members, setMembers] = useState<Member[]>([]);

  const [myStatus, setMyStatus] = useState<
    'none' | 'pending' | 'member' | 'admin' | 'faculty'
  >('none');

  const [pendingRequests, setPendingRequests] = useState<JoinRequest[]>([]);

  const [loading, setLoading] = useState(true);
  const [showJoinForm, setShowJoinForm] = useState(false);
  const [joinMessage, setJoinMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [processingIds, setProcessingIds] = useState<string[]>([]);
  const [roleChangingIds, setRoleChangingIds] = useState<string[]>([]);

  const [joinConfirmOpen, setJoinConfirmOpen] = useState(false);

  const router = useRouter();

  /*
   * ------------------------------------------------------
   * SORT MEMBERS
   * ------------------------------------------------------
   */

  const sortMembers = (rows: Member[]) => {
    const roleRank = (role: string) => {
      if (role === 'faculty') return 0;
      if (role === 'admin') return 1;
      return 2;
    };

    return [...rows].sort(
      (a, b) => roleRank(a.role) - roleRank(b.role)
    );
  };

  /*
   * ------------------------------------------------------
   * LOAD EVERYTHING
   * ------------------------------------------------------
   */

  const loadEverything = async () => {
    setLoading(true);

    try {
      const { data: sessionData } =
        await supabase.auth.getSession();

      const email = sessionData.session?.user.email;

      if (!email) {
        router.push('/login');
        return;
      }

      /*
       * Resolve application user ID.
       */

      const {
        data: userRow,
        error: userRowError,
      } = await supabase
        .from('users')
        .select('id')
        .eq('email', email)
        .single();

      if (userRowError) {
        console.error(
          'Failed to resolve current user:',
          userRowError
        );

        setLoading(false);
        return;
      }

      const currentUserId = userRow?.id ?? null;

      setUserId(currentUserId);

      /*
       * Load members.
       */

      const {
        data: memberRows,
        error: memberRowsError,
      } = await supabase
        .from('club_members')
        .select(
          'user_id, role, users(name, email, avatar_url)'
        )
        .eq('club_id', clubId);

      if (memberRowsError) {
        console.error(
          'Failed to load club members:',
          memberRowsError
        );
      }

      const sortedMembers = sortMembers(
        ((memberRows as unknown) ?? []) as Member[]
      );

      setMembers(sortedMembers);

      /*
       * Determine current user's role.
       */

      if (!currentUserId) {
        setMyStatus('none');
        setPendingRequests([]);
        setLoading(false);
        return;
      }

      const myOwnRow = sortedMembers.find(
        (m) => m.user_id === currentUserId
      );

      if (myOwnRow) {
        /*
         * Keep Faculty as Faculty.
         */

        if (myOwnRow.role === 'faculty') {
          setMyStatus('faculty');
        } else if (myOwnRow.role === 'admin') {
          setMyStatus('admin');
        } else {
          setMyStatus('member');
        }

        /*
         * Both Faculty and Leads can manage
         * pending join requests.
         */

        if (
          myOwnRow.role === 'admin' ||
          myOwnRow.role === 'faculty'
        ) {
          const {
            data: requests,
            error: requestsError,
          } = await supabase
            .from('club_join_requests')
            .select(
              'id, user_id, role_requested, message, users(name, email)'
            )
            .eq('club_id', clubId)
            .eq('status', 'pending');

          if (requestsError) {
            console.error(
              'Failed to load pending join requests:',
              requestsError
            );

            setPendingRequests([]);
          } else {
            /*
             * Supabase's inferred nested relation type can differ
             * from the local JoinRequest interface.
             *
             * Cast through unknown intentionally so TypeScript
             * does not reject the valid database result.
             */

            setPendingRequests(
              Array.isArray(requests)
                ? (requests as unknown as JoinRequest[])
                : []
            );
          }
        } else {
          setPendingRequests([]);
        }
      } else {
        /*
         * Not a member.
         * Check whether a request is pending.
         */

        const {
          data: myRequest,
          error: myRequestError,
        } = await supabase
          .from('club_join_requests')
          .select('status')
          .eq('club_id', clubId)
          .eq('user_id', currentUserId)
          .eq('status', 'pending')
          .maybeSingle();

        if (myRequestError) {
          console.error(
            'Failed to check join request:',
            myRequestError
          );
        }

        setMyStatus(
          myRequest ? 'pending' : 'none'
        );

        setPendingRequests([]);
      }
    } catch (error) {
      console.error(
        'Unexpected ClubMembers error:',
        error
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEverything();
  }, [clubId]);

  /*
   * ------------------------------------------------------
   * SUBMIT JOIN REQUEST
   * ------------------------------------------------------
   */

  const handleSubmitJoinRequest = async () => {
    if (!userId) return;

    setSubmitting(true);

    try {
      const {
        error: insertError,
      } = await supabase
        .from('club_join_requests')
        .insert({
          club_id: clubId,
          user_id: userId,
          role_requested: 'member',
          message: joinMessage.trim() || null,
          status: 'pending',
        });

      if (insertError) {
        console.error(
          'Failed to submit join request:',
          insertError
        );

        alert(
          insertError.message ||
            'Failed to submit join request.'
        );

        return;
      }

      /*
       * Notify Leads.
       */

      const { data: admins } =
        await supabase
          .from('club_members')
          .select('user_id')
          .eq('club_id', clubId)
          .eq('role', 'admin');

      for (const admin of admins ?? []) {
        const {
          error: notifError,
        } = await supabase
          .from('notifications')
          .insert({
            user_id: admin.user_id,
            message:
              'New join request for your club',
            activity_type:
              'new_join_request',
            club_id: clubId,
            actor_id: userId,
          });

        if (notifError) {
          console.error(
            'Failed to notify Lead:',
            notifError
          );
        }
      }

      /*
       * Notify Faculty Advisors too.
       */

      const { data: facultyMembers } =
        await supabase
          .from('club_members')
          .select('user_id')
          .eq('club_id', clubId)
          .eq('role', 'faculty');

      for (const faculty of facultyMembers ?? []) {
        const {
          error: notifError,
        } = await supabase
          .from('notifications')
          .insert({
            user_id: faculty.user_id,
            message:
              'New join request for your club',
            activity_type:
              'new_join_request',
            club_id: clubId,
            actor_id: userId,
          });

        if (notifError) {
          console.error(
            'Failed to notify Faculty:',
            notifError
          );
        }
      }

      setShowJoinForm(false);
      setJoinConfirmOpen(false);
      setJoinMessage('');

      await loadEverything();
    } finally {
      setSubmitting(false);
    }
  };

  /*
   * ------------------------------------------------------
   * APPROVE JOIN REQUEST
   * ------------------------------------------------------
   */

  const handleApprove = async (
    request: JoinRequest
  ) => {
    if (
      processingIds.includes(request.id)
    ) {
      return;
    }

    if (
      myStatus !== 'admin' &&
      myStatus !== 'faculty'
    ) {
      return;
    }

    setProcessingIds((prev) => [
      ...prev,
      request.id,
    ]);

    try {
      const {
        error: insertError,
      } = await supabase
        .from('club_members')
        .insert({
          club_id: clubId,
          user_id: request.user_id,
          role: 'member',
        });

      if (insertError) {
        console.error(
          'Failed to add member:',
          insertError
        );

        alert(
          insertError.message ||
            'Failed to approve request.'
        );

        return;
      }

      const {
        error: updateError,
      } = await supabase
        .from('club_join_requests')
        .update({
          status: 'approved',
        })
        .eq('id', request.id);

      if (updateError) {
        console.error(
          'Failed to update request:',
          updateError
        );
      }

      const {
        error: notifError,
      } = await supabase
        .from('notifications')
        .insert({
          user_id: request.user_id,
          message:
            "You've been approved as a member!",
          activity_type:
            'join_approved',
          club_id: clubId,
        });

      if (notifError) {
        console.error(
          'Notification insert failed:',
          notifError
        );
      }

      setPendingRequests((prev) =>
        prev.filter(
          (r) => r.id !== request.id
        )
      );

      await loadEverything();
    } finally {
      setProcessingIds((prev) =>
        prev.filter(
          (id) => id !== request.id
        )
      );
    }
  };

  /*
   * ------------------------------------------------------
   * REJECT JOIN REQUEST
   * ------------------------------------------------------
   */

  const handleReject = async (
    request: JoinRequest
  ) => {
    if (
      processingIds.includes(request.id)
    ) {
      return;
    }

    if (
      myStatus !== 'admin' &&
      myStatus !== 'faculty'
    ) {
      return;
    }

    setProcessingIds((prev) => [
      ...prev,
      request.id,
    ]);

    try {
      const {
        error: updateError,
      } = await supabase
        .from('club_join_requests')
        .update({
          status: 'rejected',
        })
        .eq('id', request.id);

      if (updateError) {
        console.error(
          'Failed to reject request:',
          updateError
        );

        alert(
          updateError.message ||
            'Failed to reject request.'
        );

        return;
      }

      const {
        error: notifError,
      } = await supabase
        .from('notifications')
        .insert({
          user_id: request.user_id,
          message:
            'Your request to join was not approved this time.',
          activity_type:
            'join_rejected',
          club_id: clubId,
        });

      if (notifError) {
        console.error(
          'Notification insert failed:',
          notifError
        );
      }

      setPendingRequests((prev) =>
        prev.filter(
          (r) => r.id !== request.id
        )
      );

      await loadEverything();
    } finally {
      setProcessingIds((prev) =>
        prev.filter(
          (id) => id !== request.id
        )
      );
    }
  };

  /*
   * ------------------------------------------------------
   * MAKE / REMOVE LEAD
   * ------------------------------------------------------
   *
   * Faculty + Lead:
   *
   * Member -> Lead
   * Lead   -> Member
   *
   * Faculty cannot be modified here.
   * Users cannot modify themselves.
   */

  const handleRoleChange = async (
    targetUserId: string,
    newRole: 'admin' | 'member'
  ) => {
    if (
      roleChangingIds.includes(targetUserId)
    ) {
      return;
    }

    /*
     * Faculty + Lead only.
     */

    if (
      myStatus !== 'faculty' &&
      myStatus !== 'admin'
    ) {
      return;
    }

    /*
     * Cannot change yourself.
     */

    if (targetUserId === userId) {
      return;
    }

    const targetMember = members.find(
      (m) => m.user_id === targetUserId
    );

    if (!targetMember) {
      return;
    }

    /*
     * Faculty Advisor cannot be changed
     * using Lead controls.
     */

    if (targetMember.role === 'faculty') {
      return;
    }

    const isPromoting =
      newRole === 'admin';

    setRoleChangingIds((prev) => [
      ...prev,
      targetUserId,
    ]);

    try {
      const {
        error,
      } = await supabase.rpc(
        'manage_club_lead',
        {
          p_club_id: clubId,
          p_member_user_id:
            targetUserId,
          p_make_lead:
            isPromoting,
        }
      );

      if (error) {
        console.error(
          'Failed to change Lead role:',
          error
        );

        alert(
          error.message ||
            `Failed to ${
              isPromoting
                ? 'make this member a Lead'
                : 'remove Lead role'
            }.`
        );

        return;
      }

      await loadEverything();
    } catch (error) {
      console.error(
        'Unexpected Lead role error:',
        error
      );

      alert(
        'Something went wrong while changing the Lead role.'
      );
    } finally {
      setRoleChangingIds((prev) =>
        prev.filter(
          (id) => id !== targetUserId
        )
      );
    }
  };

  /*
   * ------------------------------------------------------
   * LOADING
   * ------------------------------------------------------
   */

  if (loading) {
    return (
      <div className="text-sm text-[var(--ink-dim)]">
        Loading...
      </div>
    );
  }

  /*
   * ------------------------------------------------------
   * UI
   * ------------------------------------------------------
   */

  return (
    <div className="w-full">

      {/* ==================================================
          REQUEST TO JOIN
          ================================================== */}

      {myStatus === 'none' &&
        userId &&
        !showJoinForm && (
          <button
            type="button"
            onClick={() =>
              setShowJoinForm(true)
            }
            className="btn-primary px-5 py-2.5 mb-6 inline-flex items-center gap-2 text-sm fade-up cursor-pointer"
          >
            <UserPlus size={16} />
            Request to Join
          </button>
        )}

      {/* ==================================================
          JOIN FORM
          ================================================== */}

      {myStatus === 'none' &&
        userId &&
        showJoinForm && (
          <div className="card p-6 max-w-md mb-6 fade-up">

            <h3 className="font-display text-lg mb-3">
              Request to Join
            </h3>

            <textarea
              placeholder="Why do you want to join? (optional)"
              value={joinMessage}
              onChange={(e) =>
                setJoinMessage(
                  enforceWordLimit(
                    e.target.value.slice(
                      0,
                      TEXT_LIMITS.joinMessage
                    )
                  )
                )
              }
              maxLength={
                TEXT_LIMITS.joinMessage
              }
              className="w-full p-3 bg-transparent border border-[var(--border)] rounded-xl text-sm focus:border-[var(--peach-ink)] focus:outline-none"
              rows={3}
            />

            <p className="text-xs text-[var(--ink-dim)] text-right mb-3">
              {joinMessage.length}/
              {TEXT_LIMITS.joinMessage}
            </p>

            <div className="flex gap-2">

              <button
                type="button"
                onClick={() =>
                  setJoinConfirmOpen(true)
                }
                disabled={submitting}
                className="btn-primary px-4 py-2 text-sm disabled:opacity-50 cursor-pointer"
              >
                Submit Request
              </button>

              <button
                type="button"
                onClick={() => {
                  if (!submitting) {
                    setShowJoinForm(false);
                    setJoinMessage('');
                  }
                }}
                disabled={submitting}
                className="btn-ghost px-4 py-2 text-sm cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>

            </div>
          </div>
        )}

      {/* ==================================================
          JOIN CONFIRMATION
          ================================================== */}

      <ConfirmDialog
        open={joinConfirmOpen}
        title="Send join request?"
        message={
          joinMessage.trim()
            ? `You're about to send a request to join this club with the message "${joinMessage.trim()}".`
            : 'Are you sure you want to request to join this club?'
        }
        confirmLabel="Send Request"
        cancelLabel="Go Back"
        onCancel={() => {
          if (!submitting) {
            setJoinConfirmOpen(false);
          }
        }}
        onConfirm={
          handleSubmitJoinRequest
        }
        submitting={submitting}
      />

      {/* ==================================================
          PENDING REQUEST
          ================================================== */}

      {myStatus === 'pending' && (
        <div className="card-tint bg-[var(--peach)] p-5 mb-6 flex items-center gap-3 fade-up">

          <Clock
            className="icon-spin text-[var(--peach-ink)]"
            size={18}
          />

          <p className="text-sm text-[var(--peach-ink)]">
            Your request to join is
            pending approval.
          </p>

        </div>
      )}

      {/* ==================================================
          PENDING JOIN REQUESTS
          ================================================== */}

      {(myStatus === 'admin' ||
        myStatus === 'faculty') &&
        pendingRequests.length > 0 && (
          <div className="mb-8 fade-up">

            <h2 className="text-sm font-semibold text-[var(--ink-dim)] mb-4 uppercase tracking-wide">
              Pending Join Requests
            </h2>

            <div className="space-y-3">

              {pendingRequests.map(
                (request) => (
                  <div
                    key={request.id}
                    className="card p-5"
                  >

                    <div className="flex justify-between items-start gap-4">

                      <div className="min-w-0">

                        <p className="font-medium text-sm">
                          {request.users?.name}
                        </p>

                        <p className="text-xs text-[var(--ink-dim)]">
                          {request.users?.email}
                        </p>

                        {request.message && (
                          <p className="text-sm text-[var(--ink)] mt-2 italic">
                            &quot;
                            {request.message}
                            &quot;
                          </p>
                        )}

                      </div>

                      <div className="flex gap-2 shrink-0">

                        <button
                          type="button"
                          onClick={() =>
                            handleApprove(
                              request
                            )
                          }
                          disabled={processingIds.includes(
                            request.id
                          )}
                          className="btn-primary px-3 py-1.5 text-sm inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
                        >
                          <Check size={14} />
                          Approve
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            handleReject(
                              request
                            )
                          }
                          disabled={processingIds.includes(
                            request.id
                          )}
                          className="btn-ghost px-3 py-1.5 text-sm inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
                        >
                          <X size={14} />
                          Reject
                        </button>

                      </div>

                    </div>

                  </div>
                )
              )}

            </div>
          </div>
        )}

      {/* ==================================================
          MAIN SECTION
          ================================================== */}

      <div className="grid md:grid-cols-2 gap-6 items-start w-full">

        {/* ==================================================
            SUBMIT CONTRIBUTION

            IMPORTANT:
            Faculty is included here.
            ================================================== */}

        <div className="w-full">

          {(myStatus === 'member' ||
            myStatus === 'admin' ||
            myStatus === 'faculty') &&
            userId ? (
            <SubmitContribution
              clubId={clubId}
              userId={userId}
            />
          ) : null}

        </div>

        {/* ==================================================
            MEMBERS
            ================================================== */}

        <div className="card p-6 fade-up w-full">

          <h2 className="text-sm font-semibold text-[var(--ink-dim)] mb-4 uppercase tracking-wide">
            Members
          </h2>

          <div className="max-h-80 overflow-y-auto border border-[var(--border)] rounded-xl divide-y divide-[var(--border)]">

            {members.map((member) => {

              const initials = (
                member.users?.name ?? '?'
              )
                .split(' ')
                .map((n) => n[0])
                .slice(0, 2)
                .join('')
                .toUpperCase();

              const isSelf =
                member.user_id === userId;

              /*
               * Faculty + Lead can manage:
               *
               * Member -> Lead
               * Lead   -> Member
               *
               * But not Faculty.
               */

              const canManage =
                (myStatus === 'admin' ||
                  myStatus === 'faculty') &&
                !isSelf &&
                member.role !== 'faculty';

              const isChanging =
                roleChangingIds.includes(
                  member.user_id
                );

              return (
                <div
                  key={member.user_id}
                  className="px-5 py-3.5 flex justify-between items-center hover:bg-[rgba(0,0,0,0.03)] transition-colors"
                >

                  {/* Profile */}

                  <div
                    onClick={() =>
                      router.push(
                        `/profile/${member.user_id}`
                      )
                    }
                    className="flex items-center gap-3 cursor-pointer flex-1 min-w-0"
                  >

                    <span className="avatar w-8 h-8 text-xs overflow-hidden shrink-0 flex items-center justify-center font-bold bg-[var(--border)]">

                      {member.users?.avatar_url ? (
                        <img
                          src={
                            member.users
                              .avatar_url
                          }
                          alt={
                            member.users.name
                          }
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        initials
                      )}

                    </span>

                    <span className="text-sm truncate">
                      {member.users?.name}
                    </span>

                  </div>

                  {/* Role + controls */}

                  <div className="flex items-center gap-2 shrink-0">

                    <span className="text-xs uppercase tracking-wide text-[var(--ink-dim)]">
                      {ROLE_LABELS[
                        member.role
                      ] ?? member.role}
                    </span>

                    {/* Make Lead */}

                    {canManage &&
                      member.role ===
                        'member' && (
                        <button
                          type="button"
                          onClick={() =>
                            handleRoleChange(
                              member.user_id,
                              'admin'
                            )
                          }
                          disabled={
                            isChanging
                          }
                          title="Make Lead"
                          className="p-1.5 rounded-lg text-[var(--ink-dim)] hover:text-[var(--peach-ink)] hover:bg-[var(--border)] transition-colors disabled:opacity-40 cursor-pointer"
                        >
                          <ShieldPlus
                            size={15}
                          />
                        </button>
                      )}

                    {/* Remove Lead */}

                    {canManage &&
                      member.role ===
                        'admin' && (
                        <button
                          type="button"
                          onClick={() =>
                            handleRoleChange(
                              member.user_id,
                              'member'
                            )
                          }
                          disabled={
                            isChanging
                          }
                          title="Remove Lead"
                          className="p-1.5 rounded-lg text-[var(--ink-dim)] hover:text-red-600 hover:bg-[var(--border)] transition-colors disabled:opacity-40 cursor-pointer"
                        >
                          <ShieldMinus
                            size={15}
                          />
                        </button>
                      )}

                  </div>

                </div>
              );
            })}

            {members.length === 0 && (
              <p className="px-5 py-4 text-sm text-[var(--ink-dim)]">
                No members yet.
              </p>
            )}

          </div>
        </div>

      </div>

    </div>
  );
}