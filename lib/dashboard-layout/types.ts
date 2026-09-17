/**
 * PR-093.04 (Dashboard Customization) — the real, bounded set of widgets a
 * user can hide. Scoped deliberately to exactly the widget cards rendered
 * inside `app/dashboard/page.tsx`'s three `WIDGET_GRID_CLASS` tiers ("Your
 * Intelligence" / "Market Signals" / "Ecosystem Overview") — never the
 * page's hero/summary furniture (Welcome header, Executive Summary strip,
 * Today's Top Insight, Getting Started, the Intelligence Brief + Portfolio
 * row, KPI row, AI Intelligence Hub strip), which stay permanently visible.
 * A closed union, not an open string, so a stored id can always be checked
 * against a real, current widget — matching every other closed-vocabulary
 * union in this app (`WatchlistIconKey`, `NotificationType`, etc.).
 */

export type DashboardWidgetId =
  | "ai-intelligence"
  | "brief"
  | "portfolio-intelligence"
  | "watchlist"
  | "notifications"
  | "automation"
  | "timeline"
  | "ecosystem-opportunities"
  | "ecosystem-risks"
  | "whale-activity"
  | "signals"
  | "market"
  | "narrative-heatmap"
  | "trending"
  | "ai-projects"
  | "project-spotlight"
  | "activity-feed";

export type DashboardWidgetTier = "Your Intelligence" | "Market Signals" | "Ecosystem Overview";

export type DashboardWidgetDescriptor = {
  id: DashboardWidgetId;
  /** A real, human label for the customization checklist — matches what the widget itself displays as its own heading. */
  label: string;
  tier: DashboardWidgetTier;
};

/** The full, real registry — same order `app/dashboard/page.tsx` renders these in, grouped by the same three tiers it already labels them with. */
export const DASHBOARD_WIDGETS: DashboardWidgetDescriptor[] = [
  { id: "ai-intelligence", label: "AI Intelligence", tier: "Your Intelligence" },
  { id: "brief", label: "Daily Brief", tier: "Your Intelligence" },
  { id: "portfolio-intelligence", label: "Portfolio Intelligence", tier: "Your Intelligence" },
  { id: "watchlist", label: "Watchlist", tier: "Your Intelligence" },
  { id: "notifications", label: "Notifications", tier: "Your Intelligence" },
  { id: "automation", label: "Automation", tier: "Your Intelligence" },
  { id: "timeline", label: "Timeline", tier: "Your Intelligence" },
  { id: "ecosystem-opportunities", label: "Ecosystem Opportunities", tier: "Market Signals" },
  { id: "ecosystem-risks", label: "Ecosystem Risks", tier: "Market Signals" },
  { id: "whale-activity", label: "Whale Activity", tier: "Market Signals" },
  { id: "signals", label: "Signals", tier: "Market Signals" },
  { id: "market", label: "Market Overview", tier: "Market Signals" },
  { id: "narrative-heatmap", label: "Narrative Heatmap", tier: "Market Signals" },
  { id: "trending", label: "Trending", tier: "Market Signals" },
  { id: "ai-projects", label: "AI Projects", tier: "Ecosystem Overview" },
  { id: "project-spotlight", label: "Project Spotlight", tier: "Ecosystem Overview" },
  { id: "activity-feed", label: "Activity Feed", tier: "Ecosystem Overview" },
];

export const DASHBOARD_WIDGET_IDS: DashboardWidgetId[] = DASHBOARD_WIDGETS.map((widget) => widget.id);
