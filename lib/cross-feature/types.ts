/**
 * V4-INTELLIGENCE-003 — domain types for the Cross-Feature Intelligence
 * layer. This layer owns NO portfolio calculation of any kind — every type
 * below is either a reference (a real id/timestamp another module already
 * produced) or a real fact copied verbatim from an already-built object
 * (`AnalyticsHighlight`/`Trend`/`AutomationResult`/`PortfolioRecommendation`).
 * See `docs/ARCHITECTURE.md`'s ownership table for the layers this composes
 * over: Portfolio Intelligence/AI (calculation + advisor framing), Wallet
 * Automation (event log), Wallet Analytics (trends/highlights), Wallet
 * History (persistence), Historical Reports (period summaries), AI Chat
 * (structured Q&A). Cross-Feature Intelligence is the one layer ABOVE all
 * of them that only correlates — never recomputes.
 */

import type { AIChatQuestionId } from "@/lib/ai-chat/types";
import type { WalletEventTone } from "@/lib/wallet-automation/types";
import type { ReportPeriod } from "@/components/wallet/walletReportEngine";

/**
 * The real cross-references for one topic/moment — every field is `null`
 * when no real match exists (never a guessed or fabricated reference). A UI
 * uses these to render "Related Activity" links; this layer performs no
 * navigation itself (see this module's own "No routing logic" rule).
 */
export type FeatureRefs = {
  /** A real `AnalyticsSnapshot.timestamp` in Wallet History. */
  historySnapshotTimestamp: string | null;
  /** A real `Trend.metric` in Wallet Analytics. */
  analyticsTrendMetric: string | null;
  /** Whether/which real Report period (the caller-supplied `HistoricalReport`) this falls within. */
  reportPeriod: ReportPeriod | null;
  /** A real `AIChatQuestionId` that would answer a question about this topic — never an actual chat turn (Cross-Feature Intelligence never calls `askQuestion()` itself). */
  chatQuestionId: AIChatQuestionId | null;
  /** A real `AutomationResult.id` from Wallet Automation. */
  automationResultId: string | null;
};

/**
 * V4-INTELLIGENCE-003 (Phase 3) — one real underlying change, correlated
 * across every module that independently describes it. `headline` is
 * always a real, already-composed sentence copied from ONE canonical
 * source (an `AnalyticsHighlight.reason`) — never a new sentence generated
 * here.
 */
export type CorrelatedEvent = {
  id: string;
  topic: string;
  label: string;
  timestamp: string;
  tone: WalletEventTone;
  headline: string;
  refs: FeatureRefs;
};

/** V4-INTELLIGENCE-003 (Phase 4) — every real `PortfolioRecommendation`, mapped to where else it shows up. `isPrimary` reuses Portfolio AI's OWN already-ranked `actions[0]` — never a second priority judgment. */
export type RecommendationCorrelation = {
  recommendationId: string;
  title: string;
  isPrimary: boolean;
  refs: FeatureRefs;
};

export type UnifiedTimelineSource = "automation" | "history" | "analytics" | "report" | "highlights" | "ai";

/**
 * V4-INTELLIGENCE-003 (Phase 5) — one real MOMENT in time, deduplicated by
 * that moment's own real timestamp (not by an arbitrary dedup pass after
 * the fact) — see `timeline.ts`'s own doc comment for why this is safe:
 * Wallet Automation's `WalletEvent[]`, Wallet Analytics' own timeline, and
 * Portfolio AI's own timeline are ALL, by every one of those modules' own
 * documented design, reshapings of the exact same underlying event log —
 * never three independent sources to merge.
 */
export type UnifiedTimelineEntry = {
  id: string;
  timestamp: string;
  headline: string;
  tone: WalletEventTone;
  /** Every real source that independently surfaces this same moment — often more than one, which is the whole point of this list (it's evidence of the correlation, not a bug). */
  sources: UnifiedTimelineSource[];
};

/**
 * V4-FUTURE-001G — additive O(1) lookup maps over `CrossFeatureIntelligence.events`/
 * `.recommendations`, built once by `buildCrossFeatureIndexes()`
 * (`indexes.ts`). Every map value is the SAME object already in those
 * arrays — never a duplicated copy. Defined here (not in `indexes.ts`) so
 * `CrossFeatureIntelligence` below can reference it without a circular
 * type import — `indexes.ts` imports `CorrelatedEvent`/`RecommendationCorrelation`
 * FROM this file, so this file can't also import a type FROM `indexes.ts`.
 */
export type CrossFeatureIndexes = {
  /** Mirrors `events.find(e => e.refs.automationResultId === id)`. */
  eventByAutomationId: Map<string, CorrelatedEvent>;
  /** Mirrors `recommendations.find(r => r.refs.automationResultId === id)` — the real lookup `lib/notification-explain/engine.ts` performs. */
  recommendationByAutomationId: Map<string, RecommendationCorrelation>;
  /** Keyed by the recommendation's own real `recommendationId`. */
  recommendationById: Map<string, RecommendationCorrelation>;
  /** Every real event for a given real topic, in original order. */
  eventByTopic: Map<string, CorrelatedEvent[]>;
  /** Keyed by the event's own real `id` (`event:${highlight.dedupeKey}`). */
  eventByHighlight: Map<string, CorrelatedEvent>;
};

export type CrossFeatureIntelligence = {
  events: CorrelatedEvent[];
  recommendations: RecommendationCorrelation[];
  timeline: UnifiedTimelineEntry[];
  /** V4-INTELLIGENCE-003 (Phase 8) — the Dashboard's "Latest Intelligence Story": simply `events[0]` (already the most recent, most-real correlated event) — never a second "pick the best one" ranking. `null` when there are no real correlated events yet. */
  latestStory: CorrelatedEvent | null;
  /** V4-FUTURE-001G — additive: O(1) lookup maps over `events`/`recommendations` above, built once in `buildCrossFeatureIntelligence()`. Every map value is the SAME object already in those arrays — see `indexes.ts`'s own doc comment. */
  indexes: CrossFeatureIndexes;
};
