/**
 * Portfolio Intelligence (PR17 Part 1) — a per-Watchlist executive summary
 * built entirely on top of already-computed data: `getWatchlist()` (the
 * true set of watched projects), `getIntelligenceAlerts()` (the AI
 * Intelligence Engine's per-project reads), and `getDailyBrief()` (the
 * Daily Brief's own already-built sections). Nothing here re-derives
 * scoring, narrative detection, or Daily Brief's sections — it selects,
 * caps, and aggregates real values those layers already produced. No AI
 * API, no provider call, no randomness: same inputs always produce the
 * same `PortfolioIntelligence`.
 */

import type { BriefHighlight, BriefNarrativeTrend, BriefOpportunity } from "@/lib/brief/types";

/**
 * A simple three-tier read, not a new scoring system — derived from
 * already-computed counts (security risks, projects needing attention) and
 * already-computed stats (average score/confidence), never from raw
 * provider data.
 */
export const PORTFOLIO_HEALTH_LEVELS = ["strong", "stable", "needs-attention"] as const;
export type PortfolioHealth = (typeof PORTFOLIO_HEALTH_LEVELS)[number];

export type PortfolioIntelligence = {
  /** Deterministic given `generatedAt` — `portfolio:${generatedAt}`. */
  id: string;
  generatedAt: string;
  headline: string;
  summary: string;
  /** The true Watchlist size (`getWatchlist().items.length`) — NOT the count of projects with a current Intelligence Alert, which can be smaller when a watched project has no real signal yet. */
  projectCount: number;
  /** Reused directly from `DailyBrief.averageConfidence` — scoped to watched projects that currently have a real Intelligence Alert. */
  averageConfidence: number;
  /** The one genuinely new aggregate this layer computes — the mean `score` across the same alert set `averageConfidence` is scoped to. */
  averageScore: number;
  /** `DailyBrief.emergingNarratives`, capped to the most prominent few — "which narratives dominate my portfolio." */
  dominantNarratives: BriefNarrativeTrend[];
  /** `DailyBrief.topOpportunities`, reused unchanged. */
  topPerformers: BriefOpportunity[];
  /** Real `"decline"`-narrative alerts — the one real signal Daily Brief's own sections never surface on their own. */
  projectsNeedingAttention: BriefHighlight[];
  /** `DailyBrief.securityHighlights`, reused unchanged. */
  securityRisks: BriefHighlight[];
  /** `DailyBrief.governanceHighlights`, reused unchanged. */
  governanceWatch: BriefHighlight[];
  /** `DailyBrief.developmentHighlights`, reused unchanged. */
  developmentMomentum: BriefHighlight[];
  recommendations: string[];
  overallHealth: PortfolioHealth;
};
