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
  coingecko: { label: "CoinGecko", Icon: LineChart },
  dexscreener: { label: "DexScreener", Icon: Activity },
  defillama: { label: "DefiLlama", Icon: Landmark },
  blockscout: { label: "Blockscout", Icon: Blocks },
  github: { label: "GitHub", Icon: GithubMark },
  base: { label: "Base Network", Icon: Zap },
};
