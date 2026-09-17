"use server";

/**
 * V3-WALLET-002 — thin Server Action wrapper around `lib/holdings/service.ts`,
 * the same pattern `lib/hooks/liveActions.ts` already establishes and
 * explains in its own doc comment: CoinGecko/Blockscout don't send CORS
 * headers permitting a browser-origin request, so a `"use client"` hook
 * can't import the provider/holdings layer directly — the fetch has to run
 * server-side. (Base's own RPC is CORS-open, per that same file's doc
 * comment, but this action still covers the native-ETH balance call too,
 * for one consistent client-facing shape rather than splitting "some of
 * this hook's data is client-fetched, some is server-fetched.")
 */

import { getHoldings, refreshHoldings } from "@/lib/holdings/service";
import type { Holdings } from "@/lib/holdings/types";

export async function fetchHoldings(address: string, chainId: number): Promise<Holdings> {
  return getHoldings(address, chainId);
}

export async function fetchHoldingsFresh(address: string, chainId: number): Promise<Holdings> {
  return refreshHoldings(address, chainId);
}
