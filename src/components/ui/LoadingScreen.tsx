'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useLoading } from '@/context/LoadingContext';

const messages = [
  'Hang tight, loading your profile...',
  'Connecting with your clubs...',
  'Almost there...',
  'Getting things ready...',
  'Loading ClubConnect...',
];

export default function LoadingScreen() {
  const { loading } = useLoading();

  const [progress, setProgress] = useState(0);

  const [message] = useState(
    messages[Math.floor(Math.random() * messages.length)]
  );

  useEffect(() => {
    if (!loading) {
      setProgress(0);
      return;
    }

    const interval = setInterval(() => {
      setProgress((p) => {
  if (p >= 95) return p;

  if (p < 60) {
    return p + 30; // Very fast start
  }

  if (p < 80) {
    return p + 25; // Medium speed
  }

  if (p < 90) {
    return p + 12.5; // Slow
  }

  return p + 6; // Crawl to 95%
});
    }, 120);

    return () => clearInterval(interval);
  }, [loading]);

  return (
    <AnimatePresence>
      {loading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[999999] bg-[var(--bg)] flex items-center justify-center"
        >
          <div className="w-[420px] max-w-[90vw]">

            <div className="flex justify-center mb-8">

              <div className="text-5xl font-display font-bold animate-pulse">
  <span className="text-black">C</span>
  <span className="text-[var(--peach-ink)]">C</span>
</div>

            </div>

            <div className="h-4 overflow-hidden rounded-full border-2 border-black bg-white shadow-xl">

              <motion.div
                className="h-full"
                style={{
                  width: `${progress}%`,
                  background:
                    'linear-gradient(90deg,#ff6b3d,#ff944d,#ffffff)',
                }}
                animate={{
                  backgroundPosition: [
                    '0%',
                    '100%',
                  ],
                }}
                transition={{
                  repeat: Infinity,
                  duration: 2,
                  ease: 'linear',
                }}
              />

            </div>

            <motion.p
              className="mt-6 text-center text-sm font-medium tracking-wide text-[var(--ink-dim)]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              {message}
            </motion.p>

          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}