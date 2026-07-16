"use client";

import { useEffect, useRef, useState } from "react";

import { usePageVisibility } from "@/lib/hooks/usePageVisibility";

type UsePollingOptions<T> = {
  /**
   * A value already available at mount (typically an SSR-streamed first
   * value this hook is meant to keep refreshing) — seeds `data` immediately
   * and skips the very first poll instead of firing it right away. An
   * immediate poll on top of a just-streamed value is a genuine duplicate
   * upstream request: the Provider Layer's `service.ts` functions ship into
   * client JS and run their own in-browser cache/rate-limit instance,
   * separate from the server's, so a client poll never finds the server's
   * cache warm. Omit this when there's nothing to seed from — the first
   * poll then fires immediately, same as before this hook existed.
   */
  initial?: T;
};

type UsePollingResult<T> = {
  data: T | null;
  updatedAt: number | null;
};

/**
 * Shared polling engine every "live" hook in this codebase builds on
 * (`useLiveTicker`, `useLiveNetworkStatus`, and the newer `useLivePrice`/
 * `useLiveTvl`) — replaces each hook's own hand-rolled `setInterval` +
 * `cancelled`-flag loop with one implementation that additionally pauses
 * while the tab is hidden (via `usePageVisibility`) and fires one immediate
 * catch-up poll the moment it becomes visible again, rather than leaving a
 * background tab silently stale until its next scheduled tick.
 *
 * `pollFn` should never throw — every `lib/providers/*` service function
 * already resolves to a result envelope rather than rejecting, so a typical
 * `pollFn` is `async () => { const r = await service.getX(); return r.ok ?
 * r.data : null; }`. Returning `null` means "no update this round" — `data`
 * keeps its last-known-good value rather than regressing to empty, exactly
 * like `useLiveTicker`'s existing per-field merge already does for partial
 * provider failures.
 */
export function usePolling<T>(
  pollFn: () => Promise<T | null>,
  intervalMs: number,
  options?: UsePollingOptions<T>
): UsePollingResult<T> {
  const [data, setData] = useState<T | null>(options?.initial ?? null);
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);
  const visible = usePageVisibility();

  // Always call the latest `pollFn` without needing it in the effect's
  // dependency array — callers typically pass a fresh closure every render.
  // Updated in an effect (not during render) per the rules of hooks.
  const pollFnRef = useRef(pollFn);
  useEffect(() => {
    pollFnRef.current = pollFn;
  });

  // Consumed exactly once, on the first opportunity to poll (immediately at
  // mount if the tab starts visible, or on first becoming visible if it
  // doesn't) — every poll after that, including every later visibility
  // regain, fires normally.
  const skipFirstPollRef = useRef(options?.initial !== undefined);

  useEffect(() => {
    if (!visible) return;

    let cancelled = false;

    async function poll() {
      const result = await pollFnRef.current();
      if (cancelled || result === null) return;
      setData(result);
      setUpdatedAt(Date.now());
    }

    if (skipFirstPollRef.current) {
      skipFirstPollRef.current = false;
    } else {
      poll();
    }

    const interval = setInterval(poll, intervalMs);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [visible, intervalMs]);

  return { data, updatedAt };
}
