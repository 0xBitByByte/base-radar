/**
 * Which data source contributed to an `AIIntelligenceBrief`. Extends
 * `ProviderName` (`lib/providers/common/types.ts` — coingecko/dexscreener/
 * defillama/blockscout/github/base, the live-API providers) with two
 * non-API sources this codebase already produces real data from:
 * `base-registry` (`data/projects/` — editorial/registry facts, not a
 * live API call) and `discovery-engine` (`lib/discovery/` — PR-039's
 * candidate pipeline). Deliberately a distinct type from `ProviderName`
 * rather than a modification of it — `ProviderName` is scoped to "things
 * `lib/providers/common/health.ts` tracks request success/failure for,"
 * which is meaningless for a registry read or a discovery-pipeline
 * result.
 */
export const INTELLIGENCE_SOURCE_TYPES = [
  "coingecko",
  "dexscreener",
  "defillama",
  "blockscout",
  "github",
  "base",
  "base-registry",
  "discovery-engine",
] as const;
export type IntelligenceSourceType = (typeof INTELLIGENCE_SOURCE_TYPES)[number];

/** Display label per source — matches `PROVIDER_DISPLAY_NAME` (`lib/intelligence/scorecard.ts`)'s wording for the six shared values. */
export const INTELLIGENCE_SOURCE_LABEL: Record<IntelligenceSourceType, string> = {
  coingecko: "CoinGecko",
  dexscreener: "DexScreener",
  defillama: "DefiLlama",
  blockscout: "Blockscout",
  github: "GitHub",
  base: "Base Network",
  "base-registry": "Base Registry",
  "discovery-engine": "Discovery Engine",
};

/** One contributing source, with optional human-facing detail — a brief can (and usually should) cite more than one. */
export type SourceReference = {
  source: IntelligenceSourceType;
  /** Overrides `INTELLIGENCE_SOURCE_LABEL` for a more specific citation, e.g. "GitHub — aerodrome-finance/contracts". */
  label?: string;
  url?: string;
};
