'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { KeyRound } from 'lucide-react';

export default function ResetPasswordPage() {
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });

    setSubmitting(false);

    if (updateError) { setError(updateError.message); return; }

    router.push('/login');
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <form onSubmit={handleSubmit} className="card p-8 w-full max-w-sm fade-up">
        <div className="flex items-center gap-2 mb-1">
          <KeyRound className="text-[var(--peach-ink)]" size={20} />
          <h1 className="font-display text-2xl">Set New Password</h1>
        </div>
        <p className="text-sm text-[var(--ink-dim)] mb-6">Choose a new password for your account.</p>

        <input
          type="password"
          placeholder="New password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          className="w-full p-3 mb-4 bg-transparent border border-[var(--border)] rounded-xl text-sm focus:border-[var(--peach-ink)] focus:outline-none"
          required
        />

        {error && <p className="text-red-600 text-sm mb-3">{error}</p>}

        <button type="submit" disabled={submitting} className="btn-primary w-full py-3 text-sm disabled:opacity-50">
          {submitting ? 'Updating...' : 'Update Password'}
        </button>
      </form>
    </main>
  );
}