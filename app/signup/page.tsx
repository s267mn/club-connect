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

  // Races a promise against a hard timeout so a hung network call
  // can't leave the button stuck on "Sending verification email..."
  // forever.
  function withTimeout<T>(promise: PromiseLike<T>, ms: number): Promise<T> {
    return Promise.race([
      Promise.resolve(promise),
      new Promise<T>((_, reject) =>
        setTimeout(
          () => reject(new Error('Request timed out. Please try again.')),
          ms
        )
      ),
    ]);
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (submitting) return;

    setError('');

    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanName) {
      setError('Please enter your full name.');
      return;
    }

    if (!cleanEmail.endsWith('@nitk.edu.in')) {
      setError('Only @nitk.edu.in email addresses are allowed to sign up.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    setSubmitting(true);

    try {
      // Only confirmed users exist in this table.
      const { data: existingUser, error: existingError } = await withTimeout(
        supabase
          .from('users')
          .select('id')
          .eq('email', cleanEmail)
          .maybeSingle(),
        10000
      );

      if (existingError) throw existingError;

      if (existingUser) {
        setError('An account with this email already exists. Try logging in instead.');
        return;
      }

      const { error: signupError } = await withTimeout(
        supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: {
            data: {
              pending_name: cleanName,
            },
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        }),
        10000
      );

      if (signupError) {
        const msg = signupError.message.toLowerCase();

        if (msg.includes('rate limit')) {
          setError(
            "You've requested emails too frequently. Please wait a few minutes before trying again."
          );
          return;
        }

        if (
          msg.includes('already registered') ||
          msg.includes('already exists') ||
          msg.includes('user already')
        ) {
          setError(
            'A signup already exists for this email. Please check your inbox for the verification email.'
          );
          return;
        }

        throw signupError;
      }

      setSent(true);
    } catch (err: any) {
      console.error(err);

      setError(
        err?.message ||
          'Something went wrong while creating your account. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (sent) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <div className="card p-8 w-full max-w-sm fade-up text-center">
          <MailCheck
            className="text-[var(--peach-ink)] mx-auto mb-3"
            size={28}
          />

          <h1 className="font-display text-xl mb-2">
            Check your inbox
          </h1>

          <p className="text-sm text-[var(--ink-dim)]">
            We sent a verification link to{' '}
            <span className="font-medium text-[var(--ink)]">
              {email.trim().toLowerCase()}
            </span>
            .
            <br />
            Click the link to activate your ClubConnect account.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <form
        onSubmit={handleSignup}
        className="card p-8 w-full max-w-sm fade-up"
      >
        <div className="flex items-center gap-2 mb-1">
          <UserPlus
            className="text-[var(--peach-ink)]"
            size={20}
          />
          <h1 className="font-display text-2xl">
            Sign Up
          </h1>
        </div>

        <p className="text-sm text-[var(--ink-dim)] mb-6">
          Start your verified record.
        </p>

        <input
          type="text"
          placeholder="Full name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full p-3 mb-3 bg-transparent border border-[var(--border)] rounded-xl text-sm focus:border-[var(--peach-ink)] focus:outline-none"
          required
        />

        <input
          type="email"
          placeholder="you@nitk.edu.in"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full p-3 mb-3 bg-transparent border border-[var(--border)] rounded-xl text-sm focus:border-[var(--peach-ink)] focus:outline-none"
          required
        />

        <input
          type="password"
          placeholder="Password (minimum 8 characters)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full p-3 mb-4 bg-transparent border border-[var(--border)] rounded-xl text-sm focus:border-[var(--peach-ink)] focus:outline-none"
          required
        />

        {error && (
          <p className="text-red-600 text-sm mb-4">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="btn-primary w-full py-3 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? 'Sending verification email...' : 'Create Account'}
        </button>

        <p className="text-sm text-[var(--ink-dim)] text-center mt-4">
          Already have an account?{' '}
          <a
            href="/login"
            className="text-[var(--peach-ink)] hover:underline font-medium"
          >
            Log in
          </a>
        </p>
      </form>
    </main>
  );
}