import {
  Activity,
  Bell,
  CheckCircle2,
  Code2,
  LayoutGrid,
  Newspaper,
  ShieldAlert,
  Target,
  TrendingUp,
  Vote,
  type LucideIcon,
} from "lucide-react";

import type { TimelineEventType } from "@/lib/timeline/types";
import { cn } from "@/lib/utils";

/**
 * Display metadata for `TimelineEventType` — every icon is reused from the
 * exact same concept elsewhere in the app (Bell from the Alerts nav item,
 * Target from Top Opportunities/Performers, ShieldAlert from Security,
 * Vote from Governance, Code2 from Development, TrendingUp from TVL,
 * Activity from Narrative sections, CheckCircle2 from `RecommendationCard`,
 * LayoutGrid from `PortfolioWidget`, Newspaper from `BriefWidget`) — no new
 * iconography invented. Colors reuse the existing 3-tier semantic palette
 * plus `radar-purple`, this codebase's already-established "AI-generated
 * roll-up" accent (`IntelligenceBadge`/`BriefWidget`/`PortfolioWidget`),
 * reused here for the three aggregate/roll-up event types.
 */
export const TIMELINE_EVENT_ICON: Record<TimelineEventType, LucideIcon> = {
  alert: Bell,
  opportunity: Target,
  security: ShieldAlert,
  governance: Vote,
  development: Code2,
  tvl: TrendingUp,
  narrative: Activity,
  recommendation: CheckCircle2,
  portfolio: LayoutGrid,
  "daily-brief": Newspaper,
};

export const TIMELINE_EVENT_LABEL: Record<TimelineEventType, string> = {
  alert: "Alert",
  opportunity: "Opportunity",
  security: "Security",
  governance: "Governance",
  development: "Development",
  tvl: "TVL",
  narrative: "Narrative",
  recommendation: "Recommendation",
  portfolio: "Portfolio",
  "daily-brief": "Daily Brief",
};

const NEUTRAL_BADGE_CLASS =
  "border-radar-light-border bg-radar-light-surface text-radar-light-muted dark:border-white/10 dark:bg-white/[0.03] dark:text-radar-muted";
const PRIMARY_BADGE_CLASS =
  "border-radar-primary/30 bg-radar-primary/10 text-radar-primary dark:border-radar-accent/30 dark:bg-radar-accent/10 dark:text-radar-accent";
const PURPLE_BADGE_CLASS = "border-radar-purple/30 bg-radar-purple/10 text-radar-purple";

export const TIMELINE_EVENT_BADGE_CLASS: Record<TimelineEventType, string> = {
  alert: PRIMARY_BADGE_CLASS,
  opportunity: "border-radar-success/30 bg-radar-success/10 text-radar-success",
  security: "border-radar-danger/30 bg-radar-danger/10 text-radar-danger",
  governance: PRIMARY_BADGE_CLASS,
  development: PRIMARY_BADGE_CLASS,
  tvl: NEUTRAL_BADGE_CLASS,
  narrative: NEUTRAL_BADGE_CLASS,
  recommendation: PURPLE_BADGE_CLASS,
  portfolio: PURPLE_BADGE_CLASS,
  "daily-brief": PURPLE_BADGE_CLASS,
};

type TimelineEventBadgeProps = {
  eventType: TimelineEventType;
  className?: string;
};

/** Doubles as the Timeline Item's "Source badge" — identifies which upstream layer produced the event. Reuses `SeverityBadge`/`NarrativeBadge`'s exact chip shape. */
export function TimelineEventBadge({ eventType, className }: TimelineEventBadgeProps) {
  const Icon = TIMELINE_EVENT_ICON[eventType];
  return (
    <span
      className={cn(
        "inline-flex w-fit shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[10.5px] font-semibold",
        TIMELINE_EVENT_BADGE_CLASS[eventType],
        className
      )}
    >
      <Icon className="size-3 shrink-0" aria-hidden="true" />
      {TIMELINE_EVENT_LABEL[eventType]}
    </span>
  );
}
