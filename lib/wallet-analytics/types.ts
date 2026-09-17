/**
 * V4-ANALYTICS-001 — domain types for the historical layer. Analytics is
 * the historical layer: it consumes an array of already-built
 * `AutomationSnapshot`s (from `lib/wallet-automation/types.ts` — see that
 * type's own doc comment for why it was extended in place rather than a
 * second snapshot format being invented here) plus the already-real
 * `WalletEvent[]` log, and never touches raw holdings, never recomputes a
 * score, never calls Portfolio Intelligence/AI/Automation itself.
 *
 * Pure, deterministic, synchronous types only — no React, no hooks.
 *
 * ---
 * STABLE — V4-ANALYTICS-001C (Model Freeze). Every type in this file is
 * frozen as of this pass: field names, ownership, and nullability
 * conventions below are considered load-bearing for V4-HISTORY-001, which
 * will persist/replay `WalletAnalytics`/`AutomationSnapshot` values built
 * from these exact shapes. Changes from here on must be strictly additive
 * (new optional-in-practice fields with a real default, new types) — never
 * a rename, a type change on an existing field, or a removal. The one
 * documented exception is `AutomationSnapshot.analyticsVersion`
 * (`lib/wallet-automation/types.ts`), whose whole purpose is to let a
 * FUTURE non-additive change happen safely, versioned, via
 * `lib/wallet-analytics/serialization.ts`.
 *
 * Nullability convention, audited and consistent across every type here:
 * absence is always `null`, never `undefined` — a real, provable fact
 * (`grep -rn "return undefined\|: undefined"` over this directory returns
 * nothing) rather than an assumed convention.
 *
 * Nothing in this file is marked experimental — every field reflects a
 * real, already-computed value from a shipped phase (V4-ANALYTICS-001
 * through 001B), not a placeholder for something still being designed.
 * ---
 */

import type { AutomationSnapshot } from "@/lib/wallet-automation/types";

export type TrendDirection = "improving" | "stable" | "declining" | "unknown";

/**
 * V4-ANALYTICS-002 — confidence in the HISTORICAL TREND ITSELF (how much
 * history backs `direction`, and how consistent it was step-to-step) — NOT
 * Portfolio AI's `confidenceScore` (a snapshot-in-time read of pricing/data
 * completeness). See `confidence.ts` for the deterministic, three-factor
 * scoring this is computed from. `"unknown"` whenever there isn't enough
 * history to judge, or the metric is categorical and genuinely changed
 * (see `categoricalTrendConfidence`'s own doc comment).
 */
export type TrendConfidence = "high" | "medium" | "low" | "unknown";

/**
 * V4-ANALYTICS-001A (Phase 3) — the richer confidence readout: the same
 * `TrendConfidence` level, plus the real facts it was computed from
 * (`confidence.ts`'s three deterministic factors), so a UI or export can
 * show its work instead of just a bare label. `timeSpanDays`/
 * `consistencyScore` are `null` only when there truly isn't a real number
 * to report — never a fabricated 0.
 */
export type TrendConfidenceDetail = {
  confidence: TrendConfidence;
  /** A real, deterministic sentence citing the actual snapshot count/span/consistency behind `confidence` — never a generated opinion. */
  confidenceReason: string;
  snapshotCount: number;
  /** `null` only when `snapshotCount < 2` — no span exists yet. */
  timeSpanDays: number | null;
  /** 0-1, the real fraction of consecutive steps that moved consistently with the overall trend. `null` when `snapshotCount < 2`, or for a categorical trend that genuinely changed (`direction: "unknown"`) — there's no single settled trajectory left to score the consistency of. */
  consistencyScore: number | null;
};

/**
 * One metric's trajectory across the given history. `from`/`to` are the
 * real first/last values in the window; `delta` is `to - from` for numeric
 * metrics, `null` for categorical ones (fingerprint/recommendation — a
 * category change isn't a "+N" the way a score is). `direction` never
 * claims "improving"/"declining" for a categorical metric that changed —
 * only "stable" (unchanged throughout) or "unknown" (changed, but change
 * alone isn't a value judgment this module is willing to make).
 */
