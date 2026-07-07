import type { Project } from "@/data/projects/types";

export const basenames: Project = {
  id: "basenames",
  slug: "basenames",
  name: "Basenames",
  shortDescription: "Onchain naming service for human-readable Base identities.",
  description:
    "Basenames is Base's official onchain identity system, letting users register human-readable .base names that resolve to their addresses, built on the same technology as ENS.",
  websiteUrl: "https://www.base.org/names",
  categories: ["identity"],
  tags: ["base-native", "public-good"],
  status: "live",
  chains: ["base"],
  contracts: [],
  github: {
    owner: "base-org",
    repo: "basenames",
    url: "https://github.com/base-org/basenames",
  },
  social: {
    twitter: "https://twitter.com/base",
  },
  verification: {
    status: "verified",
    source: "Base Radar review",
    notes: "Official Base ecosystem product",
  },
  providerIds: {},
};
