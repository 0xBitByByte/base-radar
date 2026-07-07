import type { Project } from "@/data/projects/types";

export const curveFinance: Project = {
  id: "curve-finance",
  slug: "curve-finance",
  name: "Curve Finance",
  shortDescription: "Efficient stableswap AMM for low-slippage trading between similarly priced assets.",
  description:
    "Curve is a specialized AMM optimized for stablecoins and pegged assets, offering deep liquidity and low slippage. Its pools are deployed on Base alongside most major EVM chains.",
  websiteUrl: "https://curve.fi",
  categories: ["dex"],
  tags: ["cross-chain", "real-yield"],
  status: "live",
  chains: ["base", "ethereum", "arbitrum", "optimism", "polygon"],
  contracts: [],
  github: {
    owner: "curvefi",
    url: "https://github.com/curvefi",
  },
  social: {
    twitter: "https://twitter.com/curvefinance",
  },
  verification: {
    status: "verified",
    source: "Base Radar review",
  },
  providerIds: {
    coingeckoId: "curve-dao-token",
    defillamaSlug: "curve-dex",
  },
};
