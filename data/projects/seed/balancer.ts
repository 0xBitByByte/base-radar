import type { Project } from "@/data/projects/types";

export const balancer: Project = {
  id: "balancer",
  slug: "balancer",
  name: "Balancer",
  shortDescription: "Flexible AMM protocol supporting custom pool weightings and composable liquidity.",
  description:
    "Balancer generalizes the AMM model to support pools with more than two assets and arbitrary weightings, powering everything from index-like pools to boosted yield-bearing liquidity on Base.",
  websiteUrl: "https://balancer.fi",
  categories: ["dex"],
  tags: ["cross-chain"],
  status: "live",
  chains: ["base", "ethereum", "arbitrum", "polygon"],
  contracts: [],
  github: {
    owner: "balancer",
    // PR-051 — resolved to the org's real, pinned, most-starred contracts
    // repo (previously org-only, so `matchGithub` never had a specific
    // repo to query for this project).
    repo: "balancer-v3-monorepo",
    url: "https://github.com/balancer/balancer-v3-monorepo",
  },
  social: {
    twitter: "https://twitter.com/balancer",
  },
  verification: {
    status: "verified",
    source: "Base Radar review",
  },
  providerIds: {
    coingeckoId: "balancer",
    defillamaSlug: "balancer-v2",
    // PR-051 — no Base contract address added: CoinGecko's BAL page listed
    // two distinct Base-chain addresses without a clear "this one is
    // canonical" label, and this pass couldn't confidently disambiguate
    // them within audit time. Left empty rather than guessed — a real
    // remaining gap, not an oversight.
  },
};
