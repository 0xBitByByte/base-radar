/**
 * PR-058 — the one place the Projects page's URL shape is defined. Both the
 * Server Component (`app/dashboard/projects/page.tsx`, for parsing incoming
 * `searchParams` and building "View All"/pagination/category hrefs) and the
 * client controls (`ProjectsSearchInput`, `ProjectsSortSelect`,
 * `ProjectsFilterBar`) import from here, so the query-string shape can never
 * drift between the reader and the writers.
 *
 * Every param is written only when it differs from its default — Task 6's
 * "avoid introducing unnecessary query parameters" is enforced structurally
 * here (`buildProjectsHref`), not left to each call site's discipline.
 *
 * This module contains no business logic of its own — no filtering,
 * sorting, or searching happens here. It only translates between a
 * `URLSearchParams`-shaped object and a typed `ProjectsQueryState`, and back.
 */

import { PROJECT_CATEGORIES, VERIFICATION_STATUSES, type ProjectCategory, type VerificationStatus } from "@/data/projects/enums";
import { DISCOVERY_STATUSES, type DiscoveryStatus } from "@/lib/discovery/status";
import { FINANCIAL_RANGES } from "@/lib/projects/financial";
import { SORT_FIELDS, type FinancialMetric, type FinancialRangeId, type SortField, type SortOrder } from "@/lib/projects/types";

/** The one route every href/navigation on this page targets — avoids hardcoding the path string in every server-rendered `<Link>`. */
export const PROJECTS_PATH = "/dashboard/projects";

// ---------------------------------------------------------------------------
// Views — which project list backs the Full Directory
// ---------------------------------------------------------------------------

export const PROJECTS_VIEWS = [
  "all",
  "verified",
  "trending",
  "new",
  "topTvl",
  "topVolume",
  "topActivity",
  "needsReview",
  "recentlyDiscovered",
  "recentlyUpdated",
  // Smart Views — two presets ("Needs Attention", "Fast Growing") reuse
  // `needsReview`/`topActivity` above directly; these two are the only
  // genuinely new combinations (`components/projects/smartViews.ts`).
  "blueChips",
  "emerging",
] as const;
export type ProjectsView = (typeof PROJECTS_VIEWS)[number];

/** The Directory's own section heading when a view is active — mirrors each rail's title exactly (`app/dashboard/projects/page.tsx`), so "View All" never introduces a second name for the same real collection. */
export const VIEW_LABELS: Record<ProjectsView, string> = {
  all: "All Projects",
  verified: "Verified Projects",
  trending: "Trending",
  new: "New Projects",
  topTvl: "Top TVL",
  topVolume: "Top Volume",
  topActivity: "Top Activity",
  needsReview: "Needs Review",
  recentlyDiscovered: "Recently Discovered",
  recentlyUpdated: "Recently Updated",
  blueChips: "Blue Chips",
  emerging: "Emerging",
};

function isProjectsView(value: string): value is ProjectsView {
  return (PROJECTS_VIEWS as readonly string[]).includes(value);
}

// ---------------------------------------------------------------------------
// Sorting — default per view, and the full option list for the Sort control
// ---------------------------------------------------------------------------

type SortState = { field: SortField; order: SortOrder };

/**
 * Each view's own natural order — e.g. "View All" on Top TVL should keep
 * showing TVL-ranked results, not suddenly reshuffle by confidence. A user
 * picking an explicit sort (`sortExplicit` on `ProjectsQueryState`) always
 * overrides this.
 */
const DEFAULT_SORT_BY_VIEW: Record<ProjectsView, SortState> = {
  all: { field: "confidence", order: "desc" },
  verified: { field: "confidence", order: "desc" },
  trending: { field: "confidence", order: "desc" },
  new: { field: "discoveryDate", order: "desc" },
  topTvl: { field: "tvl", order: "desc" },
  topVolume: { field: "volume", order: "desc" },
  topActivity: { field: "activity", order: "desc" },
  // Worst-evidenced first — the point of this view is triage, matching the
  // Needs Review rail's own fixed internal sort (PR-057).
  needsReview: { field: "confidence", order: "asc" },
  recentlyDiscovered: { field: "discoveryDate", order: "desc" },
  recentlyUpdated: { field: "updatedDate", order: "desc" },
  blueChips: { field: "tvl", order: "desc" },
  emerging: { field: "discoveryDate", order: "desc" },
};

const FIELD_LABELS: Record<SortField, string> = {
  confidence: "Confidence",
  marketCap: "Market Cap",
  tvl: "TVL",
  volume: "Volume 24h",
  liquidity: "Liquidity",
  activity: "GitHub Activity",
  alphabetical: "Name",
  discoveryDate: "Discovery Date",
  updatedDate: "Last Updated",
  stars: "GitHub Stars",
  verifiedDate: "Recently Verified",
};

