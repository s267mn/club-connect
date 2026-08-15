'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

type AuthContextType = {
  session: Session | null;
  user: User | null;
  // True only while the very first session check is in flight.
  // Guaranteed to become false within GET_SESSION_TIMEOUT_MS no
  // matter what Supabase does, so no page can hang on this forever.
  authLoading: boolean;
};

const AuthContext = createContext<AuthContextType | null>(null);

// If Supabase's own getSession() call hasn't resolved by this point,
// stop waiting and treat the user as signed-out rather than freezing
// the whole app. onAuthStateChange will correct this the moment a
// real session shows up (e.g. right after login/signup redirects).
const GET_SESSION_TIMEOUT_MS = 4000;

function timeout<T>(ms: number): Promise<T> {
  return new Promise((resolve) =>
    setTimeout(
      () => resolve(null as unknown as T),
      ms
    )
  );
}

export function AuthProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [session, setSession] = useState<Session | null>(
    null
  );
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function init() {
      // Race the real session fetch against a hard timeout.
      // Whichever settles first wins — the call can never hang
      // this effect indefinitely.
      const result = await Promise.race([
        supabase.auth.getSession(),
        timeout<Awaited<
          ReturnType<typeof supabase.auth.getSession>
        > | null>(GET_SESSION_TIMEOUT_MS),
      ]);

      if (!mounted) return;

      if (result) {
        setSession(result.data.session ?? null);
      } else {
        // Timed out. Fall back to signed-out state for now;
        // onAuthStateChange below will fire and correct this
        // as soon as Supabase actually resolves the session
        // (including a late-arriving one from the timed-out call).
        setSession(null);
      }

      setAuthLoading(false);
    }

    init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        if (!mounted) return;
        setSession(newSession);
        // Any auth event (including the initial one, if it
        // arrives after our timeout fallback) confirms we're
        // no longer in the initial-loading state.
        setAuthLoading(false);
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        authLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      'useAuth must be used inside AuthProvider'
    );
  }

  return context;
}