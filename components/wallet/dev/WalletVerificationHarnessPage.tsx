"use client";

import { useMemo, useState } from "react";
import { FlaskConical } from "lucide-react";

import { cn } from "@/lib/utils";
import { WalletDataProvider, useWalletData } from "@/components/wallet/WalletDataProvider";
import { buildWalletVerificationFixtures, makeHoldingAssets } from "@/lib/dev/walletFixtures";
import type { WalletVerificationBundle } from "@/lib/dev/types";
import { WalletVerificationHarness } from "@/components/wallet/dev/WalletVerificationHarness";
import { GLASS_CARD_SURFACE } from "@/components/ui/glassStyles";
import type { LiveProject } from "@/lib/projects/types";
import type { WhaleEvent } from "@/lib/whale/types";
import type { SmartCollectionResult } from "@/lib/smart-collections/types";

/**
 * V4-FUTURE-002A (Phase 2) — the harness's page-level wrapper. Defaults to
 * REAL wallet data via `<WalletDataProvider>` (the SAME shared context
 * `WalletPortfolioPage`/`GuidedReviewPage` use — V4-FUTURE-002C) — so once
 * a real, funded wallet connects, this page IS the connected-wallet
 * verification surface the future QA session needs, with zero code
 * changes. A "Use Synthetic Fixtures" toggle swaps in
 * `buildWalletVerificationFixtures()` for today's no-wallet sandbox, never
 * the other way around by default — real data is always preferred when
 * it's real.
 */
type WalletVerificationHarnessPageProps = {
  liveProjects?: LiveProject[];
  whaleEvents?: WhaleEvent[];
  serverCollections?: SmartCollectionResult[];
};

export function WalletVerificationHarnessPage({ liveProjects = [], whaleEvents = [], serverCollections = [] }: WalletVerificationHarnessPageProps = {}) {
  return (
    <WalletDataProvider>
      <WalletVerificationHarnessPageBody liveProjects={liveProjects} whaleEvents={whaleEvents} serverCollections={serverCollections} />
    </WalletDataProvider>
  );
}

function WalletVerificationHarnessPageBody({ liveProjects, whaleEvents, serverCollections }: Required<WalletVerificationHarnessPageProps>) {
  const { isConnected, intelligence, ai, automation, analytics, walletHistory, report30d, reportAll, digest, story, crossFeature, portfolio } = useWalletData();

  const [useFixtures, setUseFixtures] = useState(!isConnected);

  const realBundle = useMemo<WalletVerificationBundle>(
    () => ({ intelligence, ai, analytics, history: walletHistory.history, automationResults: automation.results, automationEvents: automation.events, report30d, reportAll, digest, story, crossFeature }),
    [intelligence, ai, analytics, walletHistory.history, automation.results, automation.events, report30d, reportAll, digest, story, crossFeature]
  );

  const fixtureBundle = useMemo(() => buildWalletVerificationFixtures(), []);

  const bundle = useFixtures ? fixtureBundle : realBundle;

  // PR-092 final verification pass — real holdings, real `LiveProject`
  // registry, real Smart Collections, and real whale events, so
  // `HeldProjectsIntelligenceSection`/`PortfolioMonitoringSection` (both
  // driven by real holdings, never by `PortfolioIntelligence`) can be
  // exercised the same way every other section here already is: fixture
  // data when no real wallet is connected, the real thing once one is.
  const fixtureAssets = useMemo(() => makeHoldingAssets(), []);
  const assets = useFixtures ? fixtureAssets : portfolio.assets;
  const holdingsStatus: "loading" | "error" | "ready" = useFixtures ? "ready" : portfolio.loading ? "loading" : portfolio.error ? "error" : "ready";

  return (
    <div className="flex flex-col gap-4">
      <div className={cn("flex flex-wrap items-center justify-between gap-3 p-4", GLASS_CARD_SURFACE)}>
        <div className="flex items-center gap-2">
          <FlaskConical className="size-4 text-radar-primary dark:text-radar-accent" aria-hidden="true" />
          <div>
            <h1 className="text-sm font-semibold text-radar-light-text dark:text-radar-white">Wallet Verification Harness</h1>
            <p className="text-xs text-radar-light-muted dark:text-radar-muted">Developer-only. Mounts every Wallet section over one data source — real wallet hooks, or synthetic fixtures.</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setUseFixtures((v) => !v)}
          aria-pressed={useFixtures}
          className={cn(
            "flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-radar-primary/50",
            useFixtures
              ? "border-radar-primary bg-radar-primary/10 text-radar-primary dark:border-radar-accent dark:bg-radar-accent/10 dark:text-radar-accent"
              : "border-radar-light-border text-radar-light-text hover:bg-radar-light-surface dark:border-white/10 dark:text-radar-white dark:hover:bg-white/5"
          )}
        >
          {useFixtures ? "Using Synthetic Fixtures" : "Using Real Wallet Data"}
        </button>
      </div>

      <WalletVerificationHarness bundle={bundle} assets={assets} holdingsStatus={holdingsStatus} liveProjects={liveProjects} whaleEvents={whaleEvents} serverCollections={serverCollections} />
    </div>
  );
}
