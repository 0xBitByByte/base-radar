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
    url: "https://github.com/balancer",
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
  },
};
