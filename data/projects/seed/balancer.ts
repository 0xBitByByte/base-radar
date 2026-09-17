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
  // Trading Discovery Strategy audit — re-checked live against CoinGecko's
  // own `platforms` listing for the `balancer` coin id: it now returns
  // exactly one Base address, resolving PR-051's earlier "two addresses,
  // couldn't disambiguate" caution below. Filled in as real data, not a
  // guess — though pool discovery itself no longer depends on this at all:
  // Balancer's `categories` include `"dex"` with `dexscreenerDexIds`
  // configured (see `providerIds` below), so its pools resolve via its
  // exchange identity, not this token address. Kept for logo resolution
  // and any other consumer that legitimately wants "Balancer's own token."
  contracts: [{ chain: "base", address: "0x4158734d47fc9692176b5085e0f52ee0da5d47f1", type: "token", label: "BAL token (Base)" }],
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
    // Trading Discovery Strategy — verified live against real DexScreener
    // pair data for Balancer's own Base token (BAL): every pair returned
    // real `dexId: "balancer"`. This is what makes Balancer's Pools page
    // show its real, active Base pools instead of "no pools" — the same
    // root-cause class of bug Uniswap had (no Base governance token to key
    // a lookup off of), fixed the same general way, not a one-off patch.
    dexscreenerDexIds: ["balancer"],
  },
};
