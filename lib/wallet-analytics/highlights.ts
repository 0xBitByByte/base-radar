/**
 * V4-ANALYTICS-001B — Analytics Highlights: a deterministic prioritization
 * and deduplication pass over `WalletAnalytics`'s ALREADY-BUILT outputs.
 * This file computes NOTHING new about the portfolio — every highlight's
 * `reason`/`supportingMetric` is a real value already sitting on
 * `biggestChange`/`recoveries`/`milestones`/`personalBests`/`stability`/
 * `correlation`, or (to know a metric's real direction) `trends` itself —
 * all fields `WalletAnalytics` already exposes, not a re-derivation.
 *
 * Reads `trends` in addition to the six inputs the brief names explicitly,
 * for one reason only: `biggestChange` carries a magnitude and a metric
 * name, but not whether that metric was improving or declining — that
 * direction already exists on the matching `Trend`, so this reuses it
 * rather than re-parsing `biggestChange.primaryCause`'s text (which would
 * be fragile string-sniffing, not real reuse of typed data).
 *
 * Priority is a fixed function of a highlight's `type` alone — see
 * `HIGHLIGHT_TYPE_PRIORITY` — never a computed score, never random.
 *
 * Deduplication: two highlights are considered "the same event" when they
 * share a `topic` (the real underlying metric family, e.g. `"risk"`).
 * Within a topic group, the survivor is chosen by priority, then by
 * `HIGHLIGHT_TYPE_TIEBREAK_ORDER` (a fixed total order — Recovery beats a
 * generic Biggest Improvement/Decline framing of the same metric, matching
 * the brief's own "Recovery from High Risk suppresses Risk Improved"
 * example), then — only when two candidates of the IDENTICAL type collide
 * on the same topic (e.g. two separate High Risk recoveries) — by
 * recency.
 */

import type {
  AnalyticsHighlight,
  HighlightPriority,
  HighlightType,
  PersonalBests,
  PortfolioMilestone,
  PortfolioMilestones,
  RecoveryEvent,
  Trend,
  WalletAnalytics,
} from "@/lib/wallet-analytics/types";

const HIGHLIGHT_TYPE_PRIORITY: Record<HighlightType, HighlightPriority> = {
  biggestDecline: "critical",
  recovery: "important",
  biggestImprovement: "important",
  majorAllocationShift: "important",
  riskReduction: "positive",
  confidenceImprovement: "positive",
  newPersonalBest: "positive",
  stabilityChange: "informational",
  milestone: "historical",
};

const PRIORITY_STARS: Record<HighlightPriority, number> = { critical: 5, important: 4, positive: 3, informational: 2, historical: 1 };

/** Highest-value-wins order for same-topic, same-priority collisions — earlier entries win. */
const HIGHLIGHT_TYPE_TIEBREAK_ORDER: HighlightType[] = [
  "recovery",
  "biggestDecline",
  "biggestImprovement",
  "majorAllocationShift",
  "riskReduction",
  "confidenceImprovement",
  "newPersonalBest",
  "milestone",
  "stabilityChange",
];

function makeHighlight(type: HighlightType, title: string, reason: string, supportingMetric: string | null, topic: string, dedupeSuffix: string): AnalyticsHighlight {
  const priority = HIGHLIGHT_TYPE_PRIORITY[type];
  return { type, priority, stars: PRIORITY_STARS[priority], title, reason, supportingMetric, topic, dedupeKey: `${type}:${topic}:${dedupeSuffix}` };
}

function findTrend(trends: Trend[], metric: string): Trend | undefined {
  return trends.find((t) => t.metric === metric);
}

