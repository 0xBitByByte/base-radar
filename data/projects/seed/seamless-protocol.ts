import type { Project } from "@/data/projects/types";

export const seamlessProtocol: Project = {
  id: "seamless-protocol",
  slug: "seamless-protocol",
  name: "Seamless Protocol",
  shortDescription: "Base-native, community-governed lending and borrowing protocol.",
  description:
    "Seamless Protocol is a non-custodial lending market built on Base, forked from and extending the Aave v3 codebase with its own governance and incentive design.",
  websiteUrl: "https://www.seamlessprotocol.com",
  categories: ["lending"],
  tags: ["base-native", "real-yield"],
  status: "live",
  chains: ["base"],
  contracts: [],
  social: {
    twitter: "https://twitter.com/seamlessfi",
  },
  verification: {
    status: "community",
    source: "Base ecosystem directory",
  },
  providerIds: {
    coingeckoId: "seamless-protocol",
    defillamaSlug: "seamless-protocol",
  },
};
