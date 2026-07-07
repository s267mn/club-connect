'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function NewClubRequestPage() {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkLogin = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const email = sessionData.session?.user.email;

      if (!email) {
        router.push('/login');
        return;
      }

      const { data: userRow } = await supabase.from('users').select('id').eq('email', email).single();
      setUserId(userRow?.id ?? null);
      setChecking(false);
    };

    checkLogin();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!userId) {
      setError('Could not identify user.');
      return;
    }

    const { error: insertError } = await supabase.from('clubs').insert({
      name,
      description,
      status: 'pending',
      created_by: userId,
    });

    if (insertError) {
      setError(insertError.message);
      return;
    }

    setSuccess(true);
  };

  if (checking) return <div className="min-h-screen flex items-center justify-center font-mono text-sm text-[var(--steel)]">Loading...</div>;

  if (success) {
    return (
      <main className="min-h-screen flex items-center justify-center px-8 py-20">
        <div className="panel rounded-lg p-8 max-w-sm text-center fade-up">
          <span className="badge-pending inline-flex mb-4">...</span>
          <h1 className="font-display text-xl text-[var(--cyan)] glow-cyan mb-2">Request Submitted</h1>
          <p className="text-[var(--steel)]">Your club request is pending approval. You&apos;ll be able to manage it once approved.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-8 py-20">
      <form onSubmit={handleSubmit} className="panel rounded-lg p-8 w-full max-w-sm fade-up">
        <p className="font-mono text-xs tracking-[0.3em] uppercase text-[var(--steel)] mb-2">New Entry</p>
        <h1 className="font-display text-2xl text-[var(--gold)] glow-gold mb-2">Start a Club</h1>
        <p className="text-sm text-[var(--steel)] mb-6">Your request will be reviewed before it goes live.</p>

        <input type="text" placeholder="Club name" value={name} onChange={(e) => setName(e.target.value)} className="w-full p-3 mb-3 bg-transparent border border-[rgba(139,149,168,0.4)] rounded-md focus:border-[var(--gold)] focus:outline-none transition-colors" required />

        <textarea placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} className="w-full p-3 mb-4 bg-transparent border border-[rgba(139,149,168,0.4)] rounded-md focus:border-[var(--gold)] focus:outline-none transition-colors" rows={3} />

        {error && <p className="text-[var(--magenta)] text-sm mb-3">{error}</p>}

        <button type="submit" className="btn-primary w-full py-3 rounded-md">Submit Request</button>
      </form>
    </main>
  );
}