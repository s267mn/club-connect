'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Users, PlusCircle } from 'lucide-react';
import Link from 'next/link';

type Club = {
  id: string;
  name: string;
  description: string;
  category: string | null;
  logo_url: string | null;
};

type ClubRole = 'faculty' | 'lead' | 'member';

type MembershipMap = Record<string, ClubRole>;

type MemberCountMap = Record<string, number>;

const tintStyles = [
  {
    bg: 'bg-[var(--lavender)]',
    ink: 'text-[var(--lavender-ink)]',
  },
  {
    bg: 'bg-[var(--mint)]',
    ink: 'text-[var(--mint-ink)]',
  },
  {
    bg: 'bg-[var(--peach)]',
    ink: 'text-[var(--peach-ink)]',
  },
  {
    bg: 'bg-[var(--sky)]',
    ink: 'text-[var(--sky-ink)]',
  },
];

/*
 * Converts database roles into the roles used by the UI.
 *
 * Old "admin" records are treated as LEAD.
 */
function normalizeRole(
  role: string | null
): ClubRole | null {
  if (!role) return null;

  const normalized = role.toLowerCase().trim();

  if (normalized === 'faculty') {
    return 'faculty';
  }

  if (normalized === 'lead') {
    return 'lead';
  }

  // Backwards compatibility.
  if (normalized === 'admin') {
    return 'lead';
  }

  if (normalized === 'member') {
    return 'member';
  }

  return null;
}

/*
 * IMPORTANT:
 *
 * Higher number = higher position on the page.
 *
 * Faculty
 * Lead
 * Member
 * Not joined
 */
function getRolePriority(
  role: ClubRole | undefined
): number {
  switch (role) {
    case 'faculty':
      return 4;

    case 'lead':
      return 3;

    case 'member':
      return 2;

    default:
      return 1;
  }
}

function getRoleLabel(role: ClubRole): string {
  switch (role) {
    case 'faculty':
      return 'FACULTY';

    case 'lead':
      return 'LEAD';

    case 'member':
      return 'MEMBER';
  }
}

/*
 * Stronger role-specific visual colors.
 */
function getRoleBadgeClass(
  role: ClubRole
): string {
  switch (role) {
    case 'faculty':
      return `
        bg-[#62558F]
        text-white
        shadow-[0_3px_10px_rgba(98,85,143,0.20)]
      `;

    case 'lead':
      return `
        bg-[#E6783C]
        text-white
        shadow-[0_3px_10px_rgba(230,120,60,0.22)]
      `;

    case 'member':
      return `
        bg-[#3A3936]
        text-white
        shadow-[0_3px_10px_rgba(58,57,54,0.15)]
      `;
  }
}

