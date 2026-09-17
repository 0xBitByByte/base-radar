"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { Eye } from "lucide-react";

import { getAIWatchAlerts, getAIWatchConfig, subscribe } from "@/lib/ai-watch/storage";
import type { AIWatchAlert, AIWatchConfig } from "@/lib/ai-watch/types";

type WatchlistAIWatchStatusProps = {
  /** This watchlist's real project ids — an AI Watch alert counts toward THIS card only when it names one of them. */
  projectIds: readonly string[];
};

/**
 * PR-090.07 QA fix — hydration safety. `useAIWatch.ts`'s own
 * `getServerConfig`/`getServerAlerts` establish the pattern this component
 * failed to follow: the `useSyncExternalStore` server-snapshot argument runs
 * IN THE BROWSER during hydration (not only during actual server
 * rendering), so if it calls into `getAIWatchConfig()`/`getAIWatchAlerts()`
 * (which read real `localStorage` once `window` exists) it can return a
 * different value than the real server-rendered HTML used — a hydration
 * mismatch. A fixed, always-disabled/empty snapshot matches what the server
 * actually rendered; the real localStorage value then applies on the very
 * next client render via the regular `getSnapshot`, same as `useAIWatch`.
 */
const SERVER_CONFIG: AIWatchConfig = { enabled: false, createdAt: null };
const SERVER_ALERTS: AIWatchAlert[] = [];

function getServerConfig(): AIWatchConfig {
  return SERVER_CONFIG;
}

function getServerAlerts(): AIWatchAlert[] {
  return SERVER_ALERTS;
}

/**
 * PR-090.06 — Watchlist Integration. AI Watch (PR-090.03) already evaluates
 * "this Watchlist project's Risk category gained a new finding" and
 * persists alerts locally — but that state was only ever visible inside AI
 * Workspace, with no presence on the Watchlists page itself where the
 * watched projects actually live. This reads the SAME local store
 * (`lib/ai-watch/storage.ts`, unchanged) via the same `useSyncExternalStore`
 * pattern `useAIWatch` already uses, and renders nothing new — no second
 * evaluation, no re-derivation of `computeFindingKey`, just a real count of
 * this watchlist's own unread alerts.
 *
 * Renders nothing when AI Watch is off or has nothing new to report for
 * THIS watchlist — an always-visible "0" would be noise, not signal.
 */
export function WatchlistAIWatchStatus({ projectIds }: WatchlistAIWatchStatusProps) {
  const config = useSyncExternalStore(subscribe, getAIWatchConfig, getServerConfig);
  const alerts = useSyncExternalStore(subscribe, getAIWatchAlerts, getServerAlerts);

  if (!config.enabled) return null;

  const projectIdSet = new Set(projectIds);
  const matchingUnread = alerts.filter((alert) => !alert.isRead && alert.claim.projects.some((project) => projectIdSet.has(project.id)));
  if (matchingUnread.length === 0) return null;

  return (
    <Link
      href="/dashboard/ai-workspace"
      className="flex items-center gap-1.5 rounded-full bg-radar-warning/10 px-2.5 py-1 text-xs font-medium whitespace-nowrap text-radar-warning outline-none transition-colors hover:bg-radar-warning/20 focus-visible:ring-2 focus-visible:ring-radar-primary/50"
    >
      <Eye className="size-3.5 shrink-0" aria-hidden="true" />
      {matchingUnread.length} new AI Watch {matchingUnread.length === 1 ? "finding" : "findings"}
    </Link>
  );
}
