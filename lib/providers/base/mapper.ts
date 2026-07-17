/** Raw Base RPC responses → domain models. Pure functions, no I/O. */

import type { RawRpcBlock } from "@/lib/providers/base/client";
import { hexToNumber } from "@/lib/providers/common/utilities";

export type NetworkStatus = {
  gasGwei: number;
  blockHeight: number;
  txCountLatestBlock: number;
  estimatedTps: number;
  chainId: number;
};

export function mapNetworkStatus(gasPriceHex: string, block: RawRpcBlock, chainIdHex: string): NetworkStatus {
  const gasWei = hexToNumber(gasPriceHex);
  const gasGwei = gasWei / 1e9;
  const blockHeight = hexToNumber(block.number);
  const txCountLatestBlock = block.transactions.length;
  // Base targets ~2s block times; used only to derive a rough live TPS estimate.
  const estimatedTps = Math.round((txCountLatestBlock / 2) * 10) / 10;
  const chainId = hexToNumber(chainIdHex);

  return { gasGwei, blockHeight, txCountLatestBlock, estimatedTps, chainId };
}

/** PR13.7 Goal 14 — real finality lag: how many blocks behind the chain's own "safe" tag the latest block currently sits. Both are real, already-fetched block numbers; this is a subtraction, not an estimate. */
export function mapFinality(latestBlockHex: string, safeBlockHex: string): number {
  return hexToNumber(latestBlockHex) - hexToNumber(safeBlockHex);
}
