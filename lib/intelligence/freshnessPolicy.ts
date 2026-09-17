/**
 * PR-098.07 — Intelligence Freshness & Refresh Strategy, for the Featured
 * Intelligence snapshot (`lib/data/featuredIntelligenceSnapshot.ts`)
 * specifically.
 *
 * The single source of truth for "how fresh does this signal need to be,
 * and how should the UI honestly describe its age" — replacing the
 * previous single blanket 30-minute window every Featured Intelligence
 * signal shared regardless of how fast the underlying data actually moves
 * (see `featuredIntelligenceSnapshot.ts`'s own updated doc comment).
 * Every provider's own `CACHE_TTL_MS` (the real HTTP-fetch gate, one per
 * provider's `service.ts`) was retuned in this same PR to match one of
 * the classes below — this module is downstream of that: it never
 * fetches anything itself, it only classifies an already-known
 * `fetchedAt` timestamp into a freshness state and a UI-safe label.
 *
 * Deliberately a separate module from the existing `lib/intelligence/
 * freshness.ts` (`computeFreshness`) rather than a rewrite of it: that
 * function already computes `ProjectIntelligence.freshness` for the real,
 * shipped Intelligence Engine/dashboard, with its own simpler, coarser,
 * intentionally-provisional global-threshold model (its own doc comment:
 * "tune once real usage shows these need to be tighter or looser"). This
 * PR's audit is scoped to Featured Intelligence specifically — replacing
 * that separate, already-wired dashboard mechanism would be exactly the
 * kind of out-of-scope ripple into previously-shipped work this session's
 * conventions avoid. A real, related follow-up worth its own future PR.
 *
 * Deliberately a plain three-state model (fresh / stale / unavailable)
 * with one multiplier (3×) applied uniformly across every class, not a
 * bespoke curve per signal — simple, deterministic, and exactly as
 * precise as this product's real needs, per PR-098.04's own "do not
 * implement a complicated statistical model unless justified" precedent.
 */

export const FRESHNESS_CLASS_IDS = [
  "tokenPrice",
  "dexActivity",
  "tvl",
  "onchainActivity",
  "governance",
  "developerActivity",
  "security",
  "radarScore",
] as const;

export type FreshnessClassId = (typeof FRESHNESS_CLASS_IDS)[number];

export type FreshnessClassConfig = {
  /** Plain-language name for this signal class — never a provider or implementation name. */
  label: string;
  /** Below this age, the signal is "fresh" — matches the real, retuned provider-layer `CACHE_TTL_MS` for whichever provider(s) feed this class. */
  ttlMs: number;
  /** Between `ttlMs` and this age, the signal is "stale" but still shown (stale-while-revalidate) — beyond it, treated as "unavailable" rather than silently presenting very old data as current. A flat 3x multiplier of `ttlMs`, applied uniformly. */
  staleWindowMs: number;
};

/**
 * The audited, final freshness classes. Each `ttlMs` matches the real,
 * retuned `CACHE_TTL_MS` constant in the provider(s) that actually feed
 * this class (see each provider's own `service.ts` PR-098.07 comment for
 * the per-provider audit reasoning) — this table and the provider layer
 * must be changed together; a mismatch here would make this module's
 * freshness labels lie about the data's real cadence.
 */
export const FRESHNESS_CLASSES: Record<FreshnessClassId, FreshnessClassConfig> = {
  tokenPrice: { label: "Token Price", ttlMs: 120_000, staleWindowMs: 360_000 }, // 2min / 6min - CoinGecko
  dexActivity: { label: "DEX Liquidity & Volume", ttlMs: 300_000, staleWindowMs: 900_000 }, // 5min / 15min - DexScreener
  tvl: { label: "TVL", ttlMs: 720_000, staleWindowMs: 2_160_000 }, // 12min / 36min - DefiLlama
  onchainActivity: { label: "Onchain Activity", ttlMs: 300_000, staleWindowMs: 900_000 }, // 5min / 15min - DexScreener (same real cache entry as dexActivity)
  governance: { label: "Governance", ttlMs: 1_200_000, staleWindowMs: 3_600_000 }, // 20min / 60min - Snapshot
  developerActivity: { label: "Developer Activity", ttlMs: 1_800_000, staleWindowMs: 5_400_000 }, // 30min / 90min - GitHub
  security: { label: "Security", ttlMs: 2_700_000, staleWindowMs: 8_100_000 }, // 45min / 135min - Blockscout (contract verification)
  radarScore: { label: "Radar Score", ttlMs: 600_000, staleWindowMs: 1_800_000 }, // 10min / 30min - derived, see deriveScoreFreshness below
};

