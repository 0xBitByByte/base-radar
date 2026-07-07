import type { Project } from "@/data/projects/types";

export const farcaster: Project = {
  id: "farcaster",
  slug: "farcaster",
  name: "Farcaster",
  shortDescription: "Sufficiently decentralized social protocol powering onchain social apps.",
  description:
    "Farcaster is an open, permissionless protocol for building social apps. Its core identity and registry contracts live on Optimism, while a large share of its client and app ecosystem builds on Base.",
  websiteUrl: "https://www.farcaster.xyz",
  categories: ["social"],
  tags: ["onchain-social", "base-native"],
  status: "live",
  chains: ["optimism", "base"],
  contracts: [],
  github: {
    owner: "farcasterxyz",
    url: "https://github.com/farcasterxyz",
  },
  social: {
    twitter: "https://twitter.com/farcaster_xyz",
  },
  verification: {
    status: "community",
    source: "Base ecosystem directory",
  },
  providerIds: {},
};
