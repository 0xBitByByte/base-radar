import type { Project } from "@/data/projects/types";

export const compound: Project = {
  id: "compound",
  slug: "compound",
  name: "Compound",
  shortDescription: "Algorithmic, autonomous interest rate protocol for lending markets.",
  description:
    "Compound is one of the original onchain money markets. Its Comet (v3) architecture is deployed on Base, offering isolated borrow markets backed by a single base asset per deployment.",
  websiteUrl: "https://compound.finance",
  categories: ["lending"],
  tags: ["cross-chain", "real-yield"],
  status: "live",
  chains: ["base", "ethereum", "arbitrum", "polygon"],
  contracts: [
    {
      chain: "base",
      address: "0x9e1028f5f1d5ede59748ffcee5532509976840e0",
      type: "token",
      label: "COMP token (Base)",
    },
  ],
  github: {
    owner: "compound-finance",
    repo: "comet",
    url: "https://github.com/compound-finance/comet",
  },
  social: {
    twitter: "https://twitter.com/compoundfinance",
  },
  verification: {
    status: "verified",
    source: "Base Radar review",
  },
  providerIds: {
    coingeckoId: "compound-governance-token",
    defillamaSlug: "compound-v3",
    // PR-051 — verified via CoinGecko's own "Contract" panel / Basescan link.
    blockscoutAddress: "0x9e1028f5f1d5ede59748ffcee5532509976840e0",
  },
  governance: {
    snapshotSpace: "comp-vote.eth",
    governanceType: "snapshot",
    governanceUrl: "https://snapshot.org/#/comp-vote.eth",
  },
};
