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
  contracts: [
    {
      chain: "base",
      address: "0x0b3e328455c4059eeb9e3f84b5543f74e24e7e1b",
      type: "token",
      label: "VIRTUAL token (Base)",
    },
  ],
  social: {
    twitter: "https://twitter.com/virtuals_io",
  },
  verification: {
    status: "community",
    source: "Base ecosystem directory",
  },
  providerIds: {
    coingeckoId: "virtual-protocol",
    // PR-051 — verified via CoinGecko's own "Contract" panel / Basescan link.
    blockscoutAddress: "0x0b3e328455c4059eeb9e3f84b5543f74e24e7e1b",
  },
  // PR-051 — no GitHub reference added: this registry entry never had one,
  // and no single, unambiguous official Virtuals Protocol contracts/SDK
  // repo could be confidently identified within this pass. Left empty
  // rather than guessed.
};
