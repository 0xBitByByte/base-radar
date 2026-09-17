"use client";

import { ChevronLeft, ChevronRight, Rewind, SkipBack, SkipForward, X } from "lucide-react";

import type { ReplayPosition } from "@/components/wallet/walletReplayController";
import { RelativeTime } from "@/components/shared/RelativeTime";

/**
 * V4-HISTORY-004 (Phases 4-5) — the Replay Viewer + Timeline Navigation.
 * Read-only: every value shown is read DIRECTLY off `position.snapshot`
 * (an already-real, already-persisted `AnalyticsSnapshot`) — no
 * calculation, no `buildWalletAnalytics`/`buildPortfolioIntelligence`
 * call anywhere in this file. See `walletReplayController.ts`'s own doc
 * comment for why navigation is driven entirely by that pure module.
 *
 * The scrubber is a plain controlled `<input type="range">` over the real
 * snapshot index — selecting any point calls `onJumpToIndex` and the new
 * snapshot renders immediately on the next paint. No animation between
 * positions, no autoplay/interval anywhere in this component — exactly
 * the brief's "No autoplay yet."
 */

const USD_FORMAT = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });

function ReplayField({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] font-medium text-radar-light-muted dark:text-radar-muted">{label}</span>
      <span className="truncate text-sm font-semibold text-radar-light-text dark:text-radar-white">{value}</span>
    </div>
  );
}

export function WalletReplayPanel({
  position,
  onFirst,
  onPrevious,
  onNext,
  onLatest,
  onJumpToDate,
  onJumpToIndex,
  onExit,
}: {
  position: ReplayPosition;
  onFirst: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onLatest: () => void;
  onJumpToDate: (date: string) => void;
  onJumpToIndex: (index: number) => void;
  onExit: () => void;
}) {
  const { snapshot, index, total, isFirst, isLatest } = position;

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-radar-primary/30 bg-radar-primary/5 p-4 dark:border-radar-accent/30 dark:bg-radar-accent/5">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-xs font-semibold text-radar-primary dark:text-radar-accent" role="status">
          <Rewind className="size-3.5 shrink-0" aria-hidden="true" />
          Replay Status: Active
        </span>
        <button
          type="button"
          onClick={onExit}
          className="flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-medium text-radar-light-muted outline-none transition-colors hover:bg-radar-light-surface focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:text-radar-muted dark:hover:bg-white/5"
        >
          <X className="size-3.5 shrink-0" aria-hidden="true" />
          Exit Replay
        </button>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
        <ReplayField
          label="Date"
          value={
            <time dateTime={snapshot.timestamp}>
              <RelativeTime iso={snapshot.timestamp} />
            </time>
          }
        />
        <ReplayField label="Snapshot Index" value={`${index} of ${total}`} />
        <ReplayField label="Fingerprint" value={snapshot.fingerprint} />
        <ReplayField label="Health" value={snapshot.healthScore} />
        <ReplayField label="Confidence" value={`${snapshot.confidenceScore}%`} />
        <ReplayField label="Portfolio Value" value={USD_FORMAT.format(snapshot.totalValue)} />
      </div>

      <div className="flex flex-col gap-2">
        <input
          type="range"
          min={1}
          max={total}
          value={index}
          onChange={(e) => onJumpToIndex(Number(e.target.value) - 1)}
          aria-label="Replay timeline"
          className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-radar-light-border accent-radar-primary dark:bg-white/10 dark:accent-radar-accent"
        />

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1" role="group" aria-label="Replay navigation">
            <button
              type="button"
              onClick={onFirst}
              disabled={isFirst}
              aria-label="First snapshot"
              className="flex items-center justify-center rounded-lg p-1.5 text-radar-light-text outline-none transition-colors hover:bg-radar-light-surface focus-visible:ring-2 focus-visible:ring-radar-primary/50 disabled:cursor-not-allowed disabled:opacity-30 dark:text-radar-white dark:hover:bg-white/5"
            >
              <SkipBack className="size-3.5 shrink-0" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={onPrevious}
              disabled={isFirst}
              aria-label="Previous snapshot"
              className="flex items-center justify-center rounded-lg p-1.5 text-radar-light-text outline-none transition-colors hover:bg-radar-light-surface focus-visible:ring-2 focus-visible:ring-radar-primary/50 disabled:cursor-not-allowed disabled:opacity-30 dark:text-radar-white dark:hover:bg-white/5"
            >
              <ChevronLeft className="size-3.5 shrink-0" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={onNext}
              disabled={isLatest}
              aria-label="Next snapshot"
              className="flex items-center justify-center rounded-lg p-1.5 text-radar-light-text outline-none transition-colors hover:bg-radar-light-surface focus-visible:ring-2 focus-visible:ring-radar-primary/50 disabled:cursor-not-allowed disabled:opacity-30 dark:text-radar-white dark:hover:bg-white/5"
            >
              <ChevronRight className="size-3.5 shrink-0" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={onLatest}
              disabled={isLatest}
              aria-label="Jump to latest snapshot"
              className="flex items-center justify-center rounded-lg p-1.5 text-radar-light-text outline-none transition-colors hover:bg-radar-light-surface focus-visible:ring-2 focus-visible:ring-radar-primary/50 disabled:cursor-not-allowed disabled:opacity-30 dark:text-radar-white dark:hover:bg-white/5"
            >
              <SkipForward className="size-3.5 shrink-0" aria-hidden="true" />
            </button>
          </div>

          <label className="flex items-center gap-1.5 text-[11px] font-medium text-radar-light-muted dark:text-radar-muted">
            Jump to date
            <input
              type="date"
              onChange={(e) => {
                if (e.target.value) onJumpToDate(e.target.value);
              }}
              className="rounded-lg border border-radar-light-border bg-radar-light-surface px-2 py-1 text-xs text-radar-light-text outline-none focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:border-white/10 dark:bg-white/5 dark:text-radar-white"
            />
          </label>
        </div>
      </div>
    </div>
  );
}
