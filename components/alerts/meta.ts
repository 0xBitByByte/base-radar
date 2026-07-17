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
  DollarSign,
  Droplet,
  Globe2,
  Handshake,
  Info,
  ShieldAlert,
  Tag,
  TrendingUp,
  Users,
  Vote,
  Waves,
  Wrench,
  type LucideIcon,
} from "lucide-react";

import type { AlertCategory, AlertSeverity } from "@/lib/alerts/types";

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
