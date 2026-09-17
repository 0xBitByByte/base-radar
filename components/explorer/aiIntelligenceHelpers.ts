/**
 * Pure helpers for the AI Intelligence Report (PR-084.06). No JSX, no I/O,
 * no new scoring — every function here either passes through an
 * already-computed value unchanged or reuses an existing domain Curation
 * Engine's own exported classification function (`getPoolStatus`/
 * `getPoolClassification` from `pairIntelligenceHelpers.ts`,
 * `isOutcomeUncertain` from `governanceIntelligenceHelpers.ts`) to build a
 * one-line, real-data summary of a domain this report links out to rather
 * than re-lists.
 */

import { getPoolClassification, getPoolStatus } from "@/components/explorer/pairIntelligenceHelpers";
import { isOutcomeUncertain } from "@/components/explorer/governanceIntelligenceHelpers";
import type { ScorecardTile } from "@/lib/intelligence/scorecard";
import type { Contracts, TradingPool } from "@/lib/intelligence/types";
import type { GovernanceEvent } from "@/lib/governance/types";
import type { WhaleEvent } from "@/lib/whale/types";

/** `buildHealthScorecard` already returns all 11 tiles in a stable, sensible order — this exists only so the report page reads "every tile, in the engine's own order" from one named call, not a magic array index. */
export function getAllScorecardTiles(tiles: ScorecardTile[]): ScorecardTile[] {
  return tiles;
}

export type DomainSummary = {
  headline: string;
  detail: string;
  href: string;
};

/** Reuses `getPoolStatus`/`getPoolClassification` (`pairIntelligenceHelpers.ts`) on the project's own already-fetched largest pool — never a second liquidity classification pass. */
export function summarizePools(pools: TradingPool[], largestPool: TradingPool | null, slug: string): DomainSummary {
  const href = `/dashboard/projects/${slug}/pools`;
  if (pools.length === 0 || !largestPool) {
    return {
      headline: "No tracked liquidity pools",
      detail: "No DexScreener pair is currently matched for this project's token.",
      href,
    };
  }
  const status = getPoolStatus(largestPool);
  const classification = getPoolClassification(largestPool);
  return {
    headline: `${pools.length} pool${pools.length === 1 ? "" : "s"} tracked`,
    detail: `Largest pool classified "${classification.label}" with ${status.label} status.`,
    href,
  };
}

/** Registry-level `ContractInfo.verified` (the same weak fallback signal `lib/intelligence/engine.ts` already uses for its own verified-contract percentage) — not the Contract Explorer's precise per-address Blockscout check, which requires a promise this lightweight route deliberately doesn't await. */
export function summarizeContracts(contracts: Contracts, slug: string): DomainSummary {
  const href = `/dashboard/projects/${slug}/contracts`;
  if (contracts.count === 0) {
    return {
      headline: "No registered contracts",
      detail: "No contracts are currently registered for this project in the Base Radar registry.",
      href,
    };
  }
  const verifiedCount = contracts.items.filter((contract) => contract.verified === true).length;
  return {
    headline: `${contracts.count} contract${contracts.count === 1 ? "" : "s"} registered`,
    detail: `${verifiedCount} of ${contracts.count} confirmed verified at registry level.`,
    href,
  };
}

/** Mirrors `ProfileGovernance.tsx`'s own 3-way real distinction (no source configured / confirmed non-Snapshot mechanism / configured-but-zero) rather than a single generic empty message. Reuses `isOutcomeUncertain` — never a second governance classification pass. */
export function summarizeGovernance(
  governance: GovernanceEvent[] | null,
  governanceType: "snapshot" | "on-chain" | "forum" | "none" | null,
  slug: string
): DomainSummary {
  const href = `/dashboard/projects/${slug}/governance`;
  if (governance === null) {
    if (governanceType === "on-chain" || governanceType === "forum" || governanceType === "none") {
      return {
        headline: "No Snapshot governance",
        detail: `This project governs itself through ${governanceType === "none" ? "no formal mechanism" : governanceType}, not Snapshot.`,
        href,
      };
    }
    return {
      headline: "No governance source configured",
      detail: "No Snapshot space is configured for this project in the registry.",
      href,
    };
  }
  if (governance.length === 0) {
    return {
      headline: "No proposals detected",
      detail: "This project's Snapshot space is configured but returned zero proposals just now.",
      href,
    };
  }
  const activeCount = governance.filter((event) => event.status === "active").length;
  const uncertainCount = governance.filter(isOutcomeUncertain).length;
  return {
    headline: `${governance.length} proposal${governance.length === 1 ? "" : "s"} tracked`,
    detail: `${activeCount} active${uncertainCount > 0 ? `, ${uncertainCount} flagged Outcome Uncertain` : ""}.`,
    href,
  };
}

/** Reuses `WhaleEvent.classification` directly — never a second detection/classification pass. */
export function summarizeWhale(whaleEvents: WhaleEvent[], slug: string): DomainSummary {
  const href = `/dashboard/projects/${slug}/whale`;
  if (whaleEvents.length === 0) {
    return {
      headline: "No large transfers detected",
      detail: "No transfers over the $100,000 threshold were found in this project's recent on-chain activity.",
      href,
    };
  }
  const alertCount = whaleEvents.filter((event) => event.classification === "whale-alert").length;
  return {
    headline: `${whaleEvents.length} large transfer${whaleEvents.length === 1 ? "" : "s"} detected`,
    detail: `${alertCount} classified as a Whale Alert.`,
    href,
  };
}
