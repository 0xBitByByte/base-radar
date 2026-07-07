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
  contracts: [],
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
  },
};
