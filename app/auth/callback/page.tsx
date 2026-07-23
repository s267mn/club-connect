'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Loader2 } from 'lucide-react';

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [error, setError] = useState('');
  const hasRun = useRef(false);

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    // Safety net: if nothing has resolved within 12 seconds, stop spinning
    // and show an error instead of hanging forever.
    const timeoutId = setTimeout(() => {
      setError((current) =>
        current || 'This is taking longer than expected. The verification link may have expired or been opened in a different browser than the one you signed up in.'
      );
    }, 12000);

    const handleAuthCallback = async () => {
      try {
        const code = searchParams.get('code');

        if (!code) {
          throw new Error('Missing authentication code.');
        }

        const { error: exchangeError } =
          await supabase.auth.exchangeCodeForSession(code);

        if (exchangeError) {
          throw exchangeError;
        }

        const userResult = await supabase.auth.getUser();
        const user = userResult.data.user;

        if (userResult.error || !user) {
          throw new Error('Unable to retrieve authenticated user.');
        }

        // Password reset flow
        const next = searchParams.get('next');
        if (next) {
          clearTimeout(timeoutId);
          router.replace(next);
          return;
        }

        // Does this profile already exist?
        const { data: existingUser, error: existingError } = await supabase
          .from('users')
          .select('id')
          .eq('id', user.id)
          .maybeSingle();

        if (existingError) {
          throw existingError;
        }

        if (!existingUser) {
          const displayName =
            user.user_metadata?.pending_name?.trim() ||
            user.email?.split('@')[0] ||
            'Student';

          const { error: insertError } = await supabase
            .from('users')
            .insert({
              id: user.id,
              name: displayName,
              email: user.email!,
            });

          if (
            insertError &&
            !insertError.message.toLowerCase().includes('duplicate')
          ) {
            throw insertError;
          }
        }

        clearTimeout(timeoutId);
        router.replace('/profile');
      } catch (err: any) {
        clearTimeout(timeoutId);
        console.error(err);

        setError(
          err?.message ||
            'Something went wrong while verifying your account.'
        );
      }
    };

    handleAuthCallback();

    return () => clearTimeout(timeoutId);
  }, [router, searchParams]);

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="text-center max-w-sm">

        {error ? (
          <>
            <p className="text-red-600 mb-5">
              {error}
            </p>

            <button
              onClick={() => router.replace('/login')}
              className="btn-primary px-5 py-2"
            >
              Return to Login
            </button>
          </>
        ) : (
          <>
            <Loader2
              className="icon-spin text-[var(--peach-ink)] mx-auto mb-4"
              size={30}
            />

            <h1 className="font-display text-xl mb-2">
              Verifying your account
            </h1>

            <p className="text-sm text-[var(--ink-dim)]">
              Please wait while we securely sign you in.
            </p>
          </>
        )}

      </div>
    </main>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen flex items-center justify-center">
          <Loader2
            className="icon-spin text-[var(--peach-ink)]"
            size={30}
          />
        </main>
      }
    >
      <AuthCallbackContent />
    </Suspense>
  );
}