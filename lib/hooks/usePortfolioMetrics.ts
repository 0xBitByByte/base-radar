"use client";

/**
 * Formats `usePortfolioIntelligence()`'s already-computed fields into the
 * small metric-tile list `PortfolioMetric`/`PortfolioCard`/`PortfolioWidget`
 * render — the only place that list is assembled; every value is read
 * straight off `PortfolioIntelligence`, never recomputed. Memoized on the
 * `portfolio` reference, so it only re-runs when Portfolio Intelligence
 * itself actually changes.
 */

import { useMemo } from "react";

import { usePortfolioIntelligence } from "@/lib/hooks/usePortfolioIntelligence";

export type PortfolioMetricItem = {
  key: string;
  label: string;
  value: string | number;
};

export function usePortfolioMetrics(): PortfolioMetricItem[] {
  const portfolio = usePortfolioIntelligence();

  return useMemo(() => {
    if (!portfolio) return [];

    return [
      { key: "projects", label: "Projects", value: portfolio.projectCount },
      { key: "score", label: "Average Score", value: portfolio.averageScore },
      { key: "confidence", label: "Average Confidence", value: `${portfolio.averageConfidence}%` },
      { key: "topPerformers", label: "Top Performers", value: portfolio.topPerformers.length },
      { key: "needingAttention", label: "Projects Needing Attention", value: portfolio.projectsNeedingAttention.length },
      { key: "securityRisks", label: "Security Risks", value: portfolio.securityRisks.length },
    ];
  }, [portfolio]);
}
