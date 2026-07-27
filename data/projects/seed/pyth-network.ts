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
    // PR-051 — resolved to the org's real, most-active cross-chain
    // programs/utilities repo, the piece most relevant to Pyth's Base
    // deployment (previously org-only, so `matchGithub` never had a
    // specific repo to query for this project).
    repo: "pyth-crosschain",
    url: "https://github.com/pyth-network/pyth-crosschain",
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
