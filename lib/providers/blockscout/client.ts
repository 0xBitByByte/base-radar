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

/**
 * PR13.7 Goal 10 — per-address contract verification metadata, confirmed
 * live against `base.blockscout.com` before writing this type (verified
 * Base contract `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`, USDC's
 * FiatTokenProxy, returned every field below with real values).
 */
export type RawContractDetail = {
  name: string | null;
  is_verified: boolean;
  compiler_version: string | null;
  optimization_enabled: boolean | null;
  license_type: string | null;
  language: string | null;
  proxy_type: string | null;
  implementations: Array<{ address_hash: string; name: string | null }>;
  verified_at: string | null;
};

/**
 * PR13.7 Goal 10 — creator address + creation transaction, confirmed live
 * (same test address as above returned real, non-null values for both).
 * Creation date/block isn't included here — resolving it would need a
 * further lookup of `creation_transaction_hash`'s block/timestamp, out of
 * scope for this pass (documented as Not Currently Available).
 */
export type RawAddressInfo = {
  creator_address_hash: string | null;
  creation_transaction_hash: string | null;
};

export async function fetchChainStats(): Promise<RawChainStats> {
  return fetchJson<RawChainStats>("blockscout", `${BASE_URL}/stats`);
}

export async function fetchRecentSmartContracts(): Promise<RawSmartContractsResponse> {
  return fetchJson<RawSmartContractsResponse>("blockscout", `${BASE_URL}/smart-contracts`);
}

export async function fetchContractDetail(address: string): Promise<RawContractDetail> {
  return fetchJson<RawContractDetail>("blockscout", `${BASE_URL}/smart-contracts/${address}`);
}

export async function fetchAddressInfo(address: string): Promise<RawAddressInfo> {
  return fetchJson<RawAddressInfo>("blockscout", `${BASE_URL}/addresses/${address}`);
}

/** Most recent transfers for a given ERC-20 token contract, newest first — used for whale-transfer detection (`lib/whale`). */
export async function fetchTokenTransfers(tokenAddress: string): Promise<RawTokenTransfersResponse> {
  return fetchJson<RawTokenTransfersResponse>("blockscout", `${BASE_URL}/tokens/${tokenAddress}/transfers`);
}
