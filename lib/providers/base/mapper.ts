/** Raw Base RPC responses → domain models. Pure functions, no I/O. */

import type { RawRpcBlock } from "@/lib/providers/base/client";
import { hexToNumber } from "@/lib/providers/common/utilities";

/**
 * V3-WALLET-002 — a wallet's ETH balance, kept as a raw wei `bigint`, never
 * routed through `hexToNumber`/`Number()`. `hexToNumber` is safe for gas
 * price/block height (both comfortably under `Number.MAX_SAFE_INTEGER`), but
 * a balance in wei is not: `Number.MAX_SAFE_INTEGER` (~9×10^15) is worth
 * only ~0.009 ETH once expressed in wei, so any real balance above that
 * would silently lose precision the instant it became a `Number`. Every
 * consumer of this value formats it via viem's own `formatUnits`, which
 * operates on the `bigint` directly.
 */
export function mapEthBalance(balanceHex: string): bigint {
  return BigInt(balanceHex);
}

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
