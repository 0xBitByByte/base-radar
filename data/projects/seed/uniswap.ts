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
  },
};
