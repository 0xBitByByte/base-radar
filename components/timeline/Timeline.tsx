"use client";

import { useMemo, useState } from "react";
import { Gauge, ListChecks } from "lucide-react";

import { filterTimelineEvents, sortTimelineEvents, TIMELINE_SORTS, type TimelineSort } from "@/components/timeline/filters";
import { groupTimelineEvents, TIMELINE_GROUP_KEYS, TIMELINE_GROUP_LABEL } from "@/components/timeline/grouping";
import { TimelineFilters } from "@/components/timeline/TimelineFilters";
import { TimelineGroup } from "@/components/timeline/TimelineGroup";
import { TimelineItem } from "@/components/timeline/TimelineItem";
import { TimelineMetric } from "@/components/timeline/TimelineMetric";
import { TimelineSection } from "@/components/timeline/TimelineSection";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatRelativeTime } from "@/lib/data/format";
import { usePersonalizedDashboard } from "@/lib/hooks/usePersonalizedDashboard";
import { capitalize } from "@/lib/timeline/summary";
import type { TimelineEventType } from "@/lib/timeline/types";

const DEFAULT_EVENT_TYPE_FILTER: TimelineEventType | "all" = "all";
const DEFAULT_SORT: TimelineSort = TIMELINE_SORTS[0];

/**
 * The dedicated Intelligence Timeline experience
 * (`app/dashboard/timeline/page.tsx`). Everything renders from
 * `usePersonalizedDashboard()` — no fetching, no rebuilding, never reading
 * Intelligence Alerts or providers directly. Search/event-type filter/sort
 * are pure, component-local UI state; none of them ever trigger a Timeline
 * rebuild — `filterTimelineEvents`/`sortTimelineEvents` (from `./filters`)
 * only ever narrow or reorder `timelineEvents`, which is itself already
 * scoped to the active watchlist (PR22 Part 2) before this component ever
 * sees it. Date-group headings (Today/Yesterday/Earlier) are omitted
 * entirely when that group has zero events. Metric tiles (Total Events,
 * Highest Severity, etc.) stay read off the raw, un-filtered `timeline` —
 * consistent with this component's own pre-existing precedent of never
 * recomputing aggregate fields for a locally-filtered subset.
 */
export function Timeline() {
  const { timeline, timelineEvents, isPersonalized, activeWatchlist } = usePersonalizedDashboard();
  const [search, setSearch] = useState("");
  const [eventTypeFilter, setEventTypeFilter] = useState<TimelineEventType | "all">(DEFAULT_EVENT_TYPE_FILTER);
  const [sort, setSort] = useState<TimelineSort>(DEFAULT_SORT);

  const normalizedQuery = search.trim().toLowerCase();

  const projectsAffected = useMemo(() => {
    if (!timeline) return 0;
    const projectIds = new Set(
      timeline.events.map((event) => event.projectId).filter((projectId): projectId is string => projectId !== null)
    );
    return projectIds.size;
  }, [timeline]);

  const filteredEvents = useMemo(() => {
    const searched = filterTimelineEvents(timelineEvents, normalizedQuery);
    const byType = eventTypeFilter === "all" ? searched : searched.filter((event) => event.eventType === eventTypeFilter);
    return sortTimelineEvents(byType, sort);
  }, [timelineEvents, normalizedQuery, eventTypeFilter, sort]);

  const groups = useMemo(() => groupTimelineEvents(filteredEvents), [filteredEvents]);

  if (!timeline || timeline.totalEvents === 0) {
    return <EmptyState icon={ListChecks} title="No Timeline activity available." className="py-16" />;
  }

  if (isPersonalized && timelineEvents.length === 0) {
    return (
      <EmptyState
        icon={ListChecks}
        title="No Timeline events for this watchlist."
        description={`None of the projects in "${activeWatchlist?.name}" have Timeline activity yet.`}
        className="py-16"
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h1 className="text-xl font-semibold text-radar-light-text dark:text-radar-white">{timeline.headline}</h1>
          <span className="text-[10.5px] whitespace-nowrap text-radar-light-muted dark:text-radar-muted">
            Generated {formatRelativeTime(timeline.generatedAt)}
          </span>
        </div>
        <p className="text-sm leading-relaxed text-radar-light-muted dark:text-radar-muted">{timeline.summary}</p>
      </div>

      <TimelineSection id="metrics" title="Metrics" icon={Gauge}>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 rounded-xl border border-radar-light-border bg-radar-light-card p-4 dark:border-white/10 dark:bg-white/[0.02]">
          <TimelineMetric label="Total Events" value={timeline.totalEvents} />
          <TimelineMetric
            label="Highest Severity"
            value={timeline.highestSeverity ? capitalize(timeline.highestSeverity) : "None"}
          />
          <TimelineMetric label="Average Confidence" value={`${timeline.averageConfidence}%`} />
          <TimelineMetric label="Average Score" value={timeline.averageScore} />
          <TimelineMetric label="Projects Affected" value={projectsAffected} />
        </div>
      </TimelineSection>

      <TimelineFilters
        search={search}
        onSearchChange={setSearch}
        eventType={eventTypeFilter}
        onEventTypeChange={setEventTypeFilter}
        sort={sort}
        onSortChange={setSort}
      />

      {filteredEvents.length === 0 ? (
        <EmptyState
          icon={ListChecks}
          title={normalizedQuery !== "" ? "No results match your search." : "No content matches the selected filter."}
          className="py-16"
        />
      ) : (
        TIMELINE_GROUP_KEYS.map(
          (key) =>
            groups[key].length > 0 && (
              <TimelineGroup key={key} id={key} title={TIMELINE_GROUP_LABEL[key]}>
                {groups[key].map((event) => (
                  <TimelineItem key={event.id} event={event} />
                ))}
              </TimelineGroup>
            )
        )
      )}
    </div>
  );
}
