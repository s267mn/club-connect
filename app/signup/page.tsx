'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { UserPlus } from 'lucide-react';

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
    if (signupError) { setError(signupError.message); return; }

    if (data.user) {
      const { error: insertError } = await supabase.from('users').insert({ id: data.user.id, name, email });
      if (insertError) { setError(insertError.message); return; }
    }

    router.push('/clubs');
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <form onSubmit={handleSignup} className="card p-8 w-full max-w-sm fade-up">
        <div className="flex items-center gap-2 mb-1">
          <UserPlus className="text-[var(--peach-ink)]" size={20} />
          <h1 className="font-display text-2xl">Sign Up</h1>
        </div>
        <p className="text-sm text-[var(--ink-dim)] mb-6">Start your verified record.</p>

        <input type="text" placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} className="w-full p-3 mb-3 bg-transparent border border-[var(--border)] rounded-xl text-sm focus:border-[var(--peach-ink)] focus:outline-none" required />
        <input type="email" placeholder="you@nitk.edu.in" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full p-3 mb-3 bg-transparent border border-[var(--border)] rounded-xl text-sm focus:border-[var(--peach-ink)] focus:outline-none" required />
        <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full p-3 mb-4 bg-transparent border border-[var(--border)] rounded-xl text-sm focus:border-[var(--peach-ink)] focus:outline-none" required />

        {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

        <button type="submit" className="btn-primary w-full py-3 text-sm">Create Account</button>
      </form>
    </main>
  );
}