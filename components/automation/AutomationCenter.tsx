"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Gauge, Settings } from "lucide-react";

import { AutomationEmpty } from "@/components/automation/AutomationEmpty";
import { AutomationFilters } from "@/components/automation/AutomationFilters";
import { AutomationGroup } from "@/components/automation/AutomationGroup";
import { AutomationItem } from "@/components/automation/AutomationItem";
import { AutomationMetric } from "@/components/automation/AutomationMetric";
import {
  filterAutomationResultsByAction,
  filterAutomationResultsByPriority,
  filterAutomationResultsByQuery,
} from "@/components/automation/filters";
import { AUTOMATION_GROUP_KEYS, AUTOMATION_GROUP_LABEL, groupAutomationResults } from "@/components/automation/grouping";
import { buildAutomationSummary } from "@/components/automation/summary";
import { useAutomation } from "@/lib/hooks/useAutomation";
import { useAutomationMetrics } from "@/lib/hooks/useAutomationMetrics";
import type { AutomationAction } from "@/lib/automation/types";
import type { NotificationPriority } from "@/lib/notifications/types";

const DEFAULT_PRIORITY_FILTER: NotificationPriority | "all" = "all";
const DEFAULT_ACTION_FILTER: AutomationAction | "all" = "all";

/**
 * The dedicated Automation Center experience
 * (`app/dashboard/automation/page.tsx`). Everything renders from
 * `useAutomation()` — no fetching, no rebuilding, never reading
 * Notifications/Timeline/Portfolio Intelligence/Daily Brief/Intelligence
 * Alerts/providers directly, and never evaluating a rule itself.
 * Search/priority/action filters are pure, component-local UI state; none
 * of them ever trigger an automation rebuild. Date-group headings
 * (Today/Yesterday/Earlier) are omitted entirely when that group has zero
 * results. The `enabled` check (PR20 Part 3) renders a distinct
 * "Automation is disabled" state before the generic "no results" one —
 * `useAutomation()` already returns an empty `results` array when
 * disabled, but conflating "off" with "nothing matched" would be
 * misleading.
 */
export function AutomationCenter() {
  const { results, enabled } = useAutomation();
  const metrics = useAutomationMetrics();
  const [search, setSearch] = useState("");
  const [priority, setPriority] = useState<NotificationPriority | "all">(DEFAULT_PRIORITY_FILTER);
  const [action, setAction] = useState<AutomationAction | "all">(DEFAULT_ACTION_FILTER);

  const normalizedQuery = search.trim().toLowerCase();
  const criticalCount = useMemo(() => results.filter((result) => result.priority === "critical").length, [results]);

  const filteredResults = useMemo(() => {
    const searched = filterAutomationResultsByQuery(results, normalizedQuery);
    const byPriority = filterAutomationResultsByPriority(searched, priority);
    return filterAutomationResultsByAction(byPriority, action);
  }, [results, normalizedQuery, priority, action]);

  const groups = useMemo(() => groupAutomationResults(filteredResults), [filteredResults]);

  if (!enabled) {
    return <AutomationEmpty variant="disabled" className="py-16" />;
  }

  if (results.length === 0) {
    return <AutomationEmpty variant="none" className="py-16" />;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-xl font-semibold text-radar-light-text dark:text-radar-white">Automation</h1>
          <Link
            href="/dashboard/settings/automation"
            aria-label="Automation preferences"
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-radar-light-muted outline-none transition-colors hover:bg-radar-light-surface focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:text-radar-muted dark:hover:bg-white/5"
          >
            <Settings className="size-3.5" aria-hidden="true" />
            Preferences
          </Link>
        </div>
        <p className="text-sm leading-relaxed text-radar-light-muted dark:text-radar-muted">
          {buildAutomationSummary(results.length, criticalCount)}
        </p>
      </div>

      <section aria-labelledby="automation-metrics-heading" className="flex flex-col gap-3">
        <div className="flex items-center gap-1.5">
          <Gauge className="size-4 shrink-0 text-radar-light-muted dark:text-radar-muted" aria-hidden="true" />
          <h2
            id="automation-metrics-heading"
            className="text-sm font-semibold text-radar-light-text dark:text-radar-white"
          >
            Metrics
          </h2>
        </div>
        <div className="grid grid-cols-2 gap-x-6 gap-y-3 rounded-xl border border-radar-light-border bg-radar-light-card p-4 sm:grid-cols-3 lg:grid-cols-5 dark:border-white/10 dark:bg-white/[0.02]">
          {metrics.map((metric) => (
            <AutomationMetric key={metric.key} label={metric.label} value={metric.value} />
          ))}
        </div>
      </section>

      <AutomationFilters
        search={search}
        onSearchChange={setSearch}
        priority={priority}
        onPriorityChange={setPriority}
        action={action}
        onActionChange={setAction}
      />

      {filteredResults.length === 0 ? (
        <AutomationEmpty variant={normalizedQuery !== "" ? "search" : "filter"} className="py-16" />
      ) : (
        AUTOMATION_GROUP_KEYS.map(
          (key) =>
            groups[key].length > 0 && (
              <AutomationGroup key={key} id={key} title={AUTOMATION_GROUP_LABEL[key]}>
                {groups[key].map((result) => (
                  <AutomationItem key={result.id} result={result} />
                ))}
              </AutomationGroup>
            )
        )
      )}
    </div>
  );
}
