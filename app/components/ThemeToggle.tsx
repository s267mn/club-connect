'use client';

import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { Sun, Moon } from 'lucide-react';

export default function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();

  // Avoids a hydration mismatch: resolvedTheme is unknown on the
  // server, so render nothing until mounted client-side.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <div
        className="fixed top-3 right-24 lg:top-4 lg:right-32 z-[60] p-2.5 w-[38px] h-[38px]"
        aria-hidden="true"
      />
    );
  }

  const isDark = resolvedTheme === 'dark';

  return (
    <button
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className="fixed top-3 right-24 lg:top-4 lg:right-32 z-[60] p-2.5 rounded-full hover:bg-[rgba(255,255,255,0.08)] transition-colors"
    >
      {isDark ? (
        <Sun size={20} className="text-[var(--steel)]" />
      ) : (
        <Moon size={20} className="text-[var(--steel)]" />
      )}
    </button>
  );
}