export type Trend = {
  metric: string;
  label: string;
  direction: TrendDirection;
  from: number | string | null;
  to: number | string | null;
  delta: number | null;
  /** The real numbers/facts behind `direction` — e.g. "Health score moved from 74 to 82 across 5 snapshots." Never invented. */
  reason: string;
  /** How reliable `direction` is, based purely on the shape of the history — see `TrendConfidence`'s own doc comment. Kept as a bare string for backward compatibility with every existing UI/test call site — see `confidenceDetail` for the richer breakdown. */
  confidence: TrendConfidence;
  /** V4-ANALYTICS-001A (Phase 3) — the full breakdown `confidence` was derived from. */
  confidenceDetail: TrendConfidenceDetail;
};

/** One real, ranked fact — `metric`/`value`/`detail` describe what was found; the whole record is `null` when history doesn't honestly support the claim (never a guessed placeholder). */
export type EvolutionFinding = {
  metric: string;
  label: string;
  detail: string;
  value: number | string;
} | null;

/**
 * V4-ANALYTICS-001 (Phase 5) — every field independently `null`-able. Some
 * of the brief's own examples (`mostVolatileAllocation`) have no honest
 * answer given this snapshot model only carries a single largest-holding
 * symbol per point in time, not a full per-asset value history — see
 * `comparison.ts`'s own doc comment for exactly which fields are always
 * `null` today and why, rather than silently omitting them.
 */
export type PortfolioEvolution = {
  largestImprovement: EvolutionFinding;
  largestDeterioration: EvolutionFinding;
  biggestAllocationShift: EvolutionFinding;
  mostStableAsset: EvolutionFinding;
  mostVolatileAllocation: EvolutionFinding;
  longestUnchangedRecommendation: EvolutionFinding;
  mostRepeatedWarning: EvolutionFinding;
};

export type AllocationChange = {
  symbol: string;
  fromPct: number | null;
  toPct: number | null;
  deltaPct: number | null;
};

/**
 * V4-ANALYTICS-001 (Phase 6) — comparing `topHoldings` (up to 5 by value)
 * across the first and last snapshot in the given history. "New"/"removed"
 * are honestly scoped to the top-5 window each snapshot already captured —
 * an asset could have existed outside the top 5 the whole time and this
 * would still report it as "new" the moment it entered the top 5. Never
 * recomputes allocation — every percentage here is already-computed
 * `ScoredHolding.allocationPct`.
 */
export type AllocationAnalytics = {
  topChanges: AllocationChange[];
  newAssets: string[];
  removedAssets: string[];
  growingPositions: AllocationChange[];
  shrinkingPositions: AllocationChange[];
  protocolExposureChange: { from: string | null; to: string | null; changed: boolean };
  nativeVsStablecoinChange: { ethPctFrom: number; ethPctTo: number; stablecoinPctFrom: number; stablecoinPctTo: number };
};

/**
 * V4-ANALYTICS-002 — which of the four scores everyone already looks at
 * (Health/Confidence/Risk/Recommendation) genuinely moved (`improving`/
 * `declining`/`unknown`-categorical-change, never `stable`) over the SAME
 * history window `BiggestPortfolioChange` was computed from — real,
 * independently-derived boolean reads of `Trend.direction`, never guessed.
 */
export type BiggestChangeAffectedScores = {
  health: boolean;
  confidence: boolean;
  risk: boolean;
  recommendation: boolean;
};

/** V4-ANALYTICS-001A (Phase 4) — one other real metric that moved alongside the biggest change, cited for context (not claimed as a cause). */
export type BiggestChangeSupportingMetric = {
  metric: string;
  label: string;
  from: number | string | null;
  to: number | string | null;
};

