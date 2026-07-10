import {
  ArbitrumChainIcon,
  AvalancheChainIcon,
  BaseChainIcon,
  BnbChainIcon,
  EthereumChainIcon,
  OptimismChainIcon,
  PolygonChainIcon,
  SolanaChainIcon,
} from "@/components/branding/ChainIcons";
import { splitOverflow } from "@/lib/utils";
import type { ChainBrand } from "@/lib/branding/types";

/**
 * Official per-chain brand colors and logomarks — the one place these are
 * allowed to live; never hardcode one inside a consuming UI component
 * (`ChainBadge` is the only reader). `base`'s color matches this codebase's
 * own `--color-radar-primary` (app/globals.css) — not a coincidence, Base's
 * brand blue is already this app's primary accent.
 *
 * Keyed by lowercase chain id so both the Project Registry's `Chain` union
 * (`data/projects/enums.ts`) and any chain not yet in that union (e.g. BNB
 * Chain, listed as supported here ahead of the registry adding it) resolve
 * through the same lookup — `ChainBadge` falls back to a neutral,
 * undecorated pill for anything not listed here instead of throwing.
 */
export const CHAIN_BRANDING: Record<string, ChainBrand> = {
  base: {
    id: "base",
    label: "Base",
    color: "#0052FF",
    Icon: BaseChainIcon,
    networkType: "L2",
    shortLabel: "Native",
    description: "Base Ecosystem",
    chainId: 8453,
    nativeCurrency: "ETH",
    layer: "L2",
    ecosystem: "Ethereum",
    explorerUrl: "https://basescan.org",
  },
  ethereum: {
    id: "ethereum",
    label: "Ethereum",
    color: "#627EEA",
    Icon: EthereumChainIcon,
    networkType: "L1",
    shortLabel: "Layer 1",
    description: "Ethereum Mainnet",
    chainId: 1,
    nativeCurrency: "ETH",
    layer: "L1",
    ecosystem: "Ethereum",
    explorerUrl: "https://etherscan.io",
  },
  arbitrum: {
    id: "arbitrum",
    label: "Arbitrum",
    color: "#28A0F0",
    Icon: ArbitrumChainIcon,
    networkType: "L2",
    shortLabel: "Layer 2",
    description: "Optimistic Rollup",
    chainId: 42161,
    nativeCurrency: "ETH",
    layer: "L2",
    ecosystem: "Ethereum",
    explorerUrl: "https://arbiscan.io",
  },
  optimism: {
    id: "optimism",
    label: "Optimism",
    color: "#FF0420",
    Icon: OptimismChainIcon,
    networkType: "L2",
    shortLabel: "OP Stack",
    description: "Optimistic Rollup",
    chainId: 10,
    nativeCurrency: "ETH",
    layer: "L2",
    ecosystem: "Ethereum",
    explorerUrl: "https://optimistic.etherscan.io",
  },
  polygon: {
    id: "polygon",
    label: "Polygon",
    color: "#8247E5",
    Icon: PolygonChainIcon,
    networkType: "sidechain",
    shortLabel: "PoS Chain",
    description: "Polygon PoS",
    chainId: 137,
    nativeCurrency: "POL",
    layer: "sidechain",
    ecosystem: "Ethereum",
    explorerUrl: "https://polygonscan.com",
  },
  avalanche: {
    id: "avalanche",
    label: "Avalanche",
    color: "#E84142",
    Icon: AvalancheChainIcon,
    networkType: "L1",
    shortLabel: "C-Chain",
    description: "Avalanche C-Chain",
    chainId: 43114,
    nativeCurrency: "AVAX",
    layer: "L1",
    ecosystem: "Avalanche",
    explorerUrl: "https://snowtrace.io",
  },
  bnb: {
    id: "bnb",
    label: "BNB Chain",
    color: "#F0B90B",
    Icon: BnbChainIcon,
    networkType: "L1",
    shortLabel: "Layer 1",
    chainId: 56,
    nativeCurrency: "BNB",
    layer: "L1",
    ecosystem: "BNB Chain",
    explorerUrl: "https://bscscan.com",
  },
  solana: {
    id: "solana",
    label: "Solana",
    color: "#9945FF",
    Icon: SolanaChainIcon,
    networkType: "L1",
    shortLabel: "Layer 1",
    // Solana isn't EVM/EIP-155, so it has no `chainId` — omitted rather
    // than filled with an invented number.
    nativeCurrency: "SOL",
    layer: "L1",
    ecosystem: "Solana",
    explorerUrl: "https://explorer.solana.com",
  },
};

export function getChainBrand(chain: string): ChainBrand | null {
  return CHAIN_BRANDING[chain.toLowerCase()] ?? null;
}

/**
 * Base Radar is Base-first: every chain list renders in this fixed order,
 * never the Project Registry's authored array order and never
 * alphabetical. Anything not in this list (a future chain not yet added
 * here) sorts after everything that is, in its original relative order —
 * `Array.prototype.sort` is stable, so ties never reshuffle.
 */
const CHAIN_PRIORITY = [
  "base",
  "ethereum",
  "optimism",
  "arbitrum",
  "polygon",
  "avalanche",
  "bnb",
  "solana",
];

function chainRank(chain: string): number {
  const index = CHAIN_PRIORITY.indexOf(chain.toLowerCase());
  return index === -1 ? CHAIN_PRIORITY.length : index;
}

/** The one place chain display order is decided — every consumer (`ChainBadge`, `ChainBadgeGroup`, and any future Project Profile chain list) sorts through this rather than trusting API/registry array order. */
export function getSortedChains(chains: string[]): string[] {
  return [...chains].sort((a, b) => chainRank(a) - chainRank(b));
}

/**
 * Sorts, then splits into what's directly visible vs. what collapses
 * behind a "+N" indicator — the single function `ChainBadgeGroup` (Grid,
 * Table, Quick View) calls, so sorting and overflow counting can never
 * drift apart between consumers. Also returns `all` (the same sorted,
 * Base-first list `visible`/`hidden` were split from) so a consumer's
 * "+N" overflow tooltip can show the complete supported-chain list
 * instead of only the hidden remainder — without a second sort call.
 */
export function getDisplayChains(
  chains: string[],
  max?: number
): { visible: string[]; hidden: string[]; all: string[] } {
  const sorted = getSortedChains(chains);
  return { ...splitOverflow(sorted, max ?? sorted.length), all: sorted };
}
