'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { ClipboardCheck, Paperclip, Check, X } from 'lucide-react';

type Contribution = {
  id: string; title: string; description: string; file_url: string; user_id: string; skill_id: string;
  users: { name: string; email: string } | null; skills: { name: string } | null;
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
    if (isNaN(score) || score < 0 || score > 100) { alert('Please enter a valid score between 0 and 100.'); return; }
    if (processingIds.includes(contribId)) return;

    const { data: sessionData } = await supabase.auth.getSession();
    const email = sessionData.session?.user.email;
    if (!email) { alert('Session error — please refresh and try again.'); return; }

    const { data: userRow } = await supabase.from('users').select('id').eq('email', email).single();
    if (!userRow) { alert('Could not identify your account — please refresh and try again.'); return; }

    const contrib = contributions.find((c) => c.id === contribId);

    setProcessingIds((prev) => [...prev, contribId]);
    setContributions((prev) => prev.filter((c) => c.id !== contribId));

    await supabase.from('contributions').update({ status: 'verified', score, verified_by: userRow.id }).eq('id', contribId);

    if (contrib) {
      const { error: notifError } = await supabase.from('notifications').insert({
        user_id: contrib.user_id,
        message: `Your contribution "${contrib.title}" was verified with a score of ${score}!`,
        link: `/profile`,
      });
      if (notifError) console.error('Failed to notify student (verify):', notifError);
    }
  };

  const handleReject = async (contribId: string) => {
    if (processingIds.includes(contribId)) return;

    const contrib = contributions.find((c) => c.id === contribId);

    setProcessingIds((prev) => [...prev, contribId]);
    setContributions((prev) => prev.filter((c) => c.id !== contribId));

    await supabase.from('contributions').update({ status: 'rejected' }).eq('id', contribId);

    if (contrib) {
      const { error: notifError } = await supabase.from('notifications').insert({
        user_id: contrib.user_id,
        message: `Your contribution "${contrib.title}" was not verified.`,
        link: `/profile`,
      });
      if (notifError) console.error('Failed to notify student (reject):', notifError);
    }
  };

  if (loading) return <div className="text-sm text-[var(--ink-dim)]">Loading contributions...</div>;
  if (contributions.length === 0) return null;

  return (
    <div className="mb-8 fade-up">
      <div className="flex items-center gap-2 mb-4">
        <ClipboardCheck className="text-[var(--peach-ink)]" size={18} />
        <h2 className="text-sm font-semibold text-[var(--ink-dim)] uppercase tracking-wide">Pending Contributions</h2>
      </div>
      <div className="space-y-3">
        {contributions.map((c) => (
          <div key={c.id} className="card p-5">
            <p className="font-medium text-sm">{c.title}</p>
            <p className="text-xs text-[var(--ink-dim)] mt-0.5 mb-2">{c.users?.name} &middot; {c.skills?.name}</p>
            {c.description && <p className="text-sm text-[var(--ink)] mb-2">{c.description}</p>}
            {c.file_url && (
              <a href={c.file_url} target="_blank" rel="noopener noreferrer" className="text-sm text-[var(--peach-ink)] hover:underline inline-flex items-center gap-1">
                <Paperclip size={12} /> View submitted file
              </a>
            )}
            <div className="flex gap-2 items-center mt-3">
              <input type="number" min="0" max="100" placeholder="0-100" value={scores[c.id] ?? ''} onChange={(e) => setScores((prev) => ({ ...prev, [c.id]: e.target.value }))} className="w-20 p-2 bg-transparent border border-[var(--border)] rounded-lg text-sm focus:border-[var(--peach-ink)] focus:outline-none" />
              <button onClick={() => handleVerify(c.id)} className="btn-primary px-3 py-1.5 text-sm inline-flex items-center gap-1"><Check size={14} /> Verify</button>
              <button onClick={() => handleReject(c.id)} className="btn-ghost px-3 py-1.5 text-sm inline-flex items-center gap-1"><X size={14} /> Reject</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}