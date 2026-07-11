'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Users } from 'lucide-react';

type Club = { id: string; name: string; description: string; category: string | null; logo_url: string | null };
type MembershipMap = { [clubId: string]: 'member' | 'admin' };

const tintStyles = [
  { bg: 'bg-[var(--lavender)]', ink: 'text-[var(--lavender-ink)]' },
  { bg: 'bg-[var(--mint)]', ink: 'text-[var(--mint-ink)]' },
  { bg: 'bg-[var(--peach)]', ink: 'text-[var(--peach-ink)]' },
  { bg: 'bg-[var(--sky)]', ink: 'text-[var(--sky-ink)]' },
];

export default function ClubsPage() {
  const [clubs, setClubs] = useState<Club[]>([]);
  const [memberships, setMemberships] = useState<MembershipMap>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);

      const { data: clubsData, error: clubsError } = await supabase.from('clubs').select('*').eq('status', 'approved');
      if (clubsError) { setError(clubsError.message); setLoading(false); return; }

      const { data: sessionData } = await supabase.auth.getSession();
      const authUid = sessionData.session?.user.id;

      let membershipMap: MembershipMap = {};
      if (authUid) {
        const { data: myMemberships } = await supabase
          .from('club_members')
          .select('club_id, role')
          .eq('user_id', authUid);

        (myMemberships ?? []).forEach((m: any) => {
          membershipMap[m.club_id] = m.role;
        });
      }

      // Sort: clubs the viewer belongs to come first, rest keep original order
      const sorted = [...(clubsData ?? [])].sort((a, b) => {
        const aIn = membershipMap[a.id] ? 1 : 0;
        const bIn = membershipMap[b.id] ? 1 : 0;
        return bIn - aIn;
      });

      setClubs(sorted);
      setMemberships(membershipMap);
      setLoading(false);
    };

    load();
  }, []);

  if (loading) return <div className="min-h-screen flex items-center justify-center text-sm text-[var(--ink-dim)]">Loading...</div>;
  if (error) return <div className="p-8 text-red-600">Error loading clubs: {error}</div>;

  return (
    <main className="p-6 md:p-10 max-w-5xl">
      <div className="mb-8 fade-up">
        <p className="text-sm text-[var(--ink)] mb-2">Registry</p>
        <h1 className="font-display text-3xl mb-2 text-[var(--ink)]">Explore Clubs</h1>
        <p className="text-[var(--ink)]">Every club here has been reviewed and approved.</p>
      </div>

      {clubs.length === 0 && (
        <div className="card p-8 text-center fade-up">
          <p className="text-[var(--ink-dim)]">No clubs approved yet. Be the first to start one.</p>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        {clubs.map((club, i) => {
          const tint = tintStyles[i % tintStyles.length];
          const role = memberships[club.id];

          return (
            <a key={club.id} href={`/clubs/${club.id}`} className={`card-tint ${tint.bg} p-6 fade-up block relative`} style={{ animationDelay: `${i * 60}ms` }}>
              {role && (
                <span className={`absolute top-4 right-4 text-[10px] font-semibold uppercase tracking-wide px-2 py-1 rounded-full ${role === 'admin' ? 'bg-[var(--peach-ink)] text-white' : 'bg-white/70 text-[var(--ink)]'}`}>
                  {role}
                </span>
              )}

              <div className="flex items-start gap-4">
                <div className="w-16 h-16 rounded-2xl bg-white/50 flex items-center justify-center shrink-0 overflow-hidden">
                  {club.logo_url ? (
                    <img src={club.logo_url} alt={club.name} className="w-full h-full object-cover" />
                  ) : (
                    <Users className={tint.ink} size={28} />
                  )}
                </div>

                <div className="flex-1 min-w-0 pr-6">
                  <h2 className="font-display text-lg mb-1">{club.name}</h2>
                  {club.category && (
                    <p className="text-xs uppercase tracking-wide text-[var(--ink-dim)] opacity-70 mb-1.5">{club.category}</p>
                  )}
                  <p className="text-sm text-[var(--ink-dim)] leading-relaxed">{club.description}</p>
                </div>
              </div>
            </a>
          );
        })}
      </div>
    </main>
  );
}