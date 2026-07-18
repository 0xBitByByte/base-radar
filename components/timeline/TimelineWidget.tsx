"use client";

import Link from "next/link";
import { ArrowRight, Clock } from "lucide-react";

import { TimelineEventBadge } from "@/components/timeline/TimelineEventBadge";
import { TimelineMetric } from "@/components/timeline/TimelineMetric";
import { WidgetCard } from "@/components/dashboard/WidgetCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { useTimeline } from "@/lib/hooks/useTimeline";
import { capitalize } from "@/lib/timeline/summary";

/**
 * The Dashboard's compact "Recent Activity" preview — headline, summary,
 * total events, highest severity, and the single latest event.
 * Deliberately shallow: it renders only the top-level summary
 * `useTimeline()` already provides, never the full chronological feed
 * grouped by Today/Yesterday/Earlier — that depth lives at
 * `/dashboard/timeline` only, reached via the link below.
 */
export function TimelineWidget() {
  const timeline = useTimeline();
  const latestEvent = timeline?.events[0];

  return (
    <WidgetCard
      icon={<Clock className="size-5" aria-hidden="true" />}
      title="Recent Activity"
      subtitle="Your Watchlist, chronologically"
      accent="purple"
      lastUpdated={timeline?.generatedAt}
    >
      {!timeline || timeline.totalEvents === 0 ? (
        <EmptyState
          icon={Clock}
          title="No Timeline activity available."
          description="Activity will appear here once your watched projects have scoreable signals."
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
            <div className="flex flex-col gap-1 rounded-lg border border-radar-light-border bg-radar-light-surface p-2.5 dark:border-white/10 dark:bg-white/[0.03]">
              <span className="text-[10.5px] font-medium text-radar-light-muted dark:text-radar-muted">
                Latest Event
              </span>
              <div className="flex items-center gap-1.5">
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
