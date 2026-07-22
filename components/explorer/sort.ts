import type { ProjectIntelligence } from "@/lib/intelligence/types";

/**
 * `price` and `changePct24h` (PR5) are reachable only via Table View's
 * `SortableHeader` — `ExplorerSort`'s dropdown intentionally never lists
 * them (docs/explorer/06 PR5 scope). Market Cap and Verification-status
 * grouping remain real, documented sort fields (docs/explorer/02 §7) not
 * yet wired to any control.
 */
export type SortField = "name" | "tvl" | "health" | "confidence" | "githubStars" | "price" | "changePct24h";
export type SortDirection = "asc" | "desc";

export type SortState = {
  field: SortField;
  direction: SortDirection;
};

/**
 * TVL (High to Low), not alphabetical — the registry's own most-established,
 * most-real-signal ordering (PR-010). Every field here is already a real,
 * already-computed intelligence value the sort dropdown already supports;
 * this only changes which one loads first, not what's available.
 */
export const DEFAULT_SORT: SortState = { field: "tvl", direction: "desc" };

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
    case "price":
      return project.market.priceUsd;
    case "changePct24h":
      return project.market.changePct24h;
  }
}

/** First-click direction per field — magnitude fields lead with their highest values, mirroring `SORT_OPTIONS`' own ordering (tvl-desc before tvl-asc, etc.); Name leads alphabetically. */
const DEFAULT_DIRECTION: Record<SortField, SortDirection> = {
  name: "asc",
  tvl: "desc",
  health: "desc",
  confidence: "desc",
  githubStars: "desc",
  price: "desc",
  changePct24h: "desc",
};

/**
 * Column-header click behavior — a three-state cycle per field: first
 * click sorts by that field's own default direction, a second click
 * reverses it, and a third click resets to `DEFAULT_SORT` (unsorting that
 * column) rather than cycling forever. A different field always restarts
 * the cycle at its own default direction. Shared by `SortableHeader` so
 * the rule lives in one place rather than being re-decided per header.
 */
export function toggleSort(current: SortState, field: SortField): SortState {
  const defaultDirection = DEFAULT_DIRECTION[field];

  if (current.field !== field) {
    return { field, direction: defaultDirection };
  }
  if (current.direction === defaultDirection) {
    return { field, direction: defaultDirection === "asc" ? "desc" : "asc" };
  }
  return DEFAULT_SORT;
}

/**
 * A project with no value for the active sort field sorts to the end of
 * the list, in either direction — never disappears, never errors — per
 * docs/explorer/02-information-architecture.md §7.
 *
 * `prioritizedProjectIds` (PR-011) — the active Personal Watchlist's project
 * ids, when provided — only ever breaks a tie between two projects that
 * already sort identically on the active field: a watched project sorts
 * before an equally-ranked unwatched one, but never outranks a project that
 * genuinely has a higher (or lower, depending on direction) real value. This
 * is the same "prioritize, never hide or reorder past real data" rule
 * `lib/search/globalSearch.ts`'s `isPrioritizedProject` already established
 * for Global Search — applied here to Explorer sorting instead of search
 * ranking, not a second/competing prioritization system.
 */
export function sortProjects(
  projects: ProjectIntelligence[],
  { field, direction }: SortState,
  prioritizedProjectIds?: Set<string>
): ProjectIntelligence[] {
  const sign = direction === "asc" ? 1 : -1;

  return [...projects].sort((a, b) => {
    const valueA = sortValue(a, field);
    const valueB = sortValue(b, field);

    if (valueA === null && valueB === null) return tieBreak(a, b, prioritizedProjectIds);
    if (valueA === null) return 1;
    if (valueB === null) return -1;

    if (typeof valueA === "string" && typeof valueB === "string") {
      const comparison = valueA.localeCompare(valueB);
      return comparison !== 0 ? sign * comparison : tieBreak(a, b, prioritizedProjectIds);
    }
    const comparison = (valueA as number) - (valueB as number);
    return comparison !== 0 ? sign * comparison : tieBreak(a, b, prioritizedProjectIds);
  });
}

function tieBreak(
  a: ProjectIntelligence,
  b: ProjectIntelligence,
  prioritizedProjectIds: Set<string> | undefined
): number {
  if (!prioritizedProjectIds) return 0;
  const aWatched = prioritizedProjectIds.has(a.identity.id);
  const bWatched = prioritizedProjectIds.has(b.identity.id);
  if (aWatched === bWatched) return 0;
  return aWatched ? -1 : 1;
}
