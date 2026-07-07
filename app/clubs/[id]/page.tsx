import { supabase } from '@/lib/supabase';
import ClubMembers from './ClubMembers';

export default async function ClubDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const { data: club, error } = await supabase.from('clubs').select('*').eq('id', id).single();

  if (error || !club) {
    return <div className="p-8 text-[var(--magenta)]">Club not found.</div>;
  }

  return (
    <main className="min-h-screen px-8 py-16 md:px-16">
      <div className="max-w-3xl mb-12 fade-up">
        <a href="/clubs" className="font-mono text-xs uppercase tracking-widest text-[var(--steel)] hover:text-[var(--cyan)] transition-colors">&larr; Registry</a>
        <h1 className="font-display text-3xl md:text-4xl text-[var(--gold)] glow-gold mt-4 mb-3">{club.name}</h1>
        <p className="text-[var(--steel)] max-w-xl">{club.description}</p>
      </div>

      <div className="max-w-3xl">
        <ClubMembers clubId={club.id} />
      </div>
    </main>
  );
}