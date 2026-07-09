'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import ProfileView from '@/components/ProfileView';
import { ArrowLeft } from 'lucide-react';

export default function PublicProfilePage() {
  const params = useParams();
  const router = useRouter();
  const viewedUserId = params.userId as string;

  const [checking, setChecking] = useState(true);
  const [ownUserId, setOwnUserId] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const authUid = sessionData.session?.user.id;
      if (!authUid) { router.push('/login'); return; }
      setOwnUserId(authUid);
      setChecking(false);
    };
    init();
  }, [router]);

  if (checking) return <div className="min-h-screen flex items-center justify-center text-sm text-[var(--ink-dim)]">Loading...</div>;

  // If viewing your own id via this route, treat it as the own profile experience
  const isOwnProfile = ownUserId === viewedUserId;

  return (
    <main className="p-6 md:p-10 max-w-4xl">
      <a href="javascript:history.back()" className="inline-flex items-center gap-1.5 text-sm text-[var(--ink-dim)] hover:text-[var(--ink)] mb-6 fade-up">
        <ArrowLeft size={14} /> Back
      </a>
      <ProfileView userId={viewedUserId} isOwnProfile={isOwnProfile} />
    </main>
  );
}