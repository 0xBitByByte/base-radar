import type {
  Chain,
  ContractType,
  DiscoverySource,
  ProjectCategory,
  ProjectStatus,
  ProjectTag,
  RegistryLifecycleState,
  VerificationLevel,
  VerificationStatus,
} from "@/data/projects/enums";

/**
 * A single on-chain contract belonging to a project. Kept intentionally
 * generic (one chain + one address + one type per entry) so a project with
 * a token on Base and a router on Ethereum is just two entries, not a
 * nested structure.
 */
export type ProjectContract = {
  chain: Chain;
  address: string;
  type: ContractType;
  /** Human-readable label, e.g. "AERO token" or "Router V2". */
  label?: string;
};

export type GithubRepoRef = {
  /** GitHub org or user, e.g. "aerodrome-finance". */
  owner: string;
  /** Repo name, e.g. "contracts". Omit for an org-level reference. */
  repo?: string;
  url: string;
};

export type SocialLinks = {
  twitter?: string;
  discord?: string;
  telegram?: string;
  farcaster?: string;
  docs?: string;
  blog?: string;
  forum?: string;
  medium?: string;
  mirror?: string;
  linkedin?: string;
};

/**
 * Identifiers used to join a registry entry against external data
 * providers. Every field is optional and populated incrementally — none of
 * these trigger a network call by existing. A future provider layer reads
 * these to know *what* to fetch; it never has to guess or search.
 *
 * See docs/PROJECT_REGISTRY.md for how each field maps to its provider.
 */
export type ProjectProviderIds = {
  /** CoinGecko coin id, e.g. "aerodrome-finance". */
  coingeckoId?: string;
  /** DexScreener chain id for this project's primary pairs (usually "base"). */
  dexscreenerChainId?: string;
  /** DexScreener pair addresses to look up, if known. */
  dexscreenerPairAddresses?: string[];
  /** DefiLlama protocol slug, e.g. "aerodrome-finance". */
  defillamaSlug?: string;
  /** Primary address to resolve on the Base Blockscout explorer. */
  blockscoutAddress?: string;
  /** Primary on-chain address for direct Base RPC reads. */
  baseRpcAddress?: string;
};

export type ProjectVerification = {
  status: VerificationStatus;
  /** ISO date the entry was last reviewed. */
  verifiedAt?: string;
  /** Who/what vouches for this entry, e.g. "Base Radar review". */
  source?: string;
  notes?: string;
};

/**
 * Governance data source, if this project has one (PR10). Every field is
 * optional, and the whole object should be omitted entirely rather than
 * guessed — a project with no confirmed real governance space simply has
 * no `governance` field, and `lib/governance` skips it rather than
 * fabricating proposal data. See docs/PROJECT_REGISTRY.md.
 */
export type ProjectGovernance = {
  /** Real, verified Snapshot.org space id, e.g. "aave.eth". */
  snapshotSpace?: string;
  governanceType?: "snapshot";
  governanceUrl?: string;
};

/**
 * PR-037 — Registry-record lifecycle. Omitted entirely for a project that
 * has always been a normal active entry (the common case for every current
 * seed project — absence means `state: "active"`, never "unknown"). See
 * docs/PROJECT_REGISTRY.md "Project Lifecycle".
 */
export type ProjectLifecycle = {
  state: RegistryLifecycleState;
  /** ISO date this project was first surfaced by any discovery source. */
  discoveredAt?: string;
  discoverySource?: DiscoverySource;
  /** ISO date `state` (or any lifecycle field) last changed. */
  updatedAt?: string;
  /** Set only when `state` is "duplicate" — the canonical project's `id`. */
  duplicateOf?: string;
  /** Set only when `state` is "migrated" — the successor project's `id`. */
  migratedTo?: string;
  notes?: string;
};

/**
 * PR-037 — Pipeline progress toward full live-data coverage. Distinct from
 * `ProjectVerification` (editorial trust in the metadata): a project can
 * reach `level: "verified"` only once `verification.status` is "verified"
 * or "community", but the two fields are recorded and updated
 * independently — this one never implies the other has changed. See
 * docs/PROJECT_REGISTRY.md "Verification Levels".
 */
export type ProjectVerificationLevel = {
  level: VerificationLevel;
  /** ISO date this level was reached. */
  reachedAt?: string;
  /** Plain-language description of what's still missing for the next level, if any. */
  nextRequirement?: string;
};

/**
 * PR-037 — Individual 0-100 inputs to `ProjectQualityScore`. Only
 * `metadataCompleteness` is computable from the static registry alone
 * today (see `computeMetadataCompletenessFactor` in
 * `data/projects/quality-score.ts`); the other five require the live
 * provider/intelligence layer and are future work. See
 * docs/PROJECT_REGISTRY.md "Quality Score".
 */
export type ProjectQualityFactors = {
  /** Share of optional Project fields populated (logoUrl, github, social, contracts, providerIds, governance). */
  metadataCompleteness: number;
  /** Contract verification, absence of flagged issues, audit links if known. */
  security: number;
  /** Recent GitHub commit/release activity. */
  activity: number;
  /** TVL/volume depth and stability, where the project has a market. */
  liquidity: number;
  /** Contributor count, release cadence, repo health. */
  development: number;
  /** Social reach and engagement signals, where measurable. */
  community: number;
  /** Whether docs/whitepaper/technical documentation is linked and current. */
  documentation: number;
};

/** PR-037 — Weighted composite of `ProjectQualityFactors`. Always computed, never hand-authored. */
export type ProjectQualityScore = {
  /** 0-100 weighted composite — see docs/PROJECT_REGISTRY.md for the weighting model. */
  total: number;
  factors: ProjectQualityFactors;
  computedAt: string;
};

export type Project = {
  /** Stable internal identifier, kebab-case, e.g. "aerodrome-finance". Never reused or renamed. */
  id: string;
  /** URL-friendly slug. Defaults to matching `id`; kept separate so routing can change independently of the primary key. */
  slug: string;
  name: string;
  /** One line, ~≤80 characters — for lists and cards. */
  shortDescription: string;
  /** A few sentences of factual, neutral description. */
  description: string;
  logoUrl?: string;
  websiteUrl: string;
  categories: ProjectCategory[];
  tags: ProjectTag[];
  status: ProjectStatus;
  /** Chains this project is deployed on. Order implies no priority. */
  chains: Chain[];
  /** Known contracts. Can be empty — see docs/PROJECT_REGISTRY.md before adding an address. */
  contracts: ProjectContract[];
  github?: GithubRepoRef;
  social: SocialLinks;
  verification: ProjectVerification;
  providerIds: ProjectProviderIds;
  governance?: ProjectGovernance;
  /** PR-037 — registry-record lifecycle. Omit entirely for an ordinary active entry. */
  lifecycle?: ProjectLifecycle;
  /** PR-037 — pipeline progress toward full live-data coverage. */
  verificationLevel?: ProjectVerificationLevel;
  /** PR-037 — composite quality score. Computed by a future scoring pass, never hand-authored. */
  qualityScore?: ProjectQualityScore;
};
