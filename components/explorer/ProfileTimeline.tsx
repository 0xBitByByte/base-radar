"use client";

import { useState } from "react";
import {
  AlertTriangle,
  ArrowRightLeft,
  ChevronDown,
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
import { RelativeTime } from "@/components/shared/RelativeTime";
import { EmptyState } from "@/components/ui/EmptyState";
import { cn } from "@/lib/utils";
import type { TimelineEvent, TimelineEventKind } from "@/lib/intelligence/timeline";

type ProfileTimelineProps = {
  events: TimelineEvent[];
};

const DATE_GROUP_KEYS = ["today", "yesterday", "earlier"] as const;
type DateGroupKey = (typeof DATE_GROUP_KEYS)[number];
const DATE_GROUP_LABEL: Record<DateGroupKey, string> = { today: "Today", yesterday: "Yesterday", earlier: "Earlier" };

// PR-085.xx executive usability pass — narrowed from 90 to 15 days: every
// event beyond that stays real, undropped data (still fully reachable via
// "Show Earlier Events" below), only the *default* view narrows to what an
// executive actually needs to scan first. No API/data change — this only
// moves where the client-side split falls on the exact same, already-real
// `events` array `buildProjectTimeline()` already produced.
const RECENT_WINDOW_MS = 15 * 24 * 60 * 60 * 1000;

/** PR-083 — the 5 real `TimelineEventKind`s this activity summary strip counts; every other kind (`whale`, `signal`, `tvl-change`, `registry-update`, `discovery`) isn't part of this summary but stays fully visible in the timeline rows below. */
const ACTIVITY_SUMMARY_KINDS: { label: string; kind: TimelineEventKind }[] = [
  { label: "Governance", kind: "governance" },
  { label: "Transfers", kind: "transfer" },
  { label: "Releases", kind: "release" },
  { label: "Alerts", kind: "risk-alert" },
  { label: "Commits", kind: "commit-activity" },
];

/** PR-082, narrowed by PR-085.xx to 15 days — splits the (already newest-first) event list at the recency cutoff, so the default view only ever shows the most immediately relevant activity; anything older is real data, just tucked behind the "Show Earlier Events" disclosure below rather than dropped. */
function splitByRecency(events: TimelineEvent[]): { recent: TimelineEvent[]; older: TimelineEvent[] } {
  const cutoff = Date.now() - RECENT_WINDOW_MS;
  const recent: TimelineEvent[] = [];
  const older: TimelineEvent[] = [];
  for (const event of events) {
    if (new Date(event.timestamp).getTime() >= cutoff) recent.push(event);
    else older.push(event);
  }
  return { recent, older };
}

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

/**
 * PR-074 REVIEW #8 — was 3 stacked text lines per row; folded "Source" onto
 * the same line as `detail` instead of reserving its own row.
 *
 * PR-074 FINAL POLISH — still two lines per row proved too tall for a feed
 * meant to scan like a ticker ("rows consume too much height... a user
 * should be able to scan many events quickly"). Collapsed to one line: icon,
 * title, detail, and source all run together in a single truncating flex
 * row (detail/source demoted to a muted inline suffix rather than a second
 * line), with the category badge and timestamp right-aligned. Nothing is
 * removed — `detail` and `source` are still real text in the DOM, just laid
 * out horizontally instead of stacked, and the full untruncated line is
 * still available via the native `title` tooltip on hover.
 */
function TimelineEventRow({ event }: { event: TimelineEvent }) {
  const Icon = KIND_ICON[event.kind];
  const detailSuffix = event.detail ? ` — ${event.detail}` : "";
  return (
    // PR-086 — "Timeline Cards" named in this pass's shared motion-language
    // requirement, but deliberately a lighter touch than the lift+shadow
    // treatment `PairCard`/`ScorecardCardView`/Trust tiles use: this is a
    // dense, repeated ticker row (see this file's own PR-074 doc comment on
    // why it was compacted to one line), and a full lift on every row in a
    // long list would read as visual noise, not "subtle." Same color/
    // duration language, scaled to a border+background brighten only.
    <li
      className="flex items-center gap-2 rounded-lg border border-radar-light-border bg-radar-light-surface px-2.5 py-1.5 transition-colors duration-300 hover:border-radar-primary/30 hover:bg-radar-light-card dark:border-white/10 dark:bg-white/[0.02] dark:hover:border-radar-border-hover dark:hover:bg-white/[0.04]"
      title={`${event.title}${detailSuffix} · Source: ${KIND_SOURCE[event.kind]}`}
    >
      <span className="flex size-5 shrink-0 items-center justify-center rounded-md bg-radar-primary/10 text-radar-primary dark:text-radar-accent">
        <Icon className="size-3" aria-hidden="true" />
      </span>
      <p className="min-w-0 flex-1 truncate text-xs text-radar-light-text dark:text-radar-white">
        <span className="font-medium">{event.title}</span>
        <span className="text-radar-light-muted dark:text-radar-muted">{detailSuffix}</span>
      </p>
      <span className="hidden shrink-0 text-[10px] text-radar-light-muted/80 sm:inline dark:text-radar-muted/70">
        {KIND_SOURCE[event.kind]}
      </span>
      <span className="hidden shrink-0 rounded-md bg-radar-light-border/60 px-1.5 py-0.5 text-[9.5px] font-medium tracking-wide text-radar-light-muted uppercase sm:inline dark:bg-white/5 dark:text-radar-muted">
        {KIND_CATEGORY[event.kind]}
      </span>
      <span className="shrink-0 text-[10.5px] text-radar-light-muted dark:text-radar-muted">
        <RelativeTime iso={event.timestamp} />
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
  // PR-085.xx — "remember expanded state" means for the lifetime of this
  // page view: this is server-rendered HTML with no backing API for
  // per-user UI preferences (explicitly out of scope — "no API changes"),
  // so plain component state is the correct, honest scope. It doesn't
  // reset while the section streams in or re-renders, which is the only
  // "remembering" a client component can promise without a new persistence
  // layer this pass isn't adding.
  const [expanded, setExpanded] = useState(false);

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

  const { recent, older } = splitByRecency(events);
  const groups = groupByDate(recent);

  // PR-083 — a tiny muted counts strip above the day groups, purely computed
  // from `recent` (already in hand, zero new fetch). Only kinds with a
  // non-zero count render — an explicit "0" isn't wrong, but this tile's
  // established style only ever shows what's actually there.
  const activitySummary = ACTIVITY_SUMMARY_KINDS.map(({ label, kind }) => ({
    label,
    count: recent.filter((event) => event.kind === kind).length,
  })).filter((item) => item.count > 0);

  return (
    <section id="timeline" className="scroll-mt-28 flex flex-col gap-3">
      <QuickViewSectionLabel>Timeline</QuickViewSectionLabel>
      {activitySummary.length > 0 && (
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10.5px] text-radar-light-muted dark:text-radar-muted">
          <span className="font-semibold tracking-wide text-radar-light-muted/80 uppercase dark:text-radar-muted/70">Last 15 Days</span>
          {activitySummary.map((item) => (
            <span key={item.label}>
              <span className="font-semibold tabular-nums text-radar-light-text dark:text-radar-white">{item.count}</span> {item.label}
            </span>
          ))}
        </p>
      )}
      {DATE_GROUP_KEYS.map((key) => {
        const groupEvents = groups[key];
        if (groupEvents.length === 0) return null;
        return (
          <div key={key} className="flex flex-col gap-1.5">
            <h3 className="text-[10.5px] font-semibold tracking-wide text-radar-light-muted uppercase dark:text-radar-muted/70">
              {DATE_GROUP_LABEL[key]}
            </h3>
            <ul className="flex flex-col gap-1">
              {groupEvents.map((event) => (
                <TimelineEventRow key={event.id} event={event} />
              ))}
            </ul>
          </div>
        );
      })}
      {recent.length === 0 && older.length > 0 && (
        <p className="text-xs text-radar-light-muted dark:text-radar-muted">No activity in the last 15 days.</p>
      )}
      {older.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            aria-expanded={expanded}
            className="flex w-fit items-center gap-1 text-[10.5px] font-medium text-radar-light-muted outline-none transition-colors hover:text-radar-light-text focus-visible:text-radar-light-text dark:text-radar-muted dark:hover:text-radar-white dark:focus-visible:text-radar-white"
          >
            <ChevronDown className={cn("size-3 shrink-0 transition-transform duration-200", expanded && "rotate-180")} aria-hidden="true" />
            {expanded ? "Hide Earlier Events" : `Show Earlier Events (${older.length})`}
          </button>
          {/* PR-085.xx — the `grid-rows-[0fr]`/`grid-rows-[1fr]` technique:
              a real, animatable height transition with no JS-measured
              pixel value and no fixed `max-height` guess to get wrong for
              a long history. `overflow-hidden` on the inner wrapper clips
              the content while its row track is still animating open. */}
          <div className={cn("grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none", expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]")}>
            <ul className="flex flex-col gap-1 overflow-hidden">
              {older.map((event) => (
                <TimelineEventRow key={event.id} event={event} />
              ))}
            </ul>
          </div>
        </div>
      )}
    </section>
  );
}
