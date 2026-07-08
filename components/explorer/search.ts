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

export function searchProjects(projects: ProjectIntelligence[], query: string): ProjectIntelligence[] {
  return projects.filter((project) => matchesQuery(project, query));
}
