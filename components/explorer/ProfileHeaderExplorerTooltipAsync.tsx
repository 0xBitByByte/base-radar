"use client";

import { use } from "react";

import { ProfileIconLink } from "@/components/explorer/ProfileHeader";
import { contractDetailsByAddress, type ContractDetailEntry } from "@/lib/providers/blockscout/service";
import type { Contracts } from "@/lib/intelligence/types";

type ProfileHeaderExplorerTooltipAsyncProps = {
  href: string;
  contracts: Contracts;
  contractDetailsPromise: Promise<ContractDetailEntry[]>;
};

/**
 * PR-078B — the BaseScan icon's hover tooltip needs a real "N of M
 * contracts verified" line. The header's own `contracts` prop only carries
 * the fast-path registry-merge `verified` field — the same weak, almost-
 * always-wrong "most recently verified contract on Base" heuristic PR-078
 * §1 root-caused and fixed for Evidence & Sources and the Contracts
 * section. Using it here too would reintroduce the exact contradiction
 * that fix eliminated (confirmed live: this read "0 of 1 verified" while
 * Trust Center, two sections below, correctly read "1 of 1 verified
 * on-chain" for the same project). This reuses the same already-fetched
 * `contractDetailsPromise` and the same `contractDetailsByAddress` helper
 * every other consumer of it already uses, so this tooltip agrees with the
 * rest of the page instead of contradicting it. Only this one icon link
 * suspends — the rest of the header renders synchronously as before.
 */
export function ProfileHeaderExplorerTooltipAsync({ href, contracts, contractDetailsPromise }: ProfileHeaderExplorerTooltipAsyncProps) {
  const entries = use(contractDetailsPromise);
  const detailsByAddress = contractDetailsByAddress(entries);
  const verifiedCount = contracts.items.filter((item) => detailsByAddress[item.address]?.verified ?? item.verified === true).length;
  const meta =
    contracts.count > 0
      ? `${verifiedCount} of ${contracts.count} registered contract${contracts.count === 1 ? "" : "s"} verified`
      : undefined;

  return <ProfileIconLink platform="explorer" href={href} meta={meta} />;
}
