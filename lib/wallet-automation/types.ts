/**
 * V3-WALLET-004 — domain types for Wallet Automations, the layer that
 * watches `PortfolioIntelligence` (V3-WALLET-003) for changes and produces
 * events/notifications. This module never reads `HoldingAsset[]`, never
 * calls `usePortfolio()`/`useWallet()` for anything but connection/network
 * state, and never recomputes a score, risk level, or exposure percentage —
 * every number here is read straight off an already-built
 * `PortfolioIntelligence` snapshot. See `engine.ts`'s own doc comment for
 * why this deliberately does NOT extend `lib/timeline/types.ts`'s
 * `TimelineEventType` (a closed union with a documented "exactly three
 * sources" invariant that this module would violate) or force wallet rules
 * through `lib/automation/engine.ts`'s generic `matchesRule` (which matches
 * an arbitrary `Notification` stream against declarative conditions — a
 * different problem than this module's, which always knows with certainty
 * whether a given wallet condition just became true).
 */

import type { AutomationRule } from "@/lib/automation/types";
import type { PortfolioIntelligence, RiskLevel, ScoredHolding } from "@/lib/portfolio-intelligence/types";

/**
 * The 13 wallet event kinds named in the brief, verbatim. The 9
 * content-diff kinds are generated only by comparing two
 * `PortfolioIntelligence` snapshots (`events.ts`); the 4 lifecycle kinds
 * are generated from wallet/network/refresh state, since
 * `PortfolioIntelligence` itself carries no connection state to diff (it
 * simply doesn't exist while disconnected).
 */
export const WALLET_EVENT_KINDS = [
  "PortfolioScoreChanged",
  "RiskLevelChanged",
  "ConcentrationThresholdExceeded",
  "StablecoinExposureDropped",
  "StablecoinExposureRecovered",
  "PricingCoverageDropped",
  "PricingCoverageRecovered",
  "UnknownAssetsDetected",
  "LargestHoldingChanged",
  "PortfolioValueChanged",
  "WalletConnected",
  "WalletDisconnected",
  "UnsupportedNetwork",
  "RefreshCompleted",
  // V4-AUTOMATION-001 (Phase 3) — 9 new "smart" content kinds, additive to
  // this closed union exactly like every prior wallet event kind (unlike
  // `lib/timeline/types.ts`'s `TimelineEventType`, this union is owned
  // entirely by `lib/wallet-automation` and consumed nowhere exhaustively
  // outside it — confirmed via this phase's own investigation — so
  // extending it carries none of that union's documented risk). "Health
  // improved"/"Health worsened" are deliberately NOT new kinds here: the
  // existing `PortfolioScoreChanged`-adjacent `wallet-rule:health`
  // automation rule already covers that exact signal (`healthScore` delta)
  // — adding a second, separate kind for the same real change would be
  // exactly the duplicate notification this phase's own investigation
  // asked to check for. Its notification copy was enriched in place
  // instead (see `summary.ts`'s `buildHealthChangeCopy`).
  "ConfidenceIncreased",
  "ConfidenceDropped",
  "FingerprintChanged",
  "PrimaryRecommendationChanged",
  "RiskIncreased",
  "RiskDecreased",
  "LargestProtocolChanged",
  "TopContributorChanged",
  "TopWarningChanged",
] as const;
export type WalletEventKind = (typeof WALLET_EVENT_KINDS)[number];

export type WalletEventTone = "positive" | "neutral" | "attention";

/**
 * V4-AUTOMATION-001 (Phase 5) — structured fields for the "smart" event/
 * result kinds, every one of them a direct read of an already-computed
 * `PortfolioIntelligence`/`ScoreContributor`/`PortfolioRecommendation`
 * field (never a new calculation): `reason` and `relatedAssets` come
 * straight off a `ScoreContributor`/`AIInsight`, `estimatedImpact` off a
 * recommendation's own `priority`. Optional and additive on `WalletEvent`
 * below — every existing event (the original 13 kinds) simply omits it,
 * unchanged.
 */
export type WalletEventMetadata = {
  severity: RiskLevel | null;
  confidence: number;
  reason: string | null;
  relatedAssets: string[];
  relatedProtocols: string[];
  estimatedImpact: "low" | "medium" | "high";
};

/** One entry in the wallet's own change-log — the complete, unfiltered set (see `events.ts`). Not every kind here becomes an automation rule result; "Recent Wallet Events" shows this full log, "Wallet Automations" shows only the subset a rule fired on. */
export type WalletEvent = {
  /** Deterministic given `(kind, timestamp)` — same diff in, same id out. */
  id: string;
  kind: WalletEventKind;
  timestamp: string;
  title: string;
  summary: string;
  tone: WalletEventTone;
  /** V4-AUTOMATION-001 — populated for the 9 new smart kinds, `undefined` for the original 13 (never fabricated where there's nothing more to say than `title`/`summary` already do). */
  metadata?: WalletEventMetadata;
};

