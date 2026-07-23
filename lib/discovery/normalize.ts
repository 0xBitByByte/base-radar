import type { DiscoverySource } from "@/data/projects/enums";

/**
 * Default per-source trust, encoding the "default trust implication"
 * column already documented in docs/PROJECT_REGISTRY.md's Discovery
 * Sources table (PR-037) as a concrete number. Flat per source — this PR
 * does not attempt to assess any individual candidate more precisely than
 * "which source found it." A future pass could raise a specific
 * candidate's confidence with corroborating signal (e.g. it also appears
 * via a second source), but no such logic exists yet.
 */
export const SOURCE_CONFIDENCE: Record<DiscoverySource, number> = {
  "base-ecosystem": 80,
  coingecko: 60,
  defillama: 60,
  blockscout: 35,
  github: 35,
  farcaster: 30,
  community: 30,
  "ai-discovery": 20,
};

/**
 * Lowercases, trims, and strips everything but letters/digits/spaces, then
 * collapses whitespace — "Aerodrome Finance!" and "aerodrome  finance"
 * both normalize to "aerodrome finance". Used for `CandidateProject.
 * normalizedName` and for name-based duplicate matching; never shown to a
 * user.
 */
export function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .trim()
    .replace(/\s+/g, " ");
}

/**
 * Strips protocol, "www.", and any trailing slash so
 * "https://www.aave.com/" and "aave.com" compare equal. Returns `null` for
 * an empty/invalid input rather than throwing — callers treat `null` as
 * "no comparable website," not a match.
 */
export function normalizeWebsite(url: string | undefined | null): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  return trimmed
    .replace(/^https?:\/\//i, "")
    .replace(/^www\./i, "")
    .replace(/\/+$/, "")
    .toLowerCase();
}

/** Case-insensitive handle compare, tolerant of a leading "@" on either side (X handles are recorded both ways across sources). */
export function normalizeHandle(handle: string | undefined | null): string | null {
  if (!handle) return null;
  const trimmed = handle.trim().replace(/^@/, "");
  if (!trimmed) return null;
  return trimmed.toLowerCase();
}
