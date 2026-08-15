'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import {
  ShieldCheck,
  UserRound,
  UserMinus,
  UserPlus,
} from 'lucide-react';
import ConfirmDialog from '@/components/ConfirmDialog';

type Member = {
  user_id: string;
  role: 'member' | 'admin' | 'faculty';
  users: {
    name: string;
    email: string;
    avatar_url: string | null;
  } | null;
};

type Action =
  | {
      type: 'promote';
      member: Member;
    }
  | {
      type: 'demote';
      member: Member;
    }
  | null;

export default function ManageClubLeads({
  clubId,
}: {
  clubId: string;
}) {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [action, setAction] = useState<Action>(null);

  const loadMembers = async () => {
    setLoading(true);
    setError('');

    const { data, error: memberError } = await supabase
      .from('club_members')
      .select(`
        user_id,
        role,
        users (
          name,
          email,
          avatar_url
        )
      `)
      .eq('club_id', clubId)
      .in('role', ['member', 'admin']);

    if (memberError) {
      console.error(
        'Failed to load club members:',
        memberError
      );

      setError('Could not load club members.');
      setMembers([]);
      setLoading(false);
      return;
    }

    const rows =
      (data as unknown as Member[]) ?? [];

    rows.sort((a, b) => {
      if (a.role === 'admin' && b.role !== 'admin') {
        return -1;
      }

      if (a.role !== 'admin' && b.role === 'admin') {
        return 1;
      }

      return (
        (a.users?.name ?? '').localeCompare(
          b.users?.name ?? ''
        )
      );
    });

    setMembers(rows);
    setLoading(false);
  };

  useEffect(() => {
    loadMembers();
  }, [clubId]);

  const executeAction = async () => {
    if (!action) return;

    setProcessing(true);
    setError('');

    const makeLead =
      action.type === 'promote';

    const { error: rpcError } =
      await supabase.rpc(
        'manage_club_lead',
        {
          p_club_id: clubId,
          p_member_user_id:
            action.member.user_id,
          p_make_lead: makeLead,
        }
      );

    if (rpcError) {
      console.error(
        'Failed to change Lead role:',
        rpcError
      );

      setError(
        rpcError.message ||
          'Could not update the Lead role.'
      );

      setProcessing(false);
      return;
    }

    setAction(null);
    setProcessing(false);

    await loadMembers();
  };

  const leads = members.filter(
    (member) => member.role === 'admin'
  );

  const normalMembers = members.filter(
    (member) => member.role === 'member'
  );

  if (loading) {
    return (
      <div className="border border-[var(--border)] rounded-2xl overflow-hidden">
        <div className="px-5 py-4">
          <p className="text-sm text-[var(--ink-dim)]">
            Loading Lead management...
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="border border-[var(--border)] rounded-2xl overflow-hidden bg-[var(--bg)]">
        {/* Header */}

        <div className="px-5 py-4 border-b border-[var(--border)]">
          <div className="flex items-center gap-2">
            <ShieldCheck
              size={17}
              className="text-[var(--peach-ink)]"
            />

            <h3 className="font-display text-lg">
              Manage Leads
            </h3>
          </div>

          <p className="text-xs text-[var(--ink-dim)] mt-1">
            Appoint members to Lead or remove their
            existing Lead role.
          </p>
        </div>

        {error && (
          <div className="px-5 py-3 bg-red-50 border-b border-red-100">
            <p className="text-sm text-red-600">
              {error}
            </p>
          </div>
        )}

        {/* Current Leads */}

        <div className="px-5 py-5 border-b border-[var(--border)]">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-dim)]">
              Current Leads
            </p>

            <span className="text-[11px] px-2 py-1 rounded-full bg-[var(--peach)] text-[var(--peach-ink)]">
              {leads.length}
            </span>
          </div>

          {leads.length === 0 ? (
            <div className="py-4 text-sm text-[var(--ink-dim)]">
              No Leads have been appointed yet.
            </div>
          ) : (
            <div className="divide-y divide-[var(--border)]">
              {leads.map((member) => (
                <MemberRow
                  key={member.user_id}
                  member={member}
                  action="demote"
                  onAction={() =>
                    setAction({
                      type: 'demote',
                      member,
                    })
                  }
                />
              ))}
            </div>
          )}
        </div>

        {/* Members */}

        <div className="px-5 py-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-dim)]">
              Club Members
            </p>

            <span className="text-[11px] px-2 py-1 rounded-full bg-[var(--surface)] border border-[var(--border)] text-[var(--ink-dim)]">
              {normalMembers.length}
            </span>
          </div>

          {normalMembers.length === 0 ? (
            <div className="py-4 text-sm text-[var(--ink-dim)]">
              There are no normal members available.
            </div>
          ) : (
            <div className="divide-y divide-[var(--border)]">
              {normalMembers.map((member) => (
                <MemberRow
                  key={member.user_id}
                  member={member}
                  action="promote"
                  onAction={() =>
                    setAction({
                      type: 'promote',
                      member,
                    })
                  }
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Confirmation dialog */}

      <ConfirmDialog
        open={action !== null}
        title={
          action?.type === 'promote'
            ? 'Make this member a Lead?'
            : 'Remove Lead role?'
        }
        message={
          action?.type === 'promote'
            ? `${action.member.users?.name ?? 'This member'} will become a Lead and gain the club management permissions associated with the Lead role.`
            : `${action?.member.users?.name ?? 'This member'} will lose their Lead role and become a normal club member.`
        }
        confirmLabel={
          action?.type === 'promote'
            ? 'Make Lead'
            : 'Remove Lead'
        }
        cancelLabel="Cancel"
        variant={
          action?.type === 'demote'
            ? 'destructive'
            : 'neutral'
        }
        submitting={processing}
        onConfirm={executeAction}
        onCancel={() => {
          if (!processing) {
            setAction(null);
          }
        }}
      />
    </>
  );
}

function MemberRow({
  member,
  action,
  onAction,
}: {
  member: Member;
  action: 'promote' | 'demote';
  onAction: () => void;
}) {
  const name =
    member.users?.name ?? 'Unknown member';

  const initials = name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className="py-3 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-9 h-9 rounded-full overflow-hidden bg-[var(--surface)] border border-[var(--border)] flex items-center justify-center shrink-0">
          {member.users?.avatar_url ? (
            <img
              src={member.users.avatar_url}
              alt={name}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-xs font-semibold text-[var(--ink-dim)]">
              {initials || 'U'}
            </span>
          )}
        </div>

        <div className="min-w-0">
          <p className="text-sm font-medium text-[var(--ink)] truncate">
            {name}
          </p>

          <p className="text-xs text-[var(--ink-dim)] truncate">
            {member.users?.email ?? 'Club member'}
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={onAction}
        className={`
          shrink-0
          text-xs
          font-medium
          inline-flex
          items-center
          gap-1.5
          transition-colors
          cursor-pointer
          ${
            action === 'promote'
              ? 'text-[var(--peach-ink)] hover:underline'
              : 'text-red-500 hover:underline'
          }
        `}
      >
        {action === 'promote' ? (
          <>
            <UserPlus size={14} />
            Make Lead
          </>
        ) : (
          <>
            <UserMinus size={14} />
            Remove Lead
          </>
        )}
      </button>
    </div>
  );
}