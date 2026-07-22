/**
 * Shared severity/category display metadata for the Alert Engine —
 * icons, labels, and Tailwind color classes in one place so
 * `SeverityBadge`, `AlertCard`, and `AlertFilters` never duplicate a
 * mapping. Colors reuse the existing 3-tier semantic palette
 * (`radar-success`/`radar-warning`/`radar-danger`, the same convention
 * `components/explorer/ScoreBadge.tsx` already uses) plus
 * `radar-primary`/`radar-accent` for the one severity ("info") that
 * palette doesn't cover — this codebase has no dedicated "info" CSS
 * variable, so the existing brand-blue token stands in rather than
 * inventing a new one.
 */

import {
  AlertOctagon,
  AlertTriangle,
  Building2,
  CheckCircle2,
  Code2,
  DollarSign,
  Droplet,
  Globe2,
  Handshake,
  Info,
  Minus,
  ShieldAlert,
  Tag,
  TrendingDown,
  TrendingUp,
  Users,
  Vote,
  Waves,
  Wrench,
  type LucideIcon,
} from "lucide-react";

import type { AlertCategory, AlertSeverity } from "@/lib/alerts/types";
import type { IntelligenceSortOrder } from "@/lib/alerts/service";
import type { NarrativeType } from "@/lib/alerts/intelligence/types";

export const SEVERITY_ICON: Record<AlertSeverity, LucideIcon> = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  critical: AlertOctagon,
};

export const SEVERITY_LABEL: Record<AlertSeverity, string> = {
  info: "Info",
  success: "Success",
  warning: "Warning",
  critical: "Critical",
};

export const SEVERITY_BADGE_CLASS: Record<AlertSeverity, string> = {
  info: "border-radar-primary/30 bg-radar-primary/10 text-radar-primary dark:border-radar-accent/30 dark:bg-radar-accent/10 dark:text-radar-accent",
  success: "border-radar-success/30 bg-radar-success/10 text-radar-success",
  warning: "border-radar-warning/30 bg-radar-warning/10 text-radar-warning",
  critical: "border-radar-danger/30 bg-radar-danger/10 text-radar-danger",
};

/** Solid-fill variant for the card's left-edge severity indicator. */
export const SEVERITY_BORDER_CLASS: Record<AlertSeverity, string> = {
  info: "border-l-radar-primary dark:border-l-radar-accent",
  success: "border-l-radar-success",
  warning: "border-l-radar-warning",
  critical: "border-l-radar-danger",
};

export const CATEGORY_ICON: Record<AlertCategory, LucideIcon> = {
  governance: Vote,
  release: Tag,
  tvl: TrendingUp,
  liquidity: Droplet,
  whale: Waves,
  security: ShieldAlert,
  partnership: Handshake,
  listing: Building2,
  upgrade: Wrench,
  ecosystem: Globe2,
  price: DollarSign,
  community: Users,
};

export const CATEGORY_LABEL: Record<AlertCategory, string> = {
  governance: "Governance",
  release: "Release",
  tvl: "TVL",
  liquidity: "Liquidity",
  whale: "Whale Activity",
  security: "Security",
  partnership: "Partnership",
  listing: "Listing",
  upgrade: "Upgrade",
  ecosystem: "Ecosystem",
  price: "Price",
  community: "Community",
};

/**
 * Fixed evidence-priority order for rendering a signal breakdown (PR-012) —
 * a project's most consequential category always leads regardless of which
 * order its underlying alerts happened to arrive in. Matches
 * `lib/alerts/intelligence/narratives.ts`'s own real priority (a security
 * signal always wins narrative classification first); `scoring.ts`'s six
 * scoreable categories (`tvl`, `governance`, `release`, `security`, `whale`,
 * `price`) cover every category that can actually appear in a real
 * `IntelligenceSignal[]` today. The remaining categories have no scorer yet
 * (`scoring.ts`'s own comment) and are listed last only as a safe fallback
 * if one is ever added, never reordered above a real scored category.
 */
export const CATEGORY_EVIDENCE_PRIORITY: AlertCategory[] = [
  "security",
  "tvl",
  "release",
  "governance",
  "whale",
  "price",
  "liquidity",
  "partnership",
  "listing",
  "upgrade",
  "ecosystem",
  "community",
];

