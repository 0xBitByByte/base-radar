"use client";

import { use } from "react";
import { ShieldCheck } from "lucide-react";

import { NetworkStat } from "@/components/explorer/ProfileNetworkLive";
import { formatPercent } from "@/lib/data/format";
import type { Contracts } from "@/lib/intelligence/types";
import { contractDetailsByAddress, type ContractDetailEntry } from "@/lib/providers/blockscout/service";

type ProfileVerifiedContractsStatAsyncProps = {
  contracts: Contracts;
  contractDetailsPromise: Promise<ContractDetailEntry[]>;
};

/**
 * PR-074 REVIEW #6 — real per-address verification, same fix as
 * `ProfileTrustContractsTileAsync` for the identical registry-merge-vs-real-
 * Blockscout-check contradiction, applied to this Network section stat.
 * Prefers `detailsByAddress` (`contractDetailsPromise`, already fetched for
 * the Contracts section below) over the stale `contract.verified` field the
 * fallback uses.
 *
 * PR-074 FINAL POLISH — renders as a `NetworkStat`-shaped cell (same icon +
 * label + value layout as every Network strip cell) instead of a separately
 * bordered pill, so it joins the strip's own `divide-x` as a seventh cell
 * rather than sitting in its own box below it with its own surrounding gap.
 */
export function ProfileVerifiedContractsStatAsync({ contracts, contractDetailsPromise }: ProfileVerifiedContractsStatAsyncProps) {
  const entries = use(contractDetailsPromise);
  const detailsByAddress = contractDetailsByAddress(entries);

  const verifiedCount = contracts.items.filter((item) => {
    const detail = detailsByAddress[item.address];
    return detail ? detail.verified : item.verified === true;
  }).length;
  const verifiedPct = contracts.count > 0 ? (verifiedCount / contracts.count) * 100 : null;

  return (
    <NetworkStat
      icon={ShieldCheck}
      label="Verified Contracts"
      value={verifiedPct !== null ? formatPercent(verifiedPct, { showSign: false }) : "Not Tracked"}
      unavailable={verifiedPct === null}
    />
  );
}
