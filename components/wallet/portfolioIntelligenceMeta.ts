/**
 * V3-WALLET-003 — display metadata for `lib/portfolio-intelligence/`'s
 * `RiskLevel`/`PortfolioInsightTone`, the same "icons/labels/color classes
 * in one shared place" convention `components/alerts/meta.ts` already
 * establishes for the Alert Engine. Not built on `SeverityBadge`/
 * `AlertSeverity` directly — this module's `RiskLevel` is a different,
 * wallet-specific 4-tier union, so reusing the visual language (not the
 * type) keeps both features' badges looking consistent without coupling
 * this feature to the Alert Engine's types.
 */

import { AlertOctagon, AlertTriangle, CheckCircle2, Info, type LucideIcon } from "lucide-react";

import type {
  ConfidenceLevel,
  DiversificationRating,
  PortfolioInsightTone,
  PortfolioRecommendationPriority,
  RiskLevel,
} from "@/lib/portfolio-intelligence/types";

export const RISK_LEVEL_LABEL: Record<RiskLevel, string> = {
  low: "Low",
  moderate: "Moderate",
  elevated: "Elevated",
  high: "High",
};

export const RISK_LEVEL_ICON: Record<RiskLevel, LucideIcon> = {
  low: CheckCircle2,
  moderate: Info,
  elevated: AlertTriangle,
  high: AlertOctagon,
};

export const RISK_LEVEL_BADGE_CLASS: Record<RiskLevel, string> = {
  low: "border-radar-success/30 bg-radar-success/10 text-radar-success",
  moderate: "border-radar-primary/30 bg-radar-primary/10 text-radar-primary dark:border-radar-accent/30 dark:bg-radar-accent/10 dark:text-radar-accent",
  elevated: "border-radar-warning/30 bg-radar-warning/10 text-radar-warning",
  high: "border-radar-danger/30 bg-radar-danger/10 text-radar-danger",
};

export const INSIGHT_TONE_ICON: Record<PortfolioInsightTone, LucideIcon> = {
  positive: CheckCircle2,
  neutral: Info,
  attention: AlertTriangle,
};

export const INSIGHT_TONE_BADGE_CLASS: Record<PortfolioInsightTone, string> = {
  positive: "border-radar-success/30 bg-radar-success/10 text-radar-success",
  neutral: "border-radar-primary/30 bg-radar-primary/10 text-radar-primary dark:border-radar-accent/30 dark:bg-radar-accent/10 dark:text-radar-accent",
  attention: "border-radar-warning/30 bg-radar-warning/10 text-radar-warning",
};

/** V4-INTELLIGENCE-001 — `PortfolioRecommendation.priority` display metadata, the same "meta module, not inline per-component" convention this file already establishes for `RiskLevel`/`PortfolioInsightTone`. */
export const RECOMMENDATION_PRIORITY_LABEL: Record<PortfolioRecommendationPriority, string> = {
  high: "High priority",
  medium: "Medium priority",
  low: "Low priority",
};

export const RECOMMENDATION_PRIORITY_BADGE_CLASS: Record<PortfolioRecommendationPriority, string> = {
  high: "border-radar-danger/30 bg-radar-danger/10 text-radar-danger",
  medium: "border-radar-warning/30 bg-radar-warning/10 text-radar-warning",
  low: "border-radar-light-border bg-radar-light-surface text-radar-light-muted dark:border-white/10 dark:bg-white/5 dark:text-radar-muted",
};

/** V4-INTELLIGENCE-001 — `PortfolioQuality.diversificationRating` display metadata. */
export const DIVERSIFICATION_RATING_BADGE_CLASS: Record<DiversificationRating, string> = {
  Excellent: "border-radar-success/30 bg-radar-success/10 text-radar-success",
  Good: "border-radar-primary/30 bg-radar-primary/10 text-radar-primary dark:border-radar-accent/30 dark:bg-radar-accent/10 dark:text-radar-accent",
  Fair: "border-radar-warning/30 bg-radar-warning/10 text-radar-warning",
  Poor: "border-radar-danger/30 bg-radar-danger/10 text-radar-danger",
};

/** V4-INTELLIGENCE-002 — `confidenceLevel` display metadata. */
export const CONFIDENCE_LEVEL_BADGE_CLASS: Record<ConfidenceLevel, string> = {
  High: "border-radar-success/30 bg-radar-success/10 text-radar-success",
  Medium: "border-radar-warning/30 bg-radar-warning/10 text-radar-warning",
  Low: "border-radar-danger/30 bg-radar-danger/10 text-radar-danger",
};
