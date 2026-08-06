"use client";

import { use } from "react";

import { ContractsList } from "@/components/explorer/ContractsList";
import type { Contracts } from "@/lib/intelligence/types";
import { contractDetailsByAddress, type ContractDetailEntry } from "@/lib/providers/blockscout/service";

type ProfileContractDetailsAsyncProps = {
  contracts: Contracts;
  detailsPromise: Promise<ContractDetailEntry[]>;
};

/**
 * PR13.7 Goal 10 — unwraps the per-contract Blockscout detail lookups
 * `ProfileContracts` kicks off unawaited, without awaiting them itself.
 * `use()` suspends only this section behind its own `<Suspense>` (fallback:
 * `ContractsList` with no `detailsByAddress`, i.e. today's behavior) — same
 * pattern as every other `*Async` component on this page.
 */
export function ProfileContractDetailsAsync({ contracts, detailsPromise }: ProfileContractDetailsAsyncProps) {
  const entries = use(detailsPromise);
  return <ContractsList contracts={contracts} detailsByAddress={contractDetailsByAddress(entries)} />;
}
