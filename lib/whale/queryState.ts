/**
 * PR-084.05 — the one place the Whale Explorer's URL shape is defined,
 * mirroring `lib/governance/queryState.ts`'s exact pattern (see that file's
 * own header comment). The Server Component (`[slug]/whale/page.tsx`)
 * parses incoming `searchParams` with `parseWhaleQueryState`; every client
 * control (`WhaleCategoryTabs`, `WhaleExplorerFilterBar`,
 * `WhaleExplorerSortSelect`) writes the URL back with `buildWhaleQuery`.
 *
 * No business logic lives here — no curation, filtering, or sorting happens
 * in this file. It only translates between `URLSearchParams` and a typed
 * `WhaleQueryState`, and back.
 */

import { WHALE_CATEGORIES, type WhaleCategoryId } from "@/components/explorer/whaleIntelligenceHelpers";
import { first, type RawSearchParams, type SortOrder } from "@/lib/explorer/queryState-shared";

export type { RawSearchParams, SortOrder };

export const WHALE_SORT_FIELDS = ["usdValue", "timestamp"] as const;
export type WhaleSortField = (typeof WHALE_SORT_FIELDS)[number];

const WHALE_CATEGORY_IDS = WHALE_CATEGORIES.map((category) => category.id);

function isWhaleCategoryId(value: string): value is WhaleCategoryId {
  return (WHALE_CATEGORY_IDS as string[]).includes(value);
}

function isWhaleSortField(value: string): value is WhaleSortField {
  return (WHALE_SORT_FIELDS as readonly string[]).includes(value);
}

export type WhaleQueryState = {
  /** The page itself picks the real default ("whale-alert" only when a real one exists, else "all") since that depends on the fetched data, not a fixed default here. */
  category: WhaleCategoryId;
  search: string;
  sortField: WhaleSortField;
  sortOrder: SortOrder;
  /** `true` when the URL itself named a sort — lets the page keep the category's own natural order otherwise. */
  sortExplicit: boolean;
  /**
   * PR-097.01 (Performance — C1) — 1-indexed, mirroring `ProjectsQueryState.page`'s
   * exact convention (`components/projects/queryState.ts`). The Whale
   * Explorer previously rendered every real matching transfer in one
   * unbounded list — this bounds the per-render count the same way the
   * main Projects Directory already does for the same real reason: a
   * transfer feed genuinely grows without bound over a project's lifetime.
   */
  page: number;
};

export const DEFAULT_WHALE_QUERY_STATE: WhaleQueryState = {
  category: "all",
  search: "",
  sortField: "timestamp",
  sortOrder: "desc",
  sortExplicit: false,
  page: 1,
};

/** Query params whose change should reset `page` back to 1 — anything that changes what set of events is being paginated through. Mirrors `components/projects/queryState.ts`'s `PAGE_RESETTING_KEYS` exactly. */
const PAGE_RESETTING_KEYS: (keyof WhaleQueryState)[] = ["category", "search", "sortField", "sortOrder"];

/** Parses Next's raw `searchParams` into typed state — an unrecognized or malformed value always falls back to its default rather than throwing. */
export function parseWhaleQueryState(searchParams: RawSearchParams): WhaleQueryState {
  const rawCategory = first(searchParams.category);
  const category = rawCategory && isWhaleCategoryId(rawCategory) ? rawCategory : DEFAULT_WHALE_QUERY_STATE.category;

  const rawSortField = first(searchParams.sortField);
  const rawSortOrder = first(searchParams.sortOrder);
  const sortExplicit = Boolean(rawSortField && isWhaleSortField(rawSortField));
  const sortField = sortExplicit ? (rawSortField as WhaleSortField) : DEFAULT_WHALE_QUERY_STATE.sortField;
  const sortOrder = rawSortOrder === "asc" || rawSortOrder === "desc" ? rawSortOrder : DEFAULT_WHALE_QUERY_STATE.sortOrder;

  const rawPage = Number(first(searchParams.page));
  const page = Number.isInteger(rawPage) && rawPage > 0 ? rawPage : DEFAULT_WHALE_QUERY_STATE.page;

  return {
    category,
    search: (first(searchParams.search) ?? "").trim(),
    sortField,
    sortOrder,
    sortExplicit,
    page,
  };
}

/**
 * Builds the query string for `state` merged with `overrides` — the single
 * function every control on the Whale Explorer uses to navigate. Returns a
 * `?`-prefixed string, or `""` when every value is default. Any real change
 * to what's being paginated through (category/search/sort) resets `page`
 * back to 1, unless the caller explicitly overrides `page` itself —
 * mirroring `buildProjectsQuery()`'s exact `scopeChanged` logic.
 */
export function buildWhaleQuery(state: WhaleQueryState, overrides: Partial<WhaleQueryState> = {}): string {
  const next: WhaleQueryState = { ...state, ...overrides };

  const scopeChanged = PAGE_RESETTING_KEYS.some((key) => overrides[key] !== undefined && overrides[key] !== state[key]);
  if (scopeChanged && overrides.page === undefined) {
    next.page = 1;
  }

  const params = new URLSearchParams();
  if (next.category !== DEFAULT_WHALE_QUERY_STATE.category) params.set("category", next.category);
  if (next.search) params.set("search", next.search);
  if (next.sortExplicit) {
    params.set("sortField", next.sortField);
    params.set("sortOrder", next.sortOrder);
  }
  if (next.page > 1) params.set("page", String(next.page));

  const query = params.toString();
  return query ? `?${query}` : "";
}
