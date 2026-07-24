"use client";

import { useState } from "react";
import Link from "next/link";
import { Dialog } from "@base-ui/react/dialog";
import { ArrowRight, Plus, Sparkles, Target, X, Zap } from "lucide-react";

import { cn } from "@/lib/utils";
import { AutomationActionBadge, AutomationTriggerBadge } from "@/components/automation/AutomationBadge";
import { AutomationMetric } from "@/components/automation/AutomationMetric";
import { getResultActions, getResultTrigger } from "@/components/automation/filters";
import { NotificationBadge } from "@/components/notifications/NotificationBadge";
import { WidgetCard } from "@/components/dashboard/WidgetCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { GlowBadge } from "@/components/ui/GlowBadge";
import { formatRelativeTime } from "@/lib/data/format";
import { usePersonalizedDashboard } from "@/lib/hooks/usePersonalizedDashboard";
import { DEFAULT_AUTOMATION_RULES } from "@/lib/automation/rules";

/**
 * "Create Automation" is a Coming Soon placeholder (PR-048 requirement 4) —
 * this app's automation rules are fixed/preset (togglable, not user-authored),
 * so this opens an informational modal rather than implying a real rule
 * builder exists.
 */
function CreateAutomationButton() {
  const [open, setOpen] = useState(false);
  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger
        render={
          <button
            type="button"
            className="flex items-center justify-center gap-1.5 rounded-xl border border-radar-light-border px-3.5 py-2 text-xs font-medium text-radar-light-text outline-none transition-colors hover:bg-radar-light-surface focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:border-white/10 dark:text-radar-white dark:hover:bg-white/5"
          />
        }
      >
        <Plus className="size-3.5" aria-hidden="true" />
        Create Automation
        <GlowBadge color="muted" className="ml-0.5 px-1.5 py-0 text-[9px] uppercase tracking-wide">
          Coming Soon
        </GlowBadge>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Backdrop
          className={cn(
            "fixed inset-0 z-40 bg-radar-bg/40 backdrop-blur-sm dark:bg-black/60",
            "transition-opacity duration-200 motion-reduce:transition-none",
            "data-[starting-style]:opacity-0 data-[ending-style]:opacity-0"
          )}
        />
        <Dialog.Popup
          className={cn(
            "fixed top-1/2 left-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-radar-light-border bg-radar-light-card p-5 shadow-2xl outline-none dark:border-white/10 dark:bg-radar-card",
            "transition-[opacity,transform] duration-200 motion-reduce:transition-none",
            "data-[starting-style]:scale-95 data-[starting-style]:opacity-0 data-[ending-style]:scale-95 data-[ending-style]:opacity-0"
          )}
        >
          <div className="mb-1 flex items-center justify-between">
            <Dialog.Title className="text-sm font-semibold text-radar-light-text dark:text-radar-white">
              Custom Automation — Coming Soon
            </Dialog.Title>
            <Dialog.Close
              aria-label="Close"
              className="flex size-7 items-center justify-center rounded-lg text-radar-light-muted outline-none transition-colors hover:bg-radar-light-surface dark:text-radar-muted dark:hover:bg-white/5"
            >
              <X className="size-4" aria-hidden="true" />
            </Dialog.Close>
          </div>
          <Dialog.Description className="mb-4 text-xs text-radar-light-muted dark:text-radar-muted">
            Building your own automation rules from scratch is planned but not available yet. Today, Automation
            monitors your Watchlist using a fixed set of rules you can enable or disable — a custom rule builder
            will let you define your own trigger conditions and actions.
          </Dialog.Description>
          <div className="flex flex-col gap-3">
            <div className="flex items-start gap-3">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-radar-purple/10 text-radar-purple">
                <Target className="size-4" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-radar-light-text dark:text-radar-white">
                  Custom trigger conditions
                </p>
                <p className="text-[11px] text-radar-light-muted dark:text-radar-muted">
                  Define exactly what should fire a rule — a price move, a whale transfer, a governance event.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-radar-purple/10 text-radar-purple">
                <Sparkles className="size-4" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-radar-light-text dark:text-radar-white">
                  Custom actions
                </p>
                <p className="text-[11px] text-radar-light-muted dark:text-radar-muted">
                  Choose what happens when a rule matches, beyond today&apos;s fixed notification behavior.
                </p>
              </div>
            </div>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

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
      subtitle="Built-in rules monitoring your Watchlist"
      accent="purple"
      lastUpdated={latest?.triggeredAt}
    >
      {!enabled ? (
        <EmptyState icon={Zap} title="Automation is disabled." description="No rule can fire while Automation is turned off." />
      ) : !hasAutomationResults ? (
        <EmptyState
          icon={Zap}
          title="No automations configured."
          description="Automation monitors your Watchlist and notifies you when a configured condition is met — nothing has matched yet."
          action={<CreateAutomationButton />}
        />
      ) : isPersonalized && results.length === 0 ? (
        <EmptyState
          icon={Zap}
          title="No automation results for this Watchlist."
          description={`None of the projects in "${activeWatchlist?.name}" have triggered an automation rule yet.`}
          action={<CreateAutomationButton />}
        />
      ) : (
        <div className="flex flex-col gap-3.5">
          <p className="text-[11px] text-radar-light-muted dark:text-radar-muted">
            Results from {DEFAULT_AUTOMATION_RULES.length} built-in rules — no custom rules configured yet.
          </p>

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
