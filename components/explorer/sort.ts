import type { ProjectIntelligence } from "@/lib/intelligence/types";

/**
 * PR1's sort surface only — the fields the Implementation Roadmap scopes
 * for the Explorer Shell (name, TVL, Health, Confidence, GitHub stars).
 * Market Cap and Verification-status grouping are real, documented sort
 * fields (docs/explorer/02 §7) but belong to a later PR.
 */
export type SortField = "name" | "tvl" | "health" | "confidence" | "githubStars";
export type SortDirection = "asc" | "desc";

export type SortState = {
  field: SortField;
  direction: SortDirection;
};

export const DEFAULT_SORT: SortState = { field: "name", direction: "asc" };

export const SORT_OPTIONS: { value: string; label: string; state: SortState }[] = [
  { value: "name-asc", label: "Name (A–Z)", state: { field: "name", direction: "asc" } },
  { value: "name-desc", label: "Name (Z–A)", state: { field: "name", direction: "desc" } },
  { value: "tvl-desc", label: "TVL (High to Low)", state: { field: "tvl", direction: "desc" } },
  { value: "tvl-asc", label: "TVL (Low to High)", state: { field: "tvl", direction: "asc" } },
  { value: "health-desc", label: "Health (High to Low)", state: { field: "health", direction: "desc" } },
  { value: "health-asc", label: "Health (Low to High)", state: { field: "health", direction: "asc" } },
  {
    value: "confidence-desc",
    label: "Confidence (High to Low)",
    state: { field: "confidence", direction: "desc" },
  },
  {
    value: "confidence-asc",
    label: "Confidence (Low to High)",
    state: { field: "confidence", direction: "asc" },
  },
  {
    value: "githubStars-desc",
    label: "GitHub Stars (High to Low)",
    state: { field: "githubStars", direction: "desc" },
  },
  {
    value: "githubStars-asc",
    label: "GitHub Stars (Low to High)",
    state: { field: "githubStars", direction: "asc" },
  },
];

export function sortOptionValue(state: SortState): string {
  return `${state.field}-${state.direction}`;
}

function sortValue(project: ProjectIntelligence, field: SortField): number | string | null {
  switch (field) {
    case "name":
      return project.identity.name.toLowerCase();
    case "tvl":
      return project.tvl.tvlUsd;
    case "health":
      return project.health.score;
    case "confidence":
      return project.confidence.score;
    case "githubStars":
      return project.github.stars;
  }
}

/**
 * A project with no value for the active sort field sorts to the end of
 * the list, in either direction — never disappears, never errors — per
 * docs/explorer/02-information-architecture.md §7.
 */
export function sortProjects(
  projects: ProjectIntelligence[],
  { field, direction }: SortState
): ProjectIntelligence[] {
  const sign = direction === "asc" ? 1 : -1;

  return [...projects].sort((a, b) => {
    const valueA = sortValue(a, field);
    const valueB = sortValue(b, field);

    if (valueA === null && valueB === null) return 0;
    if (valueA === null) return 1;
    if (valueB === null) return -1;

    if (typeof valueA === "string" && typeof valueB === "string") {
      return sign * valueA.localeCompare(valueB);
    }
    return sign * ((valueA as number) - (valueB as number));
  });
}
