import { useState } from 'react';

/**
 * Read a localStorage value safely.
 * SSR is no longer used (Vite CSR), so no hydration mismatch concern.
 */
export function useLocalStorage(key: string, fallback: string | null = null): string | null {
  const [value] = useState(() => {
    try {
      return localStorage.getItem(key);
    } catch {
      return fallback;
    }
  });
  return value;
}

/** Always true in CSR-only app. Kept for API compat. */
export function useHydrated(): true {
  return true;
}
