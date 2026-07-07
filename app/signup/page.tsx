'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function SignupPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.endsWith('@nitk.edu.in')) {
      setError('Only @nitk.edu.in email addresses are allowed to sign up.');
      return;
    }

    const { data, error: signupError } = await supabase.auth.signUp({ email, password });

    if (signupError) {
      setError(signupError.message);
      return;
    }

    if (data.user) {
      const { error: insertError } = await supabase.from('users').insert({ id: data.user.id, name, email });
      if (insertError) {
        setError(insertError.message);
        return;
      }
    }

    router.push('/clubs');
  };

  return (
    <main className="min-h-screen flex items-center justify-center px-8 py-20">
      <form onSubmit={handleSignup} className="panel rounded-lg p-8 w-full max-w-sm fade-up">
        <p className="font-mono text-xs tracking-[0.3em] uppercase text-[var(--steel)] mb-2">New Record</p>
        <h1 className="font-display text-2xl text-[var(--cyan)] glow-cyan mb-6">Sign Up</h1>

        <input type="text" placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} className="w-full p-3 mb-3 bg-transparent border border-[rgba(139,149,168,0.4)] rounded-md focus:border-[var(--cyan)] focus:outline-none transition-colors" required />

        <input type="email" placeholder="you@nitk.edu.in" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full p-3 mb-3 bg-transparent border border-[rgba(139,149,168,0.4)] rounded-md focus:border-[var(--cyan)] focus:outline-none transition-colors" required />

        <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full p-3 mb-4 bg-transparent border border-[rgba(139,149,168,0.4)] rounded-md focus:border-[var(--cyan)] focus:outline-none transition-colors" required />

        {error && <p className="text-[var(--magenta)] text-sm mb-4">{error}</p>}

        <button type="submit" className="btn-primary w-full py-3 rounded-md">Create Account</button>
      </form>
    </main>
  );
}