export default function ClubsPage() {
  const [clubs, setClubs] = useState<Club[]>([]);
  const [memberships, setMemberships] =
    useState<MembershipMap>({});
  const [memberCounts, setMemberCounts] =
    useState<MemberCountMap>({});

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError('');

      try {
        // =====================================================
        // 1. LOAD APPROVED CLUBS
        // =====================================================

        const {
          data: clubsData,
          error: clubsError,
        } = await supabase
          .from('clubs')
          .select(
            'id, name, description, category, logo_url'
          )
          .eq('status', 'approved');

        if (clubsError) {
          throw clubsError;
        }

        const approvedClubs = clubsData ?? [];

        // =====================================================
        // 2. GET CURRENT AUTH USER
        // =====================================================

        const {
          data: sessionData,
        } = await supabase.auth.getSession();

        const authUid =
          sessionData.session?.user.id;

        // =====================================================
        // 3. LOAD CURRENT USER'S MEMBERSHIPS
        // =====================================================

        const membershipMap: MembershipMap = {};

        if (authUid) {
          const {
            data: myMemberships,
            error: membershipError,
          } = await supabase
            .from('club_members')
            .select('club_id, role')
            .eq('user_id', authUid);

          if (membershipError) {
            console.error(
              'Failed to load memberships:',
              membershipError
            );
          }

          (myMemberships ?? []).forEach(
            (membership) => {
              const role = normalizeRole(
                membership.role
              );

              if (role) {
                membershipMap[
                  membership.club_id
                ] = role;
              }
            }
          );
        }

        // =====================================================
        // 4. LOAD ALL CLUB MEMBERS
        //
        // This is NOT filtered by current user.
        // Therefore the count represents everyone in
        // the club.
        // =====================================================

        const {
          data: allMembers,
          error: membersError,
        } = await supabase
          .from('club_members')
          .select('club_id');

        if (membersError) {
          console.error(
            'Failed to load member counts:',
            membersError
          );
        }

        const counts: MemberCountMap = {};

        (allMembers ?? []).forEach((member) => {
          if (!counts[member.club_id]) {
            counts[member.club_id] = 0;
          }

          counts[member.club_id]++;
        });

        // =====================================================
        // 5. SORT
        //
        // EXACT ORDER:
        //
        // FACULTY
        // LEAD
        // MEMBER
        // NOT JOINED
        //
        // Within each group:
        // ALPHABETICAL
        // =====================================================

        const sortedClubs = [...approvedClubs].sort(
          (a, b) => {
            const roleA =
              membershipMap[a.id];

            const roleB =
              membershipMap[b.id];

            const priorityA =
              getRolePriority(roleA);

            const priorityB =
              getRolePriority(roleB);

            // ---------------------------------------------
            // FIRST: ROLE HIERARCHY
            // ---------------------------------------------

            if (priorityA !== priorityB) {
              return priorityB - priorityA;
            }

            // ---------------------------------------------
            // SECOND: ALPHABETICAL
            // ---------------------------------------------

            return a.name.localeCompare(
              b.name,
              undefined,
              {
                sensitivity: 'base',
              }
            );
          }
        );

        setClubs(sortedClubs);
        setMemberships(membershipMap);
        setMemberCounts(counts);
      } catch (err) {
        console.error(err);

        setError(
          err instanceof Error
            ? err.message
            : 'Failed to load clubs.'
        );
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-[var(--ink-dim)]">
        Loading...
      </div>
    );
  }

  // =====================================================
  // ERROR
  // =====================================================

  if (error) {
    return (
      <div className="p-8 text-red-600">
        Error loading clubs: {error}
      </div>
    );
  }

  return (
    <main className="p-6 md:p-10 max-w-5xl">
      {/* =================================================
          PAGE HEADER
      ================================================= */}

      <div className="mb-8 fade-up flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-sm text-[var(--ink)] mb-2">
            Registry
          </p>

          <h1 className="font-display text-3xl mb-2 text-[var(--ink)]">
            Explore Clubs
          </h1>

          <p className="text-[var(--ink)]">
            Every club here has been reviewed and approved.
          </p>
        </div>

        <Link
          href="/clubsrequest"
          className="btn-primary px-5 py-2.5 inline-flex items-center gap-2 text-sm shrink-0"
        >
          <PlusCircle size={16} />
          Start Your Club
        </Link>
      </div>

      {/* =================================================
          EMPTY STATE
      ================================================= */}

      {clubs.length === 0 && (
        <div className="card p-8 text-center fade-up">
          <p className="text-[var(--ink-dim)]">
            No clubs approved yet. Be the first to start one.
          </p>
        </div>
      )}

      {/* =================================================
          CLUB GRID
      ================================================= */}

      <div className="grid md:grid-cols-2 gap-4">
        {clubs.map((club, i) => {
          const tint =
            tintStyles[i % tintStyles.length];

          const role =
            memberships[club.id];

          const totalMembers =
            memberCounts[club.id] ?? 0;

          return (
            <Link
              key={club.id}
              href={`/clubs/${club.id}`}
              className={`
                card-tint
                ${tint.bg}
                p-6
                fade-up
                block
                transition-all
                duration-200
                hover:-translate-y-0.5
              `}
              style={{
                animationDelay: `${i * 60}ms`,
              }}
            >
              {/* =================================================
                  TOP SECTION
                  
                  LOGO
                  ROLE
                  MEMBER COUNT
              ================================================= */}

              <div
                className="
                  flex
                  items-center
                  gap-3
                  mb-7
                  min-w-0
                "
              >
                {/* ---------------------------------------------
                    LOGO
                --------------------------------------------- */}

                <div
                  className="
                    w-16
                    h-16
                    rounded-2xl
                    bg-white/75
                    flex
                    items-center
                    justify-center
                    shrink-0
                    overflow-hidden
                    border
                    border-black/[0.04]
                  "
                >
                  {club.logo_url ? (
                    <img
                      src={club.logo_url}
                      alt={`${club.name} logo`}
                      className="
                        w-full
                        h-full
                        object-cover
                      "
                    />
                  ) : (
                    <Users
                      className={tint.ink}
                      size={28}
                    />
                  )}
                </div>

                {/* ---------------------------------------------
                    ROLE BADGE
                --------------------------------------------- */}

                {role && (
                  <span
                    className={`
                      inline-flex
                      items-center
                      justify-center
                      px-3.5
                      h-8
                      rounded-full
                      text-[10px]
                      font-semibold
                      tracking-[0.11em]
                      whitespace-nowrap
                      shrink-0
                      ${getRoleBadgeClass(role)}
                    `}
                  >
                    {getRoleLabel(role)}
                  </span>
                )}

                {/* ---------------------------------------------
                    PUSH EVERYTHING ELSE TO RIGHT
                --------------------------------------------- */}

                <div className="flex-1" />

                {/* ---------------------------------------------
                    TOTAL MEMBER COUNT
                --------------------------------------------- */}

                <div
                  className="
                    flex
                    items-center
                    gap-2
                    shrink-0
                    text-[var(--ink-dim)]
                  "
                >
                  <Users
                    size={15}
                    strokeWidth={1.8}
                  />

                  <span
                    className="
                      text-xs
                      font-medium
                      whitespace-nowrap
                    "
                  >
                    {totalMembers}{' '}
                    {totalMembers === 1
                      ? 'member'
                      : 'members'}
                  </span>
                </div>
              </div>

              {/* =================================================
                  CLUB INFORMATION
              ================================================= */}

              <div className="min-w-0">
                <h2
                  className="
                    font-display
                    text-lg
                    leading-snug
                    mb-2
                    text-[var(--ink)]
                  "
                >
                  {club.name}
                </h2>

                {club.category && (
                  <p
                    className="
                      text-xs
                      uppercase
                      tracking-wide
                      text-[var(--ink-dim)]
                      opacity-70
                      mb-2
                    "
                  >
                    {club.category}
                  </p>
                )}

                <p
                  className="
                    text-sm
                    text-[var(--ink-dim)]
                    leading-relaxed
                  "
                >
                  {club.description}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </main>
  );
}