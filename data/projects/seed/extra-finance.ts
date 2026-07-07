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
  contracts: [],
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
  },
};
