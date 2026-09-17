/**
 * V4-INTELLIGENCE-003 — the one clean public surface for this directory,
 * matching `lib/portfolio-intelligence/index.ts`'s own barrel convention.
 */

export { buildPortfolioAI } from "@/lib/portfolio-ai/engine";
export type * from "@/lib/portfolio-ai/types";

export { buildAIOverview } from "@/lib/portfolio-ai/advisor";
export { buildAIInsights } from "@/lib/portfolio-ai/insights";
export { buildAIActions } from "@/lib/portfolio-ai/actions";
export { buildAITimeline } from "@/lib/portfolio-ai/timeline";
export { buildAISummaryLines } from "@/lib/portfolio-ai/summary";
export { buildConversationContext } from "@/lib/portfolio-ai/conversation";
export { comparePriorityTier, PRIORITY_TIER_RANK } from "@/lib/portfolio-ai/priorities";
