'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import SubmitContribution from './SubmitContribution';
import VerifyContributions from './VerifyContributions';

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

  const loadEverything = async () => {
    setLoading(true);
    const { data: sessionData } = await supabase.auth.getSession();
    const email = sessionData.session?.user.email;

    let currentUserId: string | null = null;
    if (email) {
      const { data: userRow } = await supabase.from('users').select('id').eq('email', email).single();
      currentUserId = userRow?.id ?? null;
      setUserId(currentUserId);
    }

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
    if (!insertError) await supabase.from('club_join_requests').update({ status: 'approved' }).eq('id', request.id);
    loadEverything();
  };

  const handleReject = async (requestId: string) => {
    if (processingIds.includes(requestId)) return;
    setProcessingIds((prev) => [...prev, requestId]);
    setPendingRequests((prev) => prev.filter((r) => r.id !== requestId));
    await supabase.from('club_join_requests').update({ status: 'rejected' }).eq('id', requestId);
  };

  if (loading) return <div className="font-mono text-sm text-[var(--steel)]">Loading...</div>;

  return (
    <div>
      {myStatus === 'none' && userId && !showJoinForm && (
        <button onClick={() => setShowJoinForm(true)} className="btn-primary px-5 py-2.5 rounded-md mb-10 fade-up">Request to Join</button>
      )}

      {myStatus === 'none' && userId && showJoinForm && (
        <div className="panel rounded-lg p-6 max-w-md mb-10 fade-up">
          <h3 className="font-display text-lg text-[var(--cyan)] mb-3">Request to Join as: Member</h3>
          <textarea placeholder="Why do you want to join? (optional)" value={joinMessage} onChange={(e) => setJoinMessage(e.target.value)} className="w-full p-3 mb-3 bg-transparent border border-[rgba(139,149,168,0.4)] rounded-md focus:border-[var(--cyan)] focus:outline-none transition-colors text-sm" rows={3} />
          <div className="flex gap-2">
            <button onClick={handleSubmitJoinRequest} disabled={submitting} className="btn-primary px-4 py-2 rounded-md text-sm disabled:opacity-50">{submitting ? 'Submitting...' : 'Submit Request'}</button>
            <button onClick={() => setShowJoinForm(false)} className="btn-ghost px-4 py-2 rounded-md text-sm">Cancel</button>
          </div>
        </div>
      )}

      {myStatus === 'pending' && (
        <div className="panel rounded-lg p-5 mb-10 flex items-center gap-3 fade-up">
          <span className="badge-pending">...</span>
          <p className="text-sm text-[var(--steel)]">Your request to join is pending approval.</p>
        </div>
      )}

      {(myStatus === 'member' || myStatus === 'admin') && userId && <SubmitContribution clubId={clubId} userId={userId} />}

      {myStatus === 'admin' && <VerifyContributions clubId={clubId} />}

      {myStatus === 'admin' && pendingRequests.length > 0 && (
        <div className="mb-12 fade-up">
          <h2 className="font-display text-xl text-[var(--gold)] glow-gold mb-4">Pending Join Requests</h2>
          <div className="grid gap-3">
            {pendingRequests.map((req) => (
              <div key={req.id} className="panel rounded-lg p-5">
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <p className="font-medium">{req.users?.name}</p>
                    <p className="text-sm text-[var(--steel)]">{req.users?.email}</p>
                    <p className="text-sm text-[var(--steel)] capitalize mt-1">Requested role: {req.role_requested}</p>
                    {req.message && <p className="text-sm text-[var(--text)] mt-2 italic">&quot;{req.message}&quot;</p>}
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => handleApprove(req)} className="btn-primary px-3 py-1.5 rounded-md text-sm">Approve</button>
                    <button onClick={() => handleReject(req.id)} className="btn-ghost px-3 py-1.5 rounded-md text-sm hover:border-[var(--magenta)] hover:text-[var(--magenta)]">Reject</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <h2 className="font-display text-xl text-[var(--text)] mb-4 fade-up">Members</h2>
      <div className="grid gap-2">
        {members.map((m, i) => (
          <div key={i} className="panel rounded-lg px-5 py-3 flex justify-between items-center fade-up" style={{ animationDelay: `${i * 40}ms` }}>
            <span>{m.users?.name}</span>
            <span className="font-mono text-xs uppercase tracking-widest text-[var(--steel)]">{m.role}</span>
          </div>
        ))}
        {members.length === 0 && <p className="text-[var(--steel)] panel rounded-lg p-5">No members yet.</p>}
      </div>
    </div>
  );
}