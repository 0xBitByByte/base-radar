/**
 * V3-WALLET-002 — merges discovery + pricing into the final, UI-ready
 * `HoldingAsset[]`: decimal-adjusted balances (via viem's `formatUnits`,
 * never a hand-rolled division that would need to juggle `bigint`/`Number`
 * precision itself), real USD values, and each asset's share of the
 * wallet's total known value. Pure, no I/O — every real network call
 * already happened in `discovery.ts`/`pricing.ts`.
 */

import { formatUnits } from "viem";

import type { DiscoveredTokenBalance } from "@/lib/providers/blockscout/service";
import type { HoldingAsset, Holdings } from "@/lib/holdings/types";

const NATIVE_ETH_DECIMALS = 18;

function computeUsdValue(formattedBalance: string, usdPrice: number | null): number | null {
  if (usdPrice === null) return null;
  return Number(formattedBalance) * usdPrice;
}

export function normalizeHoldings(
  address: string,
  chainId: number,
  chain: "base" | "base-sepolia",
  nativeEthBalance: bigint | null,
  nativeEthUsdPrice: number | null,
  tokens: DiscoveredTokenBalance[],
  partial: boolean
): Holdings {
  const assets: HoldingAsset[] = [];

  if (nativeEthBalance !== null && nativeEthBalance > BigInt(0)) {
    const formattedBalance = formatUnits(nativeEthBalance, NATIVE_ETH_DECIMALS);
    assets.push({
      address: null,
      symbol: "ETH",
      name: "Ethereum",
      logo: null,
      balance: nativeEthBalance,
      decimals: NATIVE_ETH_DECIMALS,
      formattedBalance,
      usdPrice: nativeEthUsdPrice,
      usdValue: computeUsdValue(formattedBalance, nativeEthUsdPrice),
      allocationPct: null, // filled in below, once totalUsdValue is known
      chain,
      verified: null,
      tokenType: "native",
    });
  }

  for (const token of tokens) {
    const formattedBalance = formatUnits(token.balance, token.decimals);
    assets.push({
      address: token.address,
      symbol: token.symbol,
      name: token.name,
      logo: token.logo,
      balance: token.balance,
      decimals: token.decimals,
      formattedBalance,
      usdPrice: token.usdPrice,
      usdValue: computeUsdValue(formattedBalance, token.usdPrice),
      allocationPct: null,
      chain,
      verified: null,
      tokenType: "erc20",
    });
  }

  const totalUsdValue = assets.reduce((sum, asset) => sum + (asset.usdValue ?? 0), 0);

  const assetsWithAllocation = assets
    .map((asset) => ({
      ...asset,
      allocationPct: asset.usdValue !== null && totalUsdValue > 0 ? (asset.usdValue / totalUsdValue) * 100 : null,
    }))
    // Highest-value holdings first — unknown-value assets (no allocationPct) sort last, not scattered.
    .sort((a, b) => (b.usdValue ?? -1) - (a.usdValue ?? -1));

  return {
    address,
    chainId,
    assets: assetsWithAllocation,
    totalUsdValue,
    fetchedAt: new Date().toISOString(),
    partial,
  };
}
