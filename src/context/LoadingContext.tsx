'use client';

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  ReactNode,
} from 'react';

type LoadingContextType = {
  loading: boolean;
  startLoading: () => void;
  stopLoading: () => void;
};

const LoadingContext = createContext<LoadingContextType | null>(null);

// Safety ceiling: if the global loading state is ever stuck true for
// longer than this, something upstream failed to call stopLoading()
// (e.g. a hung network request). Force it back to false rather than
// leaving the user staring at a frozen spinner until they reload.
const MAX_LOADING_MS = 8000;

export function LoadingProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [loadingCount, setLoadingCount] = useState(0);
  const watchdogRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loading = loadingCount > 0;

  useEffect(() => {
    if (loading) {
      watchdogRef.current = setTimeout(() => {
        console.warn(
          `Loading state stuck for over ${MAX_LOADING_MS}ms — forcing reset.`
        );
        setLoadingCount(0);
      }, MAX_LOADING_MS);
    } else if (watchdogRef.current) {
      clearTimeout(watchdogRef.current);
      watchdogRef.current = null;
    }

    return () => {
      if (watchdogRef.current) {
        clearTimeout(watchdogRef.current);
        watchdogRef.current = null;
      }
    };
  }, [loading]);

  function startLoading() {
    setLoadingCount((c) => c + 1);
  }

  function stopLoading() {
    setLoadingCount((c) => Math.max(0, c - 1));
  }

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