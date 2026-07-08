'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { LayoutDashboard, Check, X } from 'lucide-react';

type Club = { id: string; name: string; description: string; status: string; created_by: string };

export default function DashboardPage() {
  const [clubs, setClubs] = useState<Club[]>([]);
  const [checking, setChecking] = useState(true);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const init = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const email = sessionData.session?.user.email;
      if (!email) { router.push('/login'); return; }
      const { data: userRow } = await supabase.from('users').select('global_role').eq('email', email).single();
      if (userRow?.global_role !== 'super_admin') { router.push('/'); return; }
      setChecking(false);
      fetchPendingClubs();
    };
    init();
  }, [router]);

  const fetchPendingClubs = async () => {
    setLoading(true);
    const { data } = await supabase.from('clubs').select('*').eq('status', 'pending');
    setClubs(data ?? []);
    setLoading(false);
  };

  const handleApprove = async (club: Club) => {
    await supabase.from('clubs').update({ status: 'approved' }).eq('id', club.id);
    await supabase.from('club_members').insert({ club_id: club.id, user_id: club.created_by, role: 'admin' });
    fetchPendingClubs();
  };

  const handleReject = async (club: Club) => {
    await supabase.from('clubs').update({ status: 'rejected' }).eq('id', club.id);
    fetchPendingClubs();
  };

  if (checking || loading) return <div className="min-h-screen flex items-center justify-center text-sm text-[var(--ink-dim)]">Loading...</div>;

  return (
    <main className="p-6 md:p-10 max-w-5xl">
      <div className="flex items-center gap-2 mb-8 fade-up">
        <LayoutDashboard className="text-[var(--peach-ink)]" size={22} />
        <h1 className="font-display text-2xl">Pending Club Requests</h1>
      </div>

      {clubs.length === 0 ? (
        <div className="card p-8 text-center fade-up">
          <p className="text-[var(--ink-dim)]">No pending requests right now.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {clubs.map((club) => (
            <div key={club.id} className="card p-6 flex justify-between items-center fade-up">
              <div>
                <h2 className="font-display text-lg mb-1">{club.name}</h2>
                <p className="text-sm text-[var(--ink-dim)]">{club.description}</p>
              </div>
              <div className="flex gap-2 shrink-0">
                <button onClick={() => handleApprove(club)} className="btn-primary px-4 py-2 text-sm inline-flex items-center gap-1"><Check size={14} /> Approve</button>
                <button onClick={() => handleReject(club)} className="btn-ghost px-4 py-2 text-sm inline-flex items-center gap-1"><X size={14} /> Reject</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}