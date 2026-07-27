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
  contracts: [
    {
      chain: "base",
      address: "0x511ab53f793683763e5a8829738301368a2411e3",
      type: "token",
      label: "WELL token (Base)",
    },
  ],
  github: {
    owner: "moonwell-fi",
    repo: "moonwell-contracts-v2",
    url: "https://github.com/moonwell-fi/moonwell-contracts-v2",
  },
  social: {
    twitter: "https://twitter.com/moonwellfi",
  },
  verification: {
    status: "community",
    source: "Base ecosystem directory",
  },
  providerIds: {
    // PR-051 — verified live against CoinGecko: the URL slug "moonwell"
    // resolves, but the coin's real REST API id (shown as "API ID" on its
    // own CoinGecko page) is "moonwell-artemis". `matchMarket` compares
    // against `CoinMarket.id`, which is populated straight from the
    // `/coins/markets` response's own `id` field — that field is
    // "moonwell-artemis", so the previous "moonwell" value here could never
    // have matched. Corrected, not guessed: confirmed via CoinGecko's own
    // coin page before changing.
    coingeckoId: "moonwell-artemis",
    defillamaSlug: "moonwell",
    blockscoutAddress: "0x511ab53f793683763e5a8829738301368a2411e3",
  },
  governance: {
    // Verified real, active Snapshot space via a direct GraphQL query
    // against hub.snapshot.org (space id + name + real recent proposal
    // titles, e.g. "Remediation of Bad Debt From 10/10 Using Reserves").
    snapshotSpace: "moonwell-governance.eth",
    governanceType: "snapshot",
    governanceUrl: "https://snapshot.box/#/s:moonwell-governance.eth",
  },
};
