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
      const { data: sessionData } = await supabase.auth.getSession();
      const authUid = sessionData.session?.user.id;
      if (!authUid) { router.push('/login'); return; }
      setUserId(authUid);
      setChecking(false);
    };
    init();
  }, [router]);

  if (checking || !userId) return <div className="min-h-screen flex items-center justify-center text-sm text-[var(--ink-dim)]">Loading...</div>;

  return (
    <main className="p-6 md:p-10 max-w-6xl">
      <div className="grid lg:grid-cols-[1fr_360px] gap-6 items-start">
        <ProfileView userId={userId} />
        <div>
          <Leaderboard />
        </div>
      </div>
    </main>
  );
}