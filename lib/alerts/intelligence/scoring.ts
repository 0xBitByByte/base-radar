/**
 * Stage 4 of the pipeline — modular, per-category scoring. Every scorer
 * below is a small, independent, pure function ("Do NOT hardcode one
 * giant function"): each looks at one `Alert` and, if that alert's
 * category is the one it understands, returns a real `IntelligenceSignal`
 * derived from that alert's own already-real `severity` (magnitude) and
 * title text (direction) — never a fabricated number. An alert whose
 * category no scorer recognizes yet (liquidity/partnership/listing/
 * upgrade/ecosystem/community) simply contributes no signal, honestly,
 * rather than a guessed one.
 */

import type { Alert, AlertSeverity } from "@/lib/alerts/types";
import type { IntelligenceSignal } from "@/lib/alerts/intelligence/types";

/** How much a severity level scales a signal's magnitude — `critical` isn't always "bad" in this codebase's Alert model (e.g. a large *upward* price move is still `critical`), so severity drives MAGNITUDE only; direction comes from `classifyDirection` below. */
const SEVERITY_MAGNITUDE: Record<AlertSeverity, number> = {
  info: 0.6,
  success: 1,
  warning: 1,
  critical: 1.75,
};

// Real words the alert PROVIDERS themselves already write into titles
// (`lib/alerts/providers/*.ts`) — this is reading already-real text for its
// direction, never inventing sentiment the provider didn't already encode.
const POSITIVE_KEYWORDS = [
  "increased",
  "up",
  "passed",
  "verified",
  "major release",
  "new release",
  "release candidate",
  "all-time high",
];
const NEGATIVE_KEYWORDS = ["decreased", "down", "failed", "archived", "all-time low"];

/**
 * Reads the alert's own real title for a direction word every provider
 * already writes. Returns `0` (neutral) for procedural events — a new
 * governance proposal opening, or a contract simply being verified, isn't
 * "good" or "bad" on its own — deliberately conservative rather than
 * guessing a direction the title doesn't support.
 */
export function classifyDirection(alert: Alert): -1 | 0 | 1 {
  const text = alert.title.toLowerCase();
  if (NEGATIVE_KEYWORDS.some((keyword) => text.includes(keyword))) return -1;
  if (POSITIVE_KEYWORDS.some((keyword) => text.includes(keyword))) return 1;
  return 0;
}

function buildSignal(alert: Alert, label: string, basePoints: number): IntelligenceSignal {
  return {
    category: alert.category,
    label,
    weight: Math.round(basePoints * SEVERITY_MAGNITUDE[alert.severity]),
    direction: classifyDirection(alert),
    sourceAlertId: alert.id,
  };
}

/** TVL change — category `"tvl"` (DefiLlama). */
export function scoreTvlChange(alert: Alert): IntelligenceSignal | null {
  if (alert.category !== "tvl") return null;
  return buildSignal(alert, "TVL change", 14);
}

/** Governance activity — category `"governance"` (Snapshot). */
export function scoreGovernanceActivity(alert: Alert): IntelligenceSignal | null {
  if (alert.category !== "governance") return null;
  return buildSignal(alert, "Governance activity", 10);
}

/** GitHub commit/release activity — category `"release"` (GitHub). */
export function scoreGithubActivity(alert: Alert): IntelligenceSignal | null {
  if (alert.category !== "release") return null;
  return buildSignal(alert, "Development activity", 9);
}

/** Contract deployment/verification/security events — category `"security"` (Blockscout/GitHub). */
export function scoreContractEvent(alert: Alert): IntelligenceSignal | null {
  if (alert.category !== "security") return null;
  return buildSignal(alert, "Contract/security event", 11);
}

/** Whale/large transfer — category `"whale"` (Blockscout). */
export function scoreWhaleTransfer(alert: Alert): IntelligenceSignal | null {
  if (alert.category !== "whale") return null;
  return buildSignal(alert, "Whale activity", 12);
}

/** Price movement — category `"price"` (CoinGecko). */
export function scorePriceMovement(alert: Alert): IntelligenceSignal | null {
  if (alert.category !== "price") return null;
  return buildSignal(alert, "Price movement", 8);
}

/** Every scorer, tried in order — the modular list `scoreAlert` walks. Adding a new category's scorer later means adding one function here, never touching the others. */
const SIGNAL_SCORERS: Array<(alert: Alert) => IntelligenceSignal | null> = [
  scoreTvlChange,
  scoreGovernanceActivity,
  scoreGithubActivity,
  scoreContractEvent,
  scoreWhaleTransfer,
  scorePriceMovement,
];

/** Runs every scorer against one alert; returns whichever real signal (if any) applies. Never more than one signal per alert — each `Alert` has exactly one `category`. */
export function scoreAlert(alert: Alert): IntelligenceSignal | null {
  for (const scorer of SIGNAL_SCORERS) {
    const signal = scorer(alert);
    if (signal) return signal;
  }
  return null;
}

/** Stage 4's final composite — total real signal magnitude, clamped to a 0-100 scale. Direction-agnostic by design: `score` answers "how much is happening," not "is it good or bad." */
export function computeScore(signals: IntelligenceSignal[]): number {
  const total = signals.reduce((sum, signal) => sum + signal.weight, 0);
  return Math.max(0, Math.min(100, Math.round(total)));
}

/** Signed sum of every signal's `weight * direction` — the one number `narratives.ts` uses to tell a real upswing from a real downswing. Not exposed on `IntelligenceAlert` directly; it's an intermediate value, not a user-facing fact. */
export function computeNetSentiment(signals: IntelligenceSignal[]): number {
  return signals.reduce((sum, signal) => sum + signal.weight * signal.direction, 0);
}

const CONFIDENCE_BY_DISTINCT_CATEGORIES: Record<number, number> = {
  0: 0,
  1: 45,
  2: 65,
  3: 82,
};
const CONFIDENCE_FOUR_OR_MORE_CATEGORIES = 92;

/**
 * More independent signal CATEGORIES agreeing raises confidence — three
 * alerts all about the same TVL swing is one real signal repeated, not
 * three independent confirmations, so this counts distinct `category`
 * values, never raw alert count.
 */
export function computeConfidence(signals: IntelligenceSignal[]): number {
  const distinctCategories = new Set(signals.map((signal) => signal.category)).size;
  return CONFIDENCE_BY_DISTINCT_CATEGORIES[distinctCategories] ?? CONFIDENCE_FOUR_OR_MORE_CATEGORIES;
}
