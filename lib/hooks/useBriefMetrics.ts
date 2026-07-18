"use client";

/**
 * Formats `useDailyBrief()`'s already-computed fields into the small
 * metric-tile list `BriefMetric`/`BriefCard`/`BriefWidget` render — this is
 * the ONLY place that list is assembled; every value it emits is read
 * straight off `DailyBrief`, never recomputed (the Daily Brief engine
 * already produced `projectCount`/`averageConfidence`/`highestScore`/
 * `narrativeCounts`; this hook just picks and labels them). Memoized on the
 * `brief` reference, so it only re-runs when the brief itself actually
 * changes.
 */

import { useMemo } from "react";

import { useDailyBrief } from "@/lib/hooks/useDailyBrief";

export type BriefMetricItem = {
  key: string;
  label: string;
  value: string | number;
};

export function useBriefMetrics(): BriefMetricItem[] {
  const brief = useDailyBrief();

  return useMemo(() => {
    if (!brief) return [];

    return [
      { key: "projects", label: "Projects", value: brief.projectCount },
      { key: "confidence", label: "Average Confidence", value: `${brief.averageConfidence}%` },
      { key: "score", label: "Highest Score", value: brief.highestScore },
      { key: "growth", label: "Growth Narratives", value: brief.narrativeCounts.growth },
      { key: "security", label: "Security Alerts", value: brief.narrativeCounts["security-risk"] },
      { key: "governance", label: "Governance Events", value: brief.narrativeCounts["governance-active"] },
    ];
  }, [brief]);
}
