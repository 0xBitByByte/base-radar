import {
  AlertTriangle,
  ArrowRightLeft,
  Compass,
  Fish,
  GitCommit,
  History,
  Landmark,
  Radio,
  RefreshCw,
  Rocket,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";

import { QuickViewSectionLabel } from "@/components/explorer/QuickViewSectionLabel";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatRelativeTime } from "@/lib/data/format";
import type { TimelineEvent, TimelineEventKind } from "@/lib/intelligence/timeline";

type ProfileTimelineProps = {
  events: TimelineEvent[];
};

const DATE_GROUP_KEYS = ["today", "yesterday", "earlier"] as const;
type DateGroupKey = (typeof DATE_GROUP_KEYS)[number];
const DATE_GROUP_LABEL: Record<DateGroupKey, string> = { today: "Today", yesterday: "Yesterday", earlier: "Earlier" };

/** Same Today/Yesterday/Earlier convention the Dashboard's own Timeline uses (`components/timeline/grouping.ts`) — reimplemented locally rather than imported, since that helper is typed to a different, unrelated `TimelineEvent` shape (`lib/timeline/types`, the Watchlist-wide feed) from this one (`lib/intelligence/timeline`, this single project's feed). */
function groupByDate(events: TimelineEvent[]): Record<DateGroupKey, TimelineEvent[]> {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfYesterday.getDate() - 1);

  const groups: Record<DateGroupKey, TimelineEvent[]> = { today: [], yesterday: [], earlier: [] };
  for (const event of events) {
    const eventDate = new Date(event.timestamp);
    if (eventDate >= startOfToday) groups.today.push(event);
    else if (eventDate >= startOfYesterday) groups.yesterday.push(event);
    else groups.earlier.push(event);
  }
  return groups;
}

/** Same iconography already used for these concepts elsewhere (`AIIntelligencePreview.tsx`'s Whale Alert/Governance Vote tiles), so a whale event reads the same wherever it appears. */
const KIND_ICON: Record<TimelineEventKind, LucideIcon> = {
  release: Rocket,
  whale: Fish,
  governance: Landmark,
  signal: Radio,
  "commit-activity": GitCommit,
  "tvl-change": TrendingUp,
  "risk-alert": AlertTriangle,
  transfer: ArrowRightLeft,
  "registry-update": RefreshCw,
  discovery: Compass,
};

/**
 * PR13.6 Goal 16 — a real, honest Category + Source label per event kind,
 * so every row answers "what kind of thing is this and who reported it,"
 * not just "what happened." Both are derived straight from `buildProjectTimeline`'s
 * already-real `kind` (`lib/intelligence/timeline.ts`) — never a fabricated
 * grouping beyond what this codebase's real event kinds actually are.
 */
const KIND_CATEGORY: Record<TimelineEventKind, string> = {
  release: "GitHub",
  "commit-activity": "GitHub",
  governance: "Governance",
  whale: "Treasury",
  transfer: "Treasury",
  "tvl-change": "Treasury",
  "risk-alert": "Risk",
  signal: "Signal",
  "registry-update": "Registry",
  discovery: "Discovery",
};

const KIND_SOURCE: Record<TimelineEventKind, string> = {
  release: "GitHub",
  "commit-activity": "GitHub",
  governance: "Snapshot",
  whale: "Blockscout",
  transfer: "Blockscout",
  "tvl-change": "DefiLlama",
  "risk-alert": "Base Radar",
  signal: "Base Radar",
  "registry-update": "Base Radar Registry",
  discovery: "Base Radar Discovery",
};

function TimelineEventRow({ event }: { event: TimelineEvent }) {
  const Icon = KIND_ICON[event.kind];
  return (
    <li className="flex items-start gap-3 rounded-xl border border-radar-light-border bg-radar-light-surface p-3 dark:border-white/10 dark:bg-white/[0.02]">
      <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-radar-primary/10 text-radar-primary dark:text-radar-accent">
        <Icon className="size-3.5" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <p className="truncate text-xs font-medium text-radar-light-text dark:text-radar-white">{event.title}</p>
          <span className="shrink-0 rounded-md bg-radar-light-border/60 px-1.5 py-0.5 text-[9.5px] font-medium tracking-wide text-radar-light-muted uppercase dark:bg-white/5 dark:text-radar-muted">
            {KIND_CATEGORY[event.kind]}
          </span>
        </div>
        {event.detail && (
          <p className="truncate text-[11px] text-radar-light-muted dark:text-radar-muted">{event.detail}</p>
        )}
        <p className="text-[10px] text-radar-light-muted/70 dark:text-radar-muted/60">Source: {KIND_SOURCE[event.kind]}</p>
      </div>
      <span className="shrink-0 text-[11px] text-radar-light-muted dark:text-radar-muted">
        {formatRelativeTime(event.timestamp)}
      </span>
    </li>
  );
}

/**
 * Timeline — PR11 Part 9. Purely presentational; `buildProjectTimeline()`
 * (`lib/intelligence/timeline.ts`) already merged, de-duplicated, and
 * sorted the events newest-first — this component only renders the result.
 * PR-050 Req 6 — grouped into Today/Yesterday/Earlier (same convention as
 * the Dashboard's own Timeline), so a long history scans as distinct days
 * instead of one undifferentiated list.
 */
export function ProfileTimeline({ events }: ProfileTimelineProps) {
  if (events.length === 0) {
    return (
      <section id="timeline" className="scroll-mt-28 flex flex-col gap-2">
        <QuickViewSectionLabel>Timeline</QuickViewSectionLabel>
        <EmptyState
          icon={History}
          title="Recent project activity has not yet been detected"
          description="No releases, commits, whale transfers, governance proposals, TVL swings, registry updates, discovery events, or risk alerts have been recorded for this project in the tracked window. Future updates may include new releases, governance proposals, whale transfers, and TVL changes as they're detected."
          className="bg-radar-light-surface/60 dark:bg-white/[0.02]"
        />
      </section>
    );
  }

  const groups = groupByDate(events);

  return (
    <section id="timeline" className="scroll-mt-28 flex flex-col gap-4">
      <QuickViewSectionLabel>Timeline</QuickViewSectionLabel>
      {DATE_GROUP_KEYS.map((key) => {
        const groupEvents = groups[key];
        if (groupEvents.length === 0) return null;
        return (
          <div key={key} className="flex flex-col gap-2">
            <h3 className="text-[10.5px] font-semibold tracking-wide text-radar-light-muted uppercase dark:text-radar-muted/70">
              {DATE_GROUP_LABEL[key]}
            </h3>
            <ul className="flex flex-col gap-2">
              {groupEvents.map((event) => (
                <TimelineEventRow key={event.id} event={event} />
              ))}
            </ul>
          </div>
        );
      })}
    </section>
  );
}
