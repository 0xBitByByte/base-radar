import type { Project } from "@/data/projects/types";

export const morpho: Project = {
  id: "morpho",
  slug: "morpho",
  name: "Morpho",
  shortDescription: "Trustless, efficient lending primitive with isolated markets.",
  description:
    "Morpho Blue is a minimal, immutable lending primitive that lets anyone create isolated markets with custom risk parameters. It's widely integrated by vault curators building on Base.",
  websiteUrl: "https://morpho.org",
  categories: ["lending"],
  tags: ["real-yield", "developer-tooling"],
  status: "live",
  chains: ["base", "ethereum"],
  contracts: [],
  github: {
    owner: "morpho-org",
    url: "https://github.com/morpho-org",
  },
  social: {
    twitter: "https://twitter.com/morpholabs",
  },
  verification: {
    status: "verified",
    source: "Base Radar review",
  },
  providerIds: {
    coingeckoId: "morpho",
    defillamaSlug: "morpho-blue",
  },
};
