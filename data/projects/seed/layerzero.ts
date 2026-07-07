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
  contracts: [],
  github: {
    owner: "LayerZero-Labs",
    url: "https://github.com/LayerZero-Labs",
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
  },
};
