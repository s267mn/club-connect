'use client';

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
  ReactNode,
} from 'react';

type LoadingContextType = {
  loading: boolean;
  startLoading: () => void;
  stopLoading: () => void;
};

const LoadingContext = createContext<LoadingContextType | null>(null);

const MAX_LOADING_MS = 8000;

export function LoadingProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [loadingCount, setLoadingCount] = useState(0);
  const watchdogRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loading = loadingCount > 0;

  const startLoading = useCallback(() => {
    setLoadingCount((count) => count + 1);
  }, []);

  const stopLoading = useCallback(() => {
    setLoadingCount((count) => Math.max(0, count - 1));
  }, []);

  useEffect(() => {
    if (loading) {
      watchdogRef.current = setTimeout(() => {
        console.warn(
          `Loading state stuck for over ${MAX_LOADING_MS}ms — forcing reset.`
        );

        setLoadingCount(0);
      }, MAX_LOADING_MS);
    } else {
      if (watchdogRef.current) {
        clearTimeout(watchdogRef.current);
        watchdogRef.current = null;
      }
    }

    return () => {
      if (watchdogRef.current) {
        clearTimeout(watchdogRef.current);
        watchdogRef.current = null;
      }
    };
  }, [loading]);

  return (
    <LoadingContext.Provider
      value={{
        loading,
        startLoading,
        stopLoading,
      }}
    >
      {children}
    </LoadingContext.Provider>
  );
}

export function useLoading() {
  const context = useContext(LoadingContext);

  if (!context) {
    throw new Error(
      'useLoading must be used inside LoadingProvider'
    );
  }

  return context;
}