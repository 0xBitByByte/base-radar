import type { Project } from "@/data/projects/types";

export const moonwell: Project = {
  id: "moonwell",
  slug: "moonwell",
  name: "Moonwell",
  shortDescription: "Open lending and borrowing protocol with a strong Base-native community.",
  description:
    "Moonwell is a decentralized lending protocol offering supply and borrow markets, with Base as one of its primary and most active deployments.",
  websiteUrl: "https://moonwell.fi",
  categories: ["lending"],
  tags: ["base-native", "real-yield"],
  status: "live",
  chains: ["base"],
  contracts: [],
  github: {
    owner: "moonwell-fi",
    url: "https://github.com/moonwell-fi",
  },
  social: {
    twitter: "https://twitter.com/moonwellfi",
  },
  verification: {
    status: "community",
    source: "Base ecosystem directory",
  },
  providerIds: {
    coingeckoId: "moonwell",
    defillamaSlug: "moonwell",
  },
};
