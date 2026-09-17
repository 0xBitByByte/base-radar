"use client";

import { ArrowLeftRight, X } from "lucide-react";

import { cn } from "@/lib/utils";
import type { SnapshotComparison } from "@/components/wallet/walletSnapshotCompare";
import { RelativeTime } from "@/components/shared/RelativeTime";

/**
 * V4-HISTORY-003 (Phases 4-5) — pure presentation over an already-computed
 * `SnapshotComparison` (`walletSnapshotCompare.ts`'s `compareSnapshots()`,
 * called exactly once by the caller — never recomputed here). Facts only:
 * no generated explanations, no "why" narrative — the same restraint every
 * other History UI surface already exercises.
 */

function DifferenceSummary({ comparison }: { comparison: SnapshotComparison }) {
  const changed = comparison.fields.filter((f) => f.changed);

  if (changed.length === 0) {
    return <p className="text-xs text-radar-light-muted dark:text-radar-muted">These two snapshots are identical across every compared field.</p>;
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {changed.map((field) => (
        <span
          key={field.key}
          className="rounded-full border border-radar-light-border bg-radar-light-surface px-2.5 py-1 text-[11px] font-medium text-radar-light-text dark:border-white/10 dark:bg-white/5 dark:text-radar-white"
        >
          {field.label} <span className="text-radar-light-muted dark:text-radar-muted">{field.summary}</span>
        </span>
      ))}
    </div>
  );
}

export function WalletSnapshotCompareView({ comparison, onSwap, onCancel, className }: { comparison: SnapshotComparison; onSwap: () => void; onCancel: () => void; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2 text-xs text-radar-light-muted dark:text-radar-muted">
          <time dateTime={comparison.from.timestamp} className="font-medium text-radar-light-text dark:text-radar-white">
            <RelativeTime iso={comparison.from.timestamp} />
          </time>
          <span aria-hidden="true">→</span>
          <time dateTime={comparison.to.timestamp} className="font-medium text-radar-light-text dark:text-radar-white">
            <RelativeTime iso={comparison.to.timestamp} />
          </time>
          <span>
            ({Math.abs(comparison.timeSpanDays)} day{Math.abs(comparison.timeSpanDays) === 1 ? "" : "s"} apart, {comparison.changedCount} field{comparison.changedCount === 1 ? "" : "s"} changed)
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onSwap}
            className="flex items-center gap-1.5 rounded-xl border border-radar-light-border px-3 py-1.5 text-xs font-medium text-radar-light-text outline-none transition-colors hover:bg-radar-light-surface focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:border-white/10 dark:text-radar-white dark:hover:bg-white/5"
          >
            <ArrowLeftRight className="size-3.5 shrink-0" aria-hidden="true" />
            Swap Snapshots
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium text-radar-light-muted outline-none transition-colors hover:bg-radar-light-surface focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:text-radar-muted dark:hover:bg-white/5"
          >
            <X className="size-3.5 shrink-0" aria-hidden="true" />
            Cancel Compare
          </button>
        </div>
      </div>

      <DifferenceSummary comparison={comparison} />

      <div className="flex flex-col gap-1 rounded-xl border border-radar-light-border dark:border-white/10">
        <div className="grid grid-cols-[1fr_1fr_1fr] gap-2 border-b border-radar-light-border px-3 py-2 text-[10.5px] font-semibold tracking-wide text-radar-light-muted uppercase dark:border-white/10 dark:text-radar-muted">
          <span>Field</span>
          <span>Old</span>
          <span>New</span>
        </div>
        {comparison.fields.map((field) => (
          <div
            key={field.key}
            className={cn(
              "grid grid-cols-[1fr_1fr_1fr] items-center gap-2 px-3 py-2 text-xs",
              field.changed ? "bg-radar-primary/5 dark:bg-radar-accent/10" : "text-radar-light-muted/70 dark:text-radar-muted/70"
            )}
          >
            <span className={cn("font-medium", field.changed ? "text-radar-light-text dark:text-radar-white" : undefined)}>{field.label}</span>
            <span>{field.oldValue ?? "—"}</span>
            <span className={cn(field.changed && "font-semibold text-radar-light-text dark:text-radar-white")}>
              {field.newValue ?? "—"}
              {field.changed && <span className="ml-1.5 text-[10.5px] font-medium text-radar-primary dark:text-radar-accent">{field.summary}</span>}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
