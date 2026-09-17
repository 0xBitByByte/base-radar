/**
 * V4-INTELLIGENCE-003 (Phase 4) — Recommendation Correlation. Every real
 * `PortfolioRecommendation` (already priority-sorted by
 * `lib/portfolio-intelligence/recommendations.ts`), mapped to where else it
 * shows up — via `RECOMMENDATION_TOPIC` (`topics.ts`), the one static table
 * that knows which real topic each of the 7 known recommendation ids maps
 * to. An unrecognized id (a future new recommendation) honestly gets every
 * ref as `null` rather than a guessed match.
 */

import { buildFeatureRefs, type RefsInput } from "@/lib/cross-feature/refs";
import { RECOMMENDATION_TOPIC } from "@/lib/cross-feature/topics";
import type { RecommendationCorrelation } from "@/lib/cross-feature/types";
import type { PortfolioRecommendation } from "@/lib/portfolio-intelligence/types";
import type { AnalyticsSnapshot } from "@/lib/wallet-history/types";

/** `primaryRecommendationId` is Portfolio AI's own already-ranked `actions[0]?.id` (or `null`) — reused as-is, never a second "which recommendation matters most" judgment computed here. */
export function buildRecommendationCorrelations(recommendations: PortfolioRecommendation[], history: AnalyticsSnapshot[], refsInput: RefsInput, primaryRecommendationId: string | null): RecommendationCorrelation[] {
  // A recommendation describes the CURRENT portfolio state — the real
  // "as of" moment is the latest real snapshot, if one exists.
  const latestSnapshotTimestamp = history[history.length - 1]?.timestamp ?? null;

  return recommendations.map((recommendation) => {
    const topic = RECOMMENDATION_TOPIC[recommendation.id] ?? null;
    return {
      recommendationId: recommendation.id,
      title: recommendation.title,
      isPrimary: recommendation.id === primaryRecommendationId,
      refs: topic ? buildFeatureRefs(topic, latestSnapshotTimestamp, refsInput) : { historySnapshotTimestamp: null, analyticsTrendMetric: null, reportPeriod: null, chatQuestionId: null, automationResultId: null },
    };
  });
}
