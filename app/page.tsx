import Link from 'next/link';
import { ArrowRight, ShieldCheck, Loader2 } from 'lucide-react';

export default function Home() {
  return (
    <main className="p-6 md:p-10 max-w-5xl">
      <div className="card p-6 sm:p-8 md:p-12 mb-6 fade-up">
        <p className="text-sm text-[var(--ink-dim)] mb-3">NITK Surathkal</p>
        <h1 className="font-display text-2xl sm:text-3xl md:text-5xl leading-tight mb-4 max-w-2xl">
          Your club work, <span className="text-[var(--peach-ink)]">verified</span> and yours to keep.
        </h1>
        <p className="text-[var(--ink-dim)] max-w-xl mb-8 leading-relaxed text-sm sm:text-base">
          Every edit, event, and late-night build for your club &mdash; logged, signed off by someone who saw it happen, and ready to show off campus.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link href="/clubs" className="btn-primary px-6 py-3 inline-flex items-center gap-2 text-sm">
            Explore Clubs <ArrowRight size={16} />
          </Link>
          <Link href="/signup" className="btn-ghost px-6 py-3 inline-flex items-center gap-2 text-sm">
            Create Your Record
          </Link>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="card-tint bg-[var(--mint)] p-6 fade-up">
          <ShieldCheck className="icon-flip text-[var(--mint-ink)] mb-3" size={22} />
          <p className="font-medium mb-1">Verified</p>
          <p className="text-sm text-[var(--ink-dim)]">Signed off by someone who watched you do the work.</p>
        </div>
        <div className="card-tint bg-[var(--peach)] p-6 fade-up">
          <Loader2 className="icon-spin text-[var(--peach-ink)] mb-3" size={22} />
          <p className="font-medium mb-1">Pending</p>
          <p className="text-sm text-[var(--ink-dim)]">Submitted, waiting on your club admin to review.</p>
        </div>
      </div>
    </main>
  );
}