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
import { RelativeTime } from "@/components/shared/RelativeTime";
import { EmptyState } from "@/components/ui/EmptyState";
import type { TimelineEvent, TimelineEventKind } from "@/lib/intelligence/timeline";

type ProfileTimelineProps = {
  events: TimelineEvent[];
};

const DATE_GROUP_KEYS = ["today", "yesterday", "earlier"] as const;
type DateGroupKey = (typeof DATE_GROUP_KEYS)[number];
const DATE_GROUP_LABEL: Record<DateGroupKey, string> = { today: "Today", yesterday: "Yesterday", earlier: "Earlier" };

const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;

/** PR-083 — the 5 real `TimelineEventKind`s this activity summary strip counts; every other kind (`whale`, `signal`, `tvl-change`, `registry-update`, `discovery`) isn't part of this summary but stays fully visible in the timeline rows below. */
const ACTIVITY_SUMMARY_KINDS: { label: string; kind: TimelineEventKind }[] = [
  { label: "Governance", kind: "governance" },
  { label: "Transfers", kind: "transfer" },
  { label: "Releases", kind: "release" },
  { label: "Alerts", kind: "risk-alert" },
  { label: "Commits", kind: "commit-activity" },
];

/** PR-082 — splits the (already newest-first) event list at the 90-day mark, so the default view only ever shows recent activity; anything older is real data, just tucked behind the "Show more" disclosure below rather than dropped. */
function splitByRecency(events: TimelineEvent[]): { recent: TimelineEvent[]; older: TimelineEvent[] } {
  const cutoff = Date.now() - NINETY_DAYS_MS;
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
    <li
      className="flex items-center gap-2 rounded-lg border border-radar-light-border bg-radar-light-surface px-2.5 py-1.5 dark:border-white/10 dark:bg-white/[0.02]"
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
          <span className="font-semibold tracking-wide text-radar-light-muted/80 uppercase dark:text-radar-muted/70">Last 90 Days</span>
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
        <p className="text-xs text-radar-light-muted dark:text-radar-muted">No activity in the last 90 days.</p>
      )}
      {older.length > 0 && (
        <details className="group">
          <summary className="w-fit cursor-pointer list-none text-[10.5px] font-medium text-radar-light-muted underline decoration-dotted underline-offset-2 outline-none select-none hover:text-radar-light-text focus-visible:text-radar-light-text dark:text-radar-muted dark:hover:text-radar-white dark:focus-visible:text-radar-white [&::-webkit-details-marker]:hidden">
            Show {older.length} earlier event{older.length === 1 ? "" : "s"} (90+ days ago)
          </summary>
          <ul className="mt-1.5 flex flex-col gap-1">
            {older.map((event) => (
              <TimelineEventRow key={event.id} event={event} />
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}
