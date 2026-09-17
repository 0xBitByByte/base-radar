/**
 * V4-INTELLIGENCE-003 — the one static table every correlation in this
 * layer reads from. `topic` values here are the REAL, already-existing
 * identifiers other modules already use — `AnalyticsHighlight.topic`
 * (`lib/wallet-analytics/highlights.ts`), `Trend.metric`
 * (`lib/wallet-analytics/trend.ts`), and `WalletRuleId`
 * (`lib/wallet-automation/types.ts`) — never a new taxonomy invented here.
 * A topic with no real matching trend/rule/question honestly gets `null`
 * for that field (e.g. "unknownAssets" has no `Trend` — Analytics never
 * tracked it as a continuous metric — so `analyticsTrendMetric: null`,
 * never a guessed match).
 */

import type { AIChatQuestionId } from "@/lib/ai-chat/types";
import type { WalletRuleId } from "@/lib/wallet-automation/types";

export type TopicMetadata = {
  analyticsTrendMetric: string | null;
  automationRuleId: WalletRuleId | null;
  chatQuestionId: AIChatQuestionId | null;
};

/**
 * Every real topic `buildAnalyticsHighlights()` (`lib/wallet-analytics/highlights.ts`)
 * actually produces — `RECOVERY_TOPIC`, `PERSONAL_BEST_TOPICS`,
 * `MILESTONE_TOPICS`, plus "stability" and the dynamic `biggestChange.metric`/
 * `"ethAllocation"` cases — cross-referenced here, once.
 */
export const TOPIC_METADATA: Record<string, TopicMetadata> = {
  health: { analyticsTrendMetric: "health", automationRuleId: "wallet-rule:health", chatQuestionId: "healthChange" },
  confidence: { analyticsTrendMetric: "confidence", automationRuleId: "wallet-rule:confidence", chatQuestionId: "confidenceLow" },
  risk: { analyticsTrendMetric: "risk", automationRuleId: "wallet-rule:risk", chatQuestionId: "biggestRisk" },
  diversification: { analyticsTrendMetric: "diversification", automationRuleId: null, chatQuestionId: "diversification" },
  value: { analyticsTrendMetric: "value", automationRuleId: "wallet-rule:largest-holding", chatQuestionId: "portfolioEvolution" },
  stablecoinAllocation: { analyticsTrendMetric: "stablecoinAllocation", automationRuleId: "wallet-rule:stablecoin", chatQuestionId: "portfolioEvolution" },
  ethAllocation: { analyticsTrendMetric: null, automationRuleId: "wallet-rule:concentration", chatQuestionId: "portfolioEvolution" },
  unknownAssets: { analyticsTrendMetric: null, automationRuleId: "wallet-rule:unknown-assets", chatQuestionId: null },
  lowPricingCoverage: { analyticsTrendMetric: null, automationRuleId: "wallet-rule:pricing-coverage", chatQuestionId: "confidenceLow" },
  stability: { analyticsTrendMetric: null, automationRuleId: null, chatQuestionId: "portfolioEvolution" },
  recommendation: { analyticsTrendMetric: "recommendation", automationRuleId: "wallet-rule:recommendation", chatQuestionId: "topRecommendation" },
  fingerprint: { analyticsTrendMetric: "fingerprint", automationRuleId: "wallet-rule:fingerprint", chatQuestionId: "fingerprintChange" },
};

/**
 * Every real `PortfolioRecommendation.id` `lib/portfolio-intelligence/recommendations.ts`
 * produces, mapped to the closest real topic above. An id not in this map
 * (a future new recommendation) honestly correlates to nothing rather than
 * a guessed topic.
 */
export const RECOMMENDATION_TOPIC: Record<string, string> = {
  "reduce-concentration": "ethAllocation",
  "reduce-protocol-dependency": "diversification",
  "increase-diversification": "diversification",
  "add-stablecoins": "stablecoinAllocation",
  "review-dust": "unknownAssets",
  "research-unpriced": "unknownAssets",
  "track-largest-position": "value",
};
