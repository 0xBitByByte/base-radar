import type { Project } from "@/data/projects/types";

export const virtualsProtocol: Project = {
  id: "virtuals-protocol",
  slug: "virtuals-protocol",
  name: "Virtuals Protocol",
  shortDescription: "Platform for co-owning and launching tokenized AI agents.",
  description:
    "Virtuals Protocol lets creators launch tokenized AI agents with onchain ownership and revenue sharing, and has become a hub for the AI-agent token wave on Base.",
  websiteUrl: "https://virtuals.io",
  categories: ["ai"],
  tags: ["ai-agents", "base-native"],
  status: "live",
  chains: ["base"],
  contracts: [],
  social: {
    twitter: "https://twitter.com/virtuals_io",
  },
  verification: {
    status: "community",
    source: "Base ecosystem directory",
  },
  providerIds: {
    coingeckoId: "virtual-protocol",
  },
};
