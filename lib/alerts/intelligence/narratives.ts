/**
 * Stage 5 of the pipeline — deterministic narrative detection. Every rule
 * below checks for REAL, already-computed signal categories (and their
 * real net sentiment) co-occurring; nothing here invents a pattern that
 * isn't backed by at least one real `Alert` per contributing category.
 * Rules are checked in a fixed priority order and the first match wins, so
 * a project is never assigned two narratives from the same signal set —
 * `"stable"` is the honest fallback when no rule's real conditions are met,
 * never a forced "growth"-sounding guess.
 */

import type { AlertCategory } from "@/lib/alerts/types";
import { computeNetSentiment } from "@/lib/alerts/intelligence/scoring";
import type { IntelligenceSignal, NarrativeType } from "@/lib/alerts/intelligence/types";

/** The real signal categories a "growth"/"decline" read requires — at least two of these must be present so the read is corroborated across independent sources, never inferred from a single alert. */
const GROWTH_SIGNAL_CATEGORIES: AlertCategory[] = ["tvl", "governance", "release"];
const GROWTH_MIN_CATEGORY_COUNT = 2;

export function detectNarrative(signals: IntelligenceSignal[]): NarrativeType {
  if (signals.length === 0) return "stable";

  const categories = new Set(signals.map((signal) => signal.category));
  const netSentiment = computeNetSentiment(signals);

  // A real security/contract event always takes priority — no growth or
  // decline read is allowed to bury a real security-relevant signal.
  if (categories.has("security")) return "security-risk";

  const growthCategoryCount = GROWTH_SIGNAL_CATEGORIES.filter((category) => categories.has(category)).length;
  if (growthCategoryCount >= GROWTH_MIN_CATEGORY_COUNT) {
    return netSentiment >= 0 ? "growth" : "decline";
  }

  // Whale activity alone (no corroborating TVL/governance move) reads as
  // accumulation rather than a growth/decline verdict — one real signal,
  // not a trend.
  if (categories.has("whale") && categories.size === 1) return "accumulation";

  if (categories.has("release") && categories.size === 1) return "development-active";
  if (categories.has("governance") && categories.size === 1) return "governance-active";

  if (categories.has("price") && categories.size === 1) {
    if (netSentiment > 0) return "growth";
    if (netSentiment < 0) return "decline";
  }

  return "stable";
}
