'use client';

import {
  createContext,
  useContext,
  useState,
  ReactNode,
} from 'react';

type LoadingContextType = {
  loading: boolean;
  startLoading: () => void;
  stopLoading: () => void;
};

const LoadingContext = createContext<LoadingContextType | null>(null);

export function LoadingProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [loadingCount, setLoadingCount] = useState(0);

  function startLoading() {
    setLoadingCount((c) => c + 1);
  }

  function stopLoading() {
    setLoadingCount((c) => Math.max(0, c - 1));
  }

  return (
    <LoadingContext.Provider
      value={{
        loading: loadingCount > 0,
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