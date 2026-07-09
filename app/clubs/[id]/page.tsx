'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { calculateOverallRating } from '@/lib/ratingFormula';
import ClubMembers from './ClubMembers';
import ClubLogoUpload from '@/components/ClubLogoUpload';
import { ArrowLeft, Users, FileCheck, Star } from 'lucide-react';

type Club = { id: string; name: string; description: string; category: string | null; logo_url: string | null; created_by: string };

export default function ClubDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [club, setClub] = useState<Club | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [memberCount, setMemberCount] = useState(0);
  const [verifiedCount, setVerifiedCount] = useState(0);
  const [topContributor, setTopContributor] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);

      const { data: clubData, error } = await supabase.from('clubs').select('*').eq('id', id).single();
      if (error || !clubData) { setNotFound(true); setLoading(false); return; }
      setClub(clubData as Club);

      const { data: sessionData } = await supabase.auth.getSession();
      const authUid = sessionData.session?.user.id;

      if (authUid) {
        const { data: myMembership } = await supabase
          .from('club_members')
          .select('role')
          .eq('club_id', id)
          .eq('user_id', authUid)
          .maybeSingle();
        setIsAdmin(myMembership?.role === 'admin');
      }

      const { count: members } = await supabase
        .from('club_members')
        .select('*', { count: 'exact', head: true })
        .eq('club_id', id);
      setMemberCount(members ?? 0);

      const { data: contribs } = await supabase
        .from('contributions')
        .select('user_id, score, users!contributions_user_id_fkey(name)')
        .eq('club_id', id)
        .eq('status', 'verified');

      const contribList = (contribs as any[]) ?? [];
      setVerifiedCount(contribList.length);

      if (contribList.length > 0) {
        const perUser: { [uid: string]: { total: number; count: number; name: string } } = {};
        contribList.forEach((c) => {
          if (!perUser[c.user_id]) perUser[c.user_id] = { total: 0, count: 0, name: c.users?.name ?? 'Unknown' };
          perUser[c.user_id].total += c.score;
          perUser[c.user_id].count += 1;
        });

        let bestName = '';
        let bestRating = -1;
        Object.values(perUser).forEach((agg) => {
          const rating = calculateOverallRating({
            avgScore: agg.total / agg.count,
            contributionCount: agg.count,
            distinctSkills: 1,
            clubsJoined: 1,
          });
          if (rating > bestRating) { bestRating = rating; bestName = agg.name; }
        });
        setTopContributor(bestName);
      }

      setLoading(false);
    };

    load();
  }, [id]);

  if (loading) return <div className="min-h-screen flex items-center justify-center text-sm text-[var(--ink-dim)]">Loading...</div>;
  if (notFound || !club) return <div className="p-8 text-red-600">Club not found.</div>;

  return (
    <main className="p-6 md:p-10 max-w-5xl">
      <a href="/clubs" className="inline-flex items-center gap-1.5 text-sm text-[var(--ink-dim)] hover:text-[var(--ink)] mb-6 fade-up">
        <ArrowLeft size={14} /> Registry
      </a>

      <div className="card p-6 md:p-8 mb-6 fade-up">
        <div className="flex items-start gap-5">
          <div className="w-16 h-16 rounded-2xl bg-[var(--peach)] flex items-center justify-center shrink-0 overflow-hidden">
            {club.logo_url ? (
              <img src={club.logo_url} alt={club.name} className="w-full h-full object-cover" />
            ) : (
              <span className="font-display text-xl text-[var(--peach-ink)]">{club.name.charAt(0)}</span>
            )}
          </div>

          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h1 className="font-display text-2xl">{club.name}</h1>
              {club.category && (
                <span className="text-xs px-2.5 py-1 rounded-full bg-[var(--border)] text-[var(--ink-dim)] uppercase tracking-wide">
                  {club.category}
                </span>
              )}
            </div>
            <p className="text-[var(--ink-dim)] max-w-xl">{club.description}</p>

            {isAdmin && (
              <div className="mt-3">
                <ClubLogoUpload
                  clubId={club.id}
                  currentLogoUrl={club.logo_url}
                  onUploaded={(url) => setClub((prev) => prev ? { ...prev, logo_url: url } : prev)}
                />
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 mt-6">
          <div className="card-tint bg-[var(--lavender)] p-4 flex items-center gap-3">
            <Users className="text-[var(--lavender-ink)]" size={18} />
            <div>
              <p className="text-xs text-[var(--ink-dim)]">Members</p>
              <p className="font-display text-lg text-[var(--lavender-ink)]">{memberCount}</p>
            </div>
          </div>
          <div className="card-tint bg-[var(--mint)] p-4 flex items-center gap-3">
            <FileCheck className="text-[var(--mint-ink)]" size={18} />
            <div>
              <p className="text-xs text-[var(--ink-dim)]">Verified Contributions</p>
              <p className="font-display text-lg text-[var(--mint-ink)]">{verifiedCount}</p>
            </div>
          </div>
          <div className="card-tint bg-[var(--peach)] p-4 flex items-center gap-3">
            <Star className="text-[var(--peach-ink)]" size={18} />
            <div>
              <p className="text-xs text-[var(--ink-dim)]">Top Contributor</p>
              <p className="font-display text-sm text-[var(--peach-ink)] truncate">{topContributor ?? '—'}</p>
            </div>
          </div>
        </div>
      </div>

      <ClubMembers clubId={club.id} />
    </main>
  );
}