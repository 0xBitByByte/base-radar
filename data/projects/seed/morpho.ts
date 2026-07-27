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
  contracts: [
    {
      chain: "base",
      address: "0xbaa5cc21fd487b8fcc2f632f3f4e8d37262a0842",
      type: "token",
      label: "MORPHO token (Base)",
    },
  ],
  github: {
    owner: "morpho-org",
    // PR-051 — resolved to the org's real, most-starred, flagship contracts
    // repo (previously org-only, so `matchGithub` never had a specific repo
    // to query for this project).
    repo: "morpho-blue",
    url: "https://github.com/morpho-org/morpho-blue",
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
    // PR-051 — verified via CoinGecko's own "Contract" panel / Basescan link.
    blockscoutAddress: "0xbaa5cc21fd487b8fcc2f632f3f4e8d37262a0842",
  },
  governance: {
    // Verified real, active Snapshot space via a direct GraphQL query
    // against hub.snapshot.org (space id "morpho.eth", name "Morpho",
    // real recent grant proposals e.g. "MIP 132 - Morpho Worldcoin
    // Mini-App Transition Grant Proposal").
    snapshotSpace: "morpho.eth",
    governanceType: "snapshot",
    governanceUrl: "https://snapshot.box/#/s:morpho.eth",
  },
};
