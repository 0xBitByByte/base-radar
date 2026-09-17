"use client";

import { useMemo } from "react";
import { AlertTriangle, CheckCircle2 } from "lucide-react";

import { cn } from "@/lib/utils";
import type { WalletVerificationBundle } from "@/lib/dev/types";
import { runWalletAssertions } from "@/lib/dev/walletAssertions";
import { useGuidedReview } from "@/lib/hooks/useGuidedReview";
import { usePortfolioMonitoring } from "@/lib/hooks/usePortfolioMonitoring";
import type { UseWalletAutomationResult } from "@/lib/hooks/useWalletAutomation";
import type { UseWalletHistoryResult } from "@/lib/hooks/useWalletHistory";
import { GLASS_CARD_SURFACE } from "@/components/ui/glassStyles";
import { buildHeldProjectLinks } from "@/lib/portfolio-intelligence/projectLinks";
import { HeldProjectsIntelligenceSection } from "@/components/wallet/HeldProjectsIntelligenceSection";
import { PortfolioMonitoringSection } from "@/components/wallet/PortfolioMonitoringSection";
import type { HoldingAsset } from "@/lib/holdings/types";
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
import { AnalyticsHighlightsCard, AnalyticsSummarySection, AnalyticsTimelineSection, PortfolioMilestonesSection, PersonalBestsSection, RecoveryAnalysisSection } from "@/components/wallet/WalletAnalyticsSections";
import { HistoricalPortfolioSection } from "@/components/wallet/WalletHistorySections";
import { WalletRelatedActivityPanel } from "@/components/wallet/WalletRelatedActivityPanel";
import { GuidedPortfolioReview } from "@/components/wallet/GuidedPortfolioReview";
import { ReportSharePreviewButton } from "@/components/wallet/ReportSharePreview";

/**
 * V4-FUTURE-002A (Phase 2) — mounts every real Wallet section TOGETHER,
 * over an injected `WalletVerificationBundle` instead of live wallet
 * hooks. Every section rendered here is the SAME component the real
 * `/dashboard/wallet` page renders — this file composes them a second
 * time (unavoidable for a second page), but never reimplements one.
 * Developer-only: never linked from navigation, never shown to end users.
 *
 * Phase 3 — the assertions panel at the top runs `runWalletAssertions()`
 * (pure, read-only) over the exact same bundle being rendered below it —
 * dev-only diagnostics, never production UI.
 */

