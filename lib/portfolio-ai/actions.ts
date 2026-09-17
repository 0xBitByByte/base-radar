/**
 * V4-INTELLIGENCE-003 — AI Actions: `intelligence.recommendations`
 * (already title/explanation/reason/priority, already priority-sorted by
 * `lib/portfolio-intelligence/recommendations.ts`) plus two deterministic,
 * rule-based ratings this phase's brief asks for — `difficulty` and
 * `estimatedImpact` — keyed off each recommendation's own fixed `id`.
 * Never a new recommendation, never a re-ranked one.
 */

import type { AIAction, AIActionDifficulty, AIActionImpact } from "@/lib/portfolio-ai/types";
import type { PortfolioIntelligence, PortfolioRecommendationPriority } from "@/lib/portfolio-intelligence/types";

/**
 * A fixed rating per known recommendation id (from `recommendations.ts`'s
 * own closed set) — "easy" for anything that's just reviewing/researching
 * already-visible information, "moderate" for a single position-sizing
 * decision, "involved" for anything that means restructuring exposure
 * across multiple assets or protocols. Any future recommendation id not
 * yet in this map honestly falls back to "moderate" (see
 * `buildAIActions`) rather than guessing a rating this table doesn't have.
 */
const DIFFICULTY_BY_RECOMMENDATION_ID: Record<string, AIActionDifficulty> = {
  "reduce-concentration": "moderate",
  "reduce-protocol-dependency": "involved",
  "increase-diversification": "involved",
  "add-stablecoins": "moderate",
  "review-dust": "easy",
  "research-unpriced": "easy",
  "track-largest-position": "easy",
};

const IMPACT_BY_PRIORITY: Record<PortfolioRecommendationPriority, AIActionImpact> = {
  high: "high",
  medium: "medium",
  low: "low",
};

export function buildAIActions(intelligence: PortfolioIntelligence): AIAction[] {
  return intelligence.recommendations.map((recommendation) => ({
    id: recommendation.id,
    title: recommendation.title,
    description: recommendation.explanation,
    priority: recommendation.priority,
    difficulty: DIFFICULTY_BY_RECOMMENDATION_ID[recommendation.id] ?? "moderate",
    estimatedImpact: IMPACT_BY_PRIORITY[recommendation.priority],
    reason: recommendation.reason,
  }));
}
