"use client";

import { useMemo } from "react";
import { Clock, Zap } from "lucide-react";

import { cn } from "@/lib/utils";
import type { UseWalletAutomationResult } from "@/lib/hooks/useWalletAutomation";
import { buildAutomationIndexes } from "@/lib/wallet-automation/indexes";
import { AutomationMetric } from "@/components/automation/AutomationMetric";
import { GLASS_CARD_SURFACE } from "@/components/ui/glassStyles";
import { EmptyState } from "@/components/ui/EmptyState";
import { RelativeTime } from "@/components/shared/RelativeTime";
import { ExplainAutomationAction } from "@/components/wallet/ExplainAutomationAction";
import type { AIChatQuestionId } from "@/lib/ai-chat/types";
import type { CrossFeatureIntelligence } from "@/lib/cross-feature/types";
import type { PortfolioAI } from "@/lib/portfolio-ai/types";
import type { WalletAnalytics } from "@/lib/wallet-analytics/types";

const TONE_DOT_CLASS = {
  positive: "bg-radar-success",
  neutral: "bg-radar-light-muted dark:bg-radar-muted",
  attention: "bg-radar-warning",
} as const;

/** V3-WALLET-004 — a compact status readout: rule count, active count, last trigger. Full per-rule detail lives in the Automation Center's own "Wallet Automations" section (linked below), matching this codebase's established "shallow preview here, full detail elsewhere" widget convention. */
export function AutomationStatusSection({ automation, className }: { automation: UseWalletAutomationResult; className?: string }) {
  const { rules, results, automationEnabled } = automation;
  const activeCount = rules.filter((rule) => rule.enabled).length;
  const lastTriggered = results[0]?.triggeredAt ?? null;

  return (
    <div className={cn("flex flex-col gap-4 p-6", GLASS_CARD_SURFACE, className)}>
      <div className="flex items-center gap-2">
        <Zap className="size-4 text-radar-light-muted dark:text-radar-muted" aria-hidden="true" />
        <h2 className="text-sm font-semibold text-radar-light-text dark:text-radar-white">Automation Status</h2>
      </div>

      {!automationEnabled ? (
        <p className="text-xs text-radar-light-muted dark:text-radar-muted">
          Automation is turned off — no wallet rule can fire until it&apos;s re-enabled in Automation Preferences.
        </p>
      ) : (
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <AutomationMetric label="Wallet Rules" value={rules.length} />
          <AutomationMetric label="Active" value={activeCount} />
          <AutomationMetric label="Last Trigger" value={lastTriggered ? <RelativeTime iso={lastTriggered} /> : "Never"} />
          <AutomationMetric label="Automation" value={automationEnabled ? "Enabled" : "Disabled"} />
        </div>
      )}
    </div>
  );
}

/**
 * V3-WALLET-004 — the complete tier-1 change log (`events`), not just rule-triggered results — an honest "everything that happened," including recoveries and informational transitions a rule wouldn't necessarily notify on.
 *
 * V4-FUTURE-001 (Notification Explainability) — `crossFeature`/`ai`/
 * `analytics` are optional: when supplied, each event that has a real,
 * rule-triggered `AutomationResult` at the SAME real timestamp (found in
 * `automation.results`, never guessed) gets a real "Explain" button,
 * built via `buildNotificationExplanation()` — never a second explanation
 * engine, and never shown for an event no rule actually fired on.
 */
export function RecentWalletEventsSection({
  automation,
  crossFeature,
  ai = null,
  analytics,
  onAskQuestion,
  className,
}: {
  automation: UseWalletAutomationResult;
  crossFeature?: CrossFeatureIntelligence;
  ai?: PortfolioAI | null;
  analytics?: WalletAnalytics;
  onAskQuestion?: (questionId: AIChatQuestionId) => void;
  className?: string;
}) {
  const { events, results } = automation;
  // V4-FUTURE-002E — built once per real `results` version instead of a
  // fresh `results.find(...)` scan for EVERY event below (was O(events ×
  // results); an event's real `matchedResult` lookup is now O(1)).
  const { resultByTriggeredAt } = useMemo(() => buildAutomationIndexes(results), [results]);

  return (
    <div className={cn("flex flex-col gap-4 p-6", GLASS_CARD_SURFACE, className)}>
      <div className="flex items-center gap-2">
        <Clock className="size-4 text-radar-light-muted dark:text-radar-muted" aria-hidden="true" />
        <h2 className="text-sm font-semibold text-radar-light-text dark:text-radar-white">Recent Wallet Events</h2>
      </div>

      {events.length === 0 ? (
        <EmptyState
          icon={Clock}
          title="No wallet events yet."
          description="Events appear here as your portfolio changes — refresh, reconnect, or switch networks to see real activity."
        />
      ) : (
        <ul className="flex flex-col divide-y divide-radar-light-border dark:divide-white/10">
          {events.slice(0, 10).map((event) => {
            const matchedResult = crossFeature && analytics ? (resultByTriggeredAt.get(event.timestamp) ?? null) : null;

            return (
              <li key={event.id} className="flex items-start gap-2.5 py-2.5 first:pt-0 last:pb-0">
                <span className={cn("mt-1.5 size-1.5 shrink-0 rounded-full", TONE_DOT_CLASS[event.tone])} aria-hidden="true" />
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="text-xs font-medium text-radar-light-text dark:text-radar-white">{event.title}</span>
                  <span className="text-xs text-radar-light-muted dark:text-radar-muted">{event.summary}</span>
                  {matchedResult && crossFeature && analytics && (
                    <div>
                      <ExplainAutomationAction result={matchedResult} crossFeature={crossFeature} ai={ai} analytics={analytics} askQuestion={onAskQuestion} />
                    </div>
                  )}
                </div>
                <time dateTime={event.timestamp} className="shrink-0 text-[10.5px] text-radar-light-muted dark:text-radar-muted">
                  <RelativeTime iso={event.timestamp} />
                </time>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
