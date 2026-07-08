import { supabase } from '@/lib/supabase';
import { ArrowRight, Users, Lock } from 'lucide-react';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export default async function ClubsPage() {
  const { data: clubs, error } = await supabase.from('clubs').select('*').eq('status', 'approved');

  if (error) return <div className="p-8 text-red-600">Error loading clubs: {error.message}</div>;

  const tints = ['lavender', 'mint', 'peach', 'sky'];

  return (
    <main className="p-6 md:p-10 max-w-5xl">
      <div className="mb-8 fade-up">
        <p className="text-sm text-[var(--ink-dim)] mb-2">Registry</p>
        <h1 className="font-display text-3xl mb-2">Explore Clubs</h1>
        <p className="text-[var(--ink-dim)]">Every club here has been reviewed and approved.</p>
      </div>

      {clubs?.length === 0 && (
        <div className="card p-8 text-center fade-up">
          <p className="text-[var(--ink-dim)]">No clubs approved yet. Be the first to start one.</p>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        {clubs?.map((club, i) => {
          const tint = tints[i % tints.length];
          return (
            <a key={club.id} href={`/clubs/${club.id}`} className={`card-tint bg-[var(--${tint})] p-6 fade-up block`} style={{ animationDelay: `${i * 60}ms` }}>
              <div className="flex justify-between items-start mb-3">
                <Users className={`text-[var(--${tint}-ink)]`} size={22} />
                <ArrowRight className={`text-[var(--${tint}-ink)] opacity-60`} size={16} />
              </div>
              <h2 className="font-display text-lg mb-1">{club.name}</h2>
              <p className="text-sm text-[var(--ink-dim)] leading-relaxed">{club.description}</p>
            </a>
          );
        })}
      </div>
    </main>
  );
}