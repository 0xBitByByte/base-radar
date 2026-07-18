/**
 * AI Daily Intelligence Brief (PR16 Part 1) — an executive summary layer
 * built entirely on top of `lib/alerts/intelligence`'s already-computed
 * `IntelligenceAlert[]` (`getIntelligenceAlerts()`), never on raw provider
 * alerts and never re-deriving anything the Intelligence Engine already
 * produced. Everything below is deterministic: same `IntelligenceAlert[]`
 * in, same `DailyBrief` out — no randomness, no AI API, no network call.
 */

import type { AlertSeverity } from "@/lib/alerts/types";
import type { NarrativeType } from "@/lib/alerts/intelligence/types";

export type BriefProjectRef = {
  projectId: string;
  projectName: string;
};

/** One real, already-scored project the Brief calls out as a top opportunity — `reason` reuses the Intelligence Engine's own generated `summary`, never a re-worded duplicate. `narrative` is the same real `IntelligenceAlert.narrative` that qualified this project as an opportunity in the first place (PR16 Part 2 — the UI needs to display it, not just filter by it). `timestamp` is the source alert's own real timestamp (PR16 Part 3 — required to honestly implement a "Newest" sort; a brief-wide `generatedAt` would make every opportunity identically "new," which isn't a real ordering). */
export type BriefOpportunity = BriefProjectRef & {
  headline: string;
  reason: string;
  score: number;
  confidence: number;
  narrative: NarrativeType;
  timestamp: string;
};

/** Shared shape for the Security/Governance/Development/TVL section entries — one real `IntelligenceAlert`, reduced to what a Brief reader needs. */
export type BriefHighlight = BriefProjectRef & {
  headline: string;
  detail: string;
  severity: AlertSeverity;
};

/** One row of "how much of this narrative did we see today" — `averageScore` is the mean `score` across every real `IntelligenceAlert` currently classified with this narrative. */
export type BriefNarrativeTrend = {
  narrative: NarrativeType;
  count: number;
  averageScore: number;
};

export type DailyBrief = {
  /** Deterministic given `generatedAt` — `brief:${generatedAt}`. */
  id: string;
  generatedAt: string;
  headline: string;
  summary: string;
  /** Presentation-ready bullet lines (see `sections.ts`'s `buildMarketSummarySection`) — the same real stats as `narrativeCounts`/`averageConfidence` below, formatted as prose. */
  marketSummary: string[];
  topOpportunities: BriefOpportunity[];
  securityHighlights: BriefHighlight[];
  governanceHighlights: BriefHighlight[];
  developmentHighlights: BriefHighlight[];
  tvlHighlights: BriefHighlight[];
  emergingNarratives: BriefNarrativeTrend[];
  averageConfidence: number;
  highestScore: number;
  projectCount: number;
  narrativeCounts: Record<NarrativeType, number>;
  recommendations: string[];
};
