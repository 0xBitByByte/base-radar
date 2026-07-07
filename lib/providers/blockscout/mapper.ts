import type { RawChainStats, RawSmartContractsResponse } from "@/lib/providers/blockscout/client";

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
