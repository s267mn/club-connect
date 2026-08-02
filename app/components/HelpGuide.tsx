'use client';

import { useState, useEffect } from 'react';
import { HelpCircle, X, ArrowRight, ArrowLeft } from 'lucide-react';

type Step = {
  title: string;
  description?: string;
  customContent?: React.ReactNode;
};

const STEPS: Step[] = [
  {
    title: 'Your CGPA tells one story. Your contributions tell another.',
    description: 'College isn\'t just academics. You organize fests, build projects, design posters, lead teams, and win hackathons. ClubConnect keeps a verified record of everything you\'ve built so it never disappears.',
    customContent: (
      <div className="my-4 sm:my-6 p-4 sm:p-6 rounded-2xl bg-[var(--surface,rgba(255,255,255,0.02))] border border-[var(--border)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[var(--peach)]/5 to-transparent animate-shimmer" />
        <div className="space-y-1 relative z-10">
          <span className="text-[10px] tracking-wider uppercase text-[var(--ink-dim)]">Academics</span>
          <div className="text-lg sm:text-xl font-display text-[var(--ink)]">CGPA Record</div>
        </div>
        <div className="hidden sm:block h-8 w-px bg-[var(--border)]" />
        <div className="space-y-1 relative z-10">
          <span className="text-[10px] tracking-wider uppercase text-[var(--peach-ink)]">Real Work</span>
          <div className="text-lg sm:text-xl font-display text-[var(--peach-ink)] flex items-center gap-2">
            <span>Verified Projects</span>
            <span className="w-2 h-2 rounded-full bg-[var(--peach-ink)] animate-pulse" />
          </div>
        </div>
      </div>
    ),
  },
  {
    title: 'How your journey works',
    description: 'Every step builds your verified college reputation from day one to graduation.',
    customContent: (
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-2.5 my-4 sm:my-6 text-center">
        {[
          { label: 'Join Club', sub: 'Explore & apply' },
          { label: 'Contribute', sub: 'Submit work' },
          { label: 'Verify', sub: 'Admin review' },
          { label: 'Rating', sub: 'Skills grow' },
          { label: 'Portfolio', sub: 'Public proof' },
        ].map((item, idx) => (
          <div 
            key={idx} 
            className="p-3 sm:p-3.5 rounded-2xl bg-[var(--surface,rgba(255,255,255,0.03))] border border-[var(--border)] flex sm:flex-col items-center sm:items-stretch justify-between relative hover:border-[var(--peach-ink)] transition-colors duration-300"
          >
            <span className="text-[10px] font-mono text-[var(--peach-ink)] sm:mb-1">0{idx + 1}</span>
            <span className="text-xs font-medium text-[var(--ink)]">{item.label}</span>
            <span className="text-[10px] text-[var(--ink-dim)] sm:mt-1">{item.sub}</span>
          </div>
        ))}
      </div>
    ),
  },
  {
    title: 'Imagine graduating with...',
    description: 'Instead of saying "I was active," you will have concrete proof for recruiters and internships.',
    customContent: (
      <div className="my-4 sm:my-6 p-4 sm:p-6 rounded-3xl bg-[var(--surface,rgba(255,255,255,0.02))] border border-[var(--border)] space-y-3 sm:space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-display text-sm font-medium text-[var(--ink)]">Samanvith M N</span>
            <span className="text-[10px] sm:text-xs px-2 py-0.5 rounded-full bg-[var(--peach)] text-[var(--peach-ink)] font-medium">Verified Profile</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--ink)]">
            <span>⭐ 142 Rating</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2 border-t border-[var(--border)]">
          {['Leadership', 'UI Design', 'Marketing', 'Programming', 'Video Editing', 'CAD'].map((skill) => (
            <div key={skill} className="flex items-center gap-2 text-xs text-[var(--ink-dim)] bg-[var(--surface,rgba(255,255,255,0.03))] px-2.5 sm:px-3 py-2 rounded-xl border border-[var(--border)]">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--peach-ink)] shrink-0" />
              <span className="truncate">{skill}</span>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    title: 'Everything in one place',
    description: 'Discover communities, submit your work for review, get admin verification, and grow your reputation over time.',
    customContent: (
      <div className="my-4 sm:my-6 p-4 sm:p-6 rounded-2xl bg-[var(--surface,rgba(255,255,255,0.02))] border border-[var(--border)] flex items-center justify-around text-center">
        <div className="space-y-1">
          <div className="text-xl sm:text-2xl font-display text-[var(--ink)]">Clubs</div>
          <p className="text-[10px] text-[var(--ink-dim)]">Discover & Join</p>
        </div>
        <div className="h-8 w-px bg-[var(--border)]" />
        <div className="space-y-1">
          <div className="text-xl sm:text-2xl font-display text-[var(--peach-ink)]">Review</div>
          <p className="text-[10px] text-[var(--ink-dim)]">Admin Verified</p>
        </div>
        <div className="h-8 w-px bg-[var(--border)]" />
        <div className="space-y-1">
          <div className="text-xl sm:text-2xl font-display text-[var(--ink)]">Profile</div>
          <p className="text-[10px] text-[var(--ink-dim)]">Grow Reputation</p>
        </div>
      </div>
    ),
  },
  {
    title: 'You\'re ready to make an impact',
    description: 'Find a club, build projects, and earn recognition. Your college journey starts today.',
    customContent: (
      <div className="my-4 sm:my-6 p-4 sm:p-6 rounded-2xl bg-[var(--surface,rgba(255,255,255,0.02))] border border-[var(--border)] flex items-center justify-center gap-2 sm:gap-3">
        <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-[var(--peach-ink)] animate-bounce shrink-0" />
        <span className="text-[11px] sm:text-xs font-medium text-[var(--ink)] tracking-wide uppercase text-center">Your college journey starts today</span>
        <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-[var(--peach-ink)] animate-bounce [animation-delay:0.2s] shrink-0" />
      </div>
    ),
  },
];

