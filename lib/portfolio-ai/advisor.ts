/**
 * V4-INTELLIGENCE-003 (Phase 3) — the advisor's single top-line read.
 * `headline` is the highest-priority `AIInsight`'s own title (already
 * ranked by `insights.ts`) when one exists, or a fixed fallback when
 * nothing stands out; `explanation` is `intelligence.executiveSummary`
 * verbatim; `nextAction`/`actionReason` are the top-priority
 * recommendation's own fields. Nothing here is a new sentence.
 */

import type { AIInsight, AIOverview } from "@/lib/portfolio-ai/types";
import type { PortfolioIntelligence } from "@/lib/portfolio-intelligence/types";

const NOTHING_STANDS_OUT_HEADLINE = "Nothing urgent stands out right now.";

export function buildAIOverview(intelligence: PortfolioIntelligence, topInsight: AIInsight | null): AIOverview {
  const topRecommendation = intelligence.recommendations[0] ?? null;

  return {
    priority: topInsight?.priority ?? "observation",
    headline: topInsight && topInsight.priority !== "observation" ? topInsight.title : NOTHING_STANDS_OUT_HEADLINE,
    explanation: intelligence.executiveSummary,
    confidence: intelligence.confidenceLevel,
    nextAction: topRecommendation?.explanation ?? null,
    actionReason: topRecommendation?.reason ?? null,
  };
}
