'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { PlusCircle, Clock } from 'lucide-react';

const CATEGORIES = [
  'Technical', 'Cultural', 'Arts & Design', 'Sports & Fitness',
  'Literary & Debate', 'Music & Dance', 'Social Service',
  'Entrepreneurship', 'Robotics & Electronics', 'Photography & Film',
  'Gaming & Esports', 'Other',
];

export default function NewClubRequestPage() {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkLogin = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const email = sessionData.session?.user.email;
      if (!email) { router.push('/login'); return; }
      const { data: userRow } = await supabase.from('users').select('id').eq('email', email).single();
      setUserId(userRow?.id ?? null);
      setChecking(false);
    };
    checkLogin();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!userId) { setError('Could not identify user.'); return; }

    const { data: clubData, error: insertError } = await supabase
      .from('clubs')
      .insert({ name, description, category, status: 'pending', created_by: userId })
      .select('id')
      .single();
    if (insertError) { setError(insertError.message); return; }

    const { data: superAdminRow } = await supabase.from('users').select('id').eq('global_role', 'super_admin').single();
    if (superAdminRow?.id) {
      const { error: notifError } = await supabase.from('notifications').insert({
        user_id: superAdminRow.id,
        message: `New club request: "${name}"`,
        link: `/dashboard`,
      });
      if (notifError) console.error('Failed to notify super admin:', notifError);
    }

    setSuccess(true);
  };

  if (checking) return <div className="min-h-screen flex items-center justify-center text-sm text-[var(--ink-dim)]">Loading...</div>;

  if (success) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <div className="card-tint bg-[var(--peach)] p-8 max-w-sm text-center fade-up">
          <Clock className="icon-spin text-[var(--peach-ink)] mx-auto mb-3" size={28} />
          <h1 className="font-display text-xl mb-2">Request Submitted</h1>
          <p className="text-sm text-[var(--peach-ink)]">Your club request is pending approval. You&apos;ll be able to manage it once approved.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <form onSubmit={handleSubmit} className="card p-8 w-full max-w-sm fade-up">
        <div className="flex items-center gap-2 mb-1">
          <PlusCircle className="text-[var(--peach-ink)]" size={20} />
          <h1 className="font-display text-2xl">Start a Club</h1>
        </div>
        <p className="text-sm text-[var(--ink-dim)] mb-6">Your request will be reviewed before it goes live.</p>

        <input type="text" placeholder="Club name" value={name} onChange={(e) => setName(e.target.value)} className="w-full p-3 mb-3 bg-transparent border border-[var(--border)] rounded-xl text-sm focus:border-[var(--peach-ink)] focus:outline-none" required />
        <textarea placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} className="w-full p-3 mb-3 bg-transparent border border-[var(--border)] rounded-xl text-sm focus:border-[var(--peach-ink)] focus:outline-none" rows={3} />

        <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full p-3 mb-4 bg-[var(--bg)] border border-[var(--border)] rounded-xl text-sm focus:border-[var(--peach-ink)] focus:outline-none" required>
          <option value="">Select a category</option>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>

        {error && <p className="text-red-600 text-sm mb-3">{error}</p>}

        <button type="submit" className="btn-primary w-full py-3 text-sm">Submit Request</button>
      </form>
    </main>
  );
}