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

/**
 * PR-037 — Registry lifecycle: the state of the *registry record itself*,
 * distinct from `ProjectStatus` (the real-world operational state of the
 * underlying product). A project can be `status: "sunset"` (the team wound
 * it down) while `lifecycle.state` stays `"active"` (Base Radar keeps
 * tracking it for historical value), or conversely reach `"archived"` once
 * it's no longer worth surfacing in discovery at all. See
 * docs/PROJECT_REGISTRY.md "Project Lifecycle".
 */
export const REGISTRY_LIFECYCLE_STATES = [
  /** Surfaced by a discovery source; no full registry entry exists yet. */
  "discovered",
  /** A full registry entry, surfaced in discovery/search/dashboards as normal. */
  "active",
  /** Still a valid entry, but excluded from default discovery surfaces (e.g. long-dormant). */
  "inactive",
  /** Deliberately removed from active discovery — kept for historical/audit purposes only. */
  "archived",
  /** A confirmed duplicate of another entry — see `ProjectLifecycle.duplicateOf`. */
  "duplicate",
  /** Superseded by a successor entry (rebrand, contract migration, chain move) — see `ProjectLifecycle.migratedTo`. */
  "migrated",
  /** Confirmed fraudulent/malicious; kept for transparency, never surfaced in discovery. */
  "scam",
] as const;
export type RegistryLifecycleState = (typeof REGISTRY_LIFECYCLE_STATES)[number];

/**
 * PR-037 — How far a project has progressed through the registry's
 * ingestion pipeline. Orthogonal to `VerificationStatus` (editorial trust
 * in the metadata) and to `RegistryLifecycleState` (whether the record is
 * still active) — a project can be `level: "verified"` while its
 * `verification.status` is independently re-flagged for an unrelated,
 * newly-discovered issue. See docs/PROJECT_REGISTRY.md "Verification
 * Levels" for the full requirements of each level.
 */
export const VERIFICATION_LEVELS = [
  /** Surfaced by a discovery source; no registry entry exists yet. */
  "discovered",
  /** A registry entry exists with core identity fields (name, description, category, chains) and provider IDs. */
  "indexed",
  /** Reviewed against primary sources — `verification.status` is "verified" or "community", and provider IDs resolve to a real, matching project. */
  "verified",
  /** Enough live data resolves through `providerIds`/`github`/`governance` for the Alert Engine, Health Scorecard, and Daily Brief to produce a real (not "not currently available") read. */
  "intelligence-ready",
] as const;
export type VerificationLevel = (typeof VERIFICATION_LEVELS)[number];

/**
 * PR-037 — Where a candidate project was first surfaced, before it becomes
 * a registry entry. Recorded on `ProjectLifecycle.discoverySource`. See
 * docs/PROJECT_REGISTRY.md "Discovery Sources".
 */
export const DISCOVERY_SOURCES = [
  "base-ecosystem",
  "coingecko",
  "defillama",
  "blockscout",
  "github",
  "farcaster",
  "community",
  "ai-discovery",
] as const;
export type DiscoverySource = (typeof DISCOVERY_SOURCES)[number];
