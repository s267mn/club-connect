'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { LogIn, KeyRound, MailCheck } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [error, setError] = useState('');

  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  const [stage, setStage] = useState<'login' | 'forgot' | 'sent'>('login');
  const [resetEmail, setResetEmail] = useState('');

  // Redirect already logged in users
  useEffect(() => {
    const check = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session) {
        router.replace('/clubs');
      }
    };

    check();
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (loading) return;

    setError('');
    setLoading(true);

    try {
      const cleanEmail = email.trim().toLowerCase();

      const { error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (error) {
        const msg = error.message.toLowerCase();

        if (
          msg.includes('invalid login') ||
          msg.includes('invalid credentials')
        ) {
          throw new Error('Incorrect email or password.');
        }

        if (
          msg.includes('email not confirmed') ||
          msg.includes('not confirmed')
        ) {
          throw new Error(
            'Please verify your email before logging in.'
          );
        }

        throw error;
      }

      router.replace('/clubs');
    } catch (err: any) {
      console.error(err);

      setError(
        err?.message ||
          'Unable to log in. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSendResetLink = async (e: React.FormEvent) => {
    e.preventDefault();

    if (sending) return;

    setSending(true);
    setError('');

    try {
      const cleanEmail = resetEmail.trim().toLowerCase();

      const { error } = await supabase.auth.resetPasswordForEmail(
        cleanEmail,
        {
          redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
        }
      );

      if (error) throw error;

      setStage('sent');
    } catch (err: any) {
      console.error(err);

      setError(
        err?.message ||
          'Unable to send password reset email.'
      );
    } finally {
      setSending(false);
    }
  };

  if (stage === 'sent') {
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
            We sent a reset link to{' '}
            <span className="font-medium text-[var(--ink)]">
              {resetEmail.trim().toLowerCase()}
            </span>
            .
            <br />
            Click the link to choose a new password.
          </p>
        </div>
      </main>
    );
  }

  if (stage === 'forgot') {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <form
          onSubmit={handleSendResetLink}
          className="card p-8 w-full max-w-sm fade-up"
        >
          <div className="flex items-center gap-2 mb-1">
            <KeyRound
              className="text-[var(--peach-ink)]"
              size={20}
            />

            <h1 className="font-display text-2xl">
              Reset Password
            </h1>
          </div>

          <p className="text-sm text-[var(--ink-dim)] mb-6">
            Enter your NITK email.
          </p>

          <input
            type="email"
            placeholder="you@nitk.edu.in"
            value={resetEmail}
            onChange={(e) => setResetEmail(e.target.value)}
            className="w-full p-3 mb-4 bg-transparent border border-[var(--border)] rounded-xl text-sm focus:border-[var(--peach-ink)] focus:outline-none"
            required
          />

          {error && (
            <p className="text-red-600 text-sm mb-3">
              {error}
            </p>
          )}

          <button
            disabled={sending}
            className="btn-primary w-full py-3 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sending
              ? 'Sending...'
              : 'Send Reset Link'}
          </button>

          <button
            type="button"
            onClick={() => {
              setStage('login');
              setError('');
            }}
            className="w-full text-center text-sm text-[var(--ink-dim)] hover:text-[var(--ink)] mt-3"
          >
            Back to Login
          </button>
        </form>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <form
        onSubmit={handleLogin}
        className="card p-8 w-full max-w-sm fade-up"
      >
        <div className="flex items-center gap-2 mb-1">
          <LogIn
            className="text-[var(--peach-ink)]"
            size={20}
          />

          <h1 className="font-display text-2xl">
            Log In
          </h1>
        </div>

        <p className="text-sm text-[var(--ink-dim)] mb-6">
          Welcome back.
        </p>

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
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full p-3 mb-2 bg-transparent border border-[var(--border)] rounded-xl text-sm focus:border-[var(--peach-ink)] focus:outline-none"
          required
        />

        <button
          type="button"
          onClick={() => {
            setStage('forgot');
            setResetEmail(email);
            setError('');
          }}
          className="text-xs text-[var(--peach-ink)] hover:underline mb-4 block text-right w-full"
        >
          Forgot password?
        </button>

        {error && (
          <p className="text-red-600 text-sm mb-4">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="btn-primary w-full py-3 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Logging in...' : 'Log In'}
        </button>

        <p className="text-sm text-[var(--ink-dim)] text-center mt-4">
          Don't have an account?{' '}
          <a
            href="/signup"
            className="text-[var(--peach-ink)] hover:underline font-medium"
          >
            Sign Up
          </a>
        </p>
      </form>
    </main>
  );
}