import { AlertTriangle, ArrowRightLeft, Fish, GitCommit, History, Landmark, Radio, Rocket, TrendingUp, type LucideIcon } from "lucide-react";

import { QuickViewSectionLabel } from "@/components/explorer/QuickViewSectionLabel";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatRelativeTime } from "@/lib/data/format";
import type { TimelineEvent, TimelineEventKind } from "@/lib/intelligence/timeline";

type ProfileTimelineProps = {
  events: TimelineEvent[];
};

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
};

/**
 * Timeline — PR11 Part 9. Purely presentational; `buildProjectTimeline()`
 * (`lib/intelligence/timeline.ts`) already merged, de-duplicated, and
 * sorted the events newest-first — this component only renders the result.
 */
export function ProfileTimeline({ events }: ProfileTimelineProps) {
  if (events.length === 0) {
    return (
      <section id="timeline" className="scroll-mt-28 flex flex-col gap-2">
        <QuickViewSectionLabel>Timeline</QuickViewSectionLabel>
        <EmptyState
          icon={History}
          title="No recent activity"
          description="No releases, commits, whale transfers, governance, TVL swings, risk alerts, or signals have been recorded yet for this project. Token unlocks and exchange listings aren't tracked by any connected provider yet."
          className="bg-radar-light-surface/60 dark:bg-white/[0.02]"
        />
      </section>
    );
  }

  return (
    <section id="timeline" className="scroll-mt-28 flex flex-col gap-2">
      <QuickViewSectionLabel>Timeline</QuickViewSectionLabel>
      <ul className="flex flex-col gap-2">
        {events.map((event) => {
          const Icon = KIND_ICON[event.kind];
          return (
            <li
              key={event.id}
              className="flex items-start gap-3 rounded-xl border border-radar-light-border bg-radar-light-surface p-3 dark:border-white/10 dark:bg-white/[0.02]"
            >
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
        })}
      </ul>
    </section>
  );
}
