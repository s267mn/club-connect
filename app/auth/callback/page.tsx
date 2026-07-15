'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Loader2 } from 'lucide-react';

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState('');

  useEffect(() => {
    const handle = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user;

      if (!user) {
        setError('Could not verify your session. Please try the link again.');
        return;
      }

      const next = searchParams.get('next');

      if (next) {
        // This was a password-reset link — send them to set a new password.
        router.push(next);
        return;
      }

      // This was a signup confirmation — create the users row now that
      // we know the email is genuinely confirmed.
      const { data: existing } = await supabase.from('users').select('id').eq('id', user.id).maybeSingle();

      if (!existing) {
        const pendingName = (user.user_metadata as any)?.pending_name ?? user.email?.split('@')[0] ?? 'Student';
        const { error: insertError } = await supabase.from('users').insert({
          id: user.id,
          name: pendingName,
          email: user.email,
        });
        if (insertError) {
          setError(insertError.message);
          return;
        }
      }

      router.push('/clubs');
    };

    handle();
  }, [router, searchParams]);

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="text-center">
        {error ? (
          <p className="text-red-600 text-sm">{error}</p>
        ) : (
          <>
            <Loader2 className="icon-spin text-[var(--peach-ink)] mx-auto mb-3" size={28} />
            <p className="text-sm text-[var(--ink-dim)]">Verifying...</p>
          </>
        )}
      </div>
    </main>
  );
}