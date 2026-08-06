"use client";

import { use } from "react";

import { buildContractsTile, TrustTileView } from "@/components/explorer/ProfileTrustCenter";
import type { Contracts } from "@/lib/intelligence/types";
import { contractDetailsByAddress, type ContractDetailEntry } from "@/lib/providers/blockscout/service";

type ProfileTrustContractsTileAsyncProps = {
  contracts: Contracts;
  detailsPromise: Promise<ContractDetailEntry[]>;
};

/**
 * PR-073 — unwraps the same per-contract Blockscout detail lookups
 * `ProfileContractDetailsAsync` already unwraps for the Contracts section,
 * without awaiting them itself. `use()` suspends only this one Trust Center
 * cell behind its own `<Suspense>` (fallback: the registry-merge-only tile,
 * i.e. today's behavior) — same pattern as every other `*Async` component on
 * this page.
 */
export function ProfileTrustContractsTileAsync({ contracts, detailsPromise }: ProfileTrustContractsTileAsyncProps) {
  const entries = use(detailsPromise);
  return <TrustTileView tile={buildContractsTile(contracts, contractDetailsByAddress(entries))} />;
}
