"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckSquare, ChevronDown, Clock, GitCompare, History as HistoryIcon, RotateCcw, Sparkles, Square, X } from "lucide-react";

import { cn } from "@/lib/utils";
import type { UseWalletHistoryResult } from "@/lib/hooks/useWalletHistory";
import type { AnalyticsHighlight } from "@/lib/wallet-analytics/types";
import type { AnalyticsSnapshot } from "@/lib/wallet-history/types";
import { GLASS_CARD_SURFACE } from "@/components/ui/glassStyles";
import { EmptyState } from "@/components/ui/EmptyState";
import { RelativeTime } from "@/components/shared/RelativeTime";
import { compareSnapshots, findLatestSnapshot, findPreviousSnapshot } from "@/components/wallet/walletSnapshotCompare";
import { WalletSnapshotCompareView } from "@/components/wallet/WalletSnapshotCompareView";
import { replayFirst, replayJumpToDate, replayLatest, replayNext, replayPrevious, resolveReplayPosition } from "@/components/wallet/walletReplayController";
import { setActiveReplayTimestamp } from "@/components/wallet/walletReplaySession";
import { WalletReplayPanel } from "@/components/wallet/WalletReplayPanel";
import {
  DEFAULT_SNAPSHOT_FILTERS,
  HISTORY_GROUP_LABEL,
  HISTORY_GROUP_ORDER,
  buildHighlightsBySnapshotTimestamp,
  filterAndSortSnapshots,
  getDistinctFingerprints,
  groupSnapshotsByRecency,
  type SnapshotFilterState,
} from "@/components/wallet/walletHistoryFilters";

/**
 * V4-HISTORY-002 / V4-HISTORY-003 / V4-HISTORY-004 — the History Browser:
 * browse real, persisted `AnalyticsSnapshot`s, compare exactly two of
 * them, and (this phase) Replay — step through them read-only. Pure
 * presentation over already-real facts (`useWalletHistory()`'s output)
 * plus already-computed `AnalyticsHighlight[]`, `walletSnapshotCompare.ts`'s
 * pure diff, and `walletReplayController.ts`'s pure navigation (never
 * rerun, never recomputed — see those files' own "never a second engine"
 * doc comments). No trend framing, no interpretation anywhere in this file.
 */

