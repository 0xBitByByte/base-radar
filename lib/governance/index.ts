import { SnapshotGovernanceProvider } from "@/lib/governance/snapshot-provider";
import type { GovernanceProvider } from "@/lib/governance/types";

const snapshotProvider = new SnapshotGovernanceProvider();

/**
 * Selects the active `GovernanceProvider` via `GOVERNANCE_PROVIDER`
 * (default `"snapshot"`). Other governance sources are real, named cases —
 * not implemented in PR10, but the switch documents exactly where they
 * plug in later.
 */
export function getGovernanceProvider(): GovernanceProvider {
  const selected = process.env.GOVERNANCE_PROVIDER ?? "snapshot";

  switch (selected) {
    case "snapshot":
      return snapshotProvider;
    case "tally":
    case "compound-governor":
    case "oz-governor":
    case "aragon":
    case "safe":
      throw new Error(
        `GOVERNANCE_PROVIDER=${selected} is not implemented in PR10 — see the PR10 plan's Governance section. Falls back to snapshot by leaving GOVERNANCE_PROVIDER unset.`
      );
    default:
      return snapshotProvider;
  }
}

export type {
  GovernanceEvent,
  GovernanceFetchInput,
  GovernanceProjectRef,
  GovernanceProvider,
  GovernanceStatus,
} from "@/lib/governance/types";
