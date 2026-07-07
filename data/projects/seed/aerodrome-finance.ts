import type { Project } from "@/data/projects/types";

export const aerodromeFinance: Project = {
  id: "aerodrome-finance",
  slug: "aerodrome-finance",
  name: "Aerodrome Finance",
  shortDescription: "The central liquidity hub and ve(3,3) AMM for Base.",
  description:
    "Aerodrome is a next-generation AMM built for Base, combining vote-escrowed tokenomics with concentrated and stable liquidity pools to align liquidity providers, traders, and protocols around shared incentives.",
  websiteUrl: "https://aerodrome.finance",
  categories: ["dex", "yield"],
  tags: ["base-native", "real-yield"],
  status: "live",
  chains: ["base"],
  contracts: [],
  github: {
    owner: "aerodrome-finance",
    repo: "contracts",
    url: "https://github.com/aerodrome-finance/contracts",
  },
  social: {
    twitter: "https://twitter.com/aerodromefi",
  },
  verification: {
    status: "verified",
    source: "Base Radar review",
  },
  providerIds: {
    coingeckoId: "aerodrome-finance",
    dexscreenerChainId: "base",
    defillamaSlug: "aerodrome-finance",
  },
};