const DATE_FIELDS = new Set<SortField>(["discoveryDate", "updatedDate", "verifiedDate"]);

function directionLabel(field: SortField, order: SortOrder): string {
  if (field === "alphabetical") return order === "asc" ? "(A–Z)" : "(Z–A)";
  if (DATE_FIELDS.has(field)) return order === "desc" ? "(Newest First)" : "(Oldest First)";
  return order === "desc" ? "(High to Low)" : "(Low to High)";
}

export type SortOption = { value: string; label: string; field: SortField; order: SortOrder };

/** Every `SortField` × direction, in a stable, natural-reading-first order — "Support all available SortFields" (Task 4), generated once rather than hand-maintained per field. */
export const SORT_OPTIONS: SortOption[] = SORT_FIELDS.flatMap((field): SortOption[] => {
  // Alphabetical reads more naturally A→Z first; every magnitude/date field reads High/Newest first.
  const orders: SortOrder[] = field === "alphabetical" ? ["asc", "desc"] : ["desc", "asc"];
  return orders.map((order) => ({
    value: `${field}-${order}`,
    label: `${FIELD_LABELS[field]} ${directionLabel(field, order)}`,
    field,
    order,
  }));
});

function parseSortValue(value: string): SortState | null {
  const option = SORT_OPTIONS.find((candidate) => candidate.value === value);
  return option ? { field: option.field, order: option.order } : null;
}

export function sortValueFor(field: SortField, order: SortOrder): string {
  return `${field}-${order}`;
}

// ---------------------------------------------------------------------------
// Full query state
// ---------------------------------------------------------------------------

export type ProjectsQueryState = {
  search: string;
  categories: ProjectCategory[];
  verified: boolean;
  highConfidence: boolean;
  hasVolume: boolean;
  discoveryStatuses: DiscoveryStatus[];
  verificationStatuses: VerificationStatus[];
  /** PR-063 — one active range per financial metric; `null` means "no constraint." Ranges within a metric are mutually exclusive (a project can't be both "< $1M" and "$1M–10M" TVL), so each is a single value, not an array. */
  tvlRange: FinancialRangeId | null;
  liquidityRange: FinancialRangeId | null;
  marketCapRange: FinancialRangeId | null;
  volumeRange: FinancialRangeId | null;
  sortField: SortField;
  sortOrder: SortOrder;
  /** `true` when the URL itself named a sort — lets the page distinguish "the user picked this" from "this is just the view's own default." */
  sortExplicit: boolean;
  page: number;
  view: ProjectsView;
};

export const DEFAULT_QUERY_STATE: ProjectsQueryState = {
  search: "",
  categories: [],
  verified: false,
  highConfidence: false,
  hasVolume: false,
  discoveryStatuses: [],
  verificationStatuses: [],
  tvlRange: null,
  liquidityRange: null,
  marketCapRange: null,
  volumeRange: null,
  sortField: "confidence",
  sortOrder: "desc",
  sortExplicit: false,
  page: 1,
  view: "all",
};

/** Next's resolved `searchParams` shape — a value may be a single string, repeated (array), or absent. */
export type RawSearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function parseList<T extends string>(value: string | string[] | undefined, valid: readonly T[]): T[] {
  const raw = first(value);
  if (!raw) return [];
  const set = new Set(valid as readonly string[]);
  return raw
    .split(",")
    .map((item) => item.trim())
    .filter((item): item is T => set.has(item));
}

/** An unrecognized or malformed range id for `metric` falls back to `null` ("no constraint") rather than throwing. */
function parseFinancialRange(value: string | string[] | undefined, metric: FinancialMetric): FinancialRangeId | null {
  const raw = first(value);
  if (!raw) return null;
  const match = FINANCIAL_RANGES[metric].find((def) => def.id === raw);
  return match ? match.id : null;
}

