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
  contracts: [
    {
      chain: "base",
      address: "0x940181a94a35a4569e4529a3cdfb74e38fd98631",
      type: "token",
      label: "AERO token (Base)",
    },
  ],
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
    // PR-051 — verified via CoinGecko's own "Contract" panel / Basescan link.
    blockscoutAddress: "0x940181a94a35a4569e4529a3cdfb74e38fd98631",
  },
  // PR-051 — could not verify a real Snapshot space for Aerodrome within
  // this pass (checked common name guesses via a direct Snapshot GraphQL
  // query; none resolved). Aerodrome's real governance is on-chain
  // ve(3,3) voting, not Snapshot signaling — left unconfigured rather than
  // guessed. See docs/PROVIDER_DATA_COVERAGE_AUDIT.md's Recommended
  // Provider Priority (on-chain Governor as a real, future second
  // candidate) for the correct future fix, not a fabricated Snapshot space.
};
