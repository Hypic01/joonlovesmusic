import { useEffect, useState } from "react";

/**
 * Returns a debounced copy of `value` that only updates after `delayMs` of
 * no further changes. Used to throttle live network calls (e.g. song search)
 * so we query as the user types without hammering the database on every key.
 */
export function useDebounce<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs]);

  return debounced;
}

/**
 * Pure helper: decide whether a query string is worth running a search for.
 * Trims whitespace and enforces a minimum length so blank/too-short queries
 * don't fire network calls. Extracted for unit testing.
 */
export function shouldSearch(query: string, minLength = 1): boolean {
  return query.trim().length >= minLength;
}
