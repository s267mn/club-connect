'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import ProfileView from '@/components/ProfileView';
import Leaderboard from '@/components/Leaderboard';

export default function ProfilePage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);

  const router = useRouter();

  useEffect(() => {
    const init = async () => {
      const { data: sessionData } =
        await supabase.auth.getSession();

      const authUid =
        sessionData.session?.user.id;

      if (!authUid) {
        router.push('/login');
        return;
      }

      setUserId(authUid);
      setChecking(false);
    };

    init();
  }, [router]);

  if (checking || !userId) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-[var(--ink-dim)]">
        Loading...
      </div>
    );
  }

  return (
    <main className="w-full px-4 py-6 sm:px-6 md:px-8 lg:px-10">
      <div
        className="
          mx-auto
          w-full
          max-w-7xl
          grid
          grid-cols-1
          lg:grid-cols-[minmax(0,1fr)_380px]
          xl:grid-cols-[minmax(0,1fr)_400px]
          gap-6
          lg:gap-7
          items-start
        "
      >
        {/* ============================================
            MAIN PROFILE
        ============================================ */}

        <section className="min-w-0 w-full">
          <ProfileView userId={userId} />
        </section>

        {/* ============================================
            DESKTOP LEADERBOARD

            The navbar is approximately 64px tall.
            88px gives us:
            
            64px navbar
            +
            24px breathing room
            =
            88px sticky offset
        ============================================ */}

        <aside
          className="
            hidden
            lg:block
            w-full
            self-start
            sticky
            top-[88px]
            z-10
          "
        >
          <Leaderboard />
        </aside>

        {/* ============================================
            MOBILE LEADERBOARD

            On mobile there is no sidebar.
            It appears below the profile content.
        ============================================ */}

        <section className="lg:hidden w-full">
          <Leaderboard />
        </section>
      </div>
    </main>
  );
}