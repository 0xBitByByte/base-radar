"use client";

import { RouteError } from "@/components/dashboard/RouteError";

/**
 * The Dashboard's general-purpose error boundary. Next.js resolves the
 * nearest `error.tsx` up the tree, so this single file covers every
 * `/dashboard/*` route that doesn't define a more specific one — the
 * Dashboard home, Watchlists, Alerts, Portfolio, Brief, Automation,
 * Timeline, Notifications, the Projects listing, and every Settings
 * sub-page. `/dashboard/projects/[slug]` keeps its own, more specific
 * `error.tsx`, which still wins over this one for that route.
 */
export default function DashboardError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <RouteError reset={reset} />;
}
