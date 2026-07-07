'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function Navbar() {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const checkUser = async () => {
      const { data } = await supabase.auth.getSession();
      const email = data.session?.user.email ?? null;
      setUserEmail(email);

      if (email) {
        const { data: userRow } = await supabase.from('users').select('global_role').eq('email', email).single();
        setIsSuperAdmin(userRow?.global_role === 'super_admin');
      } else {
        setIsSuperAdmin(false);
      }
    };

    checkUser();

    const { data: listener } = supabase.auth.onAuthStateChange(() => {
      checkUser();
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <nav className="sticky top-0 z-50 flex justify-between items-center px-8 py-4 md:px-16 bg-[var(--bg)]/80 backdrop-blur-md border-b border-[rgba(45,212,206,0.15)]">
      <Link href="/" className="font-display text-lg">
        <span className="text-[var(--cyan)]">Club</span><span className="text-[var(--gold)]">Connect</span>
      </Link>

      <div className="flex items-center gap-6 text-sm font-mono uppercase tracking-wide">
        <Link href="/clubs" className="text-[var(--steel)] hover:text-[var(--cyan)] transition-colors">Explore</Link>

        {userEmail && (
          <>
            <Link href="/clubsrequest" className="text-[var(--steel)] hover:text-[var(--cyan)] transition-colors">Club Registry</Link>
            <Link href="/profile" className="text-[var(--steel)] hover:text-[var(--cyan)] transition-colors">My Profile</Link>
          </>
        )}

        {isSuperAdmin && (
          <Link href="/dashboard" className="text-[var(--steel)] hover:text-[var(--gold)] transition-colors">Dashboard</Link>
        )}

        {userEmail ? (
          <div className="flex items-center gap-4">
            <span className="hidden md:inline text-[var(--steel)] normal-case tracking-normal">{userEmail}</span>
            <button onClick={handleLogout} className="text-[var(--magenta)] hover:opacity-80 transition-opacity">Log Out</button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-[var(--steel)] hover:text-[var(--cyan)] transition-colors">Log In</Link>
            <Link href="/signup" className="btn-primary px-4 py-2 rounded-md normal-case tracking-normal">Sign Up</Link>
          </div>
        )}
      </div>
    </nav>
  );
}