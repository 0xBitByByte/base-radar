import type { Project } from "@/data/projects/types";

export const usdCoin: Project = {
  id: "usd-coin",
  slug: "usd-coin",
  name: "USD Coin",
  shortDescription: "Fully reserved, dollar-pegged stablecoin issued by Circle.",
  description:
    "USD Coin (USDC) is a dollar-backed stablecoin issued by Circle, natively deployed on Base and used as the primary settlement and liquidity asset across the ecosystem.",
  websiteUrl: "https://www.circle.com/usdc",
  categories: ["stablecoin"],
  tags: ["cross-chain"],
  status: "live",
  chains: ["base", "ethereum", "arbitrum", "optimism", "polygon", "avalanche", "solana"],
  contracts: [
    {
      chain: "base",
      address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
      type: "token",
      label: "USDC (native, Base)",
    },
  ],
  github: {
    owner: "circlefin",
    url: "https://github.com/circlefin",
  },
  social: {
    twitter: "https://twitter.com/circle",
  },
  verification: {
    status: "verified",
    source: "Base Radar review",
    notes: "Contract address is Circle's published canonical native USDC deployment on Base.",
  },
  providerIds: {
    coingeckoId: "usd-coin",
  },
};
