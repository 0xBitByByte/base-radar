"use client";

import Link from "next/link";
import { AlertTriangle, Check, Fish, Landmark, Radar, Trash2, Undo2 } from "lucide-react";

import type { UsePortfolioMonitoringResult } from "@/lib/hooks/usePortfolioMonitoring";
import { NotificationBadge } from "@/components/notifications/NotificationBadge";
import { RelativeTime } from "@/components/shared/RelativeTime";
import { GLASS_CARD_SURFACE } from "@/components/ui/glassStyles";
import { EmptyState } from "@/components/ui/EmptyState";
import { cn } from "@/lib/utils";

const KIND_ICON = { whale: Fish, governance: Landmark } as const;

/**
 * PR-092.04 (Portfolio Monitoring) — Whale + Governance alerts for the
 * projects a connected wallet actually holds. Same honest-state contract
 * `AIWatchPanel.tsx` established: "checking" while holdings are still
 * loading, an explicit "can't check right now" on a real load error (never
 * a silent skip, never a fabricated result), and the check only ever runs
 * when this page is open — never "monitors" or "in real time." "Portfolio
 * alerts"/"Risk alerts" (composition/health/concentration) are already
 * covered by the existing Wallet Automation system (`AutomationStatusSection`,
 * rendered elsewhere on this page) — this section is deliberately scoped
 * to the two kinds Wallet Automation cannot see: external whale/governance
 * events on held projects.
 */
