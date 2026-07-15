import type { ProjectIntelligence } from "@/lib/intelligence/types";

/** Shared query/haystack normalization — trim + lowercase, one place. */
export function normalizeSearch(input: string): string {
  return input.trim().toLowerCase();
}

/** Classic bounded edit-distance (Levenshtein) — how many single-character insert/delete/substitute ops turn `a` into `b`. */
function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);

  for (let i = 1; i <= a.length; i++) {
    const curr = [i];
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    prev = curr;
  }

  return prev[b.length];
}

/**
 * How many typos to tolerate for a query of a given length — 0 for short
 * queries. The cutoff is 4, not 3: at threshold-1 with a 4-character query,
 * "Aave" fuzzy-matched the unrelated word "wave" (in Virtuals Protocol's
 * description) and "Safe" matched "same" (in Basenames') — real registry
 * text, not a hypothetical. Anything 4 characters or shorter requires an
 * exact substring match; fuzziness only kicks in from 5 characters up.
 */
function fuzzyThreshold(queryLength: number): number {
  if (queryLength <= 4) return 0;
  if (queryLength <= 7) return 1;
  return 2;
}

/** Typo-tolerant fallback (PR10 Part 8) — bounded edit-distance against individual haystack *words*, never the full string, so a mistyped "arbitrium"/"aerodrme" still finds "arbitrum"/"aerodrome" without every short query fuzzy-matching everything. */
function fuzzyMatches(haystackWords: string[], normalizedQuery: string): boolean {
  const threshold = fuzzyThreshold(normalizedQuery.length);
  if (threshold === 0) return false;

  return haystackWords.some(
    (word) => Math.abs(word.length - normalizedQuery.length) <= threshold && levenshteinDistance(word, normalizedQuery) <= threshold
  );
}

/**
 * MVP search matching — `identity` fields only, exactly per
 * docs/explorer/05-data-mapping.md §9. Never reads `market`, `trading`,
 * `tvl`, `github`, `chain`, or any provider-sourced section.
 */
function matchesQuery(project: ProjectIntelligence, query: string): boolean {
  const normalized = normalizeSearch(query);
  if (!normalized) return true;

  const { identity } = project;
  const haystack = normalizeSearch(
    [identity.name, identity.shortDescription, identity.description, ...identity.tags, ...identity.categories].join(" ")
  );

  if (haystack.includes(normalized)) return true;

  return fuzzyMatches(haystack.split(/\s+/).filter(Boolean), normalized);
}

/**
 * Ranking tiers, in priority order, per docs/explorer/02-information-architecture.md
 * §5 and docs/explorer/05-data-mapping.md §9. Lower is more relevant. A
 * project that passed `matchesQuery` but fits none of the five documented
 * tiers (e.g. a substring hit in the middle of its name) still ranks — at
 * `Fallback`, the lowest priority — rather than being silently dropped from
 * ordering.
 */
const SearchRank = {
  ExactName: 0,
  NamePrefix: 1,
  ExactTag: 2,
  ExactCategory: 3,
  Description: 4,
  Fallback: 5,
} as const;

function rankProject(project: ProjectIntelligence, normalizedQuery: string): number {
  const { identity } = project;
  const name = normalizeSearch(identity.name);

  if (name === normalizedQuery) return SearchRank.ExactName; // 1. Exact project name
  if (name.startsWith(normalizedQuery)) return SearchRank.NamePrefix; // 2. Project name prefix
  if (identity.tags.some((tag) => normalizeSearch(tag) === normalizedQuery)) return SearchRank.ExactTag; // 3. Tags
  if (identity.categories.some((category) => normalizeSearch(category) === normalizedQuery)) {
    return SearchRank.ExactCategory; // 4. Categories
  }

  const description = normalizeSearch(`${identity.shortDescription} ${identity.description}`);
  if (description.includes(normalizedQuery)) return SearchRank.Description; // 5. Description

  return SearchRank.Fallback;
}

/**
 * Filters (unchanged matching per §9) then, while a query is active, orders
 * by relevance rank. `Array.prototype.sort` is stable, so projects sharing
 * a rank keep their original registry order — no separate tiebreaker
 * needed. With an empty query, returns the filtered (i.e. full) set
 * untouched, exactly as before ranking existed.
 */
export function searchProjects(projects: ProjectIntelligence[], query: string): ProjectIntelligence[] {
  const normalized = normalizeSearch(query);
  const matched = projects.filter((project) => matchesQuery(project, query));
  if (!normalized) return matched;

  return [...matched].sort((a, b) => rankProject(a, normalized) - rankProject(b, normalized));
}
