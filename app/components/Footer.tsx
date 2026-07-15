import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="mt-auto px-8 py-6 md:px-16 border-t border-[rgba(139,149,168,0.15)]">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <p className="font-mono text-[11px] tracking-wide text-[var(--steel)]/60">
          ClubConnect &middot; Built by Samanvith M N &middot; NITK Surathkal &middot; &copy; 2026
        </p>
        <div className="flex items-center gap-4">
          <Link href="/privacy" className="font-mono text-[11px] tracking-wide text-[var(--steel)]/60 hover:text-[var(--steel)] transition-colors">
            Privacy Policy
          </Link>
          <Link href="/terms" className="font-mono text-[11px] tracking-wide text-[var(--steel)]/60 hover:text-[var(--steel)] transition-colors">
            Terms of Use
          </Link>
        </div>
      </div>
    </footer>
  );
}