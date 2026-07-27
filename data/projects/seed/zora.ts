import type { Project } from "@/data/projects/types";

export const zora: Project = {
  id: "zora",
  slug: "zora",
  name: "Zora",
  shortDescription: "Onchain creator platform for minting and collecting media as NFTs.",
  description:
    "Zora provides protocols and tooling for creators to mint, sell, and collect onchain media. It operates its own Base-aligned L2 network alongside deep integration with Base itself.",
  websiteUrl: "https://zora.co",
  categories: ["nft"],
  tags: ["creator-economy", "base-native"],
  status: "live",
  chains: ["base", "ethereum", "optimism"],
  contracts: [
    {
      chain: "base",
      address: "0x1111111111166b7fe7bd91427724b487980afc69",
      type: "token",
      label: "ZORA token (Base)",
    },
  ],
  github: {
    owner: "ourzora",
    // PR-051 — resolved to the org's real, pinned, most-active repo
    // ("Monorepo for Zora Protocol (contracts & sdks)") — the org-only
    // reference here previously meant `matchGithub` never had a specific
    // repo to query, so this project's GitHub stats were always dark
    // despite `ourzora` being a large, active real org.
    repo: "zora-protocol",
    url: "https://github.com/ourzora/zora-protocol",
  },
  social: {
    twitter: "https://twitter.com/ourzora",
  },
  verification: {
    status: "community",
    source: "Base ecosystem directory",
  },
  providerIds: {
    // PR-051 — verified live on CoinGecko: real listing, "About Zora
    // (ZORA): Zora is a decentralized protocol and Layer 2 network
    // dedicated to the creator economy..." — matches this project's own
    // description. Contract cross-checked against Basescan/GeckoTerminal
    // links on the same CoinGecko page.
    coingeckoId: "zora",
    blockscoutAddress: "0x1111111111166b7fe7bd91427724b487980afc69",
  },
};
