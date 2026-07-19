"use client";

/**
 * Formats `useAutomation()`'s already-computed array into the small
 * metric-tile list `AutomationMetric`/`AutomationCenter`/`AutomationWidget`
 * render — the only place that list is assembled; every value is a
 * straight read or count over `results`, never a recomputation of
 * anything the Automation Engine already decided. Memoized on the
 * `results` reference.
 */

import { useMemo } from "react";

import { useAutomation } from "@/lib/hooks/useAutomation";

export type AutomationMetricItem = {
  key: string;
  label: string;
  value: string | number;
};

export function useAutomationMetrics(): AutomationMetricItem[] {
  const { results } = useAutomation();

  return useMemo(() => {
    const critical = results.filter((result) => result.priority === "critical").length;
    const high = results.filter((result) => result.priority === "high").length;
    const ruleIds = new Set(results.map((result) => result.ruleId));
    const projectIds = new Set(
      results.map((result) => result.projectId).filter((projectId): projectId is string => projectId !== null)
    );

    return [
      { key: "total", label: "Total Automations", value: results.length },
      { key: "critical", label: "Critical", value: critical },
      { key: "high", label: "High Priority", value: high },
      { key: "rules", label: "Rules Triggered", value: ruleIds.size },
      { key: "projects", label: "Projects Affected", value: projectIds.size },
    ];
  }, [results]);
}