function SectionCard({ title, icon, children, className }: { title: string; icon?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-4 p-6", GLASS_CARD_SURFACE, className)}>
      <div className="flex items-center gap-2">
        {icon}
        <h2 className="text-sm font-semibold text-radar-light-text dark:text-radar-white">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function HistoryFilterControls({
  filters,
  onChange,
  fingerprints,
}: {
  filters: SnapshotFilterState;
  onChange: (filters: SnapshotFilterState) => void;
  fingerprints: string[];
}) {
  const isDefault = JSON.stringify(filters) === JSON.stringify(DEFAULT_SNAPSHOT_FILTERS);

  return (
    <div className="flex flex-col gap-3 border-b border-radar-light-border pb-4 dark:border-white/10">
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-[10.5px] font-medium text-radar-light-muted dark:text-radar-muted">
          Fingerprint
          <select
            value={filters.fingerprint ?? ""}
            onChange={(e) => onChange({ ...filters, fingerprint: e.target.value === "" ? null : e.target.value })}
            className="rounded-lg border border-radar-light-border bg-radar-light-surface px-2 py-1.5 text-xs text-radar-light-text outline-none focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:border-white/10 dark:bg-white/5 dark:text-radar-white"
          >
            <option value="">All</option>
            {fingerprints.map((fp) => (
              <option key={fp} value={fp}>
                {fp}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-[10.5px] font-medium text-radar-light-muted dark:text-radar-muted">
          Health min–max
          <span className="flex items-center gap-1">
            <input
              type="number"
              inputMode="numeric"
              placeholder="0"
              value={filters.healthMin ?? ""}
              onChange={(e) => onChange({ ...filters, healthMin: e.target.value === "" ? null : Number(e.target.value) })}
              className="w-16 rounded-lg border border-radar-light-border bg-radar-light-surface px-2 py-1.5 text-xs text-radar-light-text outline-none focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:border-white/10 dark:bg-white/5 dark:text-radar-white"
            />
            <span className="text-radar-light-muted dark:text-radar-muted">–</span>
            <input
              type="number"
              inputMode="numeric"
              placeholder="100"
              value={filters.healthMax ?? ""}
              onChange={(e) => onChange({ ...filters, healthMax: e.target.value === "" ? null : Number(e.target.value) })}
              className="w-16 rounded-lg border border-radar-light-border bg-radar-light-surface px-2 py-1.5 text-xs text-radar-light-text outline-none focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:border-white/10 dark:bg-white/5 dark:text-radar-white"
            />
          </span>
        </label>

        <label className="flex flex-col gap-1 text-[10.5px] font-medium text-radar-light-muted dark:text-radar-muted">
          Confidence min–max
          <span className="flex items-center gap-1">
            <input
              type="number"
              inputMode="numeric"
              placeholder="0"
              value={filters.confidenceMin ?? ""}
              onChange={(e) => onChange({ ...filters, confidenceMin: e.target.value === "" ? null : Number(e.target.value) })}
              className="w-16 rounded-lg border border-radar-light-border bg-radar-light-surface px-2 py-1.5 text-xs text-radar-light-text outline-none focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:border-white/10 dark:bg-white/5 dark:text-radar-white"
            />
            <span className="text-radar-light-muted dark:text-radar-muted">–</span>
            <input
              type="number"
              inputMode="numeric"
              placeholder="100"
              value={filters.confidenceMax ?? ""}
              onChange={(e) => onChange({ ...filters, confidenceMax: e.target.value === "" ? null : Number(e.target.value) })}
              className="w-16 rounded-lg border border-radar-light-border bg-radar-light-surface px-2 py-1.5 text-xs text-radar-light-text outline-none focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:border-white/10 dark:bg-white/5 dark:text-radar-white"
            />
          </span>
        </label>

        <label className="flex flex-col gap-1 text-[10.5px] font-medium text-radar-light-muted dark:text-radar-muted">
          From
          <input
            type="date"
            value={filters.dateFrom ?? ""}
            onChange={(e) => onChange({ ...filters, dateFrom: e.target.value === "" ? null : e.target.value })}
            className="rounded-lg border border-radar-light-border bg-radar-light-surface px-2 py-1.5 text-xs text-radar-light-text outline-none focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:border-white/10 dark:bg-white/5 dark:text-radar-white"
          />
        </label>
        <label className="flex flex-col gap-1 text-[10.5px] font-medium text-radar-light-muted dark:text-radar-muted">
          To
          <input
            type="date"
            value={filters.dateTo ?? ""}
            onChange={(e) => onChange({ ...filters, dateTo: e.target.value === "" ? null : e.target.value })}
            className="rounded-lg border border-radar-light-border bg-radar-light-surface px-2 py-1.5 text-xs text-radar-light-text outline-none focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:border-white/10 dark:bg-white/5 dark:text-radar-white"
          />
        </label>

        {!isDefault && (
          <button
            type="button"
            onClick={() => onChange(DEFAULT_SNAPSHOT_FILTERS)}
            className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-[11px] font-medium text-radar-light-muted outline-none transition-colors hover:bg-radar-light-surface focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:text-radar-muted dark:hover:bg-white/5"
          >
            <RotateCcw className="size-3 shrink-0" aria-hidden="true" />
            Reset
          </button>
        )}
      </div>

      <div className="flex items-center gap-1.5" role="group" aria-label="Sort order">
        {(["newest", "oldest"] as const).map((order) => (
          <button
            key={order}
            type="button"
            onClick={() => onChange({ ...filters, sortOrder: order })}
            aria-pressed={filters.sortOrder === order}
            className={cn(
              "rounded-full border px-2.5 py-1 text-[11px] font-medium capitalize outline-none transition-colors focus-visible:ring-2 focus-visible:ring-radar-primary/50",
              filters.sortOrder === order
                ? "border-radar-primary bg-radar-primary/10 text-radar-primary dark:border-radar-accent dark:bg-radar-accent/10 dark:text-radar-accent"
                : "border-radar-light-border text-radar-light-muted hover:bg-radar-light-surface dark:border-white/10 dark:text-radar-muted dark:hover:bg-white/5"
            )}
          >
            {order}
          </button>
        ))}
      </div>
    </div>
  );
}

function SnapshotDetail({ snapshot }: { snapshot: AnalyticsSnapshot }) {
  const rows: { label: string; value: string }[] = [
    { label: "Timestamp", value: snapshot.timestamp },
    { label: "Snapshot Version", value: String(snapshot.analyticsVersion) },
    { label: "Overall Score", value: String(snapshot.overallScore) },
    { label: "Risk Score", value: String(snapshot.riskScore) },
    { label: "Diversification Score", value: String(snapshot.diversificationScore) },
    { label: "Pricing Coverage", value: `${snapshot.pricingCoverage}%` },
    { label: "Stablecoin Exposure", value: `${snapshot.stablecoinExposure}%` },
    { label: "ETH Allocation", value: `${snapshot.ethPct}%` },
    { label: "Unknown Assets", value: String(snapshot.unknownAssetCount) },
    { label: "Largest Protocol", value: snapshot.largestProtocolName ?? "—" },
    { label: "Primary Recommendation", value: snapshot.primaryRecommendationId ?? "—" },
    { label: "Top Warning", value: snapshot.topWarningId ?? "—" },
    { label: "Warning Count", value: String(snapshot.warningIds.length) },
    { label: "Top Holdings Captured", value: String(snapshot.topHoldings.length) },
  ];

  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-2 border-t border-radar-light-border px-3 pt-3 pb-1 text-xs sm:grid-cols-3 dark:border-white/10">
      {rows.map((row) => (
        <div key={row.label} className="flex flex-col gap-0.5">
          <span className="text-[10px] font-medium text-radar-light-muted dark:text-radar-muted">{row.label}</span>
          <span className="truncate font-medium text-radar-light-text dark:text-radar-white">{row.value}</span>
        </div>
      ))}
    </div>
  );
}

function SnapshotCard({
  snapshot,
  highlights,
  expanded,
  onToggleExpand,
  compareModeActive,
  isSelectedForCompare,
  selectionFull,
  onToggleSelect,
  hasPrevious,
  isLatest,
  onQuickCompareWithPrevious,
  onQuickCompareWithLatest,
  onReplayFromHere,
}: {
  snapshot: AnalyticsSnapshot;
  highlights: AnalyticsHighlight[];
  expanded: boolean;
  onToggleExpand: () => void;
  compareModeActive: boolean;
  isSelectedForCompare: boolean;
  selectionFull: boolean;
  onToggleSelect: () => void;
  hasPrevious: boolean;
  isLatest: boolean;
  onQuickCompareWithPrevious: () => void;
  onQuickCompareWithLatest: () => void;
  onReplayFromHere: () => void;
}) {
  const SelectIcon = isSelectedForCompare ? CheckSquare : Square;

  return (
    <li className="py-1 first:pt-0 last:pb-0">
      <button
        type="button"
        onClick={compareModeActive ? onToggleSelect : onToggleExpand}
        disabled={compareModeActive && !isSelectedForCompare && selectionFull}
        aria-expanded={compareModeActive ? undefined : expanded}
        aria-pressed={compareModeActive ? isSelectedForCompare : undefined}
        className={cn(
          "flex w-full flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-lg px-2 py-2 text-left text-xs outline-none transition-colors hover:bg-radar-light-surface focus-visible:ring-2 focus-visible:ring-radar-primary/50 disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-white/5",
          compareModeActive && isSelectedForCompare && "bg-radar-primary/10 dark:bg-radar-accent/10"
        )}
      >
        <div className="flex min-w-0 items-center gap-2">
          {compareModeActive ? (
            <SelectIcon className="size-3.5 shrink-0 text-radar-primary dark:text-radar-accent" aria-hidden="true" />
          ) : (
            <ChevronDown className={cn("size-3.5 shrink-0 text-radar-light-muted transition-transform dark:text-radar-muted", expanded && "rotate-180")} aria-hidden="true" />
          )}
          <time dateTime={snapshot.timestamp} className="shrink-0 font-medium text-radar-light-text dark:text-radar-white">
            <RelativeTime iso={snapshot.timestamp} />
          </time>
          {highlights.length > 0 && (
            <span className="flex shrink-0 items-center gap-1 rounded-full border border-radar-purple/30 bg-radar-purple/10 px-1.5 py-0.5 text-[10px] font-medium text-radar-purple">
              <Sparkles className="size-2.5 shrink-0" aria-hidden="true" />
              {highlights[0].title}
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-radar-light-muted dark:text-radar-muted">
          <span>
            Value <span className="font-medium text-radar-light-text dark:text-radar-white">${snapshot.totalValue.toLocaleString()}</span>
          </span>
          <span>
            Health <span className="font-medium text-radar-light-text dark:text-radar-white">{snapshot.healthScore}</span>
          </span>
          <span>
            Confidence <span className="font-medium text-radar-light-text dark:text-radar-white">{snapshot.confidenceScore}%</span>
          </span>
          <span>
            Largest <span className="font-medium text-radar-light-text dark:text-radar-white">{snapshot.largestHoldingSymbol ?? "—"}</span>
          </span>
          <span className="rounded-full border border-radar-light-border bg-radar-light-surface px-2 py-0.5 text-[10.5px] font-medium text-radar-light-text dark:border-white/10 dark:bg-white/5 dark:text-radar-white">
            {snapshot.fingerprint}
          </span>
        </div>
      </button>

      {!compareModeActive && (
        <div className="flex items-center gap-2 px-2 pt-1">
          {hasPrevious && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onQuickCompareWithPrevious();
              }}
              className="flex items-center gap-1 text-[10.5px] font-medium text-radar-light-muted outline-none transition-colors hover:text-radar-primary focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:text-radar-muted dark:hover:text-radar-accent"
            >
              <GitCompare className="size-3 shrink-0" aria-hidden="true" />
              vs Previous
            </button>
          )}
          {!isLatest && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onQuickCompareWithLatest();
              }}
              className="flex items-center gap-1 text-[10.5px] font-medium text-radar-light-muted outline-none transition-colors hover:text-radar-primary focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:text-radar-muted dark:hover:text-radar-accent"
            >
              <GitCompare className="size-3 shrink-0" aria-hidden="true" />
              vs Latest
            </button>
          )}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onReplayFromHere();
            }}
            className="flex items-center gap-1 text-[10.5px] font-medium text-radar-light-muted outline-none transition-colors hover:text-radar-primary focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:text-radar-muted dark:hover:text-radar-accent"
          >
            <HistoryIcon className="size-3 shrink-0" aria-hidden="true" />
            Replay
          </button>
        </div>
      )}

      {!compareModeActive && expanded && <SnapshotDetail snapshot={snapshot} />}
    </li>
  );
}

