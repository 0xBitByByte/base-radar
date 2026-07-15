/**
 * Blockscout (Base explorer instance) — free, no API key required.
 * https://docs.blockscout.com/devs/apis/rest
 */

import { fetchJson } from "@/lib/providers/common/utilities";

const BASE_URL = "https://base.blockscout.com/api/v2";

export type RawChainStats = {
  total_addresses: string;
  total_transactions: string;
  transactions_today: string;
  average_block_time: number;
  network_utilization_percentage: number;
  gas_prices: { slow: number; average: number; fast: number };
  coin_price: string | null;
};

export type RawSmartContractsResponse = {
  items: Array<{ address: { hash: string; name: string | null }; verified_at: string }>;
};

export type RawTokenTransfer = {
  tx_hash: string;
  timestamp: string | null;
  from: { hash: string };
  to: { hash: string };
  /** `null` for a small minority of malformed entries — filtered out by the mapper. */
  total: { value: string; decimals: string } | null;
};

export type RawTokenTransfersResponse = {
  items: RawTokenTransfer[];
};

export async function fetchChainStats(): Promise<RawChainStats> {
  return fetchJson<RawChainStats>("blockscout", `${BASE_URL}/stats`);
}

export async function fetchRecentSmartContracts(): Promise<RawSmartContractsResponse> {
  return fetchJson<RawSmartContractsResponse>("blockscout", `${BASE_URL}/smart-contracts`);
}

/** Most recent transfers for a given ERC-20 token contract, newest first — used for whale-transfer detection (`lib/whale`). */
export async function fetchTokenTransfers(tokenAddress: string): Promise<RawTokenTransfersResponse> {
  return fetchJson<RawTokenTransfersResponse>("blockscout", `${BASE_URL}/tokens/${tokenAddress}/transfers`);
}
