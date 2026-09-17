import { Activity, Zap } from "lucide-react";

import { BaseScanMark, CoinGeckoMark, DefiLlamaMark, GithubMark } from "@/components/ui/BrandIcons";
import type { ProviderName } from "@/lib/providers/common/types";
import type { ProviderBrand } from "@/lib/branding/types";

/**
 * Display metadata for every provider this Engine integrates with — the
 * single source `ProviderIndicator` (Quick View's Sources section) and
 * `ProviderBadge` both read, replacing what used to be a private label map
 * duplicated inside `ProviderIndicator` alone.
 *
 * PR-085.xx — coingecko/defillama/blockscout now reuse the exact same real
 * brand marks `SOCIAL_BRANDING` (`lib/branding/socials.ts`) already renders
 * elsewhere on this same page (the Project Profile Hero's icon row) —
 * `CoinGeckoMark`/`DefiLlamaMark`/`BaseScanMark` (Blockscout is Base's
 * BaseScan-branded explorer; the Hero's own `explorer` slot already uses
 * this identical mark for the identical real service), not new assets and
 * not a fetch. `dexscreener`/`base` (the L2 network itself, distinct from
 * Base Radar's own brand) genuinely have no real mark anywhere in this
 * codebase — confirmed no match in `BrandIcons.tsx` — so both keep their
 * existing generic, deliberately muted lucide icon rather than a fabricated
 * logo. `github` was already correct (`GithubMark`), unchanged.
 */
export const PROVIDER_BRANDING: Record<ProviderName, ProviderBrand> = {
  coingecko: {
    label: "CoinGecko",
    Icon: CoinGeckoMark,
    description: "Price, market cap, and 24h volume, pulled live from CoinGecko's public API.",
  },
  dexscreener: {
    label: "DexScreener",
    Icon: Activity,
    description: "On-chain DEX pair price, volume, and liquidity data from DexScreener.",
  },
  defillama: {
    label: "DefiLlama",
    Icon: DefiLlamaMark,
    description: "Total value locked (TVL), sourced live from DefiLlama's protocol data.",
  },
  blockscout: {
    label: "Blockscout",
    Icon: BaseScanMark,
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
