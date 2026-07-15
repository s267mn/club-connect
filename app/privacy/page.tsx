import { ShieldCheck } from 'lucide-react';

export default function PrivacyPolicyPage() {
  return (
    <main className="p-6 md:p-10 max-w-3xl mx-auto">
      <div className="flex items-center gap-2 mb-6 fade-up">
        <ShieldCheck className="text-[var(--peach-ink)]" size={22} />
        <h1 className="font-display text-3xl">Privacy Policy</h1>
      </div>

      <div className="card p-6 md:p-8 space-y-6 fade-up text-sm leading-relaxed text-[var(--ink)]">
        <p className="text-[var(--ink-dim)]">Last updated: July 2026</p>

        <p>
          ClubConnect is a student-built platform for NITK Surathkal that helps students track and get verified
          recognition for their contributions to campus clubs. This policy explains what information we collect,
          how it&apos;s used, and who can see it.
        </p>

        <section>
          <h2 className="font-display text-lg mb-2">What we collect</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Your name and NITK email address, provided when you sign up.</li>
            <li>Club memberships, join requests, and roles (member/admin).</li>
            <li>Contributions you submit — titles, descriptions, skill tags, and any files or images you attach.</li>
            <li>Verification scores and feedback given by club admins.</li>
            <li>Likes, comments, and replies you post on the contribution feed.</li>
            <li>An optional profile photo, if you choose to upload one.</li>
          </ul>
        </section>

        <section>
          <h2 className="font-display text-lg mb-2">How it&apos;s used</h2>
          <p>
            Your information is used to run the core features of ClubConnect: showing your verified contribution
            history, calculating your ClubConnect Rating, displaying club membership and leaderboards, and sending
            you notifications about activity relevant to you (approvals, comments, mentions, and similar events).
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg mb-2">Who can see your information</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Your name, profile photo, verified contributions, and ratings are visible to any other logged-in ClubConnect user, since the platform is designed for peer and campus visibility.</li>
            <li>Your email address is visible to other logged-in users on your profile page.</li>
            <li>Club admins can see join requests and pending contributions submitted to their club.</li>
            <li>We do not sell, share, or provide your data to any third party outside of the services (like Supabase, our database and authentication provider) needed to run the app.</li>
          </ul>
        </section>

        <section>
          <h2 className="font-display text-lg mb-2">Data storage</h2>
          <p>
            All data is stored using Supabase, a third-party database and authentication provider. Passwords are
            never stored in plain text — authentication is handled entirely by Supabase&apos;s secure auth system.
            Uploaded files (contribution proof, club logos, profile photos) are stored in Supabase Storage.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg mb-2">Your choices</h2>
          <p>
            You can update your profile photo at any time. If you&apos;d like your account or data removed
            entirely, or have any question about what&apos;s stored about you, reach out using the contact
            information below.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg mb-2">Changes to this policy</h2>
          <p>
            ClubConnect is an evolving student project. This policy may be updated as features change; the
            &quot;last updated&quot; date at the top will reflect the latest revision.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg mb-2">Contact</h2>
          <p>
            ClubConnect is built and maintained by Samanvith, an NITK Surathkal student, as an independent
            project — not an official college service. For questions or data requests, reach out through the
            contact details shared on campus or via the app.
          </p>
        </section>
      </div>
    </main>
  );
}