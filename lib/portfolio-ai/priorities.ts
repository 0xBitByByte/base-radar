/**
 * V4-INTELLIGENCE-003 — the one place `AIPriorityTier`'s fixed order is
 * encoded as a sortable rank, matching this phase's own brief exactly:
 * critical risks, then major opportunities, then recommendations, then
 * positive achievements, then interesting observations. Every consumer
 * (`insights.ts`'s sort, any future UI grouping) reads from here rather
 * than re-declaring the order.
 */

import type { AIPriorityTier } from "@/lib/portfolio-ai/types";

export const PRIORITY_TIER_RANK: Record<AIPriorityTier, number> = {
  "critical-risk": 0,
  "major-opportunity": 1,
  recommendation: 2,
  "positive-achievement": 3,
  observation: 4,
};

export function comparePriorityTier(a: AIPriorityTier, b: AIPriorityTier): number {
  return PRIORITY_TIER_RANK[a] - PRIORITY_TIER_RANK[b];
}
