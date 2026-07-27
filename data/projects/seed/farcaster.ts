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
    // PR-051 — resolved to the org's real, highest-fork-count, actively
    // maintained implementation repo (previously org-only, so
    // `matchGithub` never had a specific repo to query for this project).
    repo: "hub-monorepo",
    url: "https://github.com/farcasterxyz/hub-monorepo",
  },
  social: {
    twitter: "https://twitter.com/farcaster_xyz",
  },
  verification: {
    status: "community",
    source: "Base ecosystem directory",
  },
  // PR-051 — no CoinGecko/DefiLlama identifiers added: the Farcaster
  // protocol itself has no fungible token (its identity/registry contracts
  // exist on Optimism, not as a tradable asset), so there is nothing real
  // to link here. Left empty rather than guessed.
  providerIds: {},
};