function AssertionsPanel({ bundle }: { bundle: WalletVerificationBundle }) {
  const findings = runWalletAssertions(bundle);

  return (
    <div className={cn("flex flex-col gap-3 p-5", GLASS_CARD_SURFACE)}>
      <div className="flex items-center gap-2">
        {findings.length === 0 ? <CheckCircle2 className="size-4 text-radar-success" aria-hidden="true" /> : <AlertTriangle className="size-4 text-radar-danger" aria-hidden="true" />}
        <h2 className="text-sm font-semibold text-radar-light-text dark:text-radar-white">Developer Assertions ({findings.length})</h2>
      </div>
      {findings.length === 0 ? (
        <p className="text-xs text-radar-success">No inconsistencies detected across notifications, highlights, replay, report/story, digest/report, or feature references.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {findings.map((finding) => (
            <li key={finding.id} className={cn("rounded-lg border p-2 text-xs", finding.severity === "error" ? "border-radar-danger/30 bg-radar-danger/5 text-radar-danger" : "border-radar-warning/30 bg-radar-warning/5 text-radar-warning")}>
              <span className="font-semibold uppercase tracking-wide">
                [{finding.severity}] {finding.category}
              </span>
              <p className="mt-0.5">{finding.message}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function buildAutomationHarness(bundle: WalletVerificationBundle): UseWalletAutomationResult {
  return {
    events: bundle.automationEvents,
    results: bundle.automationResults,
    rules: [],
    setRuleEnabled: () => {},
    resetRules: () => {},
    automationEnabled: true,
    snapshot: null,
    previousSnapshot: null,
    diff: null,
    metadata: { evaluatedAt: bundle.reportAll?.overview.lastSnapshotDate ?? new Date().toISOString(), ruleCount: 0, enabledRuleCount: 0, triggeredResultCount: bundle.automationResults.length, eventCount: bundle.automationEvents.length },
  };
}

function buildWalletHistoryHarness(bundle: WalletVerificationBundle): UseWalletHistoryResult {
  return {
    history: bundle.history,
    latestSnapshot: bundle.history.at(-1) ?? null,
    newestSnapshot: bundle.history.at(-1) ?? null,
    oldestSnapshot: bundle.history[0] ?? null,
    snapshotCount: bundle.history.length,
    storageSizeBytes: JSON.stringify(bundle.history).length,
    isEmpty: bundle.history.length === 0,
    clearHistory: () => {},
  };
}

type WalletVerificationHarnessProps = {
  bundle: WalletVerificationBundle;
  /** PR-092 final verification pass — real (or fixture) holdings + registry data, threaded through so `HeldProjectsIntelligenceSection`/`PortfolioMonitoringSection` (both driven by real holdings, never by `PortfolioIntelligence`) can be exercised here the same way every pre-092 section already is. All optional/defaulted so this component's pre-092 callers/tests keep working unchanged. */
  assets?: HoldingAsset[];
  holdingsStatus?: "loading" | "error" | "ready";
  liveProjects?: LiveProject[];
  whaleEvents?: WhaleEvent[];
  serverCollections?: SmartCollectionResult[];
  className?: string;
};

export function WalletVerificationHarness({ bundle, assets = [], holdingsStatus = "ready", liveProjects = [], whaleEvents = [], serverCollections = [], className }: WalletVerificationHarnessProps) {
  const { intelligence, ai, analytics, crossFeature, digest, story, reportAll } = bundle;
  const automation = buildAutomationHarness(bundle);
  const walletHistory = buildWalletHistoryHarness(bundle);
  const review = useGuidedReview();

  const heldProjectLinks = useMemo(() => buildHeldProjectLinks(assets, liveProjects, serverCollections), [assets, liveProjects, serverCollections]);
  const monitoring = usePortfolioMonitoring(heldProjectLinks, whaleEvents, holdingsStatus);

  const shareData = reportAll
    ? {
        report: reportAll,
        ai,
        intelligence,
        analytics,
        history: { snapshotCount: walletHistory.snapshotCount, oldestSnapshot: walletHistory.oldestSnapshot, newestSnapshot: walletHistory.newestSnapshot },
        crossFeature,
        digest,
        story,
      }
    : null;

  return (
    <div className={cn("flex flex-col gap-6", className)}>
      <AssertionsPanel bundle={bundle} />

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

      <PortfolioMonitoringSection monitoring={monitoring} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <AutomationStatusSection automation={automation} />
        <RecentWalletEventsSection automation={automation} crossFeature={crossFeature} ai={ai} analytics={analytics} />
      </div>

      <AnalyticsHighlightsCard analytics={analytics} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <AnalyticsSummarySection analytics={analytics} />
        <AnalyticsTimelineSection analytics={analytics} />
        <PortfolioMilestonesSection analytics={analytics} />
        <PersonalBestsSection analytics={analytics} />
        <RecoveryAnalysisSection analytics={analytics} className="lg:col-span-2" />
      </div>

      <HistoricalPortfolioSection walletHistory={walletHistory} analytics={analytics} highlights={analytics.highlights} digest={digest} story={story} intelligence={intelligence} ai={ai} crossFeature={crossFeature} />

      <WalletRelatedActivityPanel crossFeature={crossFeature} />

      <GuidedPortfolioReview review={review} intelligence={intelligence} ai={ai} automation={automation} analytics={analytics} walletHistory={walletHistory} highlights={analytics.highlights} digest={digest} story={story} />

      <div className={cn("flex items-center gap-2 p-5", GLASS_CARD_SURFACE)}>
        <span className="text-sm font-semibold text-radar-light-text dark:text-radar-white">Smart Report Sharing</span>
        <ReportSharePreviewButton data={shareData} />
      </div>
    </div>
  );
}
