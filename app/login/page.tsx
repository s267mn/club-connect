'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { LogIn } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const { error: loginError } = await supabase.auth.signInWithPassword({ email, password });
    if (loginError) { setError(loginError.message); return; }
    router.push('/clubs');
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <form onSubmit={handleLogin} className="card p-8 w-full max-w-sm fade-up">
        <div className="flex items-center gap-2 mb-1">
          <LogIn className="text-[var(--peach-ink)]" size={20} />
          <h1 className="font-display text-2xl">Log In</h1>
        </div>
        <p className="text-sm text-[var(--ink-dim)] mb-6">Welcome back.</p>

        <input type="email" placeholder="you@nitk.edu.in" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full p-3 mb-3 bg-transparent border border-[var(--border)] rounded-xl text-sm focus:border-[var(--peach-ink)] focus:outline-none" required />
        <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full p-3 mb-4 bg-transparent border border-[var(--border)] rounded-xl text-sm focus:border-[var(--peach-ink)] focus:outline-none" required />

        {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

        <button type="submit" className="btn-primary w-full py-3 text-sm">Log In</button>

        <p className="text-sm text-[var(--ink-dim)] text-center mt-4">
          Don&apos;t have an account?{' '}
          <a href="/signup" className="text-[var(--peach-ink)] hover:underline font-medium">Sign up</a>
        </p>
      </form>
    </main>
  );
}