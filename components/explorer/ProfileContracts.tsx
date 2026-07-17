import { Suspense } from "react";
import { Blocks } from "lucide-react";

import { ContractsList } from "@/components/explorer/ContractsList";
import { ProfileContractDetailsAsync } from "@/components/explorer/ProfileContractDetailsAsync";
import { ProfileSectionCard } from "@/components/explorer/ProfileSectionCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { CHAIN_BRANDING } from "@/lib/branding/chains";
import type { ChainInfo, Contracts } from "@/lib/intelligence/types";
import type { ContractDetail } from "@/lib/providers/blockscout/service";
import type { ProviderResult } from "@/lib/providers/common/types";

type ProfileContractsProps = {
  contracts: Contracts;
  chain: ChainInfo;
  /** PR13.7 Goal 10 — real per-address Blockscout verification detail for every contract in `contracts.items`, kicked off unawaited by `page.tsx`. */
  contractDetailsPromise: Promise<Array<{ address: string; result: ProviderResult<ContractDetail> }>>;
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
export function ProfileContracts({ contracts, chain, contractDetailsPromise }: ProfileContractsProps) {
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
          description="No verified contracts have been added to Base Radar yet. Base Radar only displays manually verified contracts to ensure users always receive trusted addresses."
          className="bg-radar-light-surface/60 dark:bg-white/[0.02]"
          action={
            <span className="inline-flex items-center gap-1.5 rounded-full border border-radar-warning/30 bg-radar-warning/10 px-2.5 py-1 text-[11px] font-medium text-radar-warning">
              Registry Status: Pending Verification
            </span>
          }
        />
      ) : (
        <Suspense fallback={<ContractsList contracts={contracts} />}>
          <ProfileContractDetailsAsync contracts={contracts} detailsPromise={contractDetailsPromise} />
        </Suspense>
      )}
    </ProfileSectionCard>
  );
}
