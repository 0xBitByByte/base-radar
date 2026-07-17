/** Raw Blockscout responses → domain models. Pure functions, no I/O. */

import type {
  RawAddressInfo,
  RawChainStats,
  RawContractDetail,
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

export type ContractDetail = {
  verified: boolean;
  name: string | null;
  compilerVersion: string | null;
  optimizationEnabled: boolean | null;
  licenseType: string | null;
  language: string | null;
  /** `null` when not a proxy — a real, positive signal (Blockscout's own `proxy_type` classification), not an absence-of-data null. */
  proxyType: string | null;
  implementationAddress: string | null;
  implementationName: string | null;
  creatorAddress: string | null;
  creationTxHash: string | null;
};

/** PR13.7 Goal 10 — combines the two real Blockscout responses this evidence needs (contract-detail + address-info) into one domain model. Owner and creation date/block are deliberately absent — neither is a real field on either endpoint (confirmed via a live test fetch), never fabricated. */
export function mapContractDetail(contract: RawContractDetail, address: RawAddressInfo): ContractDetail {
  const implementation = contract.implementations[0] ?? null;
  return {
    verified: contract.is_verified,
    name: contract.name,
    compilerVersion: contract.compiler_version,
    optimizationEnabled: contract.optimization_enabled,
    licenseType: contract.license_type && contract.license_type !== "none" ? contract.license_type : null,
    language: contract.language,
    proxyType: contract.proxy_type,
    implementationAddress: implementation?.address_hash ?? null,
    implementationName: implementation?.name ?? null,
    creatorAddress: address.creator_address_hash,
    creationTxHash: address.creation_transaction_hash,
  };
}

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
