'use client';

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { useLoading } from '@/context/LoadingContext';

export default function NavigationEvents() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const { startLoading, stopLoading } = useLoading();

  // Show loader immediately when component mounts
  useEffect(() => {
    startLoading();

    const timer = setTimeout(() => {
      stopLoading();
    }, 500); // Minimum visible duration

    return () => clearTimeout(timer);
  }, [pathname, searchParams]);

  return null;
}