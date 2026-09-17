"use client";

import { useEffect } from "react";

import { RouteError } from "@/components/dashboard/RouteError";

/**
 * The Dashboard's general-purpose error boundary. Next.js resolves the
 * nearest `error.tsx` up the tree, so this single file covers every
 * `/dashboard/*` route that doesn't define a more specific one — the
 * Dashboard home, Watchlists, Alerts, Portfolio, Brief, Automation,
 * Timeline, Notifications, the Projects listing, and every Settings
 * sub-page. `/dashboard/projects/[slug]` keeps its own, more specific
 * `error.tsx`, which still wins over this one for that route.
 *
 * PR-097.03 (Observability) — the caught `error` (including Next.js's own
 * server-correlatable `digest`) is now actually logged rather than
 * silently discarded, so a real render failure is visible in the
 * platform's existing log aggregation (`fly logs`) instead of vanishing
 * the moment the fallback UI renders.
 */
export default function DashboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return <RouteError reset={reset} />;
}
