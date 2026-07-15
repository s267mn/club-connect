import { FileText } from 'lucide-react';

export default function TermsOfUsePage() {
  return (
    <main className="p-6 md:p-10 max-w-3xl mx-auto">
      <div className="flex items-center gap-2 mb-6 fade-up">
        <FileText className="text-[var(--peach-ink)]" size={22} />
        <h1 className="font-display text-3xl">Terms of Use</h1>
      </div>

      <div className="card p-6 md:p-8 space-y-6 fade-up text-sm leading-relaxed text-[var(--ink)]">
        <p className="text-[var(--ink-dim)]">Last updated: July 2026</p>

        <p>
          Welcome to ClubConnect. By creating an account, you agree to the terms below. Please read them, 
          they&apos;re short, and written to be genuinely understandable.
        </p>

        <section>
          <h2 className="font-display text-lg mb-2">What ClubConnect is</h2>
          <p>
            ClubConnect is an independent, student-built platform for NITK Surathkal students to record and get
            verified recognition for their contributions to campus clubs. It is not an official NITK service, and
            is not affiliated with or endorsed by the institute administration.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg mb-2">Eligibility</h2>
          <p>
            ClubConnect is intended for current NITK Surathkal students with a valid @nitk.edu.in email address.
            Accounts created with false information, or on behalf of someone else without their consent, may be
            removed.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg mb-2">Your content</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>You&apos;re responsible for what you submit — contribution descriptions, comments, files, and your profile photo.</li>
            <li>Don&apos;t submit content that&apos;s false, plagiarized, offensive, or that misrepresents someone else&apos;s work as your own.</li>
            <li>Club admins are trusted to verify contributions honestly. Misuse of admin verification (e.g. approving false or unearned contributions) may result in admin privileges being revoked.</li>
          </ul>
        </section>

        <section>
          <h2 className="font-display text-lg mb-2">Acceptable use</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Don&apos;t harass, impersonate, or spam other users.</li>
            <li>Don&apos;t attempt to access accounts, data, or admin functions that aren&apos;t yours.</li>
            <li>Don&apos;t use automated tools to scrape, spam, or abuse the platform.</li>
          </ul>
        </section>

        <section>
          <h2 className="font-display text-lg mb-2">Ratings and verification</h2>
          <p>
            Contribution scores, the ClubConnect Rating, and leaderboard rankings are calculated based on
            club-admin verification and are meant for campus recognition purposes. They are not official
            institute credentials or academic records.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg mb-2">No warranty</h2>
          <p>
            ClubConnect is provided as-is, as a student project. We do our best to keep it working reliably and
            fix issues promptly, but we can&apos;t guarantee uninterrupted availability or that it&apos;s free of
            bugs.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg mb-2">Changes</h2>
          <p>
            These terms may be updated as ClubConnect evolves. Continued use of the platform after changes means
            you accept the updated terms.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg mb-2">Contact</h2>
          <p>
            Questions, concerns, or content disputes can be raised directly with the ClubConnect team
            (built by Samanvith) through the contact details shared on campus or via the app
            (Email: samanvithmn135@gmail.com).
          </p>
        </section>
      </div>
    </main>
  );
}