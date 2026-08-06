"use client";

import { use } from "react";

import { classifyBlockscoutVerification, SourceCard } from "@/components/explorer/ProfileSources";
import { PROVIDER_BRANDING } from "@/lib/branding/providers";
import type { ContractDetailEntry } from "@/lib/providers/blockscout/service";

type ProfileSourcesBlockscoutAsyncProps = {
  detailsPromise: Promise<ContractDetailEntry[]>;
};

/**
 * PR-078 §1 — unwraps the same per-contract Blockscout detail lookups
 * `ProfileContracts` already consumes (`page.tsx`'s `contractDetailsPromise`,
 * kicked off unawaited) and renders the Evidence & Sources Blockscout card
 * from the real, per-address answer instead of `sources.ts`'s chain-wide
 * "most recently verified contract on Base" heuristic. Same `use()` +
 * `<Suspense>` pattern as every other `*Async` component on this page
 * (e.g. `ProfileContractDetailsAsync`) — reuses the already-fetched promise,
 * no new request.
 */
export function ProfileSourcesBlockscoutAsync({ detailsPromise }: ProfileSourcesBlockscoutAsyncProps) {
  const entries = use(detailsPromise);
  const outcome = classifyBlockscoutVerification(entries);
  return (
    <SourceCard
      label={PROVIDER_BRANDING.blockscout.label}
      status={outcome.status}
      badgeLabel={outcome.badgeLabel}
      description={outcome.description}
    />
  );
}
