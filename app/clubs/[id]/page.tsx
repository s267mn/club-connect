import { supabase } from '@/lib/supabase';
import ClubMembers from './ClubMembers';
import { ArrowLeft } from 'lucide-react';

export default async function ClubDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { data: club, error } = await supabase.from('clubs').select('*').eq('id', id).single();

  if (error || !club) return <div className="p-8 text-red-600">Club not found.</div>;

  return (
    <main className="p-6 md:p-10 max-w-5xl">
      <a href="/clubs" className="inline-flex items-center gap-1.5 text-sm text-[var(--ink-dim)] hover:text-[var(--ink)] mb-6 fade-up">
        <ArrowLeft size={14} /> Registry
      </a>

      <div className="card p-6 md:p-8 mb-6 fade-up">
        <h1 className="font-display text-2xl mb-2">{club.name}</h1>
        <p className="text-[var(--ink-dim)] max-w-xl">{club.description}</p>
      </div>

      <ClubMembers clubId={club.id} />
    </main>
  );
}