'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const { error: loginError } = await supabase.auth.signInWithPassword({ email, password });

    if (loginError) {
      setError(loginError.message);
      return;
    }

    router.push('/clubs');
  };

  return (
    <main className="min-h-screen flex items-center justify-center px-8 py-20">
      <form onSubmit={handleLogin} className="panel rounded-lg p-8 w-full max-w-sm fade-up">
        <p className="font-mono text-xs tracking-[0.3em] uppercase text-[var(--steel)] mb-2">Welcome Back</p>
        <h1 className="font-display text-2xl text-[var(--gold)] glow-gold mb-6">Log In</h1>

        <input type="email" placeholder="you@nitk.edu.in" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full p-3 mb-3 bg-transparent border border-[rgba(139,149,168,0.4)] rounded-md focus:border-[var(--gold)] focus:outline-none transition-colors" required />

        <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full p-3 mb-4 bg-transparent border border-[rgba(139,149,168,0.4)] rounded-md focus:border-[var(--gold)] focus:outline-none transition-colors" required />

        {error && <p className="text-[var(--magenta)] text-sm mb-4">{error}</p>}

        <button type="submit" className="btn-primary w-full py-3 rounded-md">Log In</button>
      </form>
    </main>
  );
}