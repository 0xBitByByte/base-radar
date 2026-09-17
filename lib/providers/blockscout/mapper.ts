/** Raw Blockscout responses → domain models. Pure functions, no I/O. */

import type {
  RawAddressInfo,
  RawChainStats,
  RawContractDetail,
  RawSmartContractsResponse,
  RawTokenBalance,
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
  /** Disambiguates multiple transfer events sharing one `txHash` (e.g. a swap) — see PR-068. */
  logIndex: number;
  timestamp: string | null;
  from: string;
  to: string;
  /** PR-084.05 — whether the recipient address is a contract, per Blockscout's own `is_contract` flag on this same already-fetched response. A real fact about the address type, never a buy/sell or exchange claim. */
  toIsContract: boolean;
  /** PR-084.05 — Blockscout's verified-contract-name resolution for `to` (e.g. "CLPool"), when `toIsContract` is true and Blockscout has one on record. `null` otherwise — never guessed. */
  toContractName: string | null;
  /** PR-078 §2 — real, already-returned by `/tokens/{address}/transfers` — never a separate lookup. */
  blockNumber: number;
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
  /**
   * PR-078 §1 — whether Blockscout recognizes this address as a contract at
   * all (from `/addresses/{address}`'s own `is_contract`), independent of
   * verification. Lets a caller distinguish "real contract, just not
   * verified" from "this registry address isn't a contract on this chain" —
   * two genuinely different, real reasons that both used to collapse into
   * the same generic failure.
   */
  isContract: boolean;
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

/**
 * PR13.7 Goal 10 — combines the two real Blockscout responses this evidence
 * needs (contract-detail + address-info) into one domain model. Owner and
 * creation date/block are deliberately absent — neither is a real field on
 * either endpoint (confirmed via a live test fetch), never fabricated.
 *
 * PR-078 §1 — `contract` is now `null` when `/smart-contracts/{address}`
 * genuinely 404s (confirmed live: this happens both for a plain EOA and for
 * a real, deployed-but-unverified contract — Blockscout's smart-contracts
 * index only lists verified ones). `address` (from `/addresses/{address}`,
 * confirmed live to still answer both cases) is the fallback source of
 * truth for `verified`/`isContract` in that case — never fabricated, and
 * never confused with a genuine transport failure (`service.ts` only calls
 * this with `contract: null` after confirming the failure really was a 404).
 */
export function mapContractDetail(contract: RawContractDetail | null, address: RawAddressInfo): ContractDetail {
  const implementation = contract?.implementations?.[0] ?? null;
  return {
    verified: contract ? contract.is_verified : address.is_verified,
    isContract: contract !== null ? true : address.is_contract,
    name: contract?.name ?? null,
    compilerVersion: contract?.compiler_version ?? null,
    optimizationEnabled: contract?.optimization_enabled ?? null,
    licenseType: contract?.license_type && contract.license_type !== "none" ? contract.license_type : null,
    language: contract?.language ?? null,
    proxyType: contract?.proxy_type ?? null,
    implementationAddress: implementation?.address_hash ?? null,
    implementationName: implementation?.name ?? null,
    creatorAddress: address.creator_address_hash,
    creationTxHash: address.creation_transaction_hash,
  };
}

/** One ERC-20 holding, balance kept as `bigint` — see `lib/providers/base/mapper.ts`'s `mapEthBalance` for why a raw on-chain balance never becomes a `Number` before it's been decimal-adjusted. */
export type DiscoveredTokenBalance = {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  balance: bigint;
  /** Real, Blockscout-computed USD price for this token — `null` when Blockscout doesn't have one (never fabricated; the portfolio pricing layer treats this as "try a fallback source next," not as zero). */
  usdPrice: number | null;
  logo: string | null;
};

/**
 * V3-WALLET-002 — filters to ERC-20 only (Blockscout's token-balances
 * endpoint also returns ERC-721/ERC-1155 through the same array; NFT
 * position discovery is explicitly out of scope, see `lib/portfolio/`'s own
 * doc comment) and drops zero balances (a wallet that has ever received and
 * fully sent away a token still gets a `RawTokenBalance` entry for it, worth
 * $0 and not worth rendering as a "holding").
 */
export function mapDiscoveredTokenBalances(raw: RawTokenBalance[]): DiscoveredTokenBalance[] {
  return raw
    .filter((item) => item.token.type === "ERC-20")
    .map((item) => ({
      address: item.token.address_hash,
      symbol: item.token.symbol,
      name: item.token.name,
      decimals: Number(item.token.decimals),
      balance: BigInt(item.value),
      usdPrice: item.token.exchange_rate ? Number(item.token.exchange_rate) : null,
      logo: item.token.icon_url ?? null,
    }))
    .filter((holding) => holding.balance > BigInt(0));
}

export function mapTokenTransfers(raw: RawTokenTransfersResponse): TokenTransfer[] {
  return raw.items
    .filter((item): item is typeof item & { total: NonNullable<typeof item.total> } => item.total !== null)
    .map((item) => {
      const decimals = Number(item.total.decimals);
      const amount = Number(item.total.value) / 10 ** decimals;
      return {
        txHash: item.transaction_hash,
        logIndex: item.log_index,
        timestamp: item.timestamp,
        from: item.from.hash,
        to: item.to.hash,
        toIsContract: item.to.is_contract ?? false,
        toContractName: item.to.implementations?.[0]?.name ?? null,
        blockNumber: item.block_number,
        amount,
      };
    });
}
