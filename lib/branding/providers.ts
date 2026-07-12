import { Activity, Blocks, Landmark, LineChart, Zap } from "lucide-react";

import { GithubMark } from "@/components/ui/BrandIcons";
import type { ProviderName } from "@/lib/providers/common/types";
import type { ProviderBrand } from "@/lib/branding/types";

/**
 * Display metadata for every provider this Engine integrates with — the
 * single source `ProviderIndicator` (Quick View's Sources section) and
 * `ProviderBadge` both read, replacing what used to be a private label map
 * duplicated inside `ProviderIndicator` alone. No official brand marks
 * exist in this codebase for these six (only GitHub's real mark does, via
 * `BrandIcons`) — the rest get a generic, sensible icon rather than a
 * fabricated logo, kept deliberately muted wherever rendered (attribution,
 * not a promotional lockup).
 */
export const PROVIDER_BRANDING: Record<ProviderName, ProviderBrand> = {
  coingecko: {
    label: "CoinGecko",
    Icon: LineChart,
    description: "Price, market cap, and 24h volume, pulled live from CoinGecko's public API.",
  },
  dexscreener: {
    label: "DexScreener",
    Icon: Activity,
    description: "On-chain DEX pair price, volume, and liquidity data from DexScreener.",
  },
  defillama: {
    label: "DefiLlama",
    Icon: Landmark,
    description: "Total value locked (TVL), sourced live from DefiLlama's protocol data.",
  },
  blockscout: {
    label: "Blockscout",
    Icon: Blocks,
    description: "On-chain contract and network activity, read directly from Base's Blockscout explorer.",
  },
  github: {
    label: "GitHub",
    Icon: GithubMark,
    description: "Stars, forks, open issues, and release activity, sourced live from the GitHub API.",
  },
  base: {
    label: "Base Network",
    Icon: Zap,
    description: "Live gas price and network status, read directly from the Base RPC.",
  },
};