export type FreshnessState = "fresh" | "stale" | "unavailable";

export type SignalFreshness = {
  state: FreshnessState;
  /** The real ISO timestamp this signal was last successfully fetched - `null` only when `state` is "unavailable" because nothing has ever been fetched. Still present (not null) for a hard-expired "unavailable" reading, so a caller can compute "how long ago" even for expired data if it chooses to. */
  updatedAt: string | null;
  ageMs: number | null;
};

/**
 * Pure, deterministic: classifies an already-known `fetchedAt` timestamp
 * against one freshness class. `now` is injectable for tests - defaults to
 * the real clock.
 */
export function resolveFreshness(fetchedAt: string | null, classId: FreshnessClassId, now: number = Date.now()): SignalFreshness {
  if (!fetchedAt) return { state: "unavailable", updatedAt: null, ageMs: null };

  const fetchedAtMs = new Date(fetchedAt).getTime();
  if (Number.isNaN(fetchedAtMs)) return { state: "unavailable", updatedAt: null, ageMs: null };

  const ageMs = Math.max(0, now - fetchedAtMs);
  const { ttlMs, staleWindowMs } = FRESHNESS_CLASSES[classId];

  if (ageMs <= ttlMs) return { state: "fresh", updatedAt: fetchedAt, ageMs };
  if (ageMs <= staleWindowMs) return { state: "stale", updatedAt: fetchedAt, ageMs };
  // Hard expiry - requirement #4: never silently present data this old as
  // current. `updatedAt` is still returned (not nulled) so a caller that
  // wants to say "last seen 3 hours ago" can, but `formatFreshnessLabel`
  // below treats "unavailable" the same regardless of age.
  return { state: "unavailable", updatedAt: fetchedAt, ageMs };
}

/**
 * UI-safe label - plain product language only, never a TTL, provider
 * name, or cache-key detail. Matches the task's own suggested copy
 * ("Updated 4 min ago").
 */
export function formatFreshnessLabel(freshness: SignalFreshness): string {
  if (freshness.state === "unavailable") return "Not available";
  if (freshness.ageMs === null) return "Not available";

  const minutes = Math.round(freshness.ageMs / 60_000);
  const recency = minutes < 1 ? "Updated just now" : minutes === 1 ? "Updated 1 min ago" : `Updated ${minutes} min ago`;
  return freshness.state === "stale" ? `${recency} — may be outdated` : recency;
}

/**
 * PR-098.07 - the Radar Score / evidence-freshness relationship the task
 * explicitly requires an answer for. Policy, stated plainly:
 *
 * - A dimension EXCLUDED from the score (no data, or hard-expired past its
 *   own `staleWindowMs`) never makes the score itself "stale" - its
 *   absence is already handled by `computeRadarScore`'s own coverage/
 *   confidence-discount mechanism (PR-098.04): fewer dimensions means a
 *   lower, more conservative score, not a mislabeled fresh one.
 * - A dimension that WAS included but is aging (state "stale" - real data,
 *   past its ideal TTL but still within its stale window) makes the WHOLE
 *   score "stale": a score is only as fresh as the stalest evidence that
 *   actually went into it. The score itself remains valid (still shown,
 *   still a real number) - never silently presented as current, though:
 *   the caller is expected to surface this state so the user knows a
 *   recalculation with fresher data is pending, not already reflected.
 * - Only when EVERY dimension that was actually used is fresh does the
 *   score read as "fresh".
 * - An empty input (no dimensions were used at all) is "unavailable" -
 *   mirrors `computeRadarScore` returning `score: null` in that case.
 */
export function deriveScoreFreshness(usedDimensionStates: FreshnessState[]): FreshnessState {
  if (usedDimensionStates.length === 0) return "unavailable";
  if (usedDimensionStates.some((s) => s === "stale")) return "stale";
  return "fresh";
}
