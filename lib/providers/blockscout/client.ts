/**
 * Blockscout. Works keyless against the public per-chain host
 * (`base.blockscout.com`) — but Blockscout's own current docs warn that
 * host sits behind bot protection and can 403 scripted/programmatic
 * traffic. `BLOCKSCOUT_API_KEY` (a PRO API key, format `proapi_...`) is
 * read once at module load, same pattern as `github/client.ts`'s
 * `GITHUB_TOKEN`; when set, every call here switches to the authenticated
 * PRO API instead (`api.blockscout.com/8453/...` — `8453` is Base
 * mainnet's chain id in that path scheme). Every existing path SUFFIX
 * after `/api/v2/` is identical between the two hosts, so this is a
 * same-shape swap, not a rewrite of any endpoint below. When unset, every
 * call behaves exactly as before (keyless, public host).
 * https://docs.blockscout.com/devs/apis/rest
 * https://docs.blockscout.com/devs/pro-api-responses-and-routes
 */

import { fetchJson } from "@/lib/providers/common/utilities";

const BLOCKSCOUT_API_KEY = process.env.BLOCKSCOUT_API_KEY;
const BASE_URL = BLOCKSCOUT_API_KEY ? "https://api.blockscout.com/8453/api/v2" : "https://base.blockscout.com/api/v2";
const HEADERS: Record<string, string> = BLOCKSCOUT_API_KEY ? { authorization: `Bearer ${BLOCKSCOUT_API_KEY}` } : {};

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
  /**
   * PR-068 — corrected from the previous (incorrect) `tx_hash` field name,
   * which does not exist on this endpoint's real response and silently
   * produced `undefined` for every transfer. Confirmed live against
   * `base.blockscout.com` before this fix.
   */
  transaction_hash: string;
  log_index: number;
  timestamp: string | null;
  from: { hash: string };
  /**
   * PR-084.05 — `is_contract`/`implementations` confirmed live on this same
   * already-called endpoint (a real Base CLPool AMM pool as `to`, with
   * `is_contract: true` and `implementations: [{name: "CLPool"}]`). Real,
   * already-fetched fields this codebase simply hadn't parsed yet.
   */
  to: { hash: string; is_contract?: boolean; implementations?: Array<{ name: string | null }> };
  /** `null` for a small minority of malformed entries — filtered out by the mapper. */
  total: { value: string; decimals: string } | null;
  /**
   * PR-078 §2 — confirmed live on `/tokens/{address}/transfers` (a real USDC
   * transfer returned `block_number: 49566752`). `gas`/`fee`/`status` are
   * NOT present on this endpoint — those are transaction-level fields this
   * transfer-log endpoint doesn't carry; fetching them would mean one extra
   * `/transactions/{hash}` request per row shown, which isn't done here (see
   * `RecentTransactions.tsx`'s doc comment).
   */
  block_number: number;
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
 *
 * PR-078 §1 — `is_contract`/`is_verified` added: confirmed live against
 * `base.blockscout.com/api/v2/addresses/{address}` for three real cases
 * (a verified contract, an EOA, and the standard burn address) that this
 * endpoint reliably answers both questions even when `/smart-contracts/
 * {address}` 404s (i.e. the address is an EOA, or a real contract with no
 * verified source on record) — see `getContractDetail` in `service.ts` for
 * why that distinction now matters.
 */
export type RawAddressInfo = {
  creator_address_hash: string | null;
  creation_transaction_hash: string | null;
  is_contract: boolean;
  is_verified: boolean;
};

export async function fetchChainStats(): Promise<RawChainStats> {
  return fetchJson<RawChainStats>("blockscout", `${BASE_URL}/stats`, { headers: HEADERS });
}

export async function fetchRecentSmartContracts(): Promise<RawSmartContractsResponse> {
  return fetchJson<RawSmartContractsResponse>("blockscout", `${BASE_URL}/smart-contracts`, { headers: HEADERS });
}

