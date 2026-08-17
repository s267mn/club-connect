'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useLoading } from '@/context/LoadingContext';

export default function NavigationEvents() {
  const pathname = usePathname();
  const { startLoading, stopLoading } = useLoading();

  useEffect(() => {
    startLoading();

    const timer = setTimeout(() => {
      stopLoading();
    }, 500);

    /*
     * IMPORTANT:
     *
     * Every startLoading() call above MUST be matched by exactly
     * one stopLoading() call, whether the timer fires naturally
     * or this effect is cleaned up early by a fast subsequent
     * navigation. Previously, cleanup only cleared the timer
     * without calling stopLoading(), which left the shared
     * loadingCount permanently incremented whenever navigation
     * happened faster than 500ms apart — causing the global
     * loading overlay to get stuck forever.
     */
    return () => {
      clearTimeout(timer);
      stopLoading();
    };
  }, [pathname, startLoading, stopLoading]);

  return null;
}