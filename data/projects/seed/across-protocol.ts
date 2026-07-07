import type { Project } from "@/data/projects/types";

export const acrossProtocol: Project = {
  id: "across-protocol",
  slug: "across-protocol",
  name: "Across Protocol",
  shortDescription: "Fast, low-cost cross-chain bridge secured by optimistic verification.",
  description:
    "Across is a cross-chain bridge that uses a single unified liquidity pool and optimistic verification to offer fast, capital-efficient transfers between Base and other major chains.",
  websiteUrl: "https://across.to",
  categories: ["bridge"],
  tags: ["cross-chain"],
  status: "live",
  chains: ["base", "ethereum", "arbitrum", "optimism", "polygon"],
  contracts: [],
  github: {
    owner: "across-protocol",
    url: "https://github.com/across-protocol",
  },
  social: {
    twitter: "https://twitter.com/AcrossProtocol",
  },
  verification: {
    status: "verified",
    source: "Base Radar review",
  },
  providerIds: {
    coingeckoId: "across-protocol",
    defillamaSlug: "across",
  },
};
