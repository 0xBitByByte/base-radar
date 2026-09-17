"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Download, RefreshCcw, Wallet } from "lucide-react";

import { cn, downloadTextFile } from "@/lib/utils";
import { buildHoldingsCsv, buildHoldingsCsvFilename } from "@/lib/holdings/csv";
import { useWalletAnalytics } from "@/lib/hooks/useWalletAnalytics";
import { WalletDataProvider, useWalletData } from "@/components/wallet/WalletDataProvider";
import { shortenAddress } from "@/lib/wallet/format";
import { TokenLogo } from "@/components/branding/TokenLogo";
import { WalletButton } from "@/components/wallet/WalletButton";
import { EmptyState } from "@/components/ui/EmptyState";
import { RelativeTime } from "@/components/shared/RelativeTime";
import { GLASS_CARD_SURFACE } from "@/components/ui/glassStyles";
import { buildHeldProjectLinks } from "@/lib/portfolio-intelligence/projectLinks";
import { HeldProjectsIntelligenceSection } from "@/components/wallet/HeldProjectsIntelligenceSection";
import { usePortfolioMonitoring } from "@/lib/hooks/usePortfolioMonitoring";
import { PortfolioMonitoringSection } from "@/components/wallet/PortfolioMonitoringSection";
import type { LiveProject } from "@/lib/projects/types";
import type { WhaleEvent } from "@/lib/whale/types";
import type { SmartCollectionResult } from "@/lib/smart-collections/types";
import {
  AISummarySection,
  AllocationAnalysisSection,
  ExecutiveSummarySection,
  OpportunitiesSection,
  PortfolioHealthSection,
  PortfolioQualitySection,
  RecommendationsSection,
  RiskAnalysisSection,
  ScoreContributorsSection,
} from "@/components/wallet/WalletIntelligenceSections";
import { AutomationStatusSection, RecentWalletEventsSection } from "@/components/wallet/WalletAutomationSections";
import {
  AllocationChangesSection,
  AnalyticsHighlightsCard,
  AnalyticsSummarySection,
  AnalyticsTimelineSection,
  AnalyticsWindowSelector,
  BiggestChangeSection,
  PersonalBestsSection,
  PortfolioEvolutionSection,
  PortfolioMilestonesSection,
  PortfolioStabilitySection,
  PortfolioTrendsSection,
  RecoveryAnalysisSection,
  TrendCorrelationSection,
} from "@/components/wallet/WalletAnalyticsSections";
import { HistoricalPortfolioSection } from "@/components/wallet/WalletHistorySections";
import { WalletAIChatPanel, type AIChatWalletStatus } from "@/components/wallet/WalletAIChatPanel";
import { useAIChat } from "@/lib/hooks/useAIChat";
import { WalletRelatedActivityPanel } from "@/components/wallet/WalletRelatedActivityPanel";
import type { AnalyticsWindow } from "@/lib/wallet-analytics/types";
import type { ConversationInput } from "@/lib/ai-chat/types";

const USD_FORMAT = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });

/**
 * V3-WALLET-002 — the full-page counterpart to the Dashboard's
 * `PortfolioWidget`: every discovered holding, not just the top few. Same
 * states, same shared `usePortfolio()`/`useWallet()` hooks (now reached via
 * `useWalletData()`, see below), no duplicated fetch/branching logic — this
 * and the widget are two views over one real data source.
 *
 * V4-FUTURE-002C — wraps its own body in `<WalletDataProvider>` so the
 * whole Wallet hook chain (`useWalletPortfolioIntelligence`,
 * `useWalletPortfolioAI`, `useWalletAutomation`, `useWalletHistory`,
 * `useCrossFeatureIntelligence`, `useMonthlyDigest`, `usePortfolioStory`)
 * runs exactly ONCE for this page instead of once per hook this component
 * used to call directly — see `WalletDataProvider.tsx`'s own doc comment.
 * `chat` (`useAIChat()`) stays a direct, local call: its `turns` are
 * session-local conversation state, not a shared, already-built object the
 * context should own.
 */
