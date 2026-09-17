/**
 * V4-INTELLIGENCE-003 — domain types for the AI Advisor layer. This is a
 * PRESENTATION layer over `PortfolioIntelligence`, never a second analysis
 * engine: every field on every type below is either copied verbatim from an
 * already-computed `PortfolioIntelligence` field, or a deterministic
 * relabeling/re-ranking of one (see each `lib/portfolio-ai/*.ts` module's
 * own doc comment for exactly which). No score, warning, recommendation, or
 * opportunity is ever recomputed here.
 */

import type {
  ConfidenceLevel,
  PortfolioFingerprint,
  PortfolioRecommendation,
  PortfolioRecommendationPriority,
  PortfolioWarning,
  ScoreContributor,
  ScoreContributorImportance,
} from "@/lib/portfolio-intelligence/types";
import type { WalletEventTone } from "@/lib/wallet-automation/types";

/**
 * The fixed ranking this phase's brief specifies, most-important-first:
 * critical risks, then major opportunities, then recommendations, then
 * positive achievements, then interesting observations. See
 * `priorities.ts` for the one place this order is encoded as a sortable
 * rank.
 */
export type AIPriorityTier = "critical-risk" | "major-opportunity" | "recommendation" | "positive-achievement" | "observation";

/**
 * The advisor's single top-line read — "what happened, why it matters,
 * what to do next" in one object. `explanation` is `intelligence.
 * executiveSummary` verbatim (already built by V4-INTELLIGENCE-002);
 * `nextAction`/`actionReason` are the top-priority recommendation's own
 * `explanation`/`reason` (already priority-sorted) — nothing here is a new
 * sentence generated from scratch.
 */
export type AIOverview = {
  priority: AIPriorityTier;
  headline: string;
  explanation: string;
  confidence: ConfidenceLevel;
  nextAction: string | null;
  actionReason: string | null;
};

/**
 * A retiered `ScoreContributor` (from `intelligence.positiveContributors`/
 * `negativeContributors`, already deduplicated against warnings/
 * opportunities — see `contributors.ts`) or, for the one "observation"-tier
 * entry, the portfolio's own `fingerprint`. `relatedAssets` is populated
 * only when the underlying contributor's real subject is knowable from
 * already-computed fields (e.g. `largestHolding`/`largestProtocol`) — never
 * guessed.
 */
export type AIInsight = {
  id: string;
  title: string;
  summary: string;
  importance: ScoreContributorImportance;
  reason: string;
  relatedAssets: string[];
  priority: AIPriorityTier;
};

export type AIActionDifficulty = "easy" | "moderate" | "involved";
export type AIActionImpact = "low" | "medium" | "high";

/**
 * A `PortfolioRecommendation` (already title/explanation/reason/priority)
 * plus two deterministic, rule-based ratings (`difficulty`/
 * `estimatedImpact`) keyed off the recommendation's own fixed `id` — see
 * `actions.ts`'s static map. Never a new recommendation.
 */
export type AIAction = {
  id: string;
  title: string;
  description: string;
  priority: PortfolioRecommendationPriority;
  difficulty: AIActionDifficulty;
  estimatedImpact: AIActionImpact;
  reason: string;
};

/**
 * One entry in the wallet's real, already-recorded change log
 * (`lib/wallet-automation`'s `WalletEvent[]`) — relabeled, never
 * regenerated. A single `PortfolioIntelligence` snapshot has no history of
 * its own to build a timeline from; only Wallet Automation's before/after
 * diffing genuinely knows "this changed since last time," so this type's
 * only real input is that existing event log. See `timeline.ts`.
 */
export type AITimelineEntry = {
  id: string;
  headline: string;
  tone: WalletEventTone;
  timestamp: string;
};

/**
 * Everything a future LLM-based chat layer (V4-AI-CHAT-001) would need,
 * assembled once here so that phase never has to re-read
 * `PortfolioIntelligence` piecemeal. Pure pass-through/reshaping of fields
 * this object's other pieces (or `PortfolioIntelligence` itself) already
 * computed — never a new fact.
 */
export type ConversationContext = {
  facts: {
    totalUsdValue: number;
    largestHoldingSymbol: string | null;
    largestProtocolName: string | null;
    lastUpdated: string;
  };
  scores: {
    overallScore: number;
    healthScore: number;
    riskScore: number;
    diversificationScore: number;
    confidenceScore: number;
  };
  warnings: PortfolioWarning[];
  recommendations: PortfolioRecommendation[];
  fingerprint: PortfolioFingerprint;
  confidenceLevel: ConfidenceLevel;
  contributors: {
    positive: ScoreContributor[];
    negative: ScoreContributor[];
  };
  summary: string;
};

export type PortfolioAI = {
  overview: AIOverview;
  insights: AIInsight[];
  actions: AIAction[];
  timeline: AITimelineEntry[];
  /** Phase 5's "richer AI summary" — the same real facts `executiveSummary` already draws on, presented as separate lines instead of one dense paragraph, with confidence named explicitly (which the paragraph form doesn't). Pure template composition, no new calculation — see `summary.ts`. */
  summaryLines: string[];
  conversationContext: ConversationContext;
};