/**
 * PR15.3 Part 2 — display metadata for `NarrativeType` (`lib/alerts/
 * intelligence/types.ts`), the AI Intelligence Engine's detected pattern.
 * Icons and the emoji-prefixed label match the PR brief's own worked
 * example ("🚀 Growth Opportunity"); colors reuse the same 3-tier semantic
 * palette `SEVERITY_BADGE_CLASS` already uses — no new tokens introduced.
 * Some narratives deliberately share a color (e.g. `governance-active` and
 * `development-active` both read as neutral/informational, matching this
 * codebase's existing precedent of `SeverityBadge`'s `critical` covering
 * both up- and down-moves) — label + icon, not color alone, carry the
 * distinction, same accessibility rule `SeverityBadge` already follows.
 */
export const NARRATIVE_ICON: Record<NarrativeType, LucideIcon> = {
  growth: TrendingUp,
  decline: TrendingDown,
  "governance-active": Vote,
  "security-risk": ShieldAlert,
  accumulation: Waves,
  "development-active": Code2,
  stable: Minus,
};

export const NARRATIVE_EMOJI: Record<NarrativeType, string> = {
  growth: "🚀",
  decline: "📉",
  "governance-active": "🗳️",
  "security-risk": "🛡️",
  accumulation: "🐋",
  "development-active": "🛠️",
  stable: "⚖️",
};

export const NARRATIVE_LABEL: Record<NarrativeType, string> = {
  growth: "Growth Opportunity",
  decline: "Decline",
  "governance-active": "Governance",
  "security-risk": "Security Risk",
  accumulation: "Accumulation",
  "development-active": "Development",
  stable: "Stable",
};

export const NARRATIVE_BADGE_CLASS: Record<NarrativeType, string> = {
  growth: "border-radar-success/30 bg-radar-success/10 text-radar-success",
  accumulation: "border-radar-success/30 bg-radar-success/10 text-radar-success",
  decline: "border-radar-warning/30 bg-radar-warning/10 text-radar-warning",
  "security-risk": "border-radar-danger/30 bg-radar-danger/10 text-radar-danger",
  "governance-active":
    "border-radar-primary/30 bg-radar-primary/10 text-radar-primary dark:border-radar-accent/30 dark:bg-radar-accent/10 dark:text-radar-accent",
  "development-active":
    "border-radar-primary/30 bg-radar-primary/10 text-radar-primary dark:border-radar-accent/30 dark:bg-radar-accent/10 dark:text-radar-accent",
  stable: "border-radar-light-border bg-radar-light-surface text-radar-light-muted dark:border-white/10 dark:bg-white/[0.03] dark:text-radar-muted",
};

/** Singular/plural noun phrases for `ExecutiveSummary.tsx`'s count sentences (e.g. "3 Growth Opportunities", "1 Security Alert") — deliberately worded differently from `NARRATIVE_LABEL`'s badge text in one case ("Security Alert" here vs. "Security Risk" on the badge): a badge names the pattern, a summary sentence names the actionable item, and this codebase already treats those as separate copy contexts (e.g. `AlertCard`'s category chip vs. `AlertHeader`'s prose). */
export const NARRATIVE_SUMMARY_LABEL: Record<NarrativeType, { singular: string; plural: string }> = {
  growth: { singular: "Growth Opportunity", plural: "Growth Opportunities" },
  decline: { singular: "Decline Signal", plural: "Decline Signals" },
  "governance-active": { singular: "Governance Event", plural: "Governance Events" },
  "security-risk": { singular: "Security Alert", plural: "Security Alerts" },
  accumulation: { singular: "Accumulation Signal", plural: "Accumulation Signals" },
  "development-active": { singular: "Development Update", plural: "Development Updates" },
  stable: { singular: "Stable Project", plural: "Stable Projects" },
};

/**
 * PR15.3 Part 3 — the Intelligence filter bar's severity-tier labels.
 * Deliberately relabels the same real `AlertSeverity` values the card's own
 * `SeverityBadge` already shows ("Critical"/"Warning"/"Success"/"Info") as
 * "Critical"/"High"/"Medium"/"Low" for the filter dropdown, per the PR
 * brief's requested filter set — no new severity tier is computed, this is
 * a display-only relabeling of the exact same field, applied only inside
 * `IntelligenceFilters.tsx`. `SeverityBadge` itself is untouched.
 */
export const SEVERITY_FILTER_LABEL: Record<AlertSeverity, string> = {
  critical: "Critical",
  warning: "High",
  success: "Medium",
  info: "Low",
};

export const INTELLIGENCE_SORT_LABEL: Record<IntelligenceSortOrder, string> = {
  score: "Highest Score",
  confidence: "Highest Confidence",
  severity: "Highest Severity",
  newest: "Newest",
};
