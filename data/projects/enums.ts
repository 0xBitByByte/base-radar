/**
 * Enumerations for the Project Registry.
 *
 * Each is modeled as a `readonly` tuple of string literals (rather than a
 * TypeScript `enum`) so that:
 *   - the values are usable directly as plain strings (JSON-serializable,
 *     no runtime import required to compare against a seed value),
 *   - the derived union type stays in sync with the tuple automatically,
 *   - the tuple itself can be iterated (e.g. to render a filter list)
 *     without a separate "all values" helper.
 */

export const PROJECT_CATEGORIES = [
  "dex",
  "lending",
  "derivatives",
  "yield",
  "stablecoin",
  "bridge",
  "infrastructure",
  "oracle",
  "wallet",
  "identity",
  "nft",
  "gaming",
  "social",
  "ai",
  "rwa",
  "dao",
  "launchpad",
  "analytics",
  "security",
  "other",
] as const;
export type ProjectCategory = (typeof PROJECT_CATEGORIES)[number];

/**
 * Tags are looser, narrative-style descriptors layered on top of
 * categories — the same vocabulary the dashboard's trending/narrative
 * widgets already use. A project can carry several.
 */
export const PROJECT_TAGS = [
  "base-native",
  "coinbase-ecosystem",
  "ai-agents",
  "onchain-social",
  "real-yield",
  "liquid-staking",
  "restaking",
  "perpetuals",
  "points-program",
  "account-abstraction",
  "cross-chain",
  "privacy",
  "public-good",
  "memecoin",
  "creator-economy",
  "developer-tooling",
] as const;
export type ProjectTag = (typeof PROJECT_TAGS)[number];

export const PROJECT_STATUSES = [
  "live",
  "beta",
  "development",
  "deprecated",
  "sunset",
] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

/**
 * How much the registry itself vouches for an entry — distinct from any
 * on-chain "verified contract" concept. This describes editorial trust in
 * the metadata (identity, links, contracts) recorded here.
 */
export const VERIFICATION_STATUSES = [
  /** Identity, links and contracts manually reviewed by the Base Radar team. */
  "verified",
  /** Sourced from a reputable community/ecosystem directory, not independently confirmed. */
  "community",
  /** Self-reported or freshly added; not yet reviewed. */
  "unverified",
  /** Known issue (mismatched contract, impersonation report, etc.) — kept for transparency. */
  "flagged",
] as const;
export type VerificationStatus = (typeof VERIFICATION_STATUSES)[number];

export const CHAINS = [
  "base",
  "ethereum",
  "optimism",
  "arbitrum",
  "polygon",
  "avalanche",
  "solana",
] as const;
export type Chain = (typeof CHAINS)[number];

export const CONTRACT_TYPES = [
  "token",
  "router",
  "factory",
  "pool",
  "vault",
  "staking",
  "governance",
  "proxy",
  "bridge",
  "other",
] as const;
export type ContractType = (typeof CONTRACT_TYPES)[number];
