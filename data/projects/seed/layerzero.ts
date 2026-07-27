import type { Project } from "@/data/projects/types";

export const layerZero: Project = {
  id: "layerzero",
  slug: "layerzero",
  name: "LayerZero",
  shortDescription: "Omnichain interoperability protocol connecting Base to dozens of chains.",
  description:
    "LayerZero is a messaging protocol that enables omnichain applications, letting contracts and tokens on Base communicate with and move between a wide range of other blockchains.",
  websiteUrl: "https://layerzero.network",
  categories: ["infrastructure"],
  tags: ["cross-chain", "developer-tooling"],
  status: "live",
  chains: ["base", "ethereum", "arbitrum", "optimism", "polygon", "avalanche"],
  contracts: [
    {
      chain: "base",
      address: "0x6985884c4392d348587b19cb9eaaf157f13271cd",
      type: "token",
      label: "ZRO token (Base)",
    },
  ],
  github: {
    owner: "LayerZero-Labs",
    // PR-051 — resolved to the org's real, most-starred, currently-shipping
    // V2 protocol repo (previously org-only, so `matchGithub` never had a
    // specific repo to query for this project).
    repo: "LayerZero-v2",
    url: "https://github.com/LayerZero-Labs/LayerZero-v2",
  },
  social: {
    twitter: "https://twitter.com/LayerZero_Labs",
  },
  verification: {
    status: "verified",
    source: "Base Radar review",
  },
  providerIds: {
    coingeckoId: "layerzero",
    defillamaSlug: "layerzero",
    // PR-051 — verified via CoinGecko's own "Contract" panel / Basescan link.
    blockscoutAddress: "0x6985884c4392d348587b19cb9eaaf157f13271cd",
  },
};
