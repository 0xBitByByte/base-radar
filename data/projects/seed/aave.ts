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
  contracts: [
    {
      chain: "base",
      address: "0x63706e401c06ac8513145b7687a14804d17f814b",
      type: "token",
      label: "AAVE token (Base)",
    },
  ],
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
    // PR-051 — same AAVE token address as `contracts` above, verified via
    // CoinGecko's own "Contract" panel (cross-checked against its Basescan
    // link) — populated here too since this field feeds the separate
    // Blockscout verification-heuristic match (`matchVerifiedContract`),
    // not just the Contracts section display.
    blockscoutAddress: "0x63706e401c06ac8513145b7687a14804d17f814b",
  },
  governance: {
    // PR-074 REVIEW #9 — was "aave.eth", a dead Snapshot space (confirmed via
    // a direct query against Snapshot's public GraphQL API: `space(id:
    // "aave.eth")` returns null). Aave's real, active governance space is
    // "aavedao.eth" (966 proposals, most recent still open at time of
    // writing) — the dead slug was silently returning zero proposals every
    // time, which read as "Aave has no governance activity," masking a
    // registry data bug as a real absence of activity.
    snapshotSpace: "aavedao.eth",
    governanceType: "snapshot",
    governanceUrl: "https://snapshot.org/#/aavedao.eth",
  },
};
