import type { Project } from "@/data/projects/types";

export const clanker: Project = {
  id: "clanker",
  slug: "clanker",
  name: "Clanker",
  shortDescription: "Onchain AI agent for deploying tokens directly from social posts.",
  description:
    "Clanker is an AI agent that deploys ERC-20 tokens on Base in response to social media requests, popularizing a fast, conversational token-launch flow within the Farcaster/Base ecosystem.",
  websiteUrl: "https://clanker.world",
  categories: ["ai"],
  tags: ["ai-agents", "onchain-social", "base-native"],
  status: "live",
  chains: ["base"],
  contracts: [],
  social: {
    twitter: "https://twitter.com/clankeronbase",
  },
  verification: {
    status: "unverified",
    source: "Base ecosystem directory",
    notes: "recently added, pending review",
  },
  providerIds: {},
};