/**
 * V4-ANALYTICS-002 (Portfolio Evolution Enhancements) — the single most
 * significant real change across `buildTrends()`'s output. `null` when
 * nothing moved enough to be "improving"/"declining" (every trend is
 * "stable") — never a fabricated placeholder. `primaryCause` is always the
 * winning `Trend.reason` (or, for an allocation-shift winner, the same real
 * `nativeVsStablecoinChange` sentence `allocation.ts` already computes)
 * verbatim, never a separately-generated narrative — "do not fabricate
 * causes" per the brief. Notably: this NEVER claims a transaction-level
 * cause like "ETH purchase" — `AutomationSnapshot` only ever carries
 * allocation PERCENTAGES, never buy/sell records, so attributing a
 * percentage move to a specific trade would be a fabrication this module
 * refuses to make; `primaryCause` states only the real percentage move
 * itself.
 *
 * V4-ANALYTICS-001A (Phase 4) — extended in place with `supportingMetrics`
 * (every OTHER real trend that also moved, for context) and `timePeriod`
 * (the real first/last snapshot timestamps this change was computed over).
 */
export type BiggestPortfolioChange = {
  metric: string;
  category: string;
  magnitude: number;
  description: string;
  primaryCause: string;
  affectedScores: BiggestChangeAffectedScores;
  supportingMetrics: BiggestChangeSupportingMetric[];
  timePeriod: { from: string; to: string } | null;
} | null;

export type AnalyticsTimelineTone = "positive" | "neutral" | "attention";

/**
 * V4-ANALYTICS-001 (Phase 7) — reshaped from Wallet Automation's own real
 * `WalletEvent[]` (day-bucketed), never a new event-generation pass. "NOT
 * the automation timeline" per the brief: `RecentWalletEventsSection`
 * shows the flat, most-recent-first log; this groups the same real events
 * by calendar day for a "how did this week go" read.
 */
export type AnalyticsTimelineEntry = {
  id: string;
  dayLabel: string;
  date: string;
  headline: string;
  tone: AnalyticsTimelineTone;
  timestamp: string;
};

/**
 * V4-ANALYTICS-001A (Phase 2) — Time-aware Analytics. `"all"` is the
 * original, still-default behavior (oldest vs newest across the whole
 * accumulated history) — every other value FILTERS the same history before
 * handing it to the same, unmodified `buildTrends()`/`buildPortfolioEvolution()`/
 * etc. (see `window.ts`), never a second trend-computation path.
 */
export type AnalyticsWindow = "24h" | "7d" | "30d" | "thisMonth" | "all";

/**
 * V4-ANALYTICS-001A (Phase 5) — one real "best/first/most-recent" fact,
 * always backed by the actual `AutomationSnapshot` it came from (never a
 * derived/summarized value) so a UI or export can cite exactly which real
 * moment in history earned it. `null` only when `history` is empty.
 */
export type PortfolioMilestone = {
  label: string;
  value: number | string;
  date: string;
  snapshot: AutomationSnapshot;
} | null;

/** Every milestone is computed over the FULL, unfiltered history — "highest ever" is inherently an all-time concept, independent of whichever `AnalyticsWindow` the rest of this run's trends were filtered to. */
export type PortfolioMilestones = {
  highestPortfolioValue: PortfolioMilestone;
  highestHealthScore: PortfolioMilestone;
  highestConfidence: PortfolioMilestone;
  lowestRisk: PortfolioMilestone;
  bestDiversification: PortfolioMilestone;
  largestStablecoinAllocation: PortfolioMilestone;
  largestEthAllocation: PortfolioMilestone;
  firstWalletConnection: PortfolioMilestone;
  mostRecentFingerprint: PortfolioMilestone;
};

/** V4-ANALYTICS-001A (Phase 6) — "Longest Stable Portfolio" is the one genuinely new calculation here; every other field is a direct alias of the matching `PortfolioMilestones` entry — see `personalBests.ts`'s own "reuse, don't duplicate" doc comment. */
export type LongestStablePortfolio = { snapshotCount: number; fingerprint: string; from: string; to: string } | null;

