"use client";

import { useSyncExternalStore } from "react";

import { formatRelativeTime } from "@/lib/data/format";

/**
 * Hydration-safe `formatRelativeTime(iso)`. `getServerSnapshot` returns
 * `placeholder` for both the server render and the client's matching first
 * render, so there's nothing for React to diff during hydration. `subscribe`
 * then actively fires its callback on the next tick — an explicit
 * notification that forces React to re-call `getSnapshot` and reconcile to
 * the real value.
 *
 * PR-075: a prior version used a no-op `subscribe`, relying entirely on
 * `useSyncExternalStore`'s internal post-hydration consistency check (a
 * passive effect scheduled via React's own low-priority path) to correct the
 * placeholder. That check was observed live to sometimes never flush for a
 * component mounted inside a streamed Suspense boundary — "Last Push" stuck
 * on the placeholder indefinitely until an unrelated user interaction (e.g.
 * scrolling) nudged React into flushing pending passive effects. Actively
 * notifying via `subscribe` doesn't depend on that internal timing.
 */
export function useRelativeTime(iso: string, placeholder = "—"): string {
  return useSyncExternalStore(
    (onStoreChange) => {
      const timer = setTimeout(onStoreChange, 0);
      return () => clearTimeout(timer);
    },
    () => formatRelativeTime(iso),
    () => placeholder
  );
}
