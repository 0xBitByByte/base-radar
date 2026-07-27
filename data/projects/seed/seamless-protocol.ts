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
  contracts: [
    {
      chain: "base",
      address: "0x1c7a460413dd4e964f96d8dfc56e7223ce88cd85",
      type: "token",
      label: "SEAM token (Base)",
    },
  ],
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
    // PR-051 — verified via CoinGecko's own "Contract" panel / Basescan link.
    blockscoutAddress: "0x1c7a460413dd4e964f96d8dfc56e7223ce88cd85",
  },
  governance: {
    // Verified real, active Snapshot space via a direct GraphQL query
    // against hub.snapshot.org (space id "seamlessprotocol.eth", name
    // "Seamless", real recent proposals e.g. "[GP-12] Migration Bonus for
    // Impacted ILM v1.0 Users").
    snapshotSpace: "seamlessprotocol.eth",
    governanceType: "snapshot",
    governanceUrl: "https://snapshot.box/#/s:seamlessprotocol.eth",
  },
};
