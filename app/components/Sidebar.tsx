'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';

export default function Sidebar() {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

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
    const { data: listener } = supabase.auth.onAuthStateChange(() => checkUser());
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => { setMobileOpen(false); }, [pathname]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const linkClass = (href: string) =>
    `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
      pathname === href ? 'bg-[var(--surface)] text-[var(--ink)] border border-[var(--border)]' : 'text-[var(--ink-dim)] hover:text-[var(--ink)]'
    }`;

  return (
    <>
      {/* Mobile top bar with hamburger */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 flex items-center gap-3 px-4 py-3 bg-[var(--bg)]/90 backdrop-blur-md border-b border-[var(--border)]">
        <button onClick={() => setMobileOpen(true)} aria-label="Open menu" className="p-2 -ml-2">
          <Menu size={22} />
        </button>
        <Link href="/" className="font-display text-base font-bold">
          Club<span className="text-[var(--peach-ink)]">Connect</span>
        </Link>
      </div>

      {/* Spacer to push content below the fixed mobile top bar */}
      <div className="lg:hidden h-[52px]" />

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 bg-black/40 z-50" onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar itself — fixed drawer on mobile, static column on desktop */}
      <aside
        className={`w-64 shrink-0 border-r border-[var(--border)] px-5 py-8 flex flex-col justify-between
          fixed top-0 left-0 h-screen z-50 bg-[var(--bg)] transition-transform duration-200
          lg:!transform-none lg:sticky`}
        style={{ transform: mobileOpen ? 'translateX(0)' : 'translateX(-100%)' }}
      >
        <div>
          <div className="flex items-center justify-between mb-10 px-2">
            <Link href="/" className="font-display text-lg font-bold">
              Club<span className="text-[var(--peach-ink)]">Connect</span>
            </Link>
            <button onClick={() => setMobileOpen(false)} aria-label="Close menu" className="lg:hidden p-1">
              <X size={20} />
            </button>
          </div>

          <nav className="space-y-1">
            <Link href="/clubs" className={linkClass('/clubs')}>Explore</Link>
            {userEmail && <Link href="/clubsrequest" className={linkClass('/clubsrequest')}>Start a Club</Link>}
            {userEmail && <Link href="/profile" className={linkClass('/profile')}>My Profile</Link>}
            {isSuperAdmin && <Link href="/dashboard" className={linkClass('/dashboard')}>Dashboard</Link>}
          </nav>

          {!userEmail && (
            <div className="mt-6 pt-6 border-t border-[var(--border)]">
              <Link href="/signup" className="btn-primary block text-center py-2.5 text-sm mb-2">Sign Up Free</Link>
              <Link href="/login" className="block text-center text-sm text-[var(--ink-dim)] hover:text-[var(--ink)] py-1">Log In</Link>
            </div>
          )}
        </div>

        <div className="px-2">
          {userEmail ? (
            <div>
              <p className="text-xs text-[var(--ink-dim)] truncate mb-3">{userEmail}</p>
              <button onClick={handleLogout} className="text-sm font-medium text-[var(--peach-ink)] hover:underline">Log Out</button>
            </div>
          ) : (
            <div className="space-y-2">
              <Link href="/login" className="block text-sm font-medium text-[var(--ink-dim)] hover:text-[var(--ink)]">Log In</Link>
              <Link href="/signup" className="btn-primary block text-center py-2.5 rounded-xl text-sm">Sign Up</Link>
            </div>
          )}

          <p className="text-[11px] text-[var(--ink-dim)] opacity-60 mt-5 pt-4 border-t border-[var(--border)]">
            Built by Samanvith
          </p>
        </div>
      </aside>
    </>
  );
}