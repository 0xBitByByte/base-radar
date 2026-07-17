"use client";

import { use } from "react";

import { ContractsList } from "@/components/explorer/ContractsList";
import type { Contracts } from "@/lib/intelligence/types";
import type { ContractDetail } from "@/lib/providers/blockscout/service";
import type { ProviderResult } from "@/lib/providers/common/types";

type ContractDetailEntry = { address: string; result: ProviderResult<ContractDetail> };

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
  const detailsByAddress: Record<string, ContractDetail> = {};
  for (const entry of entries) {
    if (entry.result.ok) detailsByAddress[entry.address] = entry.result.data;
  }
  return <ContractsList contracts={contracts} detailsByAddress={detailsByAddress} />;
}
