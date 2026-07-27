import type { Project } from "@/data/projects/types";

export const extraFinance: Project = {
  id: "extra-finance",
  slug: "extra-finance",
  name: "Extra Finance",
  shortDescription: "Leveraged yield farming and lending protocol native to Base.",
  description:
    "Extra Finance offers leveraged yield farming vaults and lending markets, letting users amplify returns on supported liquidity pairs while lenders earn yield on idle capital.",
  websiteUrl: "https://extrafi.io",
  categories: ["yield", "lending"],
  tags: ["base-native"],
  status: "live",
  chains: ["base", "optimism"],
  contracts: [
    {
      chain: "base",
      address: "0x2dad3a13ef0c6366220f989157009e501e7938f8",
      type: "token",
      label: "EXTRA token (Base)",
    },
  ],
  social: {
    twitter: "https://twitter.com/extrafi_io",
  },
  verification: {
    status: "community",
    source: "Base ecosystem directory",
  },
  providerIds: {
    coingeckoId: "extra-finance",
    defillamaSlug: "extra-finance",
    // PR-051 — verified via CoinGecko's own "Contract" panel / Basescan link.
    blockscoutAddress: "0x2dad3a13ef0c6366220f989157009e501e7938f8",
  },
  governance: {
    // Verified real, active Snapshot space via a direct GraphQL query
    // against hub.snapshot.org (space id "extrafinance.eth", name
    // "Extra DAO", real proposal "Shall we create the DAO?").
    snapshotSpace: "extrafinance.eth",
    governanceType: "snapshot",
    governanceUrl: "https://snapshot.box/#/s:extrafinance.eth",
  },
};
