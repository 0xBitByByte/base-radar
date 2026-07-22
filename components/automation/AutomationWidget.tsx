"use client";

import Link from "next/link";
import { ArrowRight, Zap } from "lucide-react";

import { AutomationActionBadge, AutomationTriggerBadge } from "@/components/automation/AutomationBadge";
import { AutomationMetric } from "@/components/automation/AutomationMetric";
import { getResultActions, getResultTrigger } from "@/components/automation/filters";
import { NotificationBadge } from "@/components/notifications/NotificationBadge";
import { WidgetCard } from "@/components/dashboard/WidgetCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatRelativeTime } from "@/lib/data/format";
import { usePersonalizedDashboard } from "@/lib/hooks/usePersonalizedDashboard";

/**
 * The Dashboard's compact Automation preview — triggered count, high
 * priority count, and the single latest automation result only.
 * Deliberately shallow (never regenerates or re-derives anything): it
 * renders only the top of the already-sorted, watchlist-personalized
 * (PR22 Part 2) `automationResults` array — the full grouped feed lives at
 * `/dashboard/automation` only, reached via the link below.
 */
export function AutomationWidget() {
  const { automationResults: results, automationEnabled: enabled, hasAutomationResults, isPersonalized, activeWatchlist } =
    usePersonalizedDashboard();
  const latest = results[0];
  const highPriorityCount = results.filter(
    (result) => result.priority === "high" || result.priority === "critical"
  ).length;
  const latestTrigger = latest ? getResultTrigger(latest) : null;
  const latestActions = latest ? getResultActions(latest) : [];

  return (
    <WidgetCard
      icon={<Zap className="size-5" aria-hidden="true" />}
      title="Automation"
      subtitle="Rules triggered across your Watchlist"
      accent="purple"
      lastUpdated={latest?.triggeredAt}
    >
      {!enabled ? (
        <EmptyState icon={Zap} title="Automation is disabled." description="No rule can fire while Automation is turned off." />
      ) : !hasAutomationResults ? (
        <EmptyState
          icon={Zap}
          title="No automation results yet."
          description="Results will appear here once a rule matches a real notification from your Watchlist."
        />
      ) : isPersonalized && results.length === 0 ? (
        <EmptyState
          icon={Zap}
          title="No automation available."
          description={`None of the projects in "${activeWatchlist?.name}" have automation results yet.`}
        />
      ) : (
        <div className="flex flex-col gap-3.5">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <AutomationMetric label="Triggered" value={results.length} />
            <AutomationMetric label="High Priority" value={highPriorityCount} />
          </div>

          {latest && (
            <div className="relative flex flex-col gap-1.5 rounded-lg border border-radar-light-border bg-radar-light-surface p-2.5 transition-colors hover:bg-radar-light-card dark:border-white/10 dark:bg-white/[0.03] dark:hover:bg-white/[0.06]">
              {latest.link && (
                <Link
                  href={latest.link}
                  aria-label={`${latest.title}. Investigate further.`}
                  className="absolute inset-0 z-0 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-radar-primary/50"
                />
              )}
              <span className="relative z-[1] text-[10.5px] font-medium text-radar-light-muted dark:text-radar-muted">
                Latest Automation
              </span>
              <div className="relative z-[1] flex flex-wrap items-center gap-1.5">
                {latestTrigger && <AutomationTriggerBadge trigger={latestTrigger} />}
                <NotificationBadge priority={latest.priority} />
              </div>
              <span className="relative z-[1] truncate text-xs font-semibold text-radar-light-text dark:text-radar-white">
                {latest.title}
              </span>
              {latestActions.length > 0 && (
                <div className="relative z-[1] flex flex-wrap items-center gap-1.5">
                  {latestActions.map((action) => (
                    <AutomationActionBadge key={action} action={action} />
                  ))}
                </div>
              )}
              <time dateTime={latest.triggeredAt} className="relative z-[1] text-[10.5px] text-radar-light-muted dark:text-radar-muted">
                {formatRelativeTime(latest.triggeredAt)}
              </time>
            </div>
          )}
        </div>
      )}

      <Link
        href="/dashboard/automation"
        className="flex items-center gap-1 self-start text-xs font-medium text-radar-primary outline-none transition-colors hover:text-radar-primary/80 focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:text-radar-accent dark:hover:text-radar-accent/80"
      >
        View Automation
        <ArrowRight className="size-3.5 shrink-0" aria-hidden="true" />
      </Link>
    </WidgetCard>
  );
}
