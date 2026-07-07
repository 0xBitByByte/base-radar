"use client";

import { useEffect, useState } from "react";

/**
 * Re-renders the calling component on an interval so relative-time labels
 * ("Updated 12s ago") stay fresh without re-fetching any data.
 */
export function useNowTick(intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(interval);
  }, [intervalMs]);

  return now;
}
