"use client";

/**
 * Formats `useTimeline()`'s already-computed fields into the small
 * metric-tile list `TimelineMetric`/`Timeline.tsx`/`TimelineWidget` render
 * — the only place that list is assembled; every value is read straight
 * off `Timeline`, never recomputed. "Projects Affected" is the one derived
 * value here — a `Set` over each event's real `projectId`, excluding the
 * `null` ones aggregate events carry — still not a duplicate calculation,
 * since nothing upstream already counts distinct projects across a mixed
 * event feed. Memoized on the `timeline` reference.
 */

import { useMemo } from "react";

import { useTimeline } from "@/lib/hooks/useTimeline";
import { capitalize } from "@/lib/timeline/summary";

export type TimelineMetricItem = {
  key: string;
  label: string;
  value: string | number;
};

export function useTimelineMetrics(): TimelineMetricItem[] {
  const timeline = useTimeline();

  return useMemo(() => {
    if (!timeline) return [];

    const projectIds = new Set(
      timeline.events.map((event) => event.projectId).filter((projectId): projectId is string => projectId !== null)
    );

    return [
      { key: "total", label: "Total Events", value: timeline.totalEvents },
      {
        key: "severity",
        label: "Highest Severity",
        value: timeline.highestSeverity ? capitalize(timeline.highestSeverity) : "None",
      },
      { key: "confidence", label: "Average Confidence", value: `${timeline.averageConfidence}%` },
      { key: "score", label: "Average Score", value: timeline.averageScore },
      { key: "projects", label: "Projects Affected", value: projectIds.size },
    ];
  }, [timeline]);
}
