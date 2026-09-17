"use client";

import { useState } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { AlertTriangle, BarChart3, BookOpen, Calendar, Clock, Database, Download, Eye, History, Trash2 } from "lucide-react";

import { cn } from "@/lib/utils";
import type { UseWalletHistoryResult } from "@/lib/hooks/useWalletHistory";
import type { AnalyticsHighlight, WalletAnalytics } from "@/lib/wallet-analytics/types";
import type { MonthlyDigest } from "@/lib/monthly-digest/types";
import type { PortfolioStory } from "@/lib/portfolio-story/types";
import type { PortfolioAI } from "@/lib/portfolio-ai/types";
import type { PortfolioIntelligence } from "@/lib/portfolio-intelligence/types";
import type { CrossFeatureIntelligence } from "@/lib/cross-feature/types";
import { GLASS_CARD_SURFACE } from "@/components/ui/glassStyles";
import { EmptyState } from "@/components/ui/EmptyState";
import { GlowBadge } from "@/components/ui/GlowBadge";
import { RelativeTime } from "@/components/shared/RelativeTime";
import { HistoryBrowserSection } from "@/components/wallet/WalletHistoryBrowser";
import { WalletReportView } from "@/components/wallet/WalletReportView";
import { WalletMonthlyDigestView } from "@/components/wallet/WalletMonthlyDigestView";
import { WalletPortfolioStoryView } from "@/components/wallet/WalletPortfolioStoryView";

