import type { Project } from "@/data/projects/types";

export const safe: Project = {
  id: "safe",
  slug: "safe",
  name: "Safe",
  shortDescription: "Smart account infrastructure for secure multisig and account abstraction.",
  description:
    "Safe (formerly Gnosis Safe) is the most widely used smart account standard, providing multisig custody and account abstraction infrastructure across Base and most major EVM chains.",
  websiteUrl: "https://safe.global",
  categories: ["wallet", "security"],
  tags: ["account-abstraction", "cross-chain"],
  status: "live",
  chains: ["base", "ethereum", "arbitrum", "optimism", "polygon", "avalanche"],
  contracts: [],
  github: {
    owner: "safe-global",
    repo: "safe-smart-account",
    url: "https://github.com/safe-global/safe-smart-account",
  },
  social: {
    twitter: "https://twitter.com/safe",
  },
  verification: {
    status: "verified",
    source: "Base Radar review",
  },
  providerIds: {
    coingeckoId: "safe",
  },
};
