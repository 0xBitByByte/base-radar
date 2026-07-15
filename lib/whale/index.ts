import { BlockscoutWhaleProvider } from "@/lib/whale/blockscout-provider";
import type { WhaleDetectionProvider } from "@/lib/whale/types";

const blockscoutProvider = new BlockscoutWhaleProvider();

/**
 * Selects the active `WhaleDetectionProvider` via `WHALE_PROVIDER` (default
 * `"blockscout"`). Paid/specialized whale-tracking services are real, named
 * cases — not implemented in PR10, but the switch documents exactly where
 * they plug in later.
 */
export function getWhaleProvider(): WhaleDetectionProvider {
  const selected = process.env.WHALE_PROVIDER ?? "blockscout";

  switch (selected) {
    case "blockscout":
      return blockscoutProvider;
    case "whale-alert":
    case "arkham":
    case "nansen":
    case "bubblemaps":
      throw new Error(
        `WHALE_PROVIDER=${selected} is not implemented in PR10 — see the PR10 plan's Whale Detection section. Falls back to blockscout by leaving WHALE_PROVIDER unset.`
      );
    default:
      return blockscoutProvider;
  }
}

export type { WatchedToken, WhaleDetectionInput, WhaleDetectionProvider, WhaleEvent } from "@/lib/whale/types";
