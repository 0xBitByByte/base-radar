/**
 * The narrative/topic taxonomy for an `AIIntelligenceBrief` — what the
 * brief is *about*, at the level a reader picks a filter chip. This is a
 * third, deliberately distinct "category" concept in this codebase:
 * `ProjectCategory` (`data/projects/enums.ts`) classifies a *project*
 * (dex/lending/nft/...); `AlertCategory` (`lib/alerts/types.ts`)
 * classifies an *event type* (governance/release/whale/...);
 * `IntelligenceCategory` classifies a *brief's subject matter* at the
 * ecosystem-topic level a reader would search or filter by. None of the
 * three are interchangeable — see docs/AI_INTELLIGENCE_ENGINE.md
 * "Intelligence Categories" for the full comparison.
 */
export const INTELLIGENCE_CATEGORIES = [
  "ecosystem",
  "defi",
  "ai",
  "infrastructure",
  "gaming",
  "nft",
  "social",
  "security",
  "governance",
  "stablecoins",
  "developer",
] as const;
export type IntelligenceCategory = (typeof INTELLIGENCE_CATEGORIES)[number];
