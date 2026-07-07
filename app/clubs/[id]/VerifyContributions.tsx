'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

type Contribution = {
  id: string;
  title: string;
  description: string;
  file_url: string;
  user_id: string;
  skill_id: string;
  users: { name: string; email: string } | null;
  skills: { name: string } | null;
};

export default function VerifyContributions({ clubId }: { clubId: string }) {
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [scores, setScores] = useState<{ [id: string]: string }>({});
  const [processingIds, setProcessingIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const loadPending = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('contributions')
      .select('id, title, description, file_url, user_id, skill_id, users!contributions_user_id_fkey(name, email), skills(name)')
      .eq('club_id', clubId)
      .eq('status', 'pending');
    setContributions((data as any) ?? []);
    setLoading(false);
  };

  useEffect(() => { loadPending(); }, [clubId]);

  const handleVerify = async (contribId: string) => {
    const score = parseInt(scores[contribId], 10);

    if (isNaN(score) || score < 0 || score > 100) {
      alert('Please enter a valid score between 0 and 100.');
      return;
    }

    if (processingIds.includes(contribId)) return;

    const { data: sessionData } = await supabase.auth.getSession();
    const email = sessionData.session?.user.email;

    if (!email) {
      alert('Session error — please refresh and try again.');
      return;
    }

    const { data: userRow } = await supabase.from('users').select('id').eq('email', email).single();

    if (!userRow) {
      alert('Could not identify your account — please refresh and try again.');
      return;
    }

    setProcessingIds((prev) => [...prev, contribId]);
    setContributions((prev) => prev.filter((c) => c.id !== contribId));

    await supabase.from('contributions').update({ status: 'verified', score, verified_by: userRow.id }).eq('id', contribId);
  };

  const handleReject = async (contribId: string) => {
    if (processingIds.includes(contribId)) return;
    setProcessingIds((prev) => [...prev, contribId]);
    setContributions((prev) => prev.filter((c) => c.id !== contribId));
    await supabase.from('contributions').update({ status: 'rejected' }).eq('id', contribId);
  };

  if (loading) return <div className="font-mono text-sm text-[var(--steel)]">Loading contributions...</div>;
  if (contributions.length === 0) return null;

  return (
    <div className="mb-12 fade-up">
      <h2 className="font-display text-xl text-[var(--gold)] glow-gold mb-4">Pending Contributions</h2>
      <div className="grid gap-3">
        {contributions.map((c) => (
          <div key={c.id} className="panel rounded-lg p-5">
            <div className="flex justify-between items-start mb-2">
              <div>
                <p className="font-medium">{c.title}</p>
                <p className="text-sm text-[var(--steel)]">{c.users?.name} &middot; {c.skills?.name}</p>
              </div>
            </div>
            {c.description && <p className="text-sm text-[var(--text)] mb-2">{c.description}</p>}
            {c.file_url && (
              <a href={c.file_url} target="_blank" rel="noopener noreferrer" className="text-sm text-[var(--cyan)] hover:underline">View submitted file</a>
            )}
            <div className="flex gap-2 items-center mt-3">
              <input type="number" min="0" max="100" placeholder="0-100" value={scores[c.id] ?? ''} onChange={(e) => setScores((prev) => ({ ...prev, [c.id]: e.target.value }))} className="w-24 p-2 bg-transparent border border-[rgba(139,149,168,0.4)] rounded-md focus:border-[var(--gold)] focus:outline-none transition-colors text-sm font-mono" />
              <button onClick={() => handleVerify(c.id)} className="btn-primary px-3 py-1.5 rounded-md text-sm">Verify</button>
              <button onClick={() => handleReject(c.id)} className="btn-ghost px-3 py-1.5 rounded-md text-sm hover:border-[var(--magenta)] hover:text-[var(--magenta)]">Reject</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}