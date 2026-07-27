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
  // PR-051 — checked, not just left unset: CoinGecko does list a coin with
  // the id "clanker", but it is a distinct, unrelated Solana-ecosystem meme
  // token (ticker CLANKER, contract on Solana, Solscan explorer) — not this
  // project. Attaching that id here would have silently mixed a different
  // project's market data into this one, which would have been worse than
  // leaving it empty. No GitHub reference either: this registry entry never
  // had one, and no single official Clanker repo could be confidently
  // identified within this pass. Left empty rather than guessed.
  providerIds: {},
};
