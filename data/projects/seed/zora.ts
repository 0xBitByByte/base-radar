import type { Project } from "@/data/projects/types";

export const zora: Project = {
  id: "zora",
  slug: "zora",
  name: "Zora",
  shortDescription: "Onchain creator platform for minting and collecting media as NFTs.",
  description:
    "Zora provides protocols and tooling for creators to mint, sell, and collect onchain media. It operates its own Base-aligned L2 network alongside deep integration with Base itself.",
  websiteUrl: "https://zora.co",
  categories: ["nft"],
  tags: ["creator-economy", "base-native"],
  status: "live",
  chains: ["base", "ethereum", "optimism"],
  contracts: [],
  github: {
    owner: "ourzora",
    url: "https://github.com/ourzora",
  },
  social: {
    twitter: "https://twitter.com/ourzora",
  },
  verification: {
    status: "community",
    source: "Base ecosystem directory",
  },
  providerIds: {},
};
