import type { Chain, DiscoverySource } from "@/data/projects/enums";
import type { GithubRepoRef, SocialLinks } from "@/data/projects/types";

/**
 * A candidate's on-chain footprint, as surfaced by a discovery source.
 * Deliberately narrower than the registry's own `ProjectContract` — a
 * candidate isn't yet known to be a token, router, vault, etc., so no
 * `type` field is recorded until a reviewer classifies it.
 */
export type CandidateContract = {
  chain: Chain;
  address: string;
};

/**
 * The subset of `SocialLinks` a discovery source can realistically surface
 * on its own (a listing endpoint, a mention, a repo link) — never the full
 * set, since nothing here performs the kind of manual review that
 * populates `docs`/`blog`/`forum`/etc. on a real registry entry.
 */
export type CandidateSocials = Pick<SocialLinks, "twitter" | "farcaster" | "discord" | "telegram">;

/**
 * A project surfaced by a `DiscoveryProvider`, before any human or
 * automated review — NOT a registry entry. See docs/DISCOVERY_ENGINE.md
 * "Candidate Lifecycle" for how (and whether) a candidate ever becomes a
 * `Project` in `data/projects/`.
 */
export type CandidateProject = {
  /** Which `DiscoverySource` surfaced this candidate. */
  source: DiscoverySource;
  /** The source's own identifier for this candidate (a CoinGecko coin id, a Blockscout address, ...) — stable enough to dedupe repeat syncs from the same source. */
  externalId: string;
  /** Lowercased, punctuation-stripped form of `displayName` — see `normalizeName()`. Used for name-based duplicate matching, never displayed. */
  normalizedName: string;
  /** The name exactly as reported by the source — never altered. */
  displayName: string;
  website?: string;
  github?: GithubRepoRef;
  socials: CandidateSocials;
  /** Known contracts, if the source surfaced any. Usually empty — most sources don't carry on-chain addresses. */
  contracts: CandidateContract[];
  /**
   * PR-053 — CoinGecko's real API `id` (`/coins/markets`'s own `id` field),
   * set only by the `coingecko` discovery source, which already fetches it
   * as `externalId`. Kept as its own named, structured field (rather than
   * reaching into `providerMetadata`) so `lib/discovery/registryMatch.ts`
   * can compare it directly against a registry project's
   * `providerIds.coingeckoId` — see docs/PR-051_REGISTRY_COMPLETION_REPORT.md
   * for why a URL-slug/API-id mismatch here is a real, previously-seen bug
   * class this structured comparison avoids.
   */
  coingeckoId?: string;
  /**
   * PR-053 — best-effort slug derived from the candidate's own display name
   * via `slugify()` (`lib/discovery/normalize.ts`), set only by the
   * `defillama` discovery source. DefiLlama's typed `Protocol` wrapper
   * (`lib/providers/defillama/mapper.ts`) carries no real slug field (see
   * docs/DISCOVERY_ENGINE.md), so this is deliberately a fuzzy,
   * name-derived approximation — matching logic must treat it as weaker
   * evidence than `coingeckoId`, never as an exact identifier.
   */
  defillamaSlug?: string;
  /**
   * PR-072 — the source's own real logo/image URL, when it has one
   * (CoinGecko's `imageUrl`, DefiLlama's `logoUrl`) — kept as its own
   * structured field for the same reason `coingeckoId`/`defillamaSlug` are,
   * rather than reaching into `providerMetadata`.
   */
  logoUrl?: string;
  /** ISO timestamp of this discovery run, not the project's real-world launch date. */
  discoveredAt: string;
  /**
   * 0-100. A source-level trust default (see `SOURCE_CONFIDENCE` in
   * `normalize.ts`), not a per-candidate quality assessment — this PR does
   * not attempt to score individual candidates more precisely than "which
   * source found it."
   */
  confidence: number;
  /** The raw, unmodified provider response this candidate was built from — kept for audit/debugging, never read by application logic. */
  providerMetadata: Record<string, unknown>;
};

/** The review states a `DiscoveryQueueEntry` can be in. See docs/DISCOVERY_ENGINE.md "Candidate Lifecycle". */
export const DISCOVERY_QUEUE_STATUSES = ["new", "needs-review", "accepted", "rejected", "duplicate"] as const;
export type DiscoveryQueueStatus = (typeof DISCOVERY_QUEUE_STATUSES)[number];
