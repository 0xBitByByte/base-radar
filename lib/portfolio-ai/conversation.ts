/**
 * V4-INTELLIGENCE-003 (Phase 7) — Conversation Context: everything a future
 * LLM-based chat layer (V4-AI-CHAT-001) would need, assembled once so that
 * phase never has to re-read `PortfolioIntelligence` piecemeal. Pure
 * pass-through/reshaping — every field here is copied directly from an
 * already-computed `PortfolioIntelligence` field. No chat is built here;
 * this is preparation only, per this phase's explicit "do NOT build chat"
 * instruction.
 */

import type { ConversationContext } from "@/lib/portfolio-ai/types";
import type { PortfolioIntelligence } from "@/lib/portfolio-intelligence/types";

export function buildConversationContext(intelligence: PortfolioIntelligence): ConversationContext {
  return {
    facts: {
      totalUsdValue: intelligence.totalUsdValue,
      largestHoldingSymbol: intelligence.largestHolding?.symbol ?? null,
      largestProtocolName: intelligence.largestProtocol?.name ?? null,
      lastUpdated: intelligence.lastUpdated,
    },
    scores: {
      overallScore: intelligence.overallScore,
      healthScore: intelligence.healthScore,
      riskScore: intelligence.riskScore,
      diversificationScore: intelligence.diversificationScore,
      confidenceScore: intelligence.confidenceScore,
    },
    warnings: intelligence.warnings,
    recommendations: intelligence.recommendations,
    fingerprint: intelligence.fingerprint,
    confidenceLevel: intelligence.confidenceLevel,
    contributors: {
      positive: intelligence.positiveContributors,
      negative: intelligence.negativeContributors,
    },
    summary: intelligence.executiveSummary,
  };
}