export type PersonalBests = {
  bestHealth: PortfolioMilestone;
  bestConfidence: PortfolioMilestone;
  lowestRisk: PortfolioMilestone;
  largestPortfolioValue: PortfolioMilestone;
  bestDiversification: PortfolioMilestone;
  longestStablePortfolio: LongestStablePortfolio;
};

export type RecoveryCategory = "highRisk" | "lowConfidence" | "poorDiversification" | "heavyConcentration" | "unknownAssets" | "lowPricingCoverage";

/**
 * V4-ANALYTICS-001A (Phase 7) — one real poor-state → recovered transition,
 * detected directly from consecutive real snapshots (never inferred from a
 * gap or a guess). `before`/`after` are the real snapshot values/timestamps
 * bracketing the transition; `improvement` is their real absolute
 * difference; `durationDays` is their real timestamp difference. History
 * with fewer than 2 snapshots, or no real recovered transition, yields an
 * empty array for that category — never a fabricated entry.
 */
export type RecoveryEvent = {
  category: RecoveryCategory;
  label: string;
  recoveryDate: string;
  before: { value: number; timestamp: string };
  after: { value: number; timestamp: string };
  improvement: number;
  durationDays: number;
};

/**
 * V4-ANALYTICS-001A (Phase 8) — deterministic CO-OCCURRENCE, explicitly
 * never causation: which other real trends moved alongside the current
 * `biggestChange` outcome, ranked by magnitude. `confidence` here means
 * "how much real co-movement backs this correlation," not "how sure we are
 * this is the CAUSE" — `note` states that distinction explicitly so no
 * consumer mistakes this for an inferred cause. `null` when there is no
 * `biggestChange` to explain.
 */
export type TrendCorrelationDriver = { metric: string; label: string; direction: TrendDirection };
export type TrendCorrelation = {
  outcomeMetric: string;
  outcomeLabel: string;
  primaryDriver: TrendCorrelationDriver | null;
  secondaryDriver: TrendCorrelationDriver | null;
  affectedMetrics: string[];
  confidence: TrendConfidence;
  note: string;
} | null;

/** V4-ANALYTICS-001A (Phase 9) — one metric's real change rate, scanning the FULL history (a rate is inherently a lifetime/multi-period concept, not a single-window one). `perWeek`/`perMonth` are simple linear projections of the real `lifetimeChanges / lifetimeDays` rate — labeled as such, never claimed to be a forecast. */
export type ChangeFrequencyMetric = {
  metric: string;
  label: string;
  lifetimeChanges: number;
  lifetimeDays: number;
  perDay: number;
  perWeek: number;
  perMonth: number;
};

export type ChangeFrequency = { metrics: ChangeFrequencyMetric[] } | null;

export type PortfolioStabilityLevel = "very-stable" | "stable" | "moderately-active" | "highly-active" | "very-volatile";

/**
 * V4-ANALYTICS-001A (Phase 10) — measures CHANGE BEHAVIOR (how often/how
 * much/how consistently the portfolio moves), explicitly NOT quality or
 * health — a portfolio can be "Very Stable" while unhealthy (nothing is
 * improving it) or "Very Volatile" while healthy (constantly rebalancing
 * for the better). Built from three already-real, already-computed
 * ingredients — `ChangeFrequency`, `Trend[]` deltas, and
 * `TrendConfidenceDetail.consistencyScore` — never portfolio value alone,
 * and never a new score competing with Portfolio Intelligence's own
 * health/risk scores.
 */
export type PortfolioStabilityIndex = {
  level: PortfolioStabilityLevel;
  label: string;
  /** 0-1 composite, higher = more volatile. Exposed for transparency/debugging, not meant as a standalone user-facing number. */
  score: number;
  frequencyComponent: number;
  magnitudeComponent: number;
  consistencyComponent: number;
  reason: string;
} | null;

