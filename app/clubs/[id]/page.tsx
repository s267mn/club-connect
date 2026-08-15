'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import ClubMembers from './ClubMembers';
import ClubLogoUpload from '@/components/ClubLogoUpload';
import ClubContributionFeed from '@/components/ClubContributionFeed';
import { ArrowLeft } from 'lucide-react';

type Club = {
  id: string;
  name: string;
  description: string;
  category: string | null;
  logo_url: string | null;
  created_by: string;
  status: string;
};

export default function ClubDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();

  const [club, setClub] = useState<Club | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setNotFound(false);

      /*
       * ------------------------------------------------------
       * LOAD CLUB
       * ------------------------------------------------------
       */

      const {
        data: clubData,
        error: clubError,
      } = await supabase
        .from('clubs')
        .select(
          'id, name, description, category, logo_url, created_by, status'
        )
        .eq('id', id)
        .single();

      if (clubError || !clubData) {
        console.error('Failed to load club:', clubError);
        setNotFound(true);
        setLoading(false);
        return;
      }

      /*
       * ------------------------------------------------------
       * RESOLVE CURRENT USER
       * ------------------------------------------------------
       */

      const {
        data: sessionData,
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        console.error(
          'Failed to get session:',
          sessionError
        );
      }

      const authEmail =
        sessionData.session?.user.email;

      let resolvedUserId: string | null = null;

      if (authEmail) {
        const {
          data: userRow,
          error: userError,
        } = await supabase
          .from('users')
          .select('id')
          .eq('email', authEmail)
          .maybeSingle();

        if (userError) {
          console.error(
            'Failed to resolve current user:',
            userError
          );
        }

        resolvedUserId = userRow?.id ?? null;
      }

      /*
       * ------------------------------------------------------
       * ACCESS CHECK FOR UNAPPROVED CLUBS
       * ------------------------------------------------------
       *
       * Approved clubs are visible normally.
       *
       * Unapproved clubs are only accessible to:
       * - the club creator
       * - a club admin
       */

      if (clubData.status !== 'approved') {
        let hasAccess = false;

        if (resolvedUserId) {
          /*
           * Club creator
           */
          if (
            clubData.created_by ===
            resolvedUserId
          ) {
            hasAccess = true;
          } else {
            /*
             * Club admin
             */
            const {
              data: membershipCheck,
              error: membershipError,
            } = await supabase
              .from('club_members')
              .select('role')
              .eq('club_id', id)
              .eq('user_id', resolvedUserId)
              .maybeSingle();

            if (membershipError) {
              console.error(
                'Failed to check club membership:',
                membershipError
              );
            }

            if (
              membershipCheck?.role ===
              'admin'
            ) {
              hasAccess = true;
            }
          }
        }

        if (!hasAccess) {
          setNotFound(true);
          setLoading(false);
          return;
        }
      }

      setClub(clubData as Club);

      /*
       * ------------------------------------------------------
       * DETERMINE ADMIN ACCESS
       * ------------------------------------------------------
       *
       * This is only used for club-specific actions such
       * as changing the club logo.
       *
       * Contribution verification and faculty review do NOT
       * belong on this page anymore.
       */

      if (resolvedUserId) {
        const {
          data: membership,
          error: membershipError,
        } = await supabase
          .from('club_members')
          .select('role')
          .eq('club_id', id)
          .eq('user_id', resolvedUserId)
          .maybeSingle();

        if (membershipError) {
          console.error(
            'Failed to load current membership:',
            membershipError
          );
        }

        setIsAdmin(
          membership?.role === 'admin' ||
            clubData.created_by ===
              resolvedUserId
        );
      } else {
        setIsAdmin(false);
      }

      setLoading(false);
    };

    load();
  }, [id]);

  /*
   * --------------------------------------------------------
   * LOADING
   * --------------------------------------------------------
   */

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-[var(--ink-dim)]">
        Loading...
      </div>
    );
  }

  /*
   * --------------------------------------------------------
   * NOT FOUND
   * --------------------------------------------------------
   */

  if (notFound || !club) {
    return (
      <main className="p-8">
        <div className="text-red-600">
          Club not found.
        </div>
      </main>
    );
  }

  /*
   * --------------------------------------------------------
   * CLUB PAGE
   * --------------------------------------------------------
   */

  return (
    <main className="p-6 md:p-10 max-w-5xl mx-auto">

      {/* Back to registry */}

      <Link
        href="/clubs"
        className="inline-flex items-center gap-1.5 text-sm text-[var(--ink-dim)] hover:text-[var(--ink)] mb-6 fade-up transition-colors"
      >
        <ArrowLeft size={14} />
        Registry
      </Link>

      {/* ================================================== */}
      {/* CLUB HEADER */}
      {/* ================================================== */}

      <section className="card p-6 md:p-8 mb-8 fade-up">

        <div className="flex items-start gap-5">

          {/* Club logo */}

          <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-[var(--peach)] flex items-center justify-center shrink-0 overflow-hidden">

            {club.logo_url ? (
              <img
                src={club.logo_url}
                alt={club.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="font-display text-2xl md:text-3xl text-[var(--peach-ink)]">
                {club.name.charAt(0)}
              </span>
            )}

          </div>

          {/* Club information */}

          <div className="flex-1 min-w-0">

            <div className="flex items-center gap-2 flex-wrap mb-2">

              <h1 className="font-display text-2xl md:text-3xl leading-tight">
                {club.name}
              </h1>

              {club.category && (
                <span className="text-xs px-2.5 py-1 rounded-full bg-[var(--border)] text-[var(--ink-dim)] uppercase tracking-wide">
                  {club.category}
                </span>
              )}

            </div>

            <p className="text-[var(--ink-dim)] leading-relaxed max-w-2xl">
              {club.description}
            </p>

            {/* Admin-only logo management */}

            {isAdmin && (
              <div className="mt-4">
                <ClubLogoUpload
                  clubId={club.id}
                  currentLogoUrl={
                    club.logo_url
                  }
                  onUploaded={(url) =>
                    setClub((prev) =>
                      prev
                        ? {
                            ...prev,
                            logo_url: url,
                          }
                        : prev
                    )
                  }
                />
              </div>
            )}

          </div>

        </div>

      </section>

      {/* ================================================== */}
      {/* MEMBERS / JOIN / SUBMIT CONTRIBUTION */}
      {/* ================================================== */}

      <ClubMembers
        clubId={club.id}
      />

      {/* ================================================== */}
      {/* CONTRIBUTION FEED */}
      {/* ================================================== */}

      <ClubContributionFeed
        clubId={club.id}
      />

    </main>
  );
}