export default function HelpGuide() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState<'next' | 'prev'>('next');

  useEffect(() => {
    const hasSeenOnboarding = localStorage.getItem('clubconnect_onboarded');
    if (!hasSeenOnboarding) {
      setOpen(true);
    }
  }, []);

  const close = () => {
    setOpen(false);
    setStep(0);
    localStorage.setItem('clubconnect_onboarded', 'true');
  };

  const handleNext = () => {
    setDirection('next');
    setStep((s) => s + 1);
  };

  const handlePrev = () => {
    setDirection('prev');
    setStep((s) => s - 1);
  };

  const isLast = step === STEPS.length - 1;
  const current = STEPS[step];

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Help guide"
        className="fixed top-3 right-14 lg:top-4 lg:right-20 z-[60] p-2.5 rounded-full hover:bg-[rgba(255,255,255,0.08)] transition-colors"
      >
        <HelpCircle size={20} className="text-[var(--steel)]" />
      </button>

      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-md transition-opacity animate-fade-in" onClick={close} />

          {/* Simple popup modal container */}
          <div className="relative card bg-[var(--bg)] w-full sm:w-[720px] h-[85vh] sm:h-[620px] max-w-full sm:max-w-[95vw] max-h-[90vh] p-6 sm:p-10 shadow-[0_20px_80px_rgba(0,0,0,.45)] border border-[var(--border)] rounded-[32px] overflow-hidden flex flex-col justify-between animate-scale-up z-10">
            
            <div className="absolute top-0 right-0 w-96 h-96 bg-[radial-gradient(circle_at_top_right,rgba(255,150,80,0.06),transparent_45%)] pointer-events-none" />

            {/* Top Bar */}
            <div className="flex items-center justify-between pb-4 sm:pb-6 border-b border-[var(--border)] relative z-10 shrink-0">
              <div className="flex items-center gap-1.5 sm:gap-2">
                {STEPS.map((_, idx) => (
                  <div
                    key={idx}
                    onClick={() => {
                      setDirection(idx > step ? 'next' : 'prev');
                      setStep(idx);
                    }}
                    className={`h-1.5 rounded-full transition-all duration-500 cursor-pointer ${
                      idx === step 
                        ? 'w-6 sm:w-8 bg-[var(--peach-ink)]' 
                        : idx < step 
                        ? 'w-2 bg-[var(--peach-ink)] opacity-50' 
                        : 'w-2 bg-[var(--border)]'
                    }`}
                  />
                ))}
              </div>

              <button
                onClick={close}
                aria-label="Close"
                className="text-[var(--ink-dim)] hover:text-[var(--ink)] p-2 rounded-full hover:bg-[var(--surface,rgba(255,255,255,0.05))] transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Scrollable Middle Content Area */}
            <div className="overflow-y-auto overflow-x-hidden my-auto py-3 sm:py-4 relative z-10 custom-scrollbar">
              <div 
                key={step}
                className={`transition-all duration-300 ease-out ${
                  direction === 'next' ? 'animate-slide-in-right' : 'animate-slide-in-left'
                }`}
              >
                <span className="text-[10px] sm:text-xs font-mono tracking-widest uppercase text-[var(--peach-ink)] mb-2 sm:mb-3 block">
                  0{step + 1} / 0{STEPS.length}
                </span>

                <h2 className="font-display text-xl sm:text-3xl mb-2 sm:mb-3 tracking-tight text-[var(--ink)]">
                  {current.title}
                </h2>
                
                {current.description && (
                  <p className="text-xs sm:text-base text-[var(--ink-dim)] leading-relaxed max-w-xl">
                    {current.description}
                  </p>
                )}

                {current.customContent}
              </div>
            </div>

            {/* Fixed Footer */}
            <div className="pt-4 sm:pt-6 border-t border-[var(--border)] flex flex-col gap-4 relative z-10 shrink-0">
              <div className="flex items-center justify-between">
                {step > 0 ? (
                  <button
                    onClick={handlePrev}
                    className="btn-ghost px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm inline-flex items-center gap-1.5 rounded-xl hover:bg-[var(--surface,rgba(255,255,255,0.05))] transition-colors text-[var(--ink)]"
                  >
                    <ArrowLeft size={16} /> Back
                  </button>
                ) : (
                  <button
                    onClick={close}
                    className="text-[11px] sm:text-xs text-[var(--ink-dim)] hover:text-[var(--ink)] transition-colors px-2 py-1 font-medium"
                  >
                    Skip intro
                  </button>
                )}

                {isLast ? (
                  <button 
                    onClick={close} 
                    className="btn-primary px-5 sm:px-6 py-2 sm:py-2.5 text-xs sm:text-sm font-medium rounded-xl shadow-lg inline-flex items-center gap-2 hover:opacity-95 transition-all"
                  >
                    Start Exploring
                  </button>
                ) : (
                  <button
                    onClick={handleNext}
                    className="btn-primary px-4 sm:px-5 py-2 sm:py-2.5 text-xs sm:text-sm font-medium rounded-xl shadow-lg inline-flex items-center gap-1.5 hover:opacity-95 transition-all"
                  >
                    Continue <ArrowRight size={16} />
                  </button>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleUp {
          from { opacity: 0; transform: scale(0.96) translateY(8px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(12px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes slideInLeft {
          from { opacity: 0; transform: translateX(-12px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .animate-fade-in {
          animation: fadeIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .animate-scale-up {
          animation: scaleUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .animate-slide-in-right {
          animation: slideInRight 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .animate-slide-in-left {
          animation: slideInLeft 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .animate-shimmer {
          animation: shimmer 3s infinite linear;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: var(--border);
          border-radius: 9999px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: var(--ink-dim);
        }
      `}</style>
    </>
  );
}