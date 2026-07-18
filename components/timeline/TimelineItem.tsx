import Link from "next/link";

import { NarrativeBadge } from "@/components/alerts/NarrativeBadge";
import { SeverityBadge } from "@/components/alerts/SeverityBadge";
import { TimelineEventBadge } from "@/components/timeline/TimelineEventBadge";
import { formatRelativeTime } from "@/lib/data/format";
import type { TimelineEvent } from "@/lib/timeline/types";

type TimelineItemProps = {
  event: TimelineEvent;
};

/**
 * One Timeline entry. `event.link` is already a real, precomputed route
 * (a Project Profile for project-scoped events, `/dashboard/brief` or
 * `/dashboard/portfolio` for roll-up events, or `null` when there's
 * nowhere more specific to send the reader) — this component never
 * derives a link itself, so an aggregate event with no real destination
 * simply renders without the stretched-link wrapper, never a broken one.
 */
export function TimelineItem({ event }: TimelineItemProps) {
  return (
    <li className="group relative flex flex-col gap-1.5 rounded-xl border border-radar-light-border bg-radar-light-card p-4 transition-colors hover:bg-radar-light-surface dark:border-white/10 dark:bg-white/[0.02] dark:hover:bg-white/[0.05]">
      {event.link && (
        <Link
          href={event.link}
          aria-label={`${event.title}${event.projectName ? `. View ${event.projectName}'s Project Profile.` : ". View details."}`}
          className="absolute inset-0 z-0 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-radar-primary/50"
        />
      )}

      <div className="relative z-[1] flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
          <TimelineEventBadge eventType={event.eventType} />
          {event.projectName && (
            <span className="max-w-[160px] truncate text-[10.5px] font-medium text-radar-light-text dark:text-radar-white">
              {event.projectName}
            </span>
          )}
          {event.severity && <SeverityBadge severity={event.severity} />}
          {event.narrative && <NarrativeBadge narrative={event.narrative} />}
        </div>
        <time
          dateTime={event.timestamp}
          className="shrink-0 text-[10.5px] whitespace-nowrap text-radar-light-muted dark:text-radar-muted"
        >
          {formatRelativeTime(event.timestamp)}
        </time>
      </div>

      <div className="relative z-[1] flex flex-col gap-1">
        <p className="line-clamp-1 text-sm font-semibold text-radar-light-text dark:text-radar-white">{event.title}</p>
        <p className="line-clamp-2 text-xs leading-relaxed text-radar-light-muted dark:text-radar-muted">
          {event.summary}
        </p>
      </div>

      <div className="relative z-[1] flex flex-wrap items-center justify-between gap-2">
        <span className="text-[10.5px] text-radar-light-muted dark:text-radar-muted">via {event.source}</span>
        {(event.confidence !== null || event.score !== null) && (
          <div className="flex items-center gap-3 text-[10.5px] text-radar-light-muted dark:text-radar-muted">
            {event.confidence !== null && <span>{event.confidence}% confidence</span>}
            {event.score !== null && <span>Score {event.score}</span>}
          </div>
        )}
      </div>
    </li>
  );
}
