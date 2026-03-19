import { useSyncExternalStore } from 'react';

const emptySubscribe = () => () => {};

/**
 * Returns true after hydration is complete (client-only).
 * No setState, no useEffect — zero cascading render warnings.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,   // client
    () => false,   // server
  );
}

/**
 * Read a localStorage value safely after hydration.
 * Returns null on server and fallback on error.
 */
export function useLocalStorage(key: string, fallback: string | null = null): string | null {
  return useSyncExternalStore(
    emptySubscribe,
    () => {
      try {
        return localStorage.getItem(key);
      } catch {
        return fallback;
      }
    },
    () => fallback, // server
  );
}
