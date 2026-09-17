/**
 * V3-WALLET-001 — wallet-network metadata. Deliberately separate from
 * `lib/branding/chains.ts`'s `CHAIN_BRANDING` (that file is the Project
 * Registry's ecosystem-branding system — "which chains does this project
 * support," keyed by the registry's own `Chain` union). This file answers a
 * different question — "is the connected wallet's own chain one Base Radar
 * actually supports" — which only ever means Base Mainnet or Base Sepolia,
 * regardless of how many chains the Project Registry knows about.
 */

import { base, baseSepolia } from "viem/chains";

export const WALLET_SUPPORTED_CHAINS = [base, baseSepolia] as const;

const SUPPORTED_CHAIN_IDS = new Set<number>(WALLET_SUPPORTED_CHAINS.map((chain) => chain.id));

export function isSupportedWalletChain(chainId: number | undefined): boolean {
  return chainId !== undefined && SUPPORTED_CHAIN_IDS.has(chainId);
}

/**
 * Per-chain BaseScan origin — Base Mainnet and Base Sepolia are separate
 * explorer instances, unlike `CHAIN_BRANDING.base.explorerUrl` which only
 * ever points at the mainnet one.
 */
const WALLET_CHAIN_EXPLORER_URL: Record<number, string> = {
  [base.id]: "https://basescan.org",
  [baseSepolia.id]: "https://sepolia.basescan.org",
};

/** `null` when `chainId` isn't a wallet-supported chain — never guesses at an explorer for a network Base Radar doesn't recognize. */
export function getWalletExplorerAddressUrl(chainId: number | undefined, address: string): string | null {
  if (chainId === undefined) return null;
  const origin = WALLET_CHAIN_EXPLORER_URL[chainId];
  return origin ? `${origin}/address/${address}` : null;
}