type WalletPortfolioPageProps = {
  /** The real project registry, server-fetched once by `app/dashboard/wallet/page.tsx` (`cache()`-deduped, same precedent as Watchlists/Compare) — never re-fetched here. Optional/defaulted so every other existing mount point (none currently render this without the page, but defensively) keeps working. */
  liveProjects?: LiveProject[];
  /** Real, already-detected whale transfers across the tracked registry — server-fetched once alongside `liveProjects`. */
  whaleEvents?: WhaleEvent[];
  /** Real, server-evaluated Smart Collection membership for the whole registry — the same result `/dashboard/collections` renders. */
  serverCollections?: SmartCollectionResult[];
};

export function WalletPortfolioPage({ liveProjects = [], whaleEvents = [], serverCollections = [] }: WalletPortfolioPageProps = {}) {
  return (
    <WalletDataProvider>
      <WalletPortfolioPageBody liveProjects={liveProjects} whaleEvents={whaleEvents} serverCollections={serverCollections} />
    </WalletDataProvider>
  );
}

function WalletPortfolioPageBody({ liveProjects, whaleEvents, serverCollections }: Required<WalletPortfolioPageProps>) {
  const {
    isConnected,
    isSupportedNetwork,
    address,
    ensName,
    portfolio,
    intelligence,
    ai,
    automation,
    walletHistory,
    crossFeature,
    digest,
    story,
    analytics: canonicalAnalytics,
    report30d,
  } = useWalletData();
  const { assets, totalValue, loading, refreshing, error, chainSupported, partial, lastUpdated, refresh } = portfolio;

  // PR-092.03 — real held-token → project-registry links, recomputed only
  // when the real inputs change. Reused by both the Held Projects
  // Intelligence section below AND PR-092.04's monitoring hook, so the
  // matching logic runs exactly once per real holdings/registry change,
  // never twice.
  const heldProjectLinks = useMemo(() => buildHeldProjectLinks(assets, liveProjects, serverCollections), [assets, liveProjects, serverCollections]);
  const holdingsStatus: "loading" | "error" | "ready" = loading ? "loading" : error ? "error" : "ready";
  const monitoring = usePortfolioMonitoring(heldProjectLinks, whaleEvents, holdingsStatus);

  const [analyticsWindow, setAnalyticsWindow] = useState<AnalyticsWindow>("all");
  // Genuinely per-window, never shared: Trends/Evolution/Allocation below
  // change with this selector by design, unlike every other value above
  // (which are the canonical "all"-window/all-time reads `useWalletData()`
  // already computed once) — see `WalletDataProvider.tsx`'s own doc comment
  // on why this stays a separate, local call.
  const { analytics } = useWalletAnalytics(analyticsWindow);

  // Bug fix — `useAIChat()` used to independently re-derive intelligence/
  // ai/analytics/automation via its own separate hook chain instead of
  // consuming the canonical copies this page already has via
  // `useWalletData()`, which could genuinely diverge (see `useAIChat.ts`'s
  // own doc comment). This override is the SAME canonical data the rest of
  // this page already renders — never a second fetch, never a second
  // derivation. `canonicalAnalytics` (the "all"-window read), not the
  // window-scoped `analytics` above, matches `useAIChat()`'s own
  // documented "always reasons over the full, stable history" contract.
  const chatInput: ConversationInput = useMemo(
    () => ({
      intelligence,
      ai,
      analytics: canonicalAnalytics,
      history: walletHistory.history,
      automationEvents: automation.events,
      automationResults: automation.results,
      automationDiff: automation.diff,
      monthlyReport: report30d,
    }),
    [intelligence, ai, canonicalAnalytics, walletHistory.history, automation.events, automation.results, automation.diff, report30d]
  );
  const chat = useAIChat(chatInput);

  // Bug fix — precise reasons AI Chat has no data yet, computed from the
  // SAME real facts this page's own holdings card above already branches
  // on. Never tells a connected user to "connect a wallet" — that message
  // is reserved for the genuinely disconnected case.
  const chatWalletStatus: AIChatWalletStatus = !isConnected
    ? { kind: "disconnected" }
    : loading
      ? { kind: "loading" }
      : error
        ? { kind: "error", message: error }
        : assets.length === 0
          ? { kind: "no-holdings" }
          : { kind: "ready" };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-radar-light-text dark:text-radar-white">Wallet</h1>
        <p className="text-sm text-radar-light-muted dark:text-radar-muted">
          {isConnected && address ? `Real holdings for ${ensName ?? shortenAddress(address)} on Base` : "Your real, on-chain holdings on Base"}
        </p>
      </div>

      <div className={cn("flex flex-col gap-5 p-6", GLASS_CARD_SURFACE)}>
        {!isConnected ? (
          <EmptyState
            icon={Wallet}
            title="No wallet connected"
            description="Connect your wallet to see your real ETH and token balances, USD value, and allocation on Base."
            action={<WalletButton />}
            className="py-12"
          />
        ) : !isSupportedNetwork ? (
          <EmptyState
            icon={AlertTriangle}
            title="Unsupported network"
            description="Switch your wallet to Base Mainnet or Base Sepolia to continue."
            className="py-12"
          />
        ) : !chainSupported ? (
          <EmptyState
            icon={AlertTriangle}
            title="Base Sepolia not yet supported"
            description="Holdings discovery currently only supports Base Mainnet — switch your wallet to Base to see your real holdings."
            className="py-12"
          />
        ) : loading ? (
          <div className="flex flex-col gap-2" role="status" aria-label="Loading your holdings">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-14 animate-pulse rounded-xl bg-radar-light-surface dark:bg-white/5" />
            ))}
          </div>
        ) : error ? (
          <EmptyState
            icon={AlertTriangle}
            title="Couldn't load your holdings"
            description={error}
            className="py-12"
            action={
              <button
                type="button"
                onClick={refresh}
                className="rounded-lg bg-radar-primary px-4 py-2 text-sm font-medium text-white outline-none transition-colors hover:bg-radar-primary/90 focus-visible:ring-2 focus-visible:ring-radar-primary/50"
              >
                Try again
              </button>
            }
          />
        ) : assets.length === 0 ? (
          <EmptyState icon={Wallet} title="No holdings found" description="This wallet has no ETH or tokens on Base yet." className="py-12" />
        ) : (
          <>
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-xs font-medium text-radar-light-muted uppercase tracking-wide dark:text-radar-muted">Total Value</p>
                  {/*
                    V4-INTELLIGENCE-002 — Portfolio Fingerprint: one
                    rule-based label from `intelligence.fingerprint`
                    (`fingerprint.ts`), placed beside Total Value as the
                    page's own "at a glance, what kind of portfolio is
                    this" badge. A single neutral color (not a 10-entry
                    color map) since this is a classification, not a
                    good/bad signal.
                  */}
                  {intelligence && (
                    <span
                      title={intelligence.fingerprintReason}
                      className="rounded-full border border-radar-light-border bg-radar-light-surface px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap text-radar-light-muted dark:border-white/10 dark:bg-white/5 dark:text-radar-muted"
                    >
                      {intelligence.fingerprint}
                    </span>
                  )}
                </div>
                <p className="text-3xl font-semibold text-radar-light-text dark:text-radar-white">{USD_FORMAT.format(totalValue)}</p>
                {lastUpdated && (
                  <p className="mt-1 text-xs text-radar-light-muted dark:text-radar-muted">
                    Updated <RelativeTime iso={lastUpdated} />
                  </p>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                {/* PR-092.06 — real per-holding CSV, built client-side from the exact `assets` this list already renders (no re-fetch, no recomputation). Privacy-conscious: the file never leaves the browser except via the user's own save action, same as every other export in this app. */}
                <button
                  type="button"
                  onClick={() => {
                    const generatedAt = new Date().toISOString();
                    downloadTextFile(buildHoldingsCsvFilename(generatedAt), buildHoldingsCsv(assets, generatedAt), "text/csv");
                  }}
                  className="flex items-center gap-1.5 rounded-lg border border-radar-light-border px-3 py-1.5 text-xs font-medium text-radar-light-text outline-none transition-colors hover:bg-radar-light-surface focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:border-white/10 dark:text-radar-white dark:hover:bg-white/5"
                >
                  <Download className="size-3.5 shrink-0" aria-hidden="true" />
                  Export CSV
                </button>
                <button
                  type="button"
                  onClick={refresh}
                  disabled={refreshing}
                  aria-label={refreshing ? "Refreshing…" : "Refresh holdings"}
                  className={cn(
                    "flex items-center gap-1.5 rounded-lg border border-radar-light-border px-3 py-1.5 text-xs font-medium text-radar-light-text outline-none transition-colors hover:bg-radar-light-surface focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:border-white/10 dark:text-radar-white dark:hover:bg-white/5",
                    refreshing && "cursor-not-allowed opacity-70"
                  )}
                >
                  <RefreshCcw className={cn("size-3.5 shrink-0", refreshing && "animate-spin motion-reduce:animate-none")} aria-hidden="true" />
                  {refreshing ? "Refreshing…" : "Refresh"}
                </button>
              </div>
            </div>

            {partial && (
              <div role="alert" className="flex items-center gap-2 rounded-lg border border-radar-warning/30 bg-radar-warning/5 px-3 py-2 text-xs text-radar-warning">
                <AlertTriangle className="size-3.5 shrink-0" aria-hidden="true" />
                Some data couldn&apos;t be loaded — your holdings list or prices may be incomplete.
              </div>
            )}

            <ul className="flex flex-col divide-y divide-radar-light-border dark:divide-white/10">
              {assets.map((asset) => (
                <li key={asset.address ?? "native-eth"} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                  <TokenLogo logoUrl={asset.logo} symbol={asset.symbol} size={32} />
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-sm font-medium text-radar-light-text dark:text-radar-white">{asset.name}</span>
                    <span className="truncate text-xs text-radar-light-muted dark:text-radar-muted">
                      {asset.formattedBalance} {asset.symbol}
                    </span>
                  </div>
                  <div className="flex shrink-0 flex-col items-end">
                    <span className="text-sm font-medium text-radar-light-text dark:text-radar-white">
                      {asset.usdValue !== null ? USD_FORMAT.format(asset.usdValue) : "Price unknown"}
                    </span>
                    {asset.allocationPct !== null && (
                      <span className="text-xs text-radar-light-muted dark:text-radar-muted">{asset.allocationPct.toFixed(1)}% of portfolio</span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      {/*
        V3-WALLET-003 — sibling cards below the holdings card, not nested
        inside it: this page composes independent concerns as separate
        glass cards elsewhere already (see `app/dashboard/page.tsx`'s own
        widget composition), and `intelligence` only exists once real,
        priced holdings exist, so these render only in that same state the
        holdings `<ul>` above already requires.
      */}
      {intelligence && ai && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <PortfolioHealthSection intelligence={intelligence} />
          <ExecutiveSummarySection ai={ai} />
          <ScoreContributorsSection intelligence={intelligence} />
          <AISummarySection ai={ai} />
          <PortfolioQualitySection intelligence={intelligence} />
          <RiskAnalysisSection intelligence={intelligence} />
          <AllocationAnalysisSection intelligence={intelligence} />
          <OpportunitiesSection intelligence={intelligence} />
          <RecommendationsSection intelligence={intelligence} />
          <HeldProjectsIntelligenceSection links={heldProjectLinks} className="lg:col-span-2" />
        </div>
      )}

      {/*
        V3-WALLET-004 — rendered independently of `intelligence`, unlike the
        grid above: a wallet-disconnect lifecycle event is recorded at
        exactly the moment `intelligence` becomes null, so gating this
        behind `intelligence` would hide the very transition it exists to
        show. Both sections render their own honest empty states when
        nothing has happened yet.
      */}
      {isConnected && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <AutomationStatusSection automation={automation} />
          <RecentWalletEventsSection automation={automation} crossFeature={crossFeature} ai={ai} analytics={analytics} onAskQuestion={chat.ask} />
          <PortfolioMonitoringSection monitoring={monitoring} className="lg:col-span-2" />
        </div>
      )}

      {/*
        V4-ANALYTICS-001B (Phase 7) — Analytics Highlights sits above every
        other Analytics section, summarizing the whole area with the single
        highest-priority real finding across it — placed first so a reader
        sees "what matters most" before the detail sections below.
      */}
      {isConnected && <AnalyticsHighlightsCard analytics={analytics} />}

      {/*
        V4-ANALYTICS-001 — the historical/trend layer, sibling to Intelligence
        (current state) and Automation (actions/events), never merged into
        either. Gated on `isConnected` the same way Automation is above: each
        section owns its own honest "not enough history yet" empty state for
        `analytics.snapshotCount < 2`, which is the common case since history
        is session-only (see `useWalletAnalytics()`'s own doc comment) — it
        does not wait on `intelligence`/`ai` because a disconnect is itself a
        timeline event these sections should be able to show.
      */}
      {isConnected && (
        <div className="flex flex-col gap-4">
          <AnalyticsWindowSelector window={analyticsWindow} onChange={setAnalyticsWindow} />
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <PortfolioTrendsSection analytics={analytics} />
            <BiggestChangeSection analytics={analytics} />
            <PortfolioEvolutionSection analytics={analytics} />
            <AllocationChangesSection analytics={analytics} />
            <TrendCorrelationSection analytics={analytics} />
            <PortfolioStabilitySection analytics={analytics} />
            <AnalyticsSummarySection analytics={analytics} />
            <AnalyticsTimelineSection analytics={analytics} className="lg:col-span-2" />
          </div>
        </div>
      )}

      {/*
        V4-ANALYTICS-001A (Phase 11) — Milestones/Personal Bests/Recovery
        Analysis are always all-time facts (see `PortfolioMilestonesSection`'s
        own doc comment) — a separate grid, NOT inside the window-scoped
        grid above, since the `AnalyticsWindowSelector` has no effect on
        these three sections by design.
      */}
      {isConnected && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <PortfolioMilestonesSection analytics={analytics} />
          <PersonalBestsSection analytics={analytics} />
          <RecoveryAnalysisSection analytics={analytics} className="lg:col-span-2" />
        </div>
      )}

      {/*
        V4-HISTORY-001 — the persistence layer, beneath every other section
        on this page: History stores snapshots, Analytics interprets them
        (see `docs/ARCHITECTURE.md`'s ownership table) — placed last since
        it's the foundation the sections above are increasingly built on,
        not a new interpretation of its own.
      */}
      {isConnected && (
        <HistoricalPortfolioSection
          walletHistory={walletHistory}
          analytics={analytics}
          highlights={analytics.highlights}
          digest={digest}
          story={story}
          intelligence={intelligence}
          ai={ai}
          crossFeature={crossFeature}
        />
      )}

      {/*
        V4-INTELLIGENCE-003 — the correlation layer OVER everything above:
        connects Automation/History/Analytics/Reports/AI Chat references for
        the same real events, never recomputing any of them. Placed right
        before AI Chat since it's the natural "here's everything related —
        want to ask about it?" lead-in.
      */}
      {isConnected && <WalletRelatedActivityPanel crossFeature={crossFeature} />}

      {/*
        V4-AI-CHAT-001 — a real synthesis layer OVER everything above:
        Portfolio Intelligence/AI, Wallet Analytics, Wallet History, and
        Reports (via `useAIChat()`'s own 30-day report). Placed last for the
        same reason History is — it depends on the most already-built
        context, not the other way around. `useAIChat()` always calls
        `useWalletAnalytics()` with the default "all" window (not this
        page's own `analyticsWindow` selector) — the assistant reasons over
        the full, stable history regardless of which window the Trends
        section above happens to be showing.
      */}
      {isConnected && <WalletAIChatPanel chat={chat} walletStatus={chatWalletStatus} />}
    </div>
  );
}
