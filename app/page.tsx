export default function Home() {
  return (
    <main className="min-h-screen flex flex-col justify-center px-8 py-20 md:px-16 relative overflow-hidden">
      <div className="max-w-3xl relative z-10">
        <p className="font-mono text-xs tracking-[0.3em] uppercase text-[var(--steel)] mb-6 fade-up" style={{ animationDelay: '0ms' }}>NITK Surathkal &middot; Registry Online</p>

        <h1 className="font-display text-4xl md:text-6xl leading-[1.15] mb-8 fade-up" style={{ animationDelay: '80ms' }}>
          <span className="text-[var(--cyan)] glow-cyan">CLUB</span>{' '}
          <span className="text-[var(--gold)] glow-gold">CONNECT</span>
        </h1>

        <p className="text-lg text-[var(--steel)] max-w-xl mb-12 leading-relaxed fade-up" style={{ animationDelay: '160ms' }}>
          Every edit, event, and late-night build for your club — logged, verified, and yours to carry off campus.
        </p>

        <div className="flex flex-wrap items-center gap-4 mb-16 fade-up" style={{ animationDelay: '240ms' }}>
          <a href="/clubs" className="btn-primary px-6 py-3 rounded-md">Explore Clubs</a>
          <a href="/signup" className="btn-ghost px-6 py-3 rounded-md">Create Your Record</a>
        </div>

        <div className="panel rounded-lg p-6 flex flex-wrap gap-x-12 gap-y-6 fade-up" style={{ animationDelay: '320ms' }}>
          <div className="flex items-center gap-3">
            <span className="badge-verified">OK</span>
            <span className="text-sm text-[var(--steel)] max-w-[180px]">Verified &mdash; signed off by someone who saw the work</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="badge-pending">...</span>
            <span className="text-sm text-[var(--steel)] max-w-[180px]">Pending &mdash; waiting on your club admin</span>
          </div>
        </div>
      </div>
    </main>
  );
}