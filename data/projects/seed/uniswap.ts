import type { Project } from "@/data/projects/types";

export const uniswap: Project = {
  id: "uniswap",
  slug: "uniswap",
  name: "Uniswap",
  shortDescription: "The most widely used decentralized exchange protocol, live on Base.",
  description:
    "Uniswap is a leading decentralized exchange protocol for swapping and providing liquidity across ERC-20 tokens. Its v3 concentrated-liquidity contracts are deployed on Base alongside Ethereum and other major L2s.",
  websiteUrl: "https://uniswap.org",
  categories: ["dex"],
  tags: ["cross-chain"],
  status: "live",
  chains: ["base", "ethereum", "arbitrum", "optimism", "polygon"],
  // Trading Discovery Strategy audit — genuinely empty, not an oversight:
  // UNI has no Base deployment at all (confirmed live against CoinGecko's
  // own `platforms` listing for the `uniswap` coin id — Ethereum, Polygon,
  // Arbitrum, Optimism, Avalanche, BSC, and others, but not Base). Uniswap
  // still has real, active Base pools — see `providerIds.dexscreenerDexIds`
  // below, which is what actually drives this project's pool discovery now.
  contracts: [],
  github: {
    owner: "Uniswap",
    repo: "v3-core",
    url: "https://github.com/Uniswap/v3-core",
  },
  social: {
    twitter: "https://twitter.com/uniswap",
  },
  verification: {
    status: "verified",
    source: "Base Radar review",
  },
  providerIds: {
    coingeckoId: "uniswap",
    dexscreenerChainId: "base",
    defillamaSlug: "uniswap",
    // Trading Discovery Strategy — verified live against real DexScreener
    // Base pair data (`dexId: "uniswap"` on real, currently-trending
    // pairs). This is the fix for the reported "Uniswap shows no pools"
    // issue: the old pipeline could only discover pools by looking up a
    // project's own Base token contract, which Uniswap doesn't have — its
    // real Base footprint is the exchange it hosts, not a token. See
    // `lib/trading/discoveryStrategy.ts`.
    dexscreenerDexIds: ["uniswap"],
  },
  governance: {
    snapshotSpace: "uniswapgovernance.eth",
    governanceType: "snapshot",
    governanceUrl: "https://snapshot.org/#/uniswapgovernance.eth",
  },
};
