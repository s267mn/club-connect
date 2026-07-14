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

    return () => clearTimeout(timer);
  }, [pathname]);

  return null;
}