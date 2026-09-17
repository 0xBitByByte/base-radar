/**
 * V4-ANALYTICS-001 — display metadata for `lib/wallet-analytics/`'s
 * `TrendDirection`, the same "icons/labels/color classes in one shared
 * place" convention `portfolioIntelligenceMeta.ts` already establishes.
 */

import { Activity, HelpCircle, Minus, TrendingDown, TrendingUp, Waves, Zap, type LucideIcon } from "lucide-react";

import type { HighlightPriority, PortfolioStabilityLevel, TrendConfidence, TrendDirection } from "@/lib/wallet-analytics/types";

export const TREND_DIRECTION_LABEL: Record<TrendDirection, string> = {
  improving: "Improving",
  stable: "Stable",
  declining: "Declining",
  unknown: "Unknown",
};

export const TREND_DIRECTION_ICON: Record<TrendDirection, LucideIcon> = {
  improving: TrendingUp,
  stable: Minus,
  declining: TrendingDown,
  unknown: HelpCircle,
};

export const TREND_DIRECTION_CLASS: Record<TrendDirection, string> = {
  improving: "text-radar-success",
  stable: "text-radar-light-muted dark:text-radar-muted",
  declining: "text-radar-danger",
  unknown: "text-radar-light-muted/70 dark:text-radar-muted/70",
};

/**
 * V4-ANALYTICS-002 — display metadata for `TrendConfidence`, the
 * "confidence in the historical trend itself" rating (not Portfolio AI's
 * `confidenceScore`). A neutral gray scale, not a good/bad color — a "Low"
 * confidence trend isn't a bad outcome, just a less-certain read.
 */
export const TREND_CONFIDENCE_LABEL: Record<TrendConfidence, string> = {
  high: "High Confidence",
  medium: "Medium Confidence",
  low: "Low Confidence",
  unknown: "Confidence Unknown",
};

export const TREND_CONFIDENCE_CLASS: Record<TrendConfidence, string> = {
  high: "text-radar-light-text dark:text-radar-white",
  medium: "text-radar-light-muted dark:text-radar-muted",
  low: "text-radar-light-muted/70 dark:text-radar-muted/70",
  unknown: "text-radar-light-muted/50 dark:text-radar-muted/50",
};

/**
 * V4-ANALYTICS-001A (Phase 10) — display metadata for `PortfolioStabilityLevel`.
 * Deliberately NOT a good/bad color scale (green→red) the way health/risk
 * are — Stability measures change BEHAVIOR, not quality, so "Very Volatile"
 * gets an attention color for visibility, not a "danger" one.
 */
export const STABILITY_LEVEL_ICON: Record<PortfolioStabilityLevel, LucideIcon> = {
  "very-stable": Minus,
  stable: Waves,
  "moderately-active": Activity,
  "highly-active": Zap,
  "very-volatile": Zap,
};

export const STABILITY_LEVEL_CLASS: Record<PortfolioStabilityLevel, string> = {
  "very-stable": "text-radar-light-muted dark:text-radar-muted",
  stable: "text-radar-primary dark:text-radar-accent",
  "moderately-active": "text-radar-warning",
  "highly-active": "text-radar-warning",
  "very-volatile": "text-radar-danger",
};

/**
 * V4-ANALYTICS-001B — display metadata for `HighlightPriority`, a fixed
 * function of a highlight's `type` (see `highlights.ts`), not a computed
 * score. `stars` mirrors the brief's own ★-count example.
 */
export const HIGHLIGHT_PRIORITY_LABEL: Record<HighlightPriority, string> = {
  critical: "Critical",
  important: "Important",
  positive: "Positive",
  informational: "Informational",
  historical: "Historical",
};

export const HIGHLIGHT_PRIORITY_CLASS: Record<HighlightPriority, string> = {
  critical: "text-radar-danger",
  important: "text-radar-warning",
  positive: "text-radar-success",
  informational: "text-radar-light-muted dark:text-radar-muted",
  historical: "text-radar-light-muted/70 dark:text-radar-muted/70",
};
