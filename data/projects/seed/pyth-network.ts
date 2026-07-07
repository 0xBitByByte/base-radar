import type { Project } from "@/data/projects/types";

export const pythNetwork: Project = {
  id: "pyth-network",
  slug: "pyth-network",
  name: "Pyth Network",
  shortDescription: "First-party financial oracle delivering low-latency price feeds onchain.",
  description:
    "Pyth Network aggregates price data directly from major exchanges and trading firms, publishing low-latency oracle feeds that Base protocols rely on for pricing and liquidations.",
  websiteUrl: "https://pyth.network",
  categories: ["oracle", "infrastructure"],
  tags: ["cross-chain", "developer-tooling"],
  status: "live",
  chains: ["base", "ethereum", "arbitrum", "optimism", "solana"],
  contracts: [],
  github: {
    owner: "pyth-network",
    url: "https://github.com/pyth-network",
  },
  social: {
    twitter: "https://twitter.com/PythNetwork",
  },
  verification: {
    status: "verified",
    source: "Base Radar review",
  },
  providerIds: {
    coingeckoId: "pyth-network",
  },
};
