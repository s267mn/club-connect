'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

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

      if (!email) {
        router.push('/login');
        return;
      }

      const { data: userRow } = await supabase.from('users').select('global_role').eq('email', email).single();

      if (userRow?.global_role !== 'super_admin') {
        router.push('/');
        return;
      }

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

  if (checking || loading) return <div className="min-h-screen flex items-center justify-center font-mono text-sm text-[var(--steel)]">Loading...</div>;

  return (
    <main className="min-h-screen px-8 py-16 md:px-16">
      <div className="max-w-3xl mb-12 fade-up">
        <p className="font-mono text-xs tracking-[0.3em] uppercase text-[var(--steel)] mb-2">Super Admin</p>
        <h1 className="font-display text-3xl md:text-4xl text-[var(--gold)] glow-gold">Pending Club Requests</h1>
      </div>

      <div className="max-w-3xl">
        {clubs.length === 0 ? (
          <p className="text-[var(--steel)] panel rounded-lg p-6 fade-up">No pending requests right now.</p>
        ) : (
          <div className="grid gap-3">
            {clubs.map((club) => (
              <div key={club.id} className="panel rounded-lg p-6 flex justify-between items-center fade-up">
                <div>
                  <h2 className="font-display text-xl mb-1">{club.name}</h2>
                  <p className="text-[var(--steel)]">{club.description}</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => handleApprove(club)} className="btn-primary px-4 py-2 rounded-md text-sm">Approve</button>
                  <button onClick={() => handleReject(club)} className="btn-ghost px-4 py-2 rounded-md text-sm hover:border-[var(--magenta)] hover:text-[var(--magenta)]">Reject</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}