export function HistoryBrowserSection({ walletHistory, highlights = [], className }: { walletHistory: UseWalletHistoryResult; highlights?: AnalyticsHighlight[]; className?: string }) {
  const [filters, setFilters] = useState<SnapshotFilterState>(DEFAULT_SNAPSHOT_FILTERS);
  const [expandedTimestamp, setExpandedTimestamp] = useState<string | null>(null);
  const [compareModeActive, setCompareModeActive] = useState(false);
  const [compareSelection, setCompareSelection] = useState<AnalyticsSnapshot[]>([]);
  // `isReplaying` is the real gate on Replay mode. `replayTimestamp` alone
  // can't serve that role: `resolveReplayPosition` deliberately treats
  // `null` as "fall back to the latest real snapshot" (useful WITHIN an
  // active session — e.g. a replayed timestamp aging out of the real
  // history cap), which would otherwise make Replay mode active by
  // default on every render, the instant real history exists.
  const [isReplaying, setIsReplaying] = useState(false);
  const [replayTimestamp, setReplayTimestampState] = useState<string | null>(null);

  const fingerprints = useMemo(() => getDistinctFingerprints(walletHistory.history), [walletHistory.history]);
  const filtered = useMemo(() => filterAndSortSnapshots(walletHistory.history, filters), [walletHistory.history, filters]);
  const highlightsByTimestamp = useMemo(() => buildHighlightsBySnapshotTimestamp(highlights), [highlights]);
  const groups = useMemo(() => groupSnapshotsByRecency(filtered, new Date()), [filtered]);
  const latestSnapshot = useMemo(() => findLatestSnapshot(walletHistory.history), [walletHistory.history]);
  const replayPosition = useMemo(
    () => (isReplaying ? resolveReplayPosition(walletHistory.history, replayTimestamp) : null),
    [isReplaying, walletHistory.history, replayTimestamp]
  );

  // V4-HISTORY-004 (Phase 7) — keeps the cross-page "Currently Replaying"
  // indicator (`components/wallet/walletReplaySession.ts`) in sync with
  // this component's own local Replay state, in exactly one place.
  function setReplayTo(timestamp: string | null) {
    setReplayTimestampState(timestamp);
    setActiveReplayTimestamp(timestamp);
  }

  // Leaving the Wallet page (or this section unmounting) while Replay is
  // still active must not leave a stale "Currently Replaying" indicator
  // showing on the Dashboard forever — a real no-op when Replay wasn't
  // active (`setActiveReplayTimestamp` itself skips redundant writes).
  useEffect(() => {
    return () => setActiveReplayTimestamp(null);
  }, []);

  function startReplay(snapshot: AnalyticsSnapshot) {
    setCompareModeActive(false);
    setCompareSelection([]);
    setExpandedTimestamp(null);
    setIsReplaying(true);
    setReplayTo(snapshot.timestamp);
  }

  function exitReplay() {
    setIsReplaying(false);
    setReplayTo(null);
  }

  function enterCompareMode() {
    setCompareModeActive(true);
    setCompareSelection([]);
    setExpandedTimestamp(null);
  }

  function cancelCompare() {
    setCompareModeActive(false);
    setCompareSelection([]);
  }

  function toggleSelectForCompare(snapshot: AnalyticsSnapshot) {
    setCompareSelection((prev) => {
      const alreadyIndex = prev.findIndex((s) => s.timestamp === snapshot.timestamp);
      if (alreadyIndex !== -1) return prev.filter((_, i) => i !== alreadyIndex);
      if (prev.length >= 2) return prev; // V4-HISTORY-003 (Phase 2) — never select more than two
      return [...prev, snapshot];
    });
  }

  function quickCompareWithPrevious(snapshot: AnalyticsSnapshot) {
    const previous = findPreviousSnapshot(walletHistory.history, snapshot);
    if (!previous) return;
    setCompareModeActive(true);
    setCompareSelection([previous, snapshot]); // chronological default: from=previous, to=snapshot
  }

  function quickCompareWithLatest(snapshot: AnalyticsSnapshot) {
    if (!latestSnapshot || latestSnapshot.timestamp === snapshot.timestamp) return;
    const [from, to] = snapshot.timestamp <= latestSnapshot.timestamp ? [snapshot, latestSnapshot] : [latestSnapshot, snapshot];
    setCompareModeActive(true);
    setCompareSelection([from, to]);
  }

  function swapCompareSelection() {
    setCompareSelection((prev) => (prev.length === 2 ? [prev[1], prev[0]] : prev));
  }

  if (walletHistory.isEmpty) {
    return (
      <SectionCard title="History Browser" icon={<Clock className="size-4 text-radar-light-muted dark:text-radar-muted" aria-hidden="true" />} className={className}>
        <EmptyState icon={Clock} title="No snapshots yet." description="Real portfolio snapshots will appear here as they're captured." />
      </SectionCard>
    );
  }

  if (compareSelection.length === 2) {
    return (
      <SectionCard title="Compare Snapshots" icon={<GitCompare className="size-4 text-radar-primary dark:text-radar-accent" aria-hidden="true" />} className={className}>
        <WalletSnapshotCompareView comparison={compareSnapshots(compareSelection[0], compareSelection[1])} onSwap={swapCompareSelection} onCancel={cancelCompare} />
      </SectionCard>
    );
  }

  if (replayPosition) {
    return (
      <SectionCard title="History Browser" icon={<Clock className="size-4 text-radar-light-muted dark:text-radar-muted" aria-hidden="true" />} className={className}>
        <WalletReplayPanel
          position={replayPosition}
          onFirst={() => setReplayTo(replayFirst(walletHistory.history))}
          onPrevious={() => setReplayTo(replayPrevious(walletHistory.history, replayPosition.snapshot.timestamp))}
          onNext={() => setReplayTo(replayNext(walletHistory.history, replayPosition.snapshot.timestamp))}
          onLatest={() => setReplayTo(replayLatest(walletHistory.history))}
          onJumpToDate={(date) => {
            const resolved = replayJumpToDate(walletHistory.history, date);
            if (resolved !== null) setReplayTo(resolved);
          }}
          onJumpToIndex={(index) => {
            const target = walletHistory.history[index];
            if (target) setReplayTo(target.timestamp);
          }}
          onExit={exitReplay}
        />
      </SectionCard>
    );
  }

  return (
    <SectionCard title="History Browser" icon={<Clock className="size-4 text-radar-light-muted dark:text-radar-muted" aria-hidden="true" />} className={className}>
      <div className="flex items-center justify-between gap-2">
        <HistoryFilterControls filters={filters} onChange={setFilters} fingerprints={fingerprints} />
        <div className="flex shrink-0 items-center gap-2 self-start">
          {!compareModeActive && (
            <button
              type="button"
              onClick={() => latestSnapshot && startReplay(latestSnapshot)}
              className="flex items-center gap-1.5 rounded-xl border border-radar-light-border px-3 py-1.5 text-xs font-medium text-radar-light-text outline-none transition-colors hover:bg-radar-light-surface focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:border-white/10 dark:text-radar-white dark:hover:bg-white/5"
            >
              <HistoryIcon className="size-3.5 shrink-0" aria-hidden="true" />
              Replay
            </button>
          )}
          {!compareModeActive ? (
            <button
              type="button"
              onClick={enterCompareMode}
              className="flex items-center gap-1.5 rounded-xl border border-radar-light-border px-3 py-1.5 text-xs font-medium text-radar-light-text outline-none transition-colors hover:bg-radar-light-surface focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:border-white/10 dark:text-radar-white dark:hover:bg-white/5"
            >
              <GitCompare className="size-3.5 shrink-0" aria-hidden="true" />
              Compare
            </button>
          ) : (
            <button
              type="button"
              onClick={cancelCompare}
              className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium text-radar-light-muted outline-none transition-colors hover:bg-radar-light-surface focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:text-radar-muted dark:hover:bg-white/5"
            >
              <X className="size-3.5 shrink-0" aria-hidden="true" />
              Cancel Compare
            </button>
          )}
        </div>
      </div>

      {compareModeActive && (
        <p className="text-xs text-radar-light-muted dark:text-radar-muted" role="status">
          Select {2 - compareSelection.length} more snapshot{2 - compareSelection.length === 1 ? "" : "s"} to compare.
        </p>
      )}

      {filtered.length === 0 ? (
        <p className="py-4 text-center text-xs text-radar-light-muted dark:text-radar-muted">No snapshots match these filters.</p>
      ) : (
        <div className="flex flex-col gap-4">
          {HISTORY_GROUP_ORDER.filter((key) => groups[key].length > 0).map((key) => (
            <div key={key} className="flex flex-col gap-1">
              <span className="text-[10.5px] font-semibold tracking-wide text-radar-light-muted uppercase dark:text-radar-muted">
                {HISTORY_GROUP_LABEL[key]} ({groups[key].length})
              </span>
              <ul className="flex flex-col divide-y divide-radar-light-border dark:divide-white/10">
                {groups[key].map((snapshot) => (
                  <SnapshotCard
                    key={snapshot.timestamp}
                    snapshot={snapshot}
                    highlights={highlightsByTimestamp.get(snapshot.timestamp) ?? []}
                    expanded={expandedTimestamp === snapshot.timestamp}
                    onToggleExpand={() => setExpandedTimestamp((prev) => (prev === snapshot.timestamp ? null : snapshot.timestamp))}
                    compareModeActive={compareModeActive}
                    isSelectedForCompare={compareSelection.some((s) => s.timestamp === snapshot.timestamp)}
                    selectionFull={compareSelection.length >= 2}
                    onToggleSelect={() => toggleSelectForCompare(snapshot)}
                    hasPrevious={findPreviousSnapshot(walletHistory.history, snapshot) !== null}
                    isLatest={latestSnapshot?.timestamp === snapshot.timestamp}
                    onQuickCompareWithPrevious={() => quickCompareWithPrevious(snapshot)}
                    onQuickCompareWithLatest={() => quickCompareWithLatest(snapshot)}
                    onReplayFromHere={() => startReplay(snapshot)}
                  />
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  );
}