export const WALLET_RULE_IDS = [
  "wallet-rule:concentration",
  "wallet-rule:stablecoin",
  "wallet-rule:unknown-assets",
  "wallet-rule:pricing-coverage",
  "wallet-rule:largest-holding",
  "wallet-rule:health",
  // V4-AUTOMATION-001 (Phase 3) — 5 new rules, additive. Not all 9 new
  // trigger predicates became rules: `confidenceIncreased`/
  // `riskScoreDecreased`/`topContributorChanged` (when it's clearing, not
  // newly appearing) are genuinely positive/informational and already
  // surface via "Recent Wallet Events" (Phase 3's new content-event
  // kinds) — mirroring the original design's own restraint (only 6 of its
  // 9 content-diff kinds became rules; `PortfolioValueChanged`/
  // `RiskLevelChanged` never did either). Curated to the 5 most
  // actionable new conditions so "Wallet Automations"/the Automation
  // Center don't get noisier than the real signal warrants.
  "wallet-rule:confidence",
  "wallet-rule:fingerprint",
  "wallet-rule:recommendation",
  "wallet-rule:risk",
  "wallet-rule:top-warning",
] as const;
export type WalletRuleId = (typeof WALLET_RULE_IDS)[number];

/** A real `AutomationRule` (from `lib/automation/types.ts`, unmodified) narrowed to this module's own fixed rule ids — lets `rules.ts` stay exhaustive over the 6 wallet rules without a separate parallel type. */
export type WalletAutomationRule = AutomationRule & { id: WalletRuleId };

/** Snapshot of wallet/network/refresh state `events.ts` needs for the 4 lifecycle event kinds — deliberately just booleans/strings, not the full `useWallet()`/`usePortfolio()` return shape, so `events.ts` can't reach for anything beyond what it's declared it needs. */
export type WalletLifecycleState = {
  isConnected: boolean;
  isSupportedNetwork: boolean;
  chainSupported: boolean;
  lastUpdated: string | null;
};

/**
 * V4-AUTOMATION-001 (Phase 9) — preparation for V4-HISTORY-001. Every field
 * is a plain, already-computed value (never a new calculation) taken
 * straight off one `PortfolioIntelligence` snapshot at the moment
 * automation last evaluated it. No persistence, no database, no backend —
 * `buildAutomationSnapshot` (see `snapshot.ts`) is a pure function a future
 * History module could call to decide what to persist, not a mechanism
 * that persists anything itself.
 *
 * V4-ANALYTICS-001 — extended in place (not a second snapshot format, per
 * that phase's own explicit "Automation already creates snapshot-like
 * objects... DO NOT invent a second snapshot format" instruction):
 * `totalValue`/`stablecoinExposure`/`ethPct`/`diversificationScore`/
 * `pricingCoverage`/`unknownAssetCount`/`warningIds`/`topHoldings` are all
 * fields `PortfolioIntelligence` already computed (`totalUsdValue`,
 * `stablecoinExposure`, `allocationBreakdown.ethPct`,
 * `diversificationScore`, `pricingCoverage`, `unknownAssetCount`,
 * `warnings.map(w => w.id)`, `allocationBreakdown.topHoldings`) — none of
 * them a new calculation, just more of what already existed captured at
 * this same moment in time, so `lib/wallet-analytics/` can do real
 * per-asset/allocation-mix comparisons across snapshots without touching
 * raw holdings or recomputing anything Portfolio Intelligence already did.
 *
 * V4-ANALYTICS-001C (Phase 3) — `analyticsVersion` added additively, no
 * existing field changed. Marks which shape of this type a given snapshot
 * was built against, so a future History module's stored records — and
 * `lib/wallet-analytics/serialization.ts`'s `deserializeAnalyticsSnapshot`,
 * which reads this field — can tell an older persisted snapshot apart from
 * the current shape and upgrade it deterministically, without guessing.
 * `CURRENT_ANALYTICS_SNAPSHOT_VERSION` below is the single source of truth
 * for "current" — bump it only when this type's shape actually changes.
 */
export type AutomationSnapshot = {
  timestamp: string;
  analyticsVersion: number;
  overallScore: number;
  healthScore: number;
  riskScore: number;
  confidenceScore: number;
  confidenceLevel: string;
  fingerprint: string;
  largestHoldingSymbol: string | null;
  largestProtocolName: string | null;
  primaryRecommendationId: string | null;
  topWarningId: string | null;
  totalValue: number;
  stablecoinExposure: number;
  ethPct: number;
  diversificationScore: number;
  pricingCoverage: number;
  unknownAssetCount: number;
  warningIds: string[];
  topHoldings: ScoredHolding[];
};

/** The real, already-known change between two `AutomationSnapshot`s — `changed` names exactly which fields differ, never a guessed or inferred summary. Array-valued fields (`warningIds`, `topHoldings`) are deliberately excluded from this simple equality diff — `lib/wallet-analytics/allocation.ts` does the real, structured comparison for `topHoldings` instead of this reducing it to a single boolean. `analyticsVersion` is excluded too — it's shape metadata, never a portfolio metric a diff should report as "changed." */
export type AutomationDiff = {
  fromTimestamp: string | null;
  toTimestamp: string;
  changed: (keyof Omit<AutomationSnapshot, "timestamp" | "analyticsVersion" | "warningIds" | "topHoldings">)[];
};

/** V4-ANALYTICS-001C (Phase 3) — the current `AutomationSnapshot` shape version. `buildAutomationSnapshot` stamps every new snapshot with this; bump it only when the type's fields actually change, and extend `deserializeAnalyticsSnapshot` (`lib/wallet-analytics/serialization.ts`) with the real upgrade step for the new version at the same time. */
export const CURRENT_ANALYTICS_SNAPSHOT_VERSION = 1;

/** Operational metadata about this evaluation pass itself — rule/event counts, never portfolio content. */
export type AutomationMetadata = {
  evaluatedAt: string;
  ruleCount: number;
  enabledRuleCount: number;
  triggeredResultCount: number;
  eventCount: number;
};

export type { PortfolioIntelligence, RiskLevel };