/** Parses Next's raw `searchParams` into typed, validated state — an unrecognized or malformed value always falls back to its default rather than throwing. */
export function parseProjectsQueryState(searchParams: RawSearchParams): ProjectsQueryState {
  const rawView = first(searchParams.view);
  const view = rawView && isProjectsView(rawView) ? rawView : "all";

  const rawSort = first(searchParams.sort);
  const parsedSort = rawSort ? parseSortValue(rawSort) : null;
  const sortExplicit = parsedSort !== null;
  const { field: sortField, order: sortOrder } = parsedSort ?? DEFAULT_SORT_BY_VIEW[view];

  const rawPage = Number(first(searchParams.page));
  const page = Number.isInteger(rawPage) && rawPage > 0 ? rawPage : 1;

  return {
    search: (first(searchParams.search) ?? "").trim(),
    categories: parseList(searchParams.category, PROJECT_CATEGORIES),
    verified: first(searchParams.verified) === "true",
    highConfidence: first(searchParams.highConfidence) === "true",
    hasVolume: first(searchParams.hasVolume) === "true",
    discoveryStatuses: parseList(searchParams.discoveryStatus, DISCOVERY_STATUSES),
    verificationStatuses: parseList(searchParams.verificationStatus, VERIFICATION_STATUSES),
    tvlRange: parseFinancialRange(searchParams.tvlRange, "tvl"),
    liquidityRange: parseFinancialRange(searchParams.liquidityRange, "liquidity"),
    marketCapRange: parseFinancialRange(searchParams.marketCapRange, "marketCap"),
    volumeRange: parseFinancialRange(searchParams.volumeRange, "volume"),
    sortField,
    sortOrder,
    sortExplicit,
    page,
    view,
  };
}

/** The real, computed default sort for `state.view` — what the Sort control should show as selected when nothing explicit has been chosen. */
export function defaultSortForView(view: ProjectsView): SortState {
  return DEFAULT_SORT_BY_VIEW[view];
}

/** Query params whose change should reset `page` back to 1 — anything that changes what set of projects is being paginated through. */
const PAGE_RESETTING_KEYS: (keyof ProjectsQueryState)[] = [
  "search",
  "categories",
  "verified",
  "highConfidence",
  "hasVolume",
  "discoveryStatuses",
  "verificationStatuses",
  "tvlRange",
  "liquidityRange",
  "marketCapRange",
  "volumeRange",
  "view",
];

/**
 * Builds the query string for `state` merged with `overrides` — the single
 * function every link/control on this page uses to navigate, so the
 * "omit defaults" and "reset page on a scope change" rules are enforced in
 * one place. Returns a `?`-prefixed string, or `""` when every value is
 * default (never a bare `?`).
 */
export function buildProjectsQuery(state: ProjectsQueryState, overrides: Partial<ProjectsQueryState> = {}): string {
  const next: ProjectsQueryState = { ...state, ...overrides };

  const scopeChanged = PAGE_RESETTING_KEYS.some((key) => overrides[key] !== undefined && overrides[key] !== state[key]);
  if (scopeChanged && overrides.page === undefined) {
    next.page = 1;
  }

  const params = new URLSearchParams();
  if (next.search) params.set("search", next.search);
  if (next.categories.length > 0) params.set("category", next.categories.join(","));
  if (next.verified) params.set("verified", "true");
  if (next.highConfidence) params.set("highConfidence", "true");
  if (next.hasVolume) params.set("hasVolume", "true");
  if (next.discoveryStatuses.length > 0) params.set("discoveryStatus", next.discoveryStatuses.join(","));
  if (next.verificationStatuses.length > 0) params.set("verificationStatus", next.verificationStatuses.join(","));
  if (next.tvlRange) params.set("tvlRange", next.tvlRange);
  if (next.liquidityRange) params.set("liquidityRange", next.liquidityRange);
  if (next.marketCapRange) params.set("marketCapRange", next.marketCapRange);
  if (next.volumeRange) params.set("volumeRange", next.volumeRange);

  const viewDefaultSort = defaultSortForView(next.view);
  const sortIsDefault = next.sortField === viewDefaultSort.field && next.sortOrder === viewDefaultSort.order;
  if (!sortIsDefault) params.set("sort", sortValueFor(next.sortField, next.sortOrder));

  if (next.page > 1) params.set("page", String(next.page));
  if (next.view !== "all") params.set("view", next.view);

  const query = params.toString();
  return query ? `?${query}` : "";
}

/** Whether any facet other than pagination/sort/view is active — drives "Clear filters" visibility and the Directory's "no matches" vs. "empty collection" empty-state branch. */
export function hasActiveFilters(state: ProjectsQueryState): boolean {
  return (
    state.categories.length > 0 ||
    state.verified ||
    state.highConfidence ||
    state.hasVolume ||
    state.discoveryStatuses.length > 0 ||
    state.verificationStatuses.length > 0 ||
    state.tvlRange !== null ||
    state.liquidityRange !== null ||
    state.marketCapRange !== null ||
    state.volumeRange !== null
  );
}

export function countActiveFilters(state: ProjectsQueryState): number {
  return (
    state.categories.length +
    (state.verified ? 1 : 0) +
    (state.highConfidence ? 1 : 0) +
    (state.hasVolume ? 1 : 0) +
    state.discoveryStatuses.length +
    state.verificationStatuses.length +
    (state.tvlRange ? 1 : 0) +
    (state.liquidityRange ? 1 : 0) +
    (state.marketCapRange ? 1 : 0) +
    (state.volumeRange ? 1 : 0)
  );
}
