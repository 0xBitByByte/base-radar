/**
 * Blockscout (Base explorer instance) — free, no API key required.
 * https://docs.blockscout.com/devs/apis/rest
 */

const REVALIDATE_SECONDS = 60;
const BASE_URL = "https://base.blockscout.com/api/v2";

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { next: { revalidate: REVALIDATE_SECONDS } });
  if (!res.ok) throw new Error(`Blockscout request failed: ${res.status} ${url}`);
  return (await res.json()) as T;
}

export type ChainStats = {
  totalAddresses: number;
  totalTransactions: number;
  transactionsToday: number;
  averageBlockTimeMs: number;
  networkUtilizationPct: number;
  gasPriceGwei: { slow: number; average: number; fast: number };
  ethPriceUsd: number | null;
};

export async function getChainStats(): Promise<ChainStats | null> {
  try {
    const data = await fetchJson<{
      total_addresses: string;
      total_transactions: string;
      transactions_today: string;
      average_block_time: number;
      network_utilization_percentage: number;
      gas_prices: { slow: number; average: number; fast: number };
      coin_price: string | null;
    }>(`${BASE_URL}/stats`);

    return {
      totalAddresses: Number(data.total_addresses),
      totalTransactions: Number(data.total_transactions),
      transactionsToday: Number(data.transactions_today),
      averageBlockTimeMs: data.average_block_time,
      networkUtilizationPct: data.network_utilization_percentage,
      gasPriceGwei: data.gas_prices,
      ethPriceUsd: data.coin_price ? Number(data.coin_price) : null,
    };
  } catch {
    return null;
  }
}

export type VerifiedContract = {
  address: string;
  name: string | null;
  verifiedAt: string;
};

export async function getRecentlyVerifiedContract(): Promise<VerifiedContract | null> {
  try {
    const data = await fetchJson<{
      items: Array<{ address: { hash: string; name: string | null }; verified_at: string }>;
    }>(`${BASE_URL}/smart-contracts`);

    const top = data.items?.[0];
    if (!top) return null;

    return {
      address: top.address.hash,
      name: top.address.name,
      verifiedAt: top.verified_at,
    };
  } catch {
    return null;
  }
}