/**
 * V4-HISTORY-001 (Phases 7-8) — the Wallet page's History UI. Pure
 * presentation over `useWalletHistory()`'s already-real fields — no trend
 * arrows, no direction/color framing, no interpretation of any kind. That
 * restraint is deliberate, not an oversight: History "stores snapshots,"
 * Analytics "interprets snapshots" (see `docs/ARCHITECTURE.md`'s ownership
 * table) — a trend arrow here would blur that boundary right back in.
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

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** "Coming Soon" placeholder, mirroring `AutomationWidget.tsx`'s exact `CreateAutomationButton` pattern (same Dialog primitive, same styling) — not a second placeholder-modal convention invented for this file. */
function ExportHistoryButton() {
  const [open, setOpen] = useState(false);
  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger
        render={
          <button
            type="button"
            className="flex items-center justify-center gap-1.5 rounded-xl border border-radar-light-border px-3.5 py-2 text-xs font-medium text-radar-light-text outline-none transition-colors hover:bg-radar-light-surface focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:border-white/10 dark:text-radar-white dark:hover:bg-white/5"
          />
        }
      >
        <Download className="size-3.5" aria-hidden="true" />
        Export History
        <GlowBadge color="muted" className="ml-0.5 px-1.5 py-0 text-[9px] uppercase tracking-wide">
          Coming Soon
        </GlowBadge>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Backdrop
          className={cn(
            "fixed inset-0 z-40 bg-radar-bg/40 backdrop-blur-sm dark:bg-black/60",
            "transition-opacity duration-200 motion-reduce:transition-none",
            "data-[starting-style]:opacity-0 data-[ending-style]:opacity-0"
          )}
        />
        <Dialog.Popup
          className={cn(
            "fixed top-1/2 left-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-radar-light-border bg-radar-light-card p-5 shadow-2xl outline-none dark:border-white/10 dark:bg-radar-card",
            "transition-[opacity,transform] duration-200 motion-reduce:transition-none",
            "data-[starting-style]:scale-95 data-[starting-style]:opacity-0 data-[ending-style]:scale-95 data-[ending-style]:opacity-0"
          )}
        >
          <Dialog.Title className="mb-1 text-sm font-semibold text-radar-light-text dark:text-radar-white">Export History — Coming Soon</Dialog.Title>
          <Dialog.Description className="text-xs text-radar-light-muted dark:text-radar-muted">
            Downloading your full snapshot history as a file (CSV/JSON) is planned but not available yet — your history is already safely stored in this
            browser.
          </Dialog.Description>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/** A real confirm step before a real, irreversible local deletion — same Dialog primitive as `ExportHistoryButton` above, styled for a destructive action. */
function ClearHistoryButton({ onConfirm }: { onConfirm: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger
        render={
          <button
            type="button"
            className="flex items-center justify-center gap-1.5 rounded-xl border border-radar-danger/30 px-3.5 py-2 text-xs font-medium text-radar-danger outline-none transition-colors hover:bg-radar-danger/10 focus-visible:ring-2 focus-visible:ring-radar-danger/50"
          />
        }
      >
        <Trash2 className="size-3.5" aria-hidden="true" />
        Clear History
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Backdrop
          className={cn(
            "fixed inset-0 z-40 bg-radar-bg/40 backdrop-blur-sm dark:bg-black/60",
            "transition-opacity duration-200 motion-reduce:transition-none",
            "data-[starting-style]:opacity-0 data-[ending-style]:opacity-0"
          )}
        />
        <Dialog.Popup
          className={cn(
            "fixed top-1/2 left-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-radar-light-border bg-radar-light-card p-5 shadow-2xl outline-none dark:border-white/10 dark:bg-radar-card",
            "transition-[opacity,transform] duration-200 motion-reduce:transition-none",
            "data-[starting-style]:scale-95 data-[starting-style]:opacity-0 data-[ending-style]:scale-95 data-[ending-style]:opacity-0"
          )}
        >
          <div className="mb-1 flex items-center gap-2">
            <AlertTriangle className="size-4 shrink-0 text-radar-danger" aria-hidden="true" />
            <Dialog.Title className="text-sm font-semibold text-radar-light-text dark:text-radar-white">Clear all history?</Dialog.Title>
          </div>
          <Dialog.Description className="mb-4 text-xs text-radar-light-muted dark:text-radar-muted">
            This permanently deletes every snapshot stored in this browser. This cannot be undone — Analytics will start over with no history.
          </Dialog.Description>
          <div className="flex items-center justify-end gap-2">
            <Dialog.Close className="rounded-lg px-3 py-1.5 text-xs font-medium text-radar-light-muted outline-none transition-colors hover:bg-radar-light-surface dark:text-radar-muted dark:hover:bg-white/5">
              Cancel
            </Dialog.Close>
            <Dialog.Close
              onClick={onConfirm}
              className="rounded-lg bg-radar-danger px-3 py-1.5 text-xs font-medium text-white outline-none transition-colors hover:bg-radar-danger/90"
            >
              Clear History
            </Dialog.Close>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export function HistoricalPortfolioSection({
  walletHistory,
  analytics,
  highlights = [],
  digest = null,
  story = null,
  intelligence = null,
  ai = null,
  crossFeature = null,
  className,
}: {
  walletHistory: UseWalletHistoryResult;
  analytics: WalletAnalytics;
  highlights?: AnalyticsHighlight[];
  digest?: MonthlyDigest | null;
  story?: PortfolioStory | null;
  /** V4-FUTURE-002 (Feature 7 — Smart Report Sharing) — optional: only when ALL THREE are supplied does `WalletReportView` build real share data. `null` (the default) reproduces this section's exact pre-Feature-7 behavior — no Share button, nothing else changed. */
  intelligence?: PortfolioIntelligence | null;
  ai?: PortfolioAI | null;
  crossFeature?: CrossFeatureIntelligence | null;
  className?: string;
}) {
  const [showTimeline, setShowTimeline] = useState(false);
  // V4-HISTORY-005 (Phase 5) — a real, independent toggle: Reports and
  // Replay/Browse are never shown together, but they're also never
  // exclusive of EACH OTHER'S state — "Do not merge with Replay" per the
  // brief. `showTimeline` (History Browser, which itself owns Replay) and
  // `showReport` can each be toggled without touching the other.
  const [showReport, setShowReport] = useState(false);
  // V4-FUTURE-001 (Monthly Portfolio Digest, Phase 6) — a third real,
  // independent toggle, same convention — "No redesign of existing
  // sections."
  const [showDigest, setShowDigest] = useState(false);
  // V4-FUTURE-002 (Feature 5 — Portfolio Story Mode) — a fourth real,
  // independent toggle, same convention.
  const [showStory, setShowStory] = useState(false);

  if (walletHistory.isEmpty) {
    return (
      <SectionCard title="Historical Portfolio" icon={<History className="size-4 text-radar-primary dark:text-radar-accent" aria-hidden="true" />} className={className}>
        <EmptyState
          icon={History}
          title="No history yet"
          description="Snapshots accumulate automatically as your portfolio refreshes over time, stored locally in this browser."
        />
      </SectionCard>
    );
  }

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <SectionCard title="Historical Portfolio" icon={<History className="size-4 text-radar-primary dark:text-radar-accent" aria-hidden="true" />}>
        <ul className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
          <li className="flex flex-col gap-0.5">
            <span className="text-[10.5px] font-medium text-radar-light-muted dark:text-radar-muted">History Status</span>
            <span className="flex items-center gap-1 text-sm font-medium text-radar-success">
              <span className="size-1.5 shrink-0 rounded-full bg-radar-success" aria-hidden="true" />
              Active
            </span>
          </li>
          <li className="flex flex-col gap-0.5">
            <span className="text-[10.5px] font-medium text-radar-light-muted dark:text-radar-muted">Total Snapshots</span>
            <span className="text-sm font-medium text-radar-light-text dark:text-radar-white">{walletHistory.snapshotCount}</span>
          </li>
          <li className="flex flex-col gap-0.5">
            <span className="text-[10.5px] font-medium text-radar-light-muted dark:text-radar-muted">Storage Size</span>
            <span className="flex items-center gap-1 text-sm font-medium text-radar-light-text dark:text-radar-white">
              <Database className="size-3 shrink-0 text-radar-light-muted dark:text-radar-muted" aria-hidden="true" />
              {formatBytes(walletHistory.storageSizeBytes)}
            </span>
          </li>
          <li className="flex flex-col gap-0.5">
            <span className="text-[10.5px] font-medium text-radar-light-muted dark:text-radar-muted">First Snapshot</span>
            {walletHistory.oldestSnapshot && (
              <time dateTime={walletHistory.oldestSnapshot.timestamp} className="text-sm font-medium text-radar-light-text dark:text-radar-white">
                <RelativeTime iso={walletHistory.oldestSnapshot.timestamp} />
              </time>
            )}
          </li>
          <li className="flex flex-col gap-0.5">
            <span className="text-[10.5px] font-medium text-radar-light-muted dark:text-radar-muted">Latest Snapshot</span>
            {walletHistory.newestSnapshot && (
              <time dateTime={walletHistory.newestSnapshot.timestamp} className="text-sm font-medium text-radar-light-text dark:text-radar-white">
                <RelativeTime iso={walletHistory.newestSnapshot.timestamp} />
              </time>
            )}
          </li>
          <li className="flex flex-col gap-0.5">
            <span className="text-[10.5px] font-medium text-radar-light-muted dark:text-radar-muted">Last Updated</span>
            {walletHistory.latestSnapshot && (
              <time dateTime={walletHistory.latestSnapshot.timestamp} className="flex items-center gap-1 text-sm font-medium text-radar-light-text dark:text-radar-white">
                <Clock className="size-3 shrink-0 text-radar-light-muted dark:text-radar-muted" aria-hidden="true" />
                <RelativeTime iso={walletHistory.latestSnapshot.timestamp} />
              </time>
            )}
          </li>
        </ul>

        <div className="flex flex-wrap items-center gap-2 border-t border-radar-light-border pt-3 dark:border-white/10">
          <button
            type="button"
            onClick={() => setShowTimeline((v) => !v)}
            aria-expanded={showTimeline}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-radar-light-border px-3.5 py-2 text-xs font-medium text-radar-light-text outline-none transition-colors hover:bg-radar-light-surface focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:border-white/10 dark:text-radar-white dark:hover:bg-white/5"
          >
            <Eye className="size-3.5" aria-hidden="true" />
            {showTimeline ? "Hide History" : "View History"}
          </button>
          <button
            type="button"
            onClick={() => setShowReport((v) => !v)}
            aria-expanded={showReport}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-radar-light-border px-3.5 py-2 text-xs font-medium text-radar-light-text outline-none transition-colors hover:bg-radar-light-surface focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:border-white/10 dark:text-radar-white dark:hover:bg-white/5"
          >
            <BarChart3 className="size-3.5" aria-hidden="true" />
            {showReport ? "Hide Report" : "View Report"}
          </button>
          <button
            type="button"
            onClick={() => setShowDigest((v) => !v)}
            aria-expanded={showDigest}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-radar-light-border px-3.5 py-2 text-xs font-medium text-radar-light-text outline-none transition-colors hover:bg-radar-light-surface focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:border-white/10 dark:text-radar-white dark:hover:bg-white/5"
          >
            <Calendar className="size-3.5" aria-hidden="true" />
            {showDigest ? "Hide Digest" : "View Digest"}
          </button>
          <button
            type="button"
            onClick={() => setShowStory((v) => !v)}
            aria-expanded={showStory}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-radar-light-border px-3.5 py-2 text-xs font-medium text-radar-light-text outline-none transition-colors hover:bg-radar-light-surface focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:border-white/10 dark:text-radar-white dark:hover:bg-white/5"
          >
            <BookOpen className="size-3.5" aria-hidden="true" />
            {showStory ? "Hide Story" : "View Story"}
          </button>
          <ExportHistoryButton />
          <ClearHistoryButton onConfirm={walletHistory.clearHistory} />
        </div>
      </SectionCard>

      {/*
        V4-HISTORY-002 — supersedes the original flat "History Timeline"
        list: day-grouped (Today/Yesterday/This Week/Earlier), filterable,
        expandable per-snapshot detail, and cross-referenced against
        already-computed Highlights — see `WalletHistoryBrowser.tsx`.
      */}
      {showTimeline && <HistoryBrowserSection walletHistory={walletHistory} highlights={highlights} />}

      {/*
        V4-HISTORY-005 (Phase 5) — the Historical Report page: a real,
        independent surface, never rendered inside `HistoryBrowserSection`
        (where Replay lives) — a sibling toggle on this same section, not a
        Replay mode.
      */}
      {showReport && (
        <WalletReportView
          history={walletHistory.history}
          analytics={analytics}
          shareContext={crossFeature ? { intelligence, ai, walletHistory, crossFeature, digest, story } : null}
        />
      )}

      {/*
        V4-FUTURE-001 (Monthly Portfolio Digest) — a third real, independent
        surface: never merged with Replay or the plain Report view, and
        never rendered unless explicitly opened.
      */}
      {showDigest && <WalletMonthlyDigestView digest={digest} />}

      {/*
        V4-FUTURE-002 (Feature 5 — Portfolio Story Mode) — a fourth real,
        independent surface: never merged with Replay, the plain Report
        view, or the Digest.
      */}
      {showStory && <WalletPortfolioStoryView story={story} />}
    </div>
  );
}
