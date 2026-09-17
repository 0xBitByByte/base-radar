"use client";

import { AlertTriangle, BarChart3, Lock, ShieldAlert } from "lucide-react";

import { PAGE_HEADER_GROUP_CLASS, PAGE_HEADER_SUBTITLE_CLASS, PAGE_HEADER_TITLE_CLASS } from "@/components/dashboard/pageHeaderStyles";
import { WidgetSkeleton } from "@/components/dashboard/WidgetSkeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { useAnalyticsDashboard } from "@/lib/hooks/useAnalyticsDashboard";
import type { AnalyticsPathSummary } from "@/lib/backend/sqlite/analyticsEvents";

/**
 * PR-097.03 (Observability — Analytics) —
 * `/dashboard/observability/analytics`. Real authorization is enforced
 * entirely server-side by `/api/observability/analytics`
 * (`resolveAdminAccess`, the same boundary every PR-095 admin route and
 * the Performance Dashboard already use, reused here without modifying
 * any PR-095 file). Every row is a real, aggregated `analytics_events`
 * summary — this page never fabricates a sample path to demonstrate the
 * UI.
 */
export function AnalyticsDashboardPage() {
  const { state, retry } = useAnalyticsDashboard();

  return (
    <div className="flex flex-col gap-6">
      <div className={PAGE_HEADER_GROUP_CLASS}>
        <h1 className={PAGE_HEADER_TITLE_CLASS}>Analytics</h1>
        <p className={PAGE_HEADER_SUBTITLE_CLASS}>
          Real, anonymous page-view counts. Visible only to authorized administrators.
        </p>
      </div>

      {state.status === "loading" && (
        <div className="flex flex-col gap-2" role="status" aria-live="polite" aria-label="Loading Analytics">
          {Array.from({ length: 5 }).map((_, index) => (
            <WidgetSkeleton key={index} className="h-12" />
          ))}
        </div>
      )}

      {state.status === "unauthenticated" && (
        <EmptyState
          icon={Lock}
          title="Sign in required"
          description="Analytics is only visible to a signed-in, authorized account. Sign in from the account menu, then reload this page."
        />
      )}

      {state.status === "forbidden" && (
        <EmptyState icon={ShieldAlert} title="Access restricted" description="Your account is signed in but isn't authorized to view Analytics." />
      )}

      {state.status === "error" && (
        <EmptyState
          icon={AlertTriangle}
          title="Couldn't load Analytics"
          description="Something went wrong while loading analytics data. Please try again."
          action={
            <button
              type="button"
              onClick={retry}
              className="rounded-lg border border-radar-light-border px-3 py-1.5 text-xs font-medium text-radar-light-text outline-none transition-colors hover:bg-radar-light-surface focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:border-white/10 dark:text-radar-white dark:hover:bg-white/5"
            >
              Try again
            </button>
          }
        />
      )}

      {state.status === "ready" && (
        state.summary.topPaths.length === 0 ? (
          <EmptyState
            icon={BarChart3}
            title="No page views yet"
            description="Real, anonymous page views from real visitors will appear here as the site is used."
          />
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1 rounded-xl border border-radar-light-border bg-radar-light-card p-4 dark:border-white/10 dark:bg-radar-card">
              <span className="text-2xl font-semibold tabular-nums text-radar-light-text dark:text-radar-white">
                {state.summary.totalPageViews.toLocaleString()}
              </span>
              <span className="text-xs font-medium text-radar-light-muted dark:text-radar-muted">Total real page views</span>
            </div>

            <ol className="flex flex-col gap-1.5">
              {state.summary.topPaths.map((path) => (
                <PathRow key={path.path} path={path} maxCount={state.summary.topPaths[0]?.eventCount ?? 1} />
              ))}
            </ol>
          </div>
        )
      )}
    </div>
  );
}

function PathRow({ path, maxCount }: { path: AnalyticsPathSummary; maxCount: number }) {
  const width = maxCount === 0 ? 0 : (path.eventCount / maxCount) * 100;

  return (
    <li className="flex items-center gap-3 rounded-lg border border-radar-light-border bg-radar-light-card px-3 py-2 dark:border-white/10 dark:bg-radar-card">
      <span className="min-w-0 flex-1 truncate font-mono text-xs text-radar-light-text dark:text-radar-white">{path.path}</span>
      <div className="h-1.5 w-24 shrink-0 overflow-hidden rounded-full bg-radar-light-border dark:bg-white/10">
        <span className="block h-full bg-radar-primary" style={{ width: `${width}%` }} />
      </div>
      <span className="w-12 shrink-0 text-right text-xs font-semibold tabular-nums text-radar-light-text dark:text-radar-white">
        {path.eventCount.toLocaleString()}
      </span>
    </li>
  );
}
