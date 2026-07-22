'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { UserPlus, MailCheck } from 'lucide-react';

export default function SignupPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.endsWith('@nitk.edu.in')) {
      setError('Only @nitk.edu.in email addresses are allowed to sign up.');
      return;
    }

    setSubmitting(true);

    // Check our own users table first — it only contains confirmed accounts,
    // so this reliably tells us if this email is already taken.
    const { data: existingUser } = await supabase.from('users').select('id').eq('email', email).maybeSingle();
    if (existingUser) {
      setError('An account with this email already exists. Try logging in instead.');
      setSubmitting(false);
      return;
    }

    // Store the name temporarily so the callback page can pick it up
    // and create the users row once the email is actually confirmed.
    const { error: signupError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { pending_name: name },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    setSubmitting(false);

    if (signupError) {
      const msg = signupError.message.toLowerCase();

      if (msg.includes('rate limit')) {
        setError("You've requested this too many times recently. Please wait a few minutes before trying again.");
      } else if (msg.includes('already registered') || msg.includes('already exists') || msg.includes('user already')) {
        // This covers the case where the account exists but was never confirmed —
        // our users-table check above only catches confirmed accounts, so this
        // is the fallback for that unconfirmed-duplicate case.
        setError('A signup for this email is already pending. Check your inbox for the confirmation link, or wait a moment and try again to get a fresh one.');
      } else {
        setError(signupError.message);
      }
      return;
    }

    setSent(true);
  };

  if (sent) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <div className="card p-8 w-full max-w-sm fade-up text-center">
          <MailCheck className="text-[var(--peach-ink)] mx-auto mb-3" size={28} />
          <h1 className="font-display text-xl mb-2">Check your inbox</h1>
          <p className="text-sm text-[var(--ink-dim)]">
            We sent a confirmation link to <span className="font-medium text-[var(--ink)]">{email}</span>. Click it to verify your NITK email and finish creating your account.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <form onSubmit={handleSignup} className="card p-8 w-full max-w-sm fade-up">
        <div className="flex items-center gap-2 mb-1">
          <UserPlus className="text-[var(--peach-ink)]" size={20} />
          <h1 className="font-display text-2xl">Sign Up</h1>
        </div>
        <p className="text-sm text-[var(--ink-dim)] mb-6">Start your verified record.</p>

        <input type="text" placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} className="w-full p-3 mb-3 bg-transparent border border-[var(--border)] rounded-xl text-sm focus:border-[var(--peach-ink)] focus:outline-none" required />
        <input type="email" placeholder="you@nitk.edu.in" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full p-3 mb-3 bg-transparent border border-[var(--border)] rounded-xl text-sm focus:border-[var(--peach-ink)] focus:outline-none" required />
        <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full p-3 mb-4 bg-transparent border border-[var(--border)] rounded-xl text-sm focus:border-[var(--peach-ink)] focus:outline-none" required />

        {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

        <button type="submit" disabled={submitting} className="btn-primary w-full py-3 text-sm disabled:opacity-50">
          {submitting ? 'Sending link...' : 'Create Account'}
        </button>

        <p className="text-sm text-[var(--ink-dim)] text-center mt-4">
          Already have an account?{' '}
          <a href="/login" className="text-[var(--peach-ink)] hover:underline font-medium">Log in</a>
        </p>
      </form>
    </main>
  );
}