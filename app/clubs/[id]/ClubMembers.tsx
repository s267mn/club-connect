'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import SubmitContribution from './SubmitContribution';
import VerifyContributions from './VerifyContributions';
import { UserPlus, Clock, Check, X } from 'lucide-react';

type Member = { role: string; users: { name: string; email: string } | null };
type JoinRequest = { id: string; user_id: string; role_requested: string; message: string | null; users: { name: string; email: string } | null };

export default function ClubMembers({ clubId }: { clubId: string }) {
  const [userId, setUserId] = useState<string | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [myStatus, setMyStatus] = useState<'none' | 'pending' | 'member' | 'admin'>('none');
  const [pendingRequests, setPendingRequests] = useState<JoinRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showJoinForm, setShowJoinForm] = useState(false);
  const [joinMessage, setJoinMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [processingIds, setProcessingIds] = useState<string[]>([]);
  const router = useRouter();

  const loadEverything = async () => {
    setLoading(true);
    const { data: sessionData } = await supabase.auth.getSession();
    const email = sessionData.session?.user.email;

    if (!email) {
      router.push('/login');
      return;
    }

    let currentUserId: string | null = null;
    const { data: userRow } = await supabase.from('users').select('id').eq('email', email).single();
    currentUserId = userRow?.id ?? null;
    setUserId(currentUserId);

    const { data: memberRows } = await supabase.from('club_members').select('role, users(name, email)').eq('club_id', clubId);
    setMembers((memberRows as any) ?? []);

    if (currentUserId) {
      const { data: myMemberRow } = await supabase.from('club_members').select('role').eq('club_id', clubId).eq('user_id', currentUserId).maybeSingle();

      if (myMemberRow) {
        setMyStatus(myMemberRow.role === 'admin' ? 'admin' : 'member');
      } else {
        const { data: myRequest } = await supabase.from('club_join_requests').select('status').eq('club_id', clubId).eq('user_id', currentUserId).eq('status', 'pending').maybeSingle();
        setMyStatus(myRequest ? 'pending' : 'none');
      }

      if (myMemberRow?.role === 'admin') {
        const { data: requests } = await supabase.from('club_join_requests').select('id, user_id, role_requested, message, users(name, email)').eq('club_id', clubId).eq('status', 'pending');
        setPendingRequests((requests as any) ?? []);
      }
    }

    setLoading(false);
  };

  useEffect(() => { loadEverything(); }, [clubId]);

  const handleSubmitJoinRequest = async () => {
    if (!userId) return;
    setSubmitting(true);
    await supabase.from('club_join_requests').insert({ club_id: clubId, user_id: userId, role_requested: 'member', message: joinMessage, status: 'pending' });
    setSubmitting(false);
    setShowJoinForm(false);
    setJoinMessage('');
    loadEverything();
  };

  const handleApprove = async (request: JoinRequest) => {
    if (processingIds.includes(request.id)) return;
    setProcessingIds((prev) => [...prev, request.id]);
    setPendingRequests((prev) => prev.filter((r) => r.id !== request.id));

    const { error: insertError } = await supabase.from('club_members').insert({ club_id: clubId, user_id: request.user_id, role: 'member' });

    if (!insertError) {
      await supabase.from('club_join_requests').update({ status: 'approved' }).eq('id', request.id);

      const { error: notifError } = await supabase.from('notifications').insert({
        user_id: request.user_id,
        message: `You've been approved as a member!`,
        link: `/clubs/${clubId}`,
      });
      if (notifError) console.error('Notification insert failed (approve):', notifError);
    } else {
      console.error('club_members insert failed:', insertError);
    }

    loadEverything();
  };

  const handleReject = async (request: JoinRequest) => {
    if (processingIds.includes(request.id)) return;
    setProcessingIds((prev) => [...prev, request.id]);
    setPendingRequests((prev) => prev.filter((r) => r.id !== request.id));

    await supabase.from('club_join_requests').update({ status: 'rejected' }).eq('id', request.id);

    const { error: notifError } = await supabase.from('notifications').insert({
      user_id: request.user_id,
      message: `Your request to join was not approved this time.`,
      link: `/clubs/${clubId}`,
    });
    if (notifError) console.error('Notification insert failed (reject):', notifError);

    loadEverything();
  };

  if (loading) return <div className="text-sm text-[var(--ink-dim)]">Loading...</div>;

  return (
    <div>
      {/* Pending contribution verification — always on top for admins */}
      {myStatus === 'admin' && <VerifyContributions clubId={clubId} />}

      {myStatus === 'none' && userId && !showJoinForm && (
        <button onClick={() => setShowJoinForm(true)} className="btn-primary px-5 py-2.5 mb-6 inline-flex items-center gap-2 text-sm fade-up">
          <UserPlus size={16} /> Request to Join
        </button>
      )}

      {myStatus === 'none' && userId && showJoinForm && (
        <div className="card p-6 max-w-md mb-6 fade-up">
          <h3 className="font-display text-lg mb-3">Request to Join</h3>
          <textarea placeholder="Why do you want to join? (optional)" value={joinMessage} onChange={(e) => setJoinMessage(e.target.value)} className="w-full p-3 mb-3 bg-transparent border border-[var(--border)] rounded-xl text-sm focus:border-[var(--peach-ink)] focus:outline-none" rows={3} />
          <div className="flex gap-2">
            <button onClick={handleSubmitJoinRequest} disabled={submitting} className="btn-primary px-4 py-2 text-sm disabled:opacity-50">{submitting ? 'Submitting...' : 'Submit Request'}</button>
            <button onClick={() => setShowJoinForm(false)} className="btn-ghost px-4 py-2 text-sm">Cancel</button>
          </div>
        </div>
      )}

      {myStatus === 'pending' && (
        <div className="card-tint bg-[var(--peach)] p-5 mb-6 flex items-center gap-3 fade-up">
          <Clock className="icon-spin text-[var(--peach-ink)]" size={18} />
          <p className="text-sm text-[var(--peach-ink)]">Your request to join is pending approval.</p>
        </div>
      )}

      {myStatus === 'admin' && pendingRequests.length > 0 && (
        <div className="mb-8 fade-up">
          <h2 className="text-sm font-semibold text-[var(--ink-dim)] mb-4 uppercase tracking-wide">Pending Join Requests</h2>
          <div className="space-y-3">
            {pendingRequests.map((req) => (
              <div key={req.id} className="card p-5">
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <p className="font-medium text-sm">{req.users?.name}</p>
                    <p className="text-xs text-[var(--ink-dim)]">{req.users?.email}</p>
                    {req.message && <p className="text-sm text-[var(--ink)] mt-2 italic">&quot;{req.message}&quot;</p>}
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => handleApprove(req)} className="btn-primary px-3 py-1.5 text-sm inline-flex items-center gap-1"><Check size={14} /> Approve</button>
                    <button onClick={() => handleReject(req)} className="btn-ghost px-3 py-1.5 text-sm inline-flex items-center gap-1"><X size={14} /> Reject</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Submit Contribution + Members side by side */}
      <div className="grid md:grid-cols-2 gap-4 items-start">
        {(myStatus === 'member' || myStatus === 'admin') && userId ? (
          <SubmitContribution clubId={clubId} userId={userId} />
        ) : (
          <div />
        )}

        <div className="card p-6 fade-up">
          <h2 className="text-sm font-semibold text-[var(--ink-dim)] mb-4 uppercase tracking-wide">Members</h2>
          <div className="max-h-80 overflow-y-auto border border-[var(--border)] rounded-xl divide-y divide-[var(--border)]">
            {members.map((m, i) => (
              <div key={i} className="px-5 py-3.5 flex justify-between items-center">
                <span className="text-sm">{m.users?.name}</span>
                <span className="text-xs uppercase tracking-wide text-[var(--ink-dim)]">{m.role}</span>
              </div>
            ))}
            {members.length === 0 && <p className="px-5 py-4 text-sm text-[var(--ink-dim)]">No members yet.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}