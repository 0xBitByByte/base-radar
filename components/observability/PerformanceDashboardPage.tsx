"use client";

import { AlertTriangle, Gauge, Lock, ShieldAlert } from "lucide-react";

import { PAGE_HEADER_GROUP_CLASS, PAGE_HEADER_SUBTITLE_CLASS, PAGE_HEADER_TITLE_CLASS } from "@/components/dashboard/pageHeaderStyles";
import { WidgetSkeleton } from "@/components/dashboard/WidgetSkeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { usePerformanceDashboard } from "@/lib/hooks/usePerformanceDashboard";
import type { PerformanceMetricSummary } from "@/lib/backend/sqlite/performanceMetrics";

/** Whole-millisecond values for readability — a real Web Vitals value never needs sub-millisecond precision to be meaningful here. CLS is a unitless score, not a duration, so it keeps real decimal precision instead. */
function formatMetricValue(metricName: string, value: number): string {
  if (metricName === "CLS") return value.toFixed(3);
  return `${Math.round(value)} ms`;
}

/**
 * PR-097.03 (Observability — Performance Dashboards) —
 * `/dashboard/observability/performance`. Real authorization is enforced
 * entirely server-side by `/api/observability/performance`
 * (`resolveAdminAccess`, the same boundary every PR-095 admin route
 * already uses, reused here without modifying any PR-095 file). Every
 * card is a real, aggregated `performance_metrics` summary row — this page
 * never fabricates a sample metric to demonstrate the UI.
 */
export function PerformanceDashboardPage() {
  const { state, retry } = usePerformanceDashboard();

  return (
    <div className="flex flex-col gap-6">
      <div className={PAGE_HEADER_GROUP_CLASS}>
        <h1 className={PAGE_HEADER_TITLE_CLASS}>Performance Dashboard</h1>
        <p className={PAGE_HEADER_SUBTITLE_CLASS}>
          Real Core Web Vitals reported by real visitor page loads. Visible only to authorized administrators.
        </p>
      </div>

      {state.status === "loading" && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3" role="status" aria-live="polite" aria-label="Loading Performance Dashboard">
          {Array.from({ length: 3 }).map((_, index) => (
            <WidgetSkeleton key={index} className="h-32" />
          ))}
        </div>
      )}

      {state.status === "unauthenticated" && (
        <EmptyState
          icon={Lock}
          title="Sign in required"
          description="The Performance Dashboard is only visible to a signed-in, authorized account. Sign in from the account menu, then reload this page."
        />
      )}

      {state.status === "forbidden" && (
        <EmptyState icon={ShieldAlert} title="Access restricted" description="Your account is signed in but isn't authorized to view the Performance Dashboard." />
      )}

      {state.status === "error" && (
        <EmptyState
          icon={AlertTriangle}
          title="Couldn't load the Performance Dashboard"
          description="Something went wrong while loading performance metrics. Please try again."
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
        state.summary.length === 0 ? (
          <EmptyState
            icon={Gauge}
            title="No performance data yet"
            description="Real Core Web Vitals from real page loads will appear here as visitors use the site."
          />
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {state.summary.map((metric) => (
              <MetricCard key={metric.metricName} metric={metric} />
            ))}
          </div>
        )
      )}
    </div>
  );
}

function MetricCard({ metric }: { metric: PerformanceMetricSummary }) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-radar-light-border bg-radar-light-card p-4 dark:border-white/10 dark:bg-radar-card">
      <div className="flex items-center gap-2.5">
        <span className="flex size-8 items-center justify-center rounded-lg bg-radar-primary/10 text-radar-primary">
          <Gauge className="size-4" aria-hidden="true" />
        </span>
        <div className="flex flex-col">
          <span className="text-sm font-semibold text-radar-light-text dark:text-radar-white">{metric.metricName}</span>
          <span className="text-[11px] text-radar-light-muted dark:text-radar-muted">{metric.sampleCount.toLocaleString()} samples</span>
        </div>
      </div>

      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-semibold tabular-nums text-radar-light-text dark:text-radar-white">
          {formatMetricValue(metric.metricName, metric.average)}
        </span>
        <span className="text-xs text-radar-light-muted dark:text-radar-muted">avg</span>
      </div>

      <div className="flex justify-between text-[11px] tabular-nums text-radar-light-muted dark:text-radar-muted">
        <span>min {formatMetricValue(metric.metricName, metric.min)}</span>
        <span>max {formatMetricValue(metric.metricName, metric.max)}</span>
      </div>

      <div className="flex gap-1 overflow-hidden rounded-full" aria-hidden="true">
        {(["goodCount", "needsImprovementCount", "poorCount"] as const).map((key) => {
          const width = metric.sampleCount === 0 ? 0 : (metric[key] / metric.sampleCount) * 100;
          const color = key === "goodCount" ? "bg-radar-success" : key === "needsImprovementCount" ? "bg-radar-warning" : "bg-radar-danger";
          return width > 0 ? <span key={key} className={`h-1.5 ${color}`} style={{ width: `${width}%` }} /> : null;
        })}
      </div>
      <div className="flex justify-between text-[11px] text-radar-light-muted dark:text-radar-muted">
        <span>{metric.goodCount} good</span>
        <span>{metric.needsImprovementCount} needs improvement</span>
        <span>{metric.poorCount} poor</span>
      </div>
    </div>
  );
}
