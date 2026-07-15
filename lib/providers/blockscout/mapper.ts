/** Raw Blockscout responses → domain models. Pure functions, no I/O. */

import type {
  RawChainStats,
  RawSmartContractsResponse,
  RawTokenTransfersResponse,
} from "@/lib/providers/blockscout/client";

export type ChainStats = {
  totalAddresses: number;
  totalTransactions: number;
  transactionsToday: number;
  averageBlockTimeMs: number;
  networkUtilizationPct: number;
  gasPriceGwei: { slow: number; average: number; fast: number };
  ethPriceUsd: number | null;
};

export type VerifiedContract = {
  address: string;
  name: string | null;
  verifiedAt: string;
};

export function mapChainStats(raw: RawChainStats): ChainStats {
  return {
    totalAddresses: Number(raw.total_addresses),
    totalTransactions: Number(raw.total_transactions),
    transactionsToday: Number(raw.transactions_today),
    averageBlockTimeMs: raw.average_block_time,
    networkUtilizationPct: raw.network_utilization_percentage,
    gasPriceGwei: raw.gas_prices,
    ethPriceUsd: raw.coin_price ? Number(raw.coin_price) : null,
  };
}

export function mapRecentlyVerifiedContract(raw: RawSmartContractsResponse): VerifiedContract | null {
  const top = raw.items?.[0];
  if (!top) return null;
  return {
    address: top.address.hash,
    name: top.address.name,
    verifiedAt: top.verified_at,
  };
}

export type TokenTransfer = {
  txHash: string;
  timestamp: string | null;
  from: string;
  to: string;
  /**
   * Decimal-adjusted token amount (raw integer value / 10^decimals). Uses
   * `Number`, not a bignum library — for whale-detection thresholding this
   * is an approximation, not exact accounting, and that's an accepted
   * tradeoff for this feature's precision needs.
   */
  amount: number;
};

export function mapTokenTransfers(raw: RawTokenTransfersResponse): TokenTransfer[] {
  return raw.items
    .filter((item): item is typeof item & { total: NonNullable<typeof item.total> } => item.total !== null)
    .map((item) => {
      const decimals = Number(item.total.decimals);
      const amount = Number(item.total.value) / 10 ** decimals;
      return {
        txHash: item.tx_hash,
        timestamp: item.timestamp,
        from: item.from.hash,
        to: item.to.hash,
        amount,
      };
    });
}
