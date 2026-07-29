"use client";

import { useSyncExternalStore } from "react";

import { formatRelativeTime } from "@/lib/data/format";

const noopSubscribe = () => () => {};

/**
 * Hydration-safe `formatRelativeTime(iso)`. `useSyncExternalStore`'s
 * `getServerSnapshot` (used for both the server render and the client's
 * matching first render) returns `placeholder` unconditionally, so there is
 * nothing for React to diff during hydration. Once mounted, React calls the
 * real `getSnapshot` and reconciles — no effect, no setState-in-effect.
 */
export function useRelativeTime(iso: string, placeholder = "—"): string {
  return useSyncExternalStore(
    noopSubscribe,
    () => formatRelativeTime(iso),
    () => placeholder
  );
}
