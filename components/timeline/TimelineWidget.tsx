"use client";

import Link from "next/link";
import { ArrowRight, Clock } from "lucide-react";

import { TimelineEventBadge } from "@/components/timeline/TimelineEventBadge";
import { TimelineMetric } from "@/components/timeline/TimelineMetric";
import { WidgetCard } from "@/components/dashboard/WidgetCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { usePersonalizedDashboard } from "@/lib/hooks/usePersonalizedDashboard";
import { capitalize } from "@/lib/timeline/summary";

/**
 * The Dashboard's compact "Recent Activity" preview — headline, summary,
 * total events, highest severity, and the single latest event.
 * Deliberately shallow: it renders only the top-level summary
 * `usePersonalizedDashboard()` already provides, never the full
 * chronological feed grouped by Today/Yesterday/Earlier — that depth lives
 * at `/dashboard/timeline` only, reached via the link below.
 *
 * PR22 Part 2: the metric tiles (Total Events/Highest Severity) stay
 * read off the raw, un-filtered `timeline` — same "aggregate metrics never
 * recomputed for a filtered subset" precedent `Timeline.tsx`'s own search
 * feature already established — only the "Latest Event" preview is scoped
 * to the active watchlist, via `timelineEvents`.
 */
export function TimelineWidget() {
  const { timeline, timelineEvents, isPersonalized, activeWatchlist } = usePersonalizedDashboard();
  const latestEvent = timelineEvents[0];

  return (
    <WidgetCard
      icon={<Clock className="size-5" aria-hidden="true" />}
      title="Recent Activity"
      subtitle="Intelligence events from your Watchlist"
      accent="purple"
      lastUpdated={timeline?.generatedAt}
    >
      {activeWatchlist && activeWatchlist.projectIds.length === 0 ? (
        <EmptyState
          icon={Clock}
          title="No activity yet."
          description="This timeline shows intelligence events generated from projects in your Watchlist. Add projects to your Watchlist to start seeing activity here."
        />
      ) : !timeline || timeline.totalEvents === 0 ? (
        <EmptyState
          icon={Clock}
          title="Nothing logged yet."
          description="This timeline chronicles intelligence events from your Watchlist as they happen. It'll fill in as your watched projects generate real activity."
        />
      ) : isPersonalized && timelineEvents.length === 0 ? (
        <EmptyState
          icon={Clock}
          title="No Timeline events for this watchlist."
          description={`None of the projects in "${activeWatchlist?.name}" have Timeline activity yet.`}
        />
      ) : (
        <div className="flex flex-col gap-3.5">
          <div className="flex flex-col gap-1">
            <p className="text-sm font-semibold text-radar-light-text dark:text-radar-white">{timeline.headline}</p>
            <p className="line-clamp-2 text-xs leading-relaxed text-radar-light-muted dark:text-radar-muted">
              {timeline.summary}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <TimelineMetric label="Total Events" value={timeline.totalEvents} />
            <TimelineMetric
              label="Highest Severity"
              value={timeline.highestSeverity ? capitalize(timeline.highestSeverity) : "None"}
            />
          </div>

          {latestEvent && (
            <div className="relative flex flex-col gap-1 rounded-lg border border-radar-light-border bg-radar-light-surface p-2.5 transition-colors hover:bg-radar-light-card dark:border-white/10 dark:bg-white/[0.03] dark:hover:bg-white/[0.06]">
              {latestEvent.link && (
                <Link
                  href={latestEvent.link}
                  aria-label={`${latestEvent.title}. Investigate further.`}
                  className="absolute inset-0 z-0 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-radar-primary/50"
                />
              )}
              <span className="relative z-[1] text-[10.5px] font-medium text-radar-light-muted dark:text-radar-muted">
                Latest Event
              </span>
              <div className="relative z-[1] flex items-center gap-1.5">
                <TimelineEventBadge eventType={latestEvent.eventType} />
                <span className="truncate text-xs font-semibold text-radar-light-text dark:text-radar-white">
                  {latestEvent.title}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      <Link
        href="/dashboard/timeline"
        className="flex items-center gap-1 self-start text-xs font-medium text-radar-primary outline-none transition-colors hover:text-radar-primary/80 focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:text-radar-accent dark:hover:text-radar-accent/80"
      >
        View full timeline
        <ArrowRight className="size-3.5 shrink-0" aria-hidden="true" />
      </Link>
    </WidgetCard>
  );
}
