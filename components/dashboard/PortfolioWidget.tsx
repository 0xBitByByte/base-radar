"use client";

import { AlertTriangle, BarChart3, BookOpen, Bot, Calendar, ClipboardCheck, Compass, GitCompare, History, RefreshCcw, Rewind, Sparkles, Wallet } from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/utils";
import { useWallet } from "@/lib/hooks/useWallet";
import { usePortfolio } from "@/lib/hooks/usePortfolio";
import { useWalletPortfolioAI } from "@/lib/hooks/useWalletPortfolioAI";
import { useWalletAnalytics } from "@/lib/hooks/useWalletAnalytics";
import { useWalletHistory } from "@/lib/hooks/useWalletHistory";
import { useWalletReplaySession } from "@/lib/hooks/useWalletReplaySession";
import { buildLastComparisonHeadline } from "@/components/wallet/walletSnapshotCompare";
import { resolveReplayPosition } from "@/components/wallet/walletReplayController";
import { buildHistoricalReport, REPORT_PERIOD_LABEL } from "@/components/wallet/walletReportEngine";
import { useCrossFeatureIntelligence } from "@/lib/hooks/useCrossFeatureIntelligence";
import { useMonthlyDigest } from "@/lib/hooks/useMonthlyDigest";
import { usePortfolioStory } from "@/lib/hooks/usePortfolioStory";
import { useGuidedReview } from "@/lib/hooks/useGuidedReview";
import { TokenLogo } from "@/components/branding/TokenLogo";
import { WalletButton } from "@/components/wallet/WalletButton";
import { WidgetCard } from "@/components/dashboard/WidgetCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { RelativeTime } from "@/components/shared/RelativeTime";
import { STABILITY_LEVEL_CLASS, STABILITY_LEVEL_ICON, TREND_DIRECTION_CLASS, TREND_DIRECTION_ICON, TREND_DIRECTION_LABEL } from "@/components/wallet/walletAnalyticsMeta";

const USD_FORMAT = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });
const MAX_HOLDINGS_SHOWN = 4;

/**
 * PR-092.02 — which of `WalletAnalytics.trends`' real metrics render in this
 * widget's compact badge row. `"value"` (Portfolio Value) is the closest
 * honest PnL-equivalent this app can show — a real `totalValue` delta
 * between two real persisted snapshots, never a fabricated cost-basis PnL
 * (no purchase-price data source exists to compute that). Reuses
 * `lib/wallet-analytics/trend.ts`'s already-computed, already-tested trend
 * directly; this is a display filter, not a second calculation.
 */
export const DASHBOARD_WIDGET_TREND_METRICS = ["health", "confidence", "value"] as const;

/**
 * V3-WALLET-002A — the one place this widget's "go see the full page" link
 * is defined, reused across every connected state (not just the fully-
 * loaded one) so a connected user always has a way to reach `/dashboard/
 * wallet` no matter what this widget itself could show — an empty wallet,
 * an unsupported network, or a load error are all still real reasons to
 * want the fuller page. Disconnected state is untouched (`WalletButton`
 * stays its own action there, per this task's explicit scope).
 */
function ViewPortfolioLink({ className }: { className?: string }) {
  return (
    <Link
      href="/dashboard/wallet"
      className={cn(
        "text-xs font-medium text-radar-primary outline-none transition-colors hover:text-radar-primary/80",
        "rounded focus-visible:ring-2 focus-visible:ring-radar-primary/50",
        className
      )}
    >
      View Portfolio →
    </Link>
  );
}

/**
 * V3-WALLET-002 — the real wallet-holdings widget, replacing the previous
 * permanent "wallet connect isn't available yet" placeholder now that both
 * halves genuinely exist: `useWallet()` (V3-WALLET-001) for the connection
 * itself, `usePortfolio()` for real discovered balances. No `data`/
 * `lastUpdated` props anymore — the old signature only existed so this
 * widget's mock `PortfolioSummary` prop could be threaded through without
 * ever being rendered; this component now owns its own real data end to
 * end via the shared hook, the same way every other hook-backed widget in
 * this app already does.
 */