export async function fetchContractDetail(address: string): Promise<RawContractDetail> {
  return fetchJson<RawContractDetail>("blockscout", `${BASE_URL}/smart-contracts/${address}`, { headers: HEADERS });
}

export async function fetchAddressInfo(address: string): Promise<RawAddressInfo> {
  return fetchJson<RawAddressInfo>("blockscout", `${BASE_URL}/addresses/${address}`, { headers: HEADERS });
}

/**
 * Most recent transfers for a given ERC-20 token contract, newest first —
 * used for whale-transfer detection (`lib/whale`) and `RecentTransactions`.
 *
 * PERFORMANCE (measured, not a blind tuning pass) — this endpoint is
 * genuinely slow for high-volume tokens: live testing found USDC at 10.66s
 * and AERO at 6.86s, both against Blockscout's real API directly, no app
 * code involved. `fetchJson`'s default (8s timeout, 2 retries) turns a
 * single ~10s request into ~30s of compounding timeouts here, and because
 * `lib/whale/blockscout-provider.ts`'s `detect()` scans every watched token
 * concurrently via `Promise.allSettled`, one slow token stalls the entire
 * ecosystem-wide scan for every caller (homepage, every project page, the
 * Whale Explorer). Retrying doesn't help: the slowness is a consistent
 * property of this endpoint under current load, not a transient blip, so a
 * retry just re-hits the same wall. `timeoutMs: 12_000` covers the observed
 * 6-11s range with headroom; `retries: 0` stops compounding a working-but-
 * slow response into a 3x wait for zero benefit. Every other Blockscout
 * endpoint keeps the shared default — this override is scoped to this one
 * call site only.
 */
export async function fetchTokenTransfers(tokenAddress: string): Promise<RawTokenTransfersResponse> {
  return fetchJson<RawTokenTransfersResponse>("blockscout", `${BASE_URL}/tokens/${tokenAddress}/transfers`, { headers: HEADERS }, 12_000, 0);
}

/**
 * V3-WALLET-002 — one real Blockscout token, as returned nested inside a
 * `RawTokenBalance` entry. Shape confirmed against Blockscout's own public
 * OpenAPI spec (github.com/blockscout/blockscout-api-v2-swagger) — the live
 * `base.blockscout.com` API was mid-outage while this was written (matching
 * this session's own `circuit-breaker provider=blockscout` warnings), so the
 * static spec was the only reliable source, not a guess. `exchange_rate` is
 * a real per-token USD price Blockscout already computes — `null`/absent for
 * lesser-known tokens, never fabricated when missing; `icon_url` is real but
 * frequently `null` for anything outside the most common tokens.
 */
export type RawBlockscoutToken = {
  address_hash: string;
  symbol: string;
  name: string;
  decimals: string;
  type: string;
  exchange_rate: string | null;
  icon_url?: string | null;
};

/**
 * One holding — Blockscout returns this as a flat array (`RawTokenBalance[]`),
 * unlike the paginated `/addresses/{address}/tokens` endpoint. `value` is the
 * raw balance in the token's smallest unit, as a decimal string — never
 * parsed as `Number` here (see `mapper.ts`'s own note on why `balance` stays
 * a `bigint` all the way through this feature).
 */
export type RawTokenBalance = {
  value: string;
  token: RawBlockscoutToken;
};

/**
 * Every real ERC-20 balance for `address`, in one call — this is the actual
 * "discovery" mechanism for V3-WALLET-002: no hardcoded token list to check
 * against and miss something on, Blockscout already indexes every transfer
 * this address has ever received. NFTs (ERC-721/ERC-1155) come back through
 * the same endpoint too — the mapper filters to `type === "ERC-20"` only.
 */
export async function fetchAddressTokenBalances(address: string): Promise<RawTokenBalance[]> {
  return fetchJson<RawTokenBalance[]>("blockscout", `${BASE_URL}/addresses/${address}/token-balances`, { headers: HEADERS });
}