/** V4-ANALYTICS-001A (Phase 13) — a flat, human-readable row shape suitable for a future CSV/PDF table renderer. Every value is already a plain, real fact pulled from the rest of `WalletAnalytics` — this file only reshapes, never computes. */
export type AnalyticsExportRow = { section: string; label: string; value: string };

export type AnalyticsExportSnapshot = {
  generatedAt: string;
  window: AnalyticsWindow;
  rows: AnalyticsExportRow[];
};

/**
 * V4-ANALYTICS-001B — five deterministic priority tiers, each a fixed
 * function of a highlight's `type` alone (see `highlights.ts`'s own
 * `HIGHLIGHT_TYPE_PRIORITY` map) — never a computed score, never random.
 * `stars` mirrors the brief's own ★-count example (5 = Critical … 1 =
 * Historical) for direct UI rendering.
 */
export type HighlightPriority = "critical" | "important" | "positive" | "informational" | "historical";

export type HighlightType =
  | "biggestImprovement"
  | "biggestDecline"
  | "recovery"
  | "newPersonalBest"
  | "milestone"
  | "stabilityChange"
  | "majorAllocationShift"
  | "confidenceImprovement"
  | "riskReduction";

/**
 * V4-ANALYTICS-001B — one real, ranked highlight. Every field is read
 * straight off `biggestChange`/`recoveries`/`milestones`/`personalBests`/
 * `stability`/`trendCorrelation`/`trends` — `highlights.ts` performs zero
 * new scoring or portfolio calculation, only prioritization and
 * deduplication over those already-computed outputs. `topic` is the real
 * underlying metric family (e.g. `"risk"`, `"ethAllocation"`,
 * `"stability"`) two highlights are considered duplicates of each other
 * when they share one — see `highlights.ts`'s own dedup doc comment.
 */
export type AnalyticsHighlight = {
  type: HighlightType;
  priority: HighlightPriority;
  stars: number;
  title: string;
  reason: string;
  supportingMetric: string | null;
  topic: string;
  /** Stable, unique per surviving highlight — safe as a React `key` and as the identity dedup collapses to. */
  dedupeKey: string;
};

export type WalletAnalytics = {
  /** V4-ANALYTICS-001A (Phase 2) — which window `trends`/`evolution`/`biggestChange`/`allocation`/`timeline`/`executiveSummary`/`correlation`/`stability` below were computed over. Defaults to `"all"`, matching this module's original, still-unchanged behavior. */
  window: AnalyticsWindow;
  /** `history.length` WITHIN `window` — every UI consumer should treat `< 2` as "not enough history yet in this window," never render a trend as if it were meaningful. See `milestones`/`personalBests`/`recoveries`/`changeFrequency` for the separate, always-full-history fields below. */
  snapshotCount: number;
  trends: Trend[];
  evolution: PortfolioEvolution;
  biggestChange: BiggestPortfolioChange;
  allocation: AllocationAnalytics;
  timeline: AnalyticsTimelineEntry[];
  /** Pure deterministic assembly from `trends`/`evolution` — no LLM, no generated opinion. See `summary.ts`. */
  executiveSummary: string;
  correlation: TrendCorrelation;
  stability: PortfolioStabilityIndex;
  /** Always computed over the FULL, unfiltered history passed to `buildWalletAnalytics` — independent of `window`. See each type's own doc comment for why. */
  milestones: PortfolioMilestones;
  personalBests: PersonalBests;
  recoveries: RecoveryEvent[];
  changeFrequency: ChangeFrequency;
  exportSnapshot: AnalyticsExportSnapshot;
  /** V4-ANALYTICS-001B — the ranked, deduplicated summary of everything else on this object. See `highlights.ts`. */
  highlights: AnalyticsHighlight[];
};

export type { AutomationSnapshot };