export function PortfolioWidget() {
  const { isConnected, isSupportedNetwork } = useWallet();
  const { assets, totalValue, loading, refreshing, error, chainSupported, partial, lastUpdated, refresh } = usePortfolio();
  const { ai } = useWalletPortfolioAI();
  const { analytics } = useWalletAnalytics();
  const walletHistory = useWalletHistory();
  // V4-HISTORY-004 (Phase 7) — "Currently Replaying (when replay mode is
  // active)": reads the cross-page `walletReplaySession.ts` indicator, and
  // resolves it against this same real `walletHistory.history` — no second
  // Replay state, just a read of whichever real snapshot the Wallet page's
  // History Browser currently has open. `null` (not currently replaying,
  // the overwhelming common case) renders nothing at all.
  const activeReplayTimestamp = useWalletReplaySession();
  const replayPosition = activeReplayTimestamp !== null ? resolveReplayPosition(walletHistory.history, activeReplayTimestamp) : null;
  // V4-HISTORY-003 (Phase 7) — "Last Comparison (if available)": the single
  // real field with the largest change between the two most recent real
  // snapshots, reusing the same `compareSnapshots()` "vs Previous" already
  // uses on the Wallet page — never a second comparison engine. O(1): only
  // ever looks at the two most recent snapshots, not the full history.
  const lastComparison = buildLastComparisonHeadline(walletHistory.history);
  // V4-HISTORY-005 (Phase 6) — "Latest Report Summary (when sufficient
  // history exists)": the same real "Last 7 Days" report a user would see
  // by opening History → View Report, reusing `buildHistoricalReport()`
  // verbatim — never a second report-building path. `analytics` here is
  // the SAME already-built `WalletAnalytics` object `useWalletAnalytics()`
  // returned above; this never calls `buildWalletAnalytics()` again.
  const latestReport = buildHistoricalReport(walletHistory.history, analytics, "7d");
  // V4-INTELLIGENCE-003 (Phase 8) — "Latest Intelligence Story": the same
  // real `latestStory` `useCrossFeatureIntelligence()` computes — never a
  // second "what's the story" pick made here.
  const crossFeature = useCrossFeatureIntelligence();
  // V4-FUTURE-001 (Monthly Portfolio Digest, Phase 7) — "one compact line
  // only" — the same real digest `useMonthlyDigest()` builds for the
  // Wallet page's own "View Digest" toggle, never a second digest.
  const digest = useMonthlyDigest();
  // V4-FUTURE-002 (Feature 5 — Portfolio Story Mode) — the same real story
  // `usePortfolioStory()` builds for the Wallet page's own "View Story"
  // toggle, never a second story built here.
  const story = usePortfolioStory();
  // V4-FUTURE-002 (Feature 6 — Guided Portfolio Review) — read-only here:
  // this widget only reads `review.inProgress` to label its shortcut link
  // Start vs Resume, never advances or resets review progress itself.
  const review = useGuidedReview();
  // V4-ANALYTICS-001B (Phase 8) — the single highest-priority real
  // highlight, already fully ranked and deduplicated by
  // `buildAnalyticsHighlights()` (replaces this widget's own prior ad hoc
  // "recovery, else milestone, else last change" heuristic — that logic
  // now lives once, in the shared engine, not duplicated here).
  const topHighlight = analytics.highlights[0] ?? null;

  const subtitle = isConnected ? "Your real holdings on Base" : "Connect a wallet to track holdings";

  return (
    <WidgetCard
      icon={<Wallet className="size-5" aria-hidden="true" />}
      title="Portfolio"
      subtitle={subtitle}
      accent="primary"
      source={isConnected && !loading && !error ? "live" : undefined}
      lastUpdated={lastUpdated ?? undefined}
      actions={
        isConnected
          ? [{ label: refreshing ? "Refreshing…" : "Refresh", icon: <RefreshCcw className={cn("size-3.5", refreshing && "animate-spin motion-reduce:animate-none")} aria-hidden="true" />, onSelect: refresh }]
          : undefined
      }
    >
      {!isConnected ? (
        <EmptyState
          icon={Wallet}
          title="No wallet connected"
          description="Connect your wallet to see your real holdings, balances, and total value on Base."
          action={<WalletButton />}
        />
      ) : !isSupportedNetwork ? (
        <EmptyState
          icon={AlertTriangle}
          title="Unsupported network"
          description="Switch your wallet to Base Mainnet to see your holdings."
          action={<ViewPortfolioLink />}
        />
      ) : !chainSupported ? (
        <EmptyState
          icon={AlertTriangle}
          title="Base Sepolia not yet supported"
          description="Holdings discovery currently only supports Base Mainnet."
          action={<ViewPortfolioLink />}
        />
      ) : loading ? (
        <div className="flex flex-col gap-2" role="status" aria-label="Loading your holdings">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-11 animate-pulse rounded-xl bg-radar-light-surface dark:bg-white/5" />
          ))}
        </div>
      ) : error ? (
        <EmptyState
          icon={AlertTriangle}
          title="Couldn't load your holdings"
          description={error}
          action={
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={refresh}
                className="rounded-lg bg-radar-primary px-3 py-1.5 text-xs font-medium text-white outline-none transition-colors hover:bg-radar-primary/90 focus-visible:ring-2 focus-visible:ring-radar-primary/50"
              >
                Try again
              </button>
              <ViewPortfolioLink />
            </div>
          }
        />
      ) : assets.length === 0 ? (
        <EmptyState
          icon={Wallet}
          title="No holdings found"
          description="This wallet has no ETH or tokens on Base yet."
          action={<ViewPortfolioLink />}
        />
      ) : (
        <div className="flex flex-col gap-3">
          <div>
            <p className="text-2xl font-semibold text-radar-light-text dark:text-radar-white">{USD_FORMAT.format(totalValue)}</p>
            {partial && (
              <p className="mt-0.5 flex items-center gap-1 text-[11px] text-radar-warning">
                <AlertTriangle className="size-3 shrink-0" aria-hidden="true" />
                Some data couldn&apos;t be loaded — this may be incomplete.
              </p>
            )}
          </div>

          {/*
            V3-WALLET-003 — a compact AI read, not a second full widget: no
            existing dashboard widget was a genuine unfilled placeholder for
            this (confirmed via investigation — Portfolio Intelligence, AI
            Intelligence, Opportunities, and Risk are all real, already-
            shipped, watchlist/ecosystem-scoped features with no wallet-
            holdings concept), so this widget — the one dashboard surface
            that's actually about *this* wallet — gets a one-line summary
            instead of a duplicate widget. The full breakdown (scores, risk,
            opportunities, recommendations, allocation) lives on
            `/dashboard/wallet`, linked below.

            V4-INTELLIGENCE-003 — now reads `useWalletPortfolioAI()`'s shared
            `PortfolioAI` object instead of independently formatting
            `intelligence.summary`/`warnings[0]` itself: `ai.overview.
            explanation` is the same `executiveSummary` the Wallet page's own
            Executive Summary card shows, and the highlighted line only
            appears when the AI layer's own top-ranked finding is actually a
            critical risk (`ai.overview.priority`) — the identical
            prioritization `ScoreContributorsSection`'s "Holding it back"
            list uses, not a second, independent "just check warnings[0]"
            rule.
          */}
          {ai && (
            <div className="flex items-start gap-2 rounded-xl bg-radar-light-surface px-3 py-2 text-xs dark:bg-white/5">
              <Sparkles className="mt-0.5 size-3.5 shrink-0 text-radar-purple" aria-hidden="true" />
              <div className="flex min-w-0 flex-col gap-0.5">
                <span className="font-medium text-radar-light-text dark:text-radar-white">
                  Portfolio score: {ai.conversationContext.scores.overallScore}/100
                </span>
                <span className="line-clamp-2 text-radar-light-muted dark:text-radar-muted">{ai.overview.explanation}</span>
                {ai.overview.priority === "critical-risk" && (
                  <span className="flex items-center gap-1 text-radar-warning">
                    <AlertTriangle className="size-3 shrink-0" aria-hidden="true" />
                    {ai.overview.headline}
                  </span>
                )}
              </div>
            </div>
          )}

          {/*
            V4-ANALYTICS-001 / V4-ANALYTICS-001A / V4-ANALYTICS-001B (Phase
            10/12/8) — the smallest possible Analytics surface on the
            Dashboard: two trend badges plus a Stability badge (reusing the
            same `Trend`/`PortfolioStabilityIndex` objects `/dashboard/
            wallet` already renders), plus ONE line showing the single
            highest-priority entry from `analytics.highlights` — already
            fully ranked/deduplicated, nothing recomputed here. Still two
            lines total, same as before this phase — "do not increase
            dashboard height significantly." Renders nothing at all below
            `snapshotCount < 2` rather than an empty-state card — this
            widget must "remain compact," and a fresh session's honest zero-
            history state is the common case, not worth a permanent line.
          */}
          {analytics.snapshotCount >= 2 && (
            <div className="flex flex-col gap-1.5 border-t border-radar-light-border pt-3 dark:border-white/10">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                {analytics.trends
                  .filter((trend) => (DASHBOARD_WIDGET_TREND_METRICS as readonly string[]).includes(trend.metric))
                  .map((trend) => {
                    const Icon = TREND_DIRECTION_ICON[trend.direction];
                    return (
                      <span key={trend.metric} className="flex items-center gap-1 text-[11px]">
                        <span className="text-radar-light-muted dark:text-radar-muted">{trend.label}:</span>
                        <span className={cn("flex items-center gap-0.5 font-medium", TREND_DIRECTION_CLASS[trend.direction])}>
                          <Icon className="size-3 shrink-0" aria-hidden="true" />
                          {TREND_DIRECTION_LABEL[trend.direction]}
                        </span>
                      </span>
                    );
                  })}
                {analytics.stability && (
                  <span className="flex items-center gap-1 text-[11px]">
                    <span className="text-radar-light-muted dark:text-radar-muted">Stability:</span>
                    <span className={cn("flex items-center gap-0.5 font-medium", STABILITY_LEVEL_CLASS[analytics.stability.level])}>
                      {(() => {
                        const StabilityIcon = STABILITY_LEVEL_ICON[analytics.stability.level];
                        return <StabilityIcon className="size-3 shrink-0" aria-hidden="true" />;
                      })()}
                      {analytics.stability.label}
                    </span>
                  </span>
                )}
              </div>
              {topHighlight && (
                <p className="line-clamp-1 text-[11px] text-radar-light-muted dark:text-radar-muted">
                  <span className="font-medium text-radar-light-text dark:text-radar-white">{topHighlight.title}: </span>
                  {topHighlight.reason}
                </p>
              )}
            </div>
          )}

          {/*
            V4-HISTORY-001 / V4-HISTORY-002 (Phase 9/7) — exactly one
            compact row, nothing more: real snapshot count plus the latest
            snapshot's real relative time when persistence has started, an
            honest "not started" otherwise. No status/size/full-date/browser
            here — that detail lives on `/dashboard/wallet`'s own Historical
            Portfolio section and History Browser.
          */}
          <p className="flex items-center gap-1.5 text-[11px] text-radar-light-muted dark:text-radar-muted">
            <History className="size-3 shrink-0" aria-hidden="true" />
            {walletHistory.isEmpty ? (
              "History not started"
            ) : (
              <>
                History: {walletHistory.snapshotCount} snapshot{walletHistory.snapshotCount === 1 ? "" : "s"}
                {walletHistory.latestSnapshot && (
                  <>
                    {" · Latest "}
                    <RelativeTime iso={walletHistory.latestSnapshot.timestamp} />
                  </>
                )}
              </>
            )}
          </p>

          {/*
            V4-HISTORY-003 (Phase 7) — "No redesign. Only surface: Last
            Comparison (if available)." One additional compact line, shown
            only when a real, non-identical comparison exists between the
            two most recent snapshots — nothing when there's only one
            snapshot or the two most recent are identical.
          */}
          {lastComparison && (
            <p className="flex items-center gap-1.5 text-[11px] text-radar-light-muted dark:text-radar-muted">
              <GitCompare className="size-3 shrink-0" aria-hidden="true" />
              Last Comparison: {lastComparison.label} {lastComparison.summary}
            </p>
          )}

          {/*
            V4-HISTORY-005 (Phase 6) — "No redesign. Only surface: Latest
            Report Summary." One compact line, shown only when the real
            7-day report actually has at least 2 real snapshots to compare
            — a single snapshot has no real "net change" to report.
          */}
          {latestReport && latestReport.statistics.snapshotCount >= 2 && (
            <p className="flex items-center gap-1.5 text-[11px] text-radar-light-muted dark:text-radar-muted">
              <BarChart3 className="size-3 shrink-0" aria-hidden="true" />
              {REPORT_PERIOD_LABEL[latestReport.period]} Report: {latestReport.overview.snapshotCount} snapshots
              {latestReport.overview.netValueChange !== null && (
                <>
                  {", "}
                  {latestReport.overview.netValueChange >= 0 ? "+" : ""}
                  {USD_FORMAT.format(latestReport.overview.netValueChange)}
                </>
              )}
            </p>
          )}

          {/*
            V4-HISTORY-004 (Phase 7) — "No redesign. Only surface: Currently
            Replaying (when replay mode is active)." One compact line, shown
            only while Replay is genuinely active somewhere in the app.
          */}
          {replayPosition && (
            <p className="flex items-center gap-1.5 text-[11px] font-medium text-radar-primary dark:text-radar-accent" role="status">
              <Rewind className="size-3 shrink-0" aria-hidden="true" />
              Currently Replaying: Snapshot {replayPosition.index} of {replayPosition.total}
            </p>
          )}

          {/*
            V4-FUTURE-001 (Monthly Portfolio Digest, Phase 7) — "one compact
            line only... Example: 'September digest available'. No large
            card." Shown only once the real digest has enough real
            substance — the same `>= 2` bar "Latest Report Summary" already
            uses, for the same reason (a single snapshot has nothing to
            summarize yet).
          */}
          {digest && digest.report.overview.snapshotCount >= 2 && (
            <p className="flex items-center gap-1.5 text-[11px] text-radar-light-muted dark:text-radar-muted">
              <Calendar className="size-3 shrink-0" aria-hidden="true" />
              {digest.monthLabel} digest available
            </p>
          )}

          {/*
            V4-FUTURE-002 (Feature 5 — Portfolio Story Mode) — "one compact
            line only... No large card." Shown only once the real story has
            at least one real correlated moment to tell.
          */}
          {story && story.keyTurningPoints.length > 0 && (
            <p className="flex items-center gap-1.5 text-[11px] text-radar-light-muted dark:text-radar-muted">
              <BookOpen className="size-3 shrink-0" aria-hidden="true" />
              Portfolio story available
            </p>
          )}

          {/*
            V4-INTELLIGENCE-003 (Phase 8) — "One compact card: Latest
            Intelligence Story. Built from correlated events." Shown only
            when a real correlated event exists — an empty portfolio or one
            with no real Highlights yet has honestly nothing to tell.
          */}
          {crossFeature.latestStory && (
            <p className="flex items-center gap-1.5 text-[11px] text-radar-light-muted dark:text-radar-muted">
              <Compass className="size-3 shrink-0 text-radar-primary dark:text-radar-accent" aria-hidden="true" />
              {crossFeature.latestStory.headline}
            </p>
          )}

          {/*
            V4-AI-CHAT-001 (Phase 7) — "Surface one entry point only." A
            single link to the real chat panel on `/dashboard/wallet` — no
            inline chat here, no redesign of this widget.
          */}
          <Link
            href="/dashboard/wallet"
            className="flex items-center gap-1.5 text-[11px] font-medium text-radar-purple outline-none transition-colors hover:text-radar-purple/80 rounded focus-visible:ring-2 focus-visible:ring-radar-primary/50"
          >
            <Bot className="size-3 shrink-0" aria-hidden="true" />
            Ask AI about your wallet
          </Link>

          {/*
            V4-FUTURE-002 (Feature 6 — Guided Portfolio Review) — the
            Dashboard shortcut: one link, same convention as the "Ask AI"
            link right above it. Label reflects real, already-persisted
            review progress (`review.inProgress`) — never a guess.
          */}
          <Link
            href="/dashboard/wallet/review"
            className="flex items-center gap-1.5 text-[11px] font-medium text-radar-primary outline-none transition-colors hover:text-radar-primary/80 dark:text-radar-accent dark:hover:text-radar-accent/80 rounded focus-visible:ring-2 focus-visible:ring-radar-primary/50"
          >
            <ClipboardCheck className="size-3 shrink-0" aria-hidden="true" />
            {review.inProgress ? "Resume Guided Review" : "Start Guided Review"}
          </Link>

          <ul className="flex flex-col gap-1.5">
            {assets.slice(0, MAX_HOLDINGS_SHOWN).map((asset) => (
              <li key={asset.address ?? "native-eth"} className="flex items-center gap-2.5 rounded-xl px-1 py-1">
                <TokenLogo logoUrl={asset.logo} symbol={asset.symbol} size={24} />
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-sm font-medium text-radar-light-text dark:text-radar-white">{asset.symbol}</span>
                  <span className="truncate text-xs text-radar-light-muted dark:text-radar-muted">
                    {asset.formattedBalance} {asset.symbol}
                  </span>
                </div>
                <div className="flex shrink-0 flex-col items-end">
                  <span className="text-sm font-medium text-radar-light-text dark:text-radar-white">
                    {asset.usdValue !== null ? USD_FORMAT.format(asset.usdValue) : "—"}
                  </span>
                  {asset.allocationPct !== null && (
                    <span className="text-xs text-radar-light-muted dark:text-radar-muted">{asset.allocationPct.toFixed(1)}%</span>
                  )}
                </div>
              </li>
            ))}
          </ul>

          <ViewPortfolioLink className="self-start" />
        </div>
      )}
    </WidgetCard>
  );
}
