'use client';

import { useState, useEffect } from 'react';
import { HelpCircle, X, ArrowRight, ArrowLeft, GraduationCap, Compass, Trophy, FileText, Rocket, CheckCircle2 } from 'lucide-react';

type Step = {
  icon: React.ReactNode;
  title: string;
  description?: string;
  customContent?: React.ReactNode;
};

const STEPS: Step[] = [
  {
    icon: <GraduationCap size={32} />,
    title: 'Your CGPA tells one story. Your contributions tell another.',
    description: 'College isn\'t just academics. You organize fests, build projects, design posters, lead teams, and win hackathons. ClubConnect keeps a verified record of everything you\'ve built so it never disappears.',
  },
  {
    icon: <Compass size={32} />,
    title: 'How your journey works',
    description: 'Every step builds your verified college reputation from day one to graduation.',
    customContent: (
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 my-4 text-center">
        {[
          { label: 'Join Club', sub: 'Explore & apply' },
          { label: 'Contribute', sub: 'Submit work' },
          { label: 'Verify', sub: 'Admin review' },
          { label: 'Rating', sub: 'Skills grow' },
          { label: 'Portfolio', sub: 'Public proof' },
        ].map((item, idx) => (
          <div key={idx} className="p-3 rounded-xl bg-[var(--surface,rgba(255,255,255,0.03))] border border-[var(--border)] flex flex-col justify-between">
            <span className="text-xs font-semibold text-[var(--peach-ink)] mb-1">0{idx + 1}</span>
            <span className="text-xs font-medium text-[var(--ink)]">{item.label}</span>
            <span className="text-[10px] text-[var(--ink-dim)] mt-1">{item.sub}</span>
          </div>
        ))}
      </div>
    ),
  },
  {
    icon: <Trophy size={32} />,
    title: 'Imagine graduating with...',
    description: 'Instead of saying "I was active," you will have concrete proof for recruiters and internships.',
    customContent: (
      <div className="my-4 p-4 rounded-2xl bg-[var(--surface,rgba(255,255,255,0.03))] border border-[var(--border)] space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-display text-base text-[var(--ink)]">Samanvith M N</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--peach)] text-[var(--peach-ink)] font-medium">Verified Profile</span>
          </div>
          <div className="text-sm font-semibold text-[var(--ink)]">⭐ 142 Rating</div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2 border-t border-[var(--border)]">
          {['Leadership', 'UI Design', 'Marketing', 'Programming', 'Video Editing', 'CAD'].map((skill) => (
            <div key={skill} className="flex items-center gap-1.5 text-xs text-[var(--ink-dim)]">
              <CheckCircle2 size={12} className="text-[var(--peach-ink)]" />
              <span>{skill}</span>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    icon: <FileText size={32} />,
    title: 'Everything in one place',
    description: 'Discover communities, submit your work for review, get admin verification, and grow your reputation over time.',
  },
  {
    icon: <Rocket size={32} />,
    title: 'You\'re ready to make an impact',
    description: 'Find a club, build projects, and earn recognition. Your college journey starts today.',
  },
];

export default function HelpGuide() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    // Check if the user has completed or seen onboarding before
    const hasSeenOnboarding = localStorage.getItem('clubconnect_onboarded');
    if (!hasSeenOnboarding) {
      setOpen(true);
    }
  }, []);

  const close = () => {
    setOpen(false);
    setStep(0);
    // Mark as seen in cache so it never auto-opens again
    localStorage.setItem('clubconnect_onboarded', 'true');
  };

  const isLast = step === STEPS.length - 1;
  const current = STEPS[step];
  const progressPercent = ((step + 1) / STEPS.length) * 100;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Help guide"
        className="fixed top-3 right-14 lg:top-4 lg:right-20 z-[60] p-2 rounded-full hover:bg-[rgba(255,255,255,0.08)] transition-colors"
      >
        <HelpCircle size={20} className="text-[var(--steel)]" />
      </button>

      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={close} />

          <div className="relative card bg-[var(--bg)] w-full max-w-xl sm:max-w-2xl p-6 sm:p-10 fade-up shadow-2xl border border-[var(--border)]">
            <button
              onClick={close}
              aria-label="Close"
              className="absolute top-5 right-5 text-[var(--ink-dim)] hover:text-[var(--ink)] p-2 rounded-full hover:bg-[var(--surface,rgba(255,255,255,0.05))] transition-colors"
            >
              <X size={20} />
            </button>

            <div className="w-16 h-16 rounded-2xl bg-[var(--peach)] text-[var(--peach-ink)] flex items-center justify-center mb-6 shadow-sm">
              {current.icon}
            </div>

            <h2 className="font-display text-2xl sm:text-3xl mb-3 tracking-tight text-[var(--ink)]">{current.title}</h2>
            {current.description && (
              <p className="text-sm sm:text-base text-[var(--ink-dim)] leading-relaxed mb-4">
                {current.description}
              </p>
            )}

            {current.customContent}

            <div className="mt-8 pt-6 border-t border-[var(--border)] flex flex-col gap-4">
              {/* Custom Progress Bar & Step Tracker */}
              <div className="flex items-center justify-between text-xs text-[var(--ink-dim)]">
                <span>{step + 1} of {STEPS.length}</span>
                <div className="w-32 sm:w-48 h-1.5 rounded-full bg-[var(--border)] overflow-hidden">
                  <div 
                    className="h-full bg-[var(--peach-ink)] transition-all duration-300 ease-out" 
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>

              {/* Navigation Controls */}
              <div className="flex items-center justify-between pt-2">
                {step > 0 ? (
                  <button
                    onClick={() => setStep((s) => s - 1)}
                    className="btn-ghost px-4 py-2 text-sm inline-flex items-center gap-1.5 rounded-xl hover:bg-[var(--surface,rgba(255,255,255,0.05))] transition-colors"
                  >
                    <ArrowLeft size={16} /> Back
                  </button>
                ) : (
                  <button
                    onClick={close}
                    className="text-xs text-[var(--ink-dim)] hover:text-[var(--ink)] transition-colors px-2 py-1"
                  >
                    Skip intro
                  </button>
                )}

                {isLast ? (
                  <button onClick={close} className="btn-primary px-6 py-2.5 text-sm font-medium rounded-xl shadow-sm inline-flex items-center gap-2">
                    Start Exploring <Rocket size={16} />
                  </button>
                ) : (
                  <button
                    onClick={() => setStep((s) => s + 1)}
                    className="btn-primary px-5 py-2.5 text-sm font-medium rounded-xl shadow-sm inline-flex items-center gap-1.5"
                  >
                    Continue <ArrowRight size={16} />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}