/** `biggestChange` names a metric and a magnitude but not a direction — this reuses the matching `Trend`'s already-classified `direction` rather than re-deriving one. A metric with no matching `Trend` (only `"ethAllocation"` today) has no improve/decline judgment to make — see `biggestChange.ts`'s own restraint on this — and becomes a `majorAllocationShift` instead. */
function buildBiggestChangeHighlight(analytics: WalletAnalytics): AnalyticsHighlight | null {
  const { biggestChange, trends } = analytics;
  if (!biggestChange) return null;

  const trend = findTrend(trends, biggestChange.metric);
  const supportingMetric = `Magnitude: ${biggestChange.magnitude}`;

  if (!trend) {
    return makeHighlight("majorAllocationShift", `Major Allocation Shift: ${biggestChange.category}`, biggestChange.primaryCause, supportingMetric, biggestChange.metric, "biggest");
  }
  if (trend.direction === "improving") {
    return makeHighlight("biggestImprovement", `Biggest Improvement: ${biggestChange.category}`, biggestChange.primaryCause, supportingMetric, biggestChange.metric, "biggest");
  }
  if (trend.direction === "declining") {
    return makeHighlight("biggestDecline", `Biggest Decline: ${biggestChange.category}`, biggestChange.primaryCause, supportingMetric, biggestChange.metric, "biggest");
  }
  return null;
}

const RECOVERY_TOPIC: Record<RecoveryEvent["category"], string> = {
  highRisk: "risk",
  lowConfidence: "confidence",
  poorDiversification: "diversification",
  heavyConcentration: "ethAllocation",
  unknownAssets: "unknownAssets",
  lowPricingCoverage: "lowPricingCoverage",
};

function buildRecoveryHighlights(analytics: WalletAnalytics): AnalyticsHighlight[] {
  return analytics.recoveries.map((recovery) =>
    makeHighlight(
      "recovery",
      `Recovered from ${recovery.label}`,
      `${recovery.label} improved from ${recovery.before.value} to ${recovery.after.value} over ${recovery.durationDays} day${recovery.durationDays === 1 ? "" : "s"}.`,
      `${recovery.before.value} → ${recovery.after.value}`,
      RECOVERY_TOPIC[recovery.category],
      recovery.recoveryDate
    )
  );
}

/** Confidence/Risk Reduction are only surfaced when that trend genuinely improved — reusing the same `Trend.direction` every other section already reads, never re-derived. */
function buildDirectTrendHighlights(analytics: WalletAnalytics): AnalyticsHighlight[] {
  const highlights: AnalyticsHighlight[] = [];
  const confidence = findTrend(analytics.trends, "confidence");
  if (confidence?.direction === "improving") {
    highlights.push(makeHighlight("confidenceImprovement", "Confidence Improved", confidence.reason, `${confidence.from} → ${confidence.to}`, "confidence", "trend"));
  }
  const risk = findTrend(analytics.trends, "risk");
  if (risk?.direction === "improving") {
    highlights.push(makeHighlight("riskReduction", "Risk Reduced", risk.reason, `${risk.from} → ${risk.to}`, "risk", "trend"));
  }
  return highlights;
}

/** A record is only highlight-worthy when it was set at the MOST RECENT snapshot — an all-time record from weeks ago isn't real-time "news." `milestones.mostRecentFingerprint.date` is always `history[last].timestamp` by construction, reused here as the one real "what is 'now'" reference rather than re-deriving it. */
function isFreshMilestone(milestone: PortfolioMilestone, milestones: PortfolioMilestones): boolean {
  return milestone !== null && milestones.mostRecentFingerprint !== null && milestone.date === milestones.mostRecentFingerprint.date;
}

const PERSONAL_BEST_TOPICS: { key: keyof PersonalBests; topic: string }[] = [
  { key: "bestHealth", topic: "health" },
  { key: "bestConfidence", topic: "confidence" },
  { key: "lowestRisk", topic: "risk" },
  { key: "largestPortfolioValue", topic: "value" },
  { key: "bestDiversification", topic: "diversification" },
];

function buildNewPersonalBestHighlights(analytics: WalletAnalytics): AnalyticsHighlight[] {
  const { personalBests, milestones } = analytics;
  const highlights: AnalyticsHighlight[] = [];
  for (const { key, topic } of PERSONAL_BEST_TOPICS) {
    const milestone = personalBests[key] as PortfolioMilestone;
    if (isFreshMilestone(milestone, milestones)) {
      highlights.push(makeHighlight("newPersonalBest", `New Personal Best: ${milestone!.label}`, `${milestone!.label} reached ${milestone!.value}.`, `${milestone!.value}`, topic, milestone!.date));
    }
  }
  return highlights;
}