export function PortfolioMonitoringSection({ monitoring, className }: { monitoring: UsePortfolioMonitoringResult; className?: string }) {
  return (
    <section aria-labelledby="portfolio-monitoring-heading" className={cn("flex flex-col gap-4 p-6", GLASS_CARD_SURFACE, className)}>
      <div>
        <div className="flex items-center gap-2">
          <Radar className="size-4 text-radar-primary dark:text-radar-accent" aria-hidden="true" />
          <h2 id="portfolio-monitoring-heading" className="text-sm font-semibold text-radar-light-text dark:text-radar-white">
            Portfolio Monitoring
          </h2>
        </div>
        <p className="mt-0.5 text-xs text-radar-light-muted dark:text-radar-muted">
          Notify me of new whale activity or governance proposals on projects I hold. Portfolio Monitoring checks when you open this page — it doesn&apos;t run in the background.
        </p>
      </div>

      {!monitoring.enabled ? (
        <div className="flex flex-col gap-3">
          <EmptyState
            icon={Radar}
            title={monitoring.exists ? "Monitoring is off" : "No monitoring yet"}
            description={monitoring.exists ? "Turn it back on to resume checking your held projects on your next visit." : "Turn it on to start checking your held projects for new whale and governance activity on your next visit."}
          />
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={monitoring.enable}
              className="self-start rounded-full bg-radar-primary px-3 py-1.5 text-[11px] font-semibold text-white outline-none transition-colors hover:bg-radar-primary/90 focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:bg-radar-accent dark:text-radar-dark dark:hover:bg-radar-accent/90"
            >
              Turn on Portfolio Monitoring
            </button>
            {monitoring.exists && (
              <button
                type="button"
                onClick={monitoring.remove}
                className="flex items-center gap-1.5 text-[10.5px] font-medium text-radar-light-muted outline-none transition-colors hover:text-radar-danger focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:text-radar-muted"
              >
                <Trash2 className="size-3 shrink-0" aria-hidden="true" />
                Remove
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {monitoring.status === "checking" && (
            <div className="flex flex-col gap-2" role="status" aria-label="Checking Portfolio Monitoring">
              <div className="h-16 animate-pulse rounded-xl bg-radar-light-surface dark:bg-white/5" />
            </div>
          )}

          {monitoring.status === "unavailable" && (
            <EmptyState
              icon={AlertTriangle}
              title="Can't check right now"
              description="Your holdings didn't load this visit. Portfolio Monitoring never checks against stale or missing data — try again on your next visit."
            />
          )}

          {monitoring.status === "ready" && monitoring.heldProjectCount === 0 && (
            <EmptyState icon={Radar} title="No tracked projects held" description="None of your current holdings match a project Base Radar tracks yet, so there's nothing to monitor." />
          )}

          {monitoring.status === "ready" && monitoring.heldProjectCount > 0 && monitoring.alerts.length === 0 && (
            <EmptyState icon={Radar} title="Nothing new yet" description="No new whale or governance activity for your held projects as of your last visit. Portfolio Monitoring will keep checking each time you open this page." />
          )}

          {monitoring.status === "ready" && monitoring.alerts.length > 0 && (
            // Plain `div`s with list roles, not `<ul>`/`<li>` — matches
            // `AIWatchPanel.tsx`'s own established fix for the real,
            // previously-caught `<li>` nesting hydration bug.
            <div className="flex flex-col gap-3" role="list" aria-label="Portfolio Monitoring alerts">
              {monitoring.alerts.map((alert) => {
                const Icon = KIND_ICON[alert.kind];
                return (
                  <div key={alert.id} role="listitem" className="flex flex-col gap-2 rounded-xl border border-radar-light-border p-3 dark:border-white/10">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {!alert.isRead && <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-radar-primary dark:bg-radar-accent" />}
                        <Icon className="size-3.5 shrink-0 text-radar-light-muted dark:text-radar-muted" aria-hidden="true" />
                        <span className="text-[10.5px] font-semibold text-radar-light-text dark:text-radar-white">{alert.kind === "whale" ? "Whale Activity" : "Governance Activity"}</span>
                        <NotificationBadge priority="medium" />
                      </div>
                      <div className="flex items-center gap-2">
                        <time dateTime={alert.firstSeenAt} className="text-[10.5px] whitespace-nowrap text-radar-light-muted dark:text-radar-muted">
                          First noticed <RelativeTime iso={alert.firstSeenAt} />
                        </time>
                        {alert.isRead ? (
                          <button
                            type="button"
                            onClick={() => monitoring.markUnread(alert.id)}
                            aria-label="Mark as unread"
                            className="flex size-6 shrink-0 items-center justify-center rounded-full text-radar-light-muted outline-none transition-colors hover:bg-radar-light-border hover:text-radar-light-text focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:text-radar-muted dark:hover:bg-white/10 dark:hover:text-radar-white"
                          >
                            <Undo2 className="size-3.5" aria-hidden="true" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => monitoring.markRead(alert.id)}
                            aria-label="Mark as read"
                            className="flex size-6 shrink-0 items-center justify-center rounded-full text-radar-light-muted outline-none transition-colors hover:bg-radar-light-border hover:text-radar-light-text focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:text-radar-muted dark:hover:bg-white/10 dark:hover:text-radar-white"
                          >
                            <Check className="size-3.5" aria-hidden="true" />
                          </button>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-radar-light-text dark:text-radar-white">{alert.headline}</p>
                    <p className="text-xs text-radar-light-muted dark:text-radar-muted">{alert.detail}</p>
                    {alert.projectSlug && (
                      <Link href={`/dashboard/projects/${alert.projectSlug}`} className="text-xs font-medium text-radar-primary outline-none hover:text-radar-primary/80 dark:text-radar-accent">
                        View {alert.projectName} →
                      </Link>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <div className="flex items-center gap-3 border-t border-radar-light-border pt-3 dark:border-white/10">
            <button
              type="button"
              onClick={monitoring.disable}
              className="text-[10.5px] font-medium text-radar-light-muted outline-none transition-colors hover:text-radar-light-text focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:text-radar-muted dark:hover:text-radar-white"
            >
              Turn off Portfolio Monitoring
            </button>
            <button
              type="button"
              onClick={monitoring.remove}
              className="flex items-center gap-1.5 text-[10.5px] font-medium text-radar-light-muted outline-none transition-colors hover:text-radar-danger focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:text-radar-muted"
            >
              <Trash2 className="size-3 shrink-0" aria-hidden="true" />
              Remove
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
