import type {
  Chain,
  ContractType,
  ProjectCategory,
  ProjectStatus,
  ProjectTag,
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
};