const MILESTONE_TOPICS: { key: "largestStablecoinAllocation" | "largestEthAllocation"; topic: string }[] = [
  { key: "largestStablecoinAllocation", topic: "stablecoinAllocation" },
  { key: "largestEthAllocation", topic: "ethAllocation" },
];

function buildMilestoneHighlights(analytics: WalletAnalytics): AnalyticsHighlight[] {
  const { milestones } = analytics;
  const highlights: AnalyticsHighlight[] = [];
  for (const { key, topic } of MILESTONE_TOPICS) {
    const milestone = milestones[key];
    if (isFreshMilestone(milestone, milestones)) {
      highlights.push(makeHighlight("milestone", `Milestone: ${milestone!.label}`, `${milestone!.label} reached ${milestone!.value}.`, `${milestone!.value}`, topic, milestone!.date));
    }
  }
  return highlights;
}

/** Only the two extremes are highlight-worthy — "Stable"/"Moderately Active" are the unremarkable middle ground, not news. There is no prior `PortfolioStabilityIndex` available to this engine to diff against (each is a point-in-time read for the current window, not itself a trend), so this never claims a "change" occurred — only that the CURRENT level is a real extreme worth flagging. */
function buildStabilityHighlight(analytics: WalletAnalytics): AnalyticsHighlight | null {
  const { stability } = analytics;
  if (!stability || (stability.level !== "very-volatile" && stability.level !== "very-stable")) return null;
  return makeHighlight("stabilityChange", `Portfolio Stability: ${stability.label}`, stability.reason, stability.label, "stability", stability.level);
}

function priorityRank(priority: HighlightPriority): number {
  return PRIORITY_STARS[priority];
}

/** Within one topic group, pick the single survivor: highest priority first, then the fixed type tiebreak order, then (only for two candidates of the identical type — e.g. two recoveries of the same category) the more recent `dedupeKey` suffix. */
function pickSurvivor(candidates: AnalyticsHighlight[]): AnalyticsHighlight {
  return candidates.reduce((best, candidate) => {
    if (priorityRank(candidate.priority) !== priorityRank(best.priority)) {
      return priorityRank(candidate.priority) > priorityRank(best.priority) ? candidate : best;
    }
    if (candidate.type !== best.type) {
      return HIGHLIGHT_TYPE_TIEBREAK_ORDER.indexOf(candidate.type) < HIGHLIGHT_TYPE_TIEBREAK_ORDER.indexOf(best.type) ? candidate : best;
    }
    return candidate.dedupeKey.localeCompare(best.dedupeKey) > 0 ? candidate : best;
  });
}

/**
 * V4-ANALYTICS-001B (Phase 2) — the one public entry point. Collects every
 * real candidate, deduplicates by `topic` (Phase 5), and returns the
 * survivors ranked highest-priority first (ties broken by the same fixed
 * type order used for dedup, for full determinism).
 */
export function buildAnalyticsHighlights(analytics: WalletAnalytics): AnalyticsHighlight[] {
  const candidates: AnalyticsHighlight[] = [
    ...[buildBiggestChangeHighlight(analytics)].filter((h): h is AnalyticsHighlight => h !== null),
    ...buildRecoveryHighlights(analytics),
    ...buildDirectTrendHighlights(analytics),
    ...buildNewPersonalBestHighlights(analytics),
    ...buildMilestoneHighlights(analytics),
    ...[buildStabilityHighlight(analytics)].filter((h): h is AnalyticsHighlight => h !== null),
  ];

  const byTopic = new Map<string, AnalyticsHighlight[]>();
  for (const candidate of candidates) {
    byTopic.set(candidate.topic, [...(byTopic.get(candidate.topic) ?? []), candidate]);
  }

  const survivors = [...byTopic.values()].map(pickSurvivor);

  return survivors.sort((a, b) => {
    if (priorityRank(b.priority) !== priorityRank(a.priority)) return priorityRank(b.priority) - priorityRank(a.priority);
    return HIGHLIGHT_TYPE_TIEBREAK_ORDER.indexOf(a.type) - HIGHLIGHT_TYPE_TIEBREAK_ORDER.indexOf(b.type);
  });
}
