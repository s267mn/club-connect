'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard,
  ShieldCheck,
  GraduationCap,
  UserRound,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';

import VerifyContributions from '../../clubs/[id]/VerifyContributions';
import FacultyReview, {
  ROLE_LABELS,
} from '@/components/FacultyReview';
import MemberContributionView from '@/components/MemberContributionView';
import ManageClubLeads from '@/components/ManageClubLeads';

type ManagedClub = {
  club_id: string;
  role: 'admin' | 'faculty' | 'member';
  clubs: {
    name: string;
    logo_url: string | null;
  } | null;
};

type ViewType =
  | 'lead'
  | 'faculty'
  | 'member';

export default function ClubManagementDashboard() {
  const [checking, setChecking] = useState(true);
  const [loading, setLoading] = useState(true);

  const [leadClubs, setLeadClubs] =
    useState<ManagedClub[]>([]);

  const [facultyClubs, setFacultyClubs] =
    useState<ManagedClub[]>([]);

  const [memberClubs, setMemberClubs] =
    useState<ManagedClub[]>([]);

  const [activeView, setActiveView] =
    useState<ViewType>('lead');

  const router = useRouter();

  useEffect(() => {
    const init = async () => {
      setChecking(true);

      const { data: sessionData } =
        await supabase.auth.getSession();

      const email =
        sessionData.session?.user.email;

      if (!email) {
        router.push('/login');
        return;
      }

      const { data: userRow, error } =
        await supabase
          .from('users')
          .select('id')
          .eq('email', email)
          .single();

      if (error || !userRow?.id) {
        router.push('/');
        return;
      }

      setChecking(false);

      await loadManagedClubs(userRow.id);
    };

    init();
  }, [router]);

  const loadManagedClubs = async (
    uid: string
  ) => {
    setLoading(true);

    /*
     * ---------------------------------------------------------
     * ADMIN / LEAD + FACULTY
     * ---------------------------------------------------------
     */

    const {
      data: memberships,
      error: membershipError,
    } = await supabase
      .from('club_members')
      .select(`
        club_id,
        role,
        clubs (
          name,
          logo_url
        )
      `)
      .eq('user_id', uid)
      .in('role', ['admin', 'faculty']);

    if (membershipError) {
      console.error(
        'Failed to load managed clubs:',
        membershipError
      );
    }

    const allManaged =
      (memberships as unknown as ManagedClub[]) ??
      [];

    const leads = allManaged.filter(
      (club) => club.role === 'admin'
    );

    let faculty = allManaged.filter(
      (club) => club.role === 'faculty'
    );

    /*
     * ---------------------------------------------------------
     * FOUNDER FALLBACK
     *
     * If a club has no Faculty Advisor, its creator gets
     * the Faculty Advisor tier.
     * ---------------------------------------------------------
     */

    const {
      data: createdClubs,
      error: createdError,
    } = await supabase
      .from('clubs')
      .select('id, name, logo_url')
      .eq('created_by', uid);

    if (createdError) {
      console.error(
        'Failed to load created clubs:',
        createdError
      );
    }

    if (createdClubs?.length) {
      const existingFacultyIds =
        new Set(
          faculty.map(
            (club) => club.club_id
          )
        );

      for (const club of createdClubs) {
        if (
          existingFacultyIds.has(club.id)
        ) {
          continue;
        }

        const {
          data: facultyRows,
          error: facultyError,
        } = await supabase
          .from('club_members')
          .select('id')
          .eq('club_id', club.id)
          .eq('role', 'faculty')
          .limit(1);

        if (facultyError) {
          console.error(
            `Failed to check faculty for ${club.name}:`,
            facultyError
          );

          continue;
        }

        if (
          !facultyRows ||
          facultyRows.length === 0
        ) {
          faculty.push({
            club_id: club.id,
            role: 'faculty',
            clubs: {
              name: club.name,
              logo_url: club.logo_url,
            },
          });
        }
      }
    }

    /*
     * ---------------------------------------------------------
     * NORMAL MEMBER CLUBS
     * ---------------------------------------------------------
     */

    const {
      data: memberMemberships,
      error: memberError,
    } = await supabase
      .from('club_members')
      .select(`
        club_id,
        role,
        clubs (
          name,
          logo_url
        )
      `)
      .eq('user_id', uid)
      .eq('role', 'member');

    if (memberError) {
      console.error(
        'Failed to load member clubs:',
        memberError
      );
    }

    const members =
      (memberMemberships as unknown as ManagedClub[]) ??
      [];

    setLeadClubs(leads);
    setFacultyClubs(faculty);
    setMemberClubs(members);

    if (leads.length > 0) {
      setActiveView('lead');
    } else if (faculty.length > 0) {
      setActiveView('faculty');
    } else {
      setActiveView('member');
    }

    setLoading(false);
  };

  if (checking || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-[var(--ink-dim)]">
        Loading...
      </div>
    );
  }

  const hasLead =
    leadClubs.length > 0;

  const hasFaculty =
    facultyClubs.length > 0;

  const hasMember =
    memberClubs.length > 0;

  const views: {
    id: ViewType;
    label: string;
    icon: React.ReactNode;
  }[] = [];

  if (hasLead) {
    views.push({
      id: 'lead',
      label: 'Lead',
      icon: (
        <ShieldCheck size={15} />
      ),
    });
  }

  if (hasFaculty) {
    views.push({
      id: 'faculty',
      label: 'Faculty Advisor',
      icon: (
        <GraduationCap size={15} />
      ),
    });
  }

  if (hasMember) {
    views.push({
      id: 'member',
      label: 'Member',
      icon: (
        <UserRound size={15} />
      ),
    });
  }

  const visibleClubs =
    activeView === 'lead'
      ? leadClubs
      : activeView === 'faculty'
        ? facultyClubs
        : memberClubs;

  if (views.length === 0) {
    return (
      <main className="p-6 md:p-10 max-w-5xl mx-auto">
        <div className="card p-8 text-center fade-up">
          <p className="text-sm text-[var(--ink-dim)]">
            You don&apos;t currently belong to
            any clubs.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="p-6 md:p-10 max-w-5xl mx-auto">
      {/* Header */}

      <div className="flex items-center gap-2 mb-7 fade-up">
        <LayoutDashboard
          size={22}
          className="text-[var(--peach-ink)]"
        />

        <h1 className="font-display text-2xl">
          Club Management
        </h1>
      </div>

      {/* View tabs */}

      {views.length > 1 && (
        <div className="flex items-center gap-6 border-b border-[var(--border)] mb-8 fade-up">
          {views.map((view) => {
            const active =
              activeView === view.id;

            return (
              <button
                key={view.id}
                type="button"
                onClick={() =>
                  setActiveView(view.id)
                }
                className={`
                  relative
                  -mb-px
                  pb-3
                  text-sm
                  font-medium
                  inline-flex
                  items-center
                  gap-2
                  cursor-pointer
                  transition-colors
                  ${
                    active
                      ? view.id ===
                        'faculty'
                        ? 'text-[var(--lavender-ink)]'
                        : 'text-[var(--peach-ink)]'
                      : 'text-[var(--ink-dim)] hover:text-[var(--ink)]'
                  }
                `}
              >
                {view.icon}

                {view.label}

                {active && (
                  <span
                    className={`
                      absolute
                      left-0
                      right-0
                      bottom-0
                      h-0.5
                      ${
                        view.id ===
                        'faculty'
                          ? 'bg-[var(--lavender-ink)]'
                          : 'bg-[var(--peach-ink)]'
                      }
                    `}
                  />
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Current view */}

      {views.length === 1 && (
        <p className="mb-7 text-sm text-[var(--ink-dim)] inline-flex items-center gap-2">
          {views[0].icon}

          Showing your{' '}
          {activeView === 'lead'
            ? 'Lead'
            : activeView ===
                'faculty'
              ? 'Faculty Advisor'
              : 'Member'}{' '}
          clubs
        </p>
      )}

      {/* No clubs in current view */}

      {visibleClubs.length === 0 && (
        <div className="py-16 text-center">
          <p className="text-sm text-[var(--ink-dim)]">
            No clubs in this view.
          </p>
        </div>
      )}

      {/* Clubs */}

      <div className="space-y-10">
        {visibleClubs.map((club) => (
          <section
            key={club.club_id}
            className="fade-up"
          >
            {/* Club identity */}

            <div className="flex items-center justify-between gap-4 mb-4">
              <Link
                href={`/clubs/${club.club_id}`}
                className="group flex items-center gap-3 min-w-0"
              >
                {/* Logo */}

                <div className="w-11 h-11 rounded-xl overflow-hidden shrink-0 border border-[var(--border)] bg-[var(--peach)] flex items-center justify-center">
                  {club.clubs?.logo_url ? (
                    <img
                      src={
                        club.clubs.logo_url
                      }
                      alt={
                        club.clubs.name
                      }
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="font-display text-sm text-[var(--peach-ink)]">
                      {club.clubs?.name
                        ?.charAt(0)
                        ?.toUpperCase() ??
                        'C'}
                    </span>
                  )}
                </div>

                <div className="min-w-0">
                  <h2 className="font-display text-lg truncate group-hover:text-[var(--peach-ink)] transition-colors">
                    {club.clubs?.name ??
                      'Club'}
                  </h2>

                  <p className="text-xs text-[var(--ink-dim)] mt-0.5">
                    {activeView ===
                    'lead'
                      ? 'Lead management'
                      : activeView ===
                          'faculty'
                        ? 'Faculty Advisor management'
                        : 'Your contributions'}
                  </p>
                </div>

                <ChevronRight
                  size={16}
                  className="shrink-0 text-[var(--ink-dim)] opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all"
                />
              </Link>

              <Link
                href={`/clubs/${club.club_id}`}
                className="shrink-0 text-xs text-[var(--ink-dim)] hover:text-[var(--ink)] inline-flex items-center gap-1"
              >
                Open club
                <ExternalLink
                  size={12}
                />
              </Link>
            </div>

            {/* =====================================================
                LEAD VIEW
                ===================================================== */}

            {activeView === 'lead' && (
              <VerifyContributions
                clubId={club.club_id}
              />
            )}

            {/* =====================================================
                FACULTY VIEW

                Faculty gets BOTH:
                1. Lead powers
                2. Faculty powers
                3. Manage Lead powers
                ===================================================== */}

            {activeView ===
              'faculty' && (
              <div className="space-y-8">
                {/* Lead contribution management */}

                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <ShieldCheck
                      size={16}
                      className="text-[var(--peach-ink)]"
                    />

                    <h3 className="text-sm font-semibold">
                      Contribution Management
                    </h3>

                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-[var(--peach)] text-[var(--peach-ink)]">
                      Lead powers
                    </span>
                  </div>

                  <VerifyContributions
                    clubId={
                      club.club_id
                    }
                  />
                </div>

                {/* Lead management */}

                <ManageClubLeads
                  clubId={
                    club.club_id
                  }
                />

                {/* Existing Faculty powers */}

                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <GraduationCap
                      size={16}
                      className="text-[var(--lavender-ink)]"
                    />

                    <h3 className="text-sm font-semibold">
                      Faculty Advisor Review
                    </h3>
                  </div>

                  <FacultyReview
                    clubId={
                      club.club_id
                    }
                  />
                </div>
              </div>
            )}

            {/* =====================================================
                MEMBER VIEW
                ===================================================== */}

            {activeView ===
              'member' && (
              <MemberContributionView
                clubId={club.club_id}
              />
            )}
          </section>
        ))}
      </div>
    </main>
  );
}