import type { ProjectIntelligence } from "@/lib/intelligence/types";

/** Shared query/haystack normalization — trim + lowercase, one place. */
export function normalizeSearch(input: string): string {
  return input.trim().toLowerCase();
}

/**
 * MVP search matching — `identity` fields only, exactly per
 * docs/explorer/05-data-mapping.md §9. Never reads `market`, `trading`,
 * `tvl`, `github`, `chain`, or any provider-sourced section.
 */
export function matchesQuery(project: ProjectIntelligence, query: string): boolean {
  const normalized = normalizeSearch(query);
  if (!normalized) return true;

  const { identity } = project;
  const haystack = normalizeSearch(
    [identity.name, identity.shortDescription, identity.description, ...identity.tags, ...identity.categories].join(" ")
  );

  return haystack.includes(normalized);
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
