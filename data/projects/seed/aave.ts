import type { Project } from "@/data/projects/types";

export const aave: Project = {
  id: "aave",
  slug: "aave",
  name: "Aave",
  shortDescription: "Leading decentralized liquidity protocol for lending and borrowing.",
  description:
    "Aave lets users supply assets to earn yield and borrow against collateral across many networks. Its v3 deployment on Base brings the protocol's battle-tested risk framework to the ecosystem.",
  websiteUrl: "https://aave.com",
  categories: ["lending"],
  tags: ["cross-chain", "real-yield"],
  status: "live",
  chains: ["base", "ethereum", "arbitrum", "optimism", "polygon", "avalanche"],
  contracts: [],
  github: {
    owner: "aave",
    repo: "aave-v3-core",
    url: "https://github.com/aave/aave-v3-core",
  },
  social: {
    twitter: "https://twitter.com/aave",
  },
  verification: {
    status: "verified",
    source: "Base Radar review",
  },
  providerIds: {
    coingeckoId: "aave",
    defillamaSlug: "aave-v3",
  },
  governance: {
    snapshotSpace: "aave.eth",
    governanceType: "snapshot",
    governanceUrl: "https://snapshot.org/#/aave.eth",
  },
};
