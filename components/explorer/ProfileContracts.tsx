import { Suspense } from "react";
import { ArrowRight, Blocks } from "lucide-react";
import Link from "next/link";

import { ContractsList } from "@/components/explorer/ContractsList";
import { ProfileContractDetailsAsync } from "@/components/explorer/ProfileContractDetailsAsync";
import { ProfileSectionCard } from "@/components/explorer/ProfileSectionCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { CHAIN_BRANDING } from "@/lib/branding/chains";
import type { ChainInfo, Contracts } from "@/lib/intelligence/types";
import type { ContractDetailEntry } from "@/lib/providers/blockscout/service";

type ProfileContractsProps = {
  contracts: Contracts;
  chain: ChainInfo;
  /** PR13.7 Goal 10 — real per-address Blockscout verification detail for every contract in `contracts.items`, kicked off unawaited by `page.tsx`. */
  contractDetailsPromise: Promise<ContractDetailEntry[]>;
  /** PR-084.03 — the real Contract Explorer route for this project (`/dashboard/projects/{slug}/contracts`), built once in `page.tsx` from `slug`. */
  contractsHref: string;
};

/**
 * Contracts — PR11 Part 6. Reuses `ContractsList` (extracted from
 * `QuickViewMetrics.tsx`) rather than a second, parallel rendering of the
 * same contract rows. The empty case gets a richer `EmptyState` here
 * (PR11.1 Part 5) — `ContractsList` itself keeps its plain-text empty
 * branch unchanged since Quick View also renders it and stays lightweight.
 * Wrapped in `ProfileSectionCard` (PR11.2 Part 3) so every main-column
 * section reads as the same card-elevation tier the Intelligence rail
 * already uses. Deployment date isn't shown: no provider in this codebase's
 * set exposes contract-creation timestamps yet (a real, documented PR12
 * candidate — Blockscout's address endpoint has the field, it just isn't
 * wired), so it's omitted rather than fabricated.
 */
export function ProfileContracts({ contracts, chain, contractDetailsPromise, contractsHref }: ProfileContractsProps) {
  const explorerUrl = CHAIN_BRANDING[chain.primaryChain]?.explorerUrl;

  return (
    <ProfileSectionCard
      id="contracts"
      title="Contracts"
      icon={Blocks}
      sourceLink={explorerUrl ? { href: explorerUrl, label: CHAIN_BRANDING[chain.primaryChain].label } : undefined}
    >
      {contracts.count === 0 ? (
        <EmptyState
          icon={Blocks}
          title="No verified contracts available"
          description="No verified contracts have been indexed for this project yet. Base Radar only displays manually verified contracts to ensure users always receive trusted addresses. When available, this section will include verified addresses, deployment network, and explorer links."
          className="bg-radar-light-surface/60 dark:bg-white/[0.02]"
          action={
            <span className="inline-flex items-center gap-1.5 rounded-full border border-radar-warning/30 bg-radar-warning/10 px-2.5 py-1 text-[11px] font-medium text-radar-warning">
              Registry Status: Pending Verification
            </span>
          }
        />
      ) : (
        // PR-074 FINAL UX POLISH — same stale-registry-vs-real-Blockscout
        // contradiction as the Trust Center / Network stat: each row's
        // Verified/Not Verified Yet badge here uses `contract.verified`
        // until the real per-address check resolves, and can flip. Marked
        // `data-loading-skeleton` so the splash waits for the real badges
        // instead of completing while they can still change.
        <>
          <Suspense
            fallback={
              <span data-loading-skeleton="true" className="contents">
                <ContractsList contracts={contracts} />
              </span>
            }
          >
            <ProfileContractDetailsAsync contracts={contracts} detailsPromise={contractDetailsPromise} />
          </Suspense>
          {/* PR-084.03 — real destination: Base Radar Intelligence badges
              (Verified/Upgradeable/Attention Required), category tabs,
              search/filter/sort over every registered contract. */}
          <Link
            href={contractsHref}
            className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-radar-light-border py-2 text-xs font-medium text-radar-light-muted outline-none transition-colors hover:border-radar-primary/40 hover:text-radar-primary focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:border-white/10 dark:text-radar-muted dark:hover:border-radar-accent/40 dark:hover:text-radar-accent"
          >
            View All Contracts ({contracts.count})
            <ArrowRight className="size-3.5" aria-hidden="true" />
          </Link>
        </>
      )}
    </ProfileSectionCard>
  );
}
