import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export default async function ClubsPage() {
  const { data: clubs, error } = await supabase.from('clubs').select('*').eq('status', 'approved');

  if (error) {
    return <div className="p-8 text-[var(--magenta)]">Error loading clubs: {error.message}</div>;
  }

  return (
    <main className="min-h-screen px-8 py-16 md:px-16">
      <div className="max-w-3xl mb-12 fade-up">
        <p className="font-mono text-xs tracking-[0.3em] uppercase text-[var(--steel)] mb-4">Club Registry</p>
        <h1 className="font-display text-3xl md:text-4xl text-[var(--cyan)] glow-cyan mb-3">Explore Clubs</h1>
        <p className="text-[var(--steel)]">Every club here has been reviewed and approved. Join one to start building your record.</p>
      </div>

      <div className="max-w-3xl grid gap-4">
        {clubs?.length === 0 && (
          <p className="text-[var(--steel)] panel rounded-lg p-6">No clubs approved yet. Be the first to start one.</p>
        )}
        {clubs?.map((club, i) => (
          <a key={club.id} href={`/clubs/${club.id}`} className="panel rounded-lg p-6 flex items-start justify-between gap-6 fade-up group" style={{ animationDelay: `${i * 60}ms` }}>
            <div className="flex gap-5">
              <span className="font-mono text-xs text-[var(--steel)] pt-1 w-8 shrink-0">{String(i + 1).padStart(2, '0')}</span>
              <div>
                <h2 className="font-display text-xl mb-1 text-[var(--text)] group-hover:text-[var(--cyan)] transition-colors">{club.name}</h2>
                <p className="text-[var(--steel)] max-w-lg">{club.description}</p>
              </div>
            </div>
            <span className="font-mono text-xs text-[var(--steel)] pt-1 shrink-0 group-hover:text-[var(--cyan)] transition-colors">&rarr;</span>
          </a>
        ))}
      </div>
    </main>
  );
}