"use client";

/**
 * Aggregates `useIntelligenceAlerts()`'s current array into the handful of
 * top-level stats `ExecutiveSummary.tsx` renders — narrative counts, average
 * confidence, highest score. A `useMemo` keyed on that array's reference, so
 * it only re-aggregates when the Alert Engine's intelligence cache actually
 * changes (per `lib/alerts/service.ts`'s cached-snapshot contract), never on
 * every render. This is the ONLY place these stats are computed — no
 * component re-derives them, per the PR brief's "do not duplicate
 * calculations."
 */

import { useMemo } from "react";

import { useIntelligenceAlerts } from "@/lib/hooks/useIntelligenceAlerts";
import { NARRATIVE_TYPES, type NarrativeType } from "@/lib/alerts/intelligence/types";

export type ExecutiveSummary = {
  totalCount: number;
  narrativeCounts: Record<NarrativeType, number>;
  averageConfidence: number;
  highestScore: number;
};

function emptyNarrativeCounts(): Record<NarrativeType, number> {
  return Object.fromEntries(NARRATIVE_TYPES.map((narrative) => [narrative, 0])) as Record<NarrativeType, number>;
}

export function useExecutiveSummary(): ExecutiveSummary {
  const alerts = useIntelligenceAlerts();

  return useMemo(() => {
    const narrativeCounts = emptyNarrativeCounts();
    let confidenceTotal = 0;
    let highestScore = 0;

    for (const alert of alerts) {
      narrativeCounts[alert.narrative] += 1;
      confidenceTotal += alert.confidence;
      if (alert.score > highestScore) highestScore = alert.score;
    }

    return {
      totalCount: alerts.length,
      narrativeCounts,
      averageConfidence: alerts.length === 0 ? 0 : Math.round(confidenceTotal / alerts.length),
      highestScore,
    };
  }, [alerts]);
}
