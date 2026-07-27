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
  contracts: [
    {
      chain: "base",
      address: "0x8Ee73c484A26e0A5df2Ee2a4960B789967dd0415",
      type: "token",
      label: "CRV token (Base)",
    },
  ],
  github: {
    owner: "curvefi",
    // PR-051 — resolved to the org's real, most-starred, actively
    // maintained repo (previously org-only, so `matchGithub` never had a
    // specific repo to query for this project).
    repo: "curve-stablecoin",
    url: "https://github.com/curvefi/curve-stablecoin",
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
    // PR-051 — verified via CoinGecko's own "Contract" panel / Basescan link.
    blockscoutAddress: "0x8Ee73c484A26e0A5df2Ee2a4960B789967dd0415",
  },
};
