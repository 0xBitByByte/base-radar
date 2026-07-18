/**
 * Intelligence Timeline (PR18 Part 1) — a chronological AGGREGATION layer,
 * not a fourth intelligence engine. Every `TimelineEvent` below is built
 * entirely from three already-computed sources — `getIntelligenceAlerts()`,
 * `getDailyBrief()`, `getPortfolioIntelligence()` — never from raw
 * provider alerts, and never by re-deriving scoring or narrative detection
 * those layers already did. Deterministic: same three inputs in, same
 * `Timeline` out — no randomness, no AI API, no network call.
 */

import type { AlertCategory, AlertSeverity } from "@/lib/alerts/types";
import type { NarrativeType } from "@/lib/alerts/intelligence/types";

/**
 * The finite set of event shapes the Timeline can contain — one per
 * upstream section, matching the PR brief's own list exactly.
 */
export const TIMELINE_EVENT_TYPES = [
  "alert",
  "opportunity",
  "security",
  "governance",
  "development",
  "tvl",
  "narrative",
  "recommendation",
  "portfolio",
  "daily-brief",
] as const;
export type TimelineEventType = (typeof TIMELINE_EVENT_TYPES)[number];

/**
 * One chronological entry. `projectId`/`projectName`/`severity`/
 * `confidence`/`score`/`narrative`/`category` are `null` for aggregate-
 * level events (Narrative, Recommendation, Portfolio, Daily Brief) that
 * genuinely aren't about one project or don't have a real value of that
 * kind — `null` is the honest representation there, never a fabricated
 * placeholder (a `0` confidence would misread as "very low confidence"
 * rather than "not applicable").
 */
export type TimelineEvent = {
  /** Deterministic and namespaced by `eventType`, so no two event types can ever collide even if their underlying keys coincidentally match. */
  id: string;
  timestamp: string;
  projectId: string | null;
  projectName: string | null;
  title: string;
  summary: string;
  eventType: TimelineEventType;
  /** Short attribution — which upstream layer produced this event, e.g. "AI Intelligence Engine", "Daily Brief", "Portfolio Intelligence". */
  source: string;
  severity: AlertSeverity | null;
  confidence: number | null;
  score: number | null;
  narrative: NarrativeType | null;
  /** Only ever set for `"tvl"` events, where it's unambiguous and definitional; `null` elsewhere rather than picking one arbitrary category off a multi-category `IntelligenceAlert`. */
  category: AlertCategory | null;
  /** Internal route to investigate further — a Project Profile, or the Brief/Portfolio page this event was rolled up from. `null` when there's nowhere more specific to send the reader. */
  link: string | null;
  /** Small, real, already-computed extra context (e.g. related alert count) — never a place to stash a fabricated value. */
  metadata: Record<string, unknown>;
};

export type Timeline = {
  /** Deterministic given `generatedAt` — `timeline:${generatedAt}`. */
  id: string;
  generatedAt: string;
  headline: string;
  summary: string;
  events: TimelineEvent[];
  totalEvents: number;
  /** The highest real severity among events that have one; `null` only when `events` is empty or none carry a severity. */
  highestSeverity: AlertSeverity | null;
  /** Mean `confidence` across events that have a real (non-`null`) confidence value. */
  averageConfidence: number;
  /** Mean `score` across events that have a real (non-`null`) score value. */
  averageScore: number;
  eventCounts: Record<TimelineEventType, number>;
};
