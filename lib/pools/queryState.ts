/**
 * PR-084.02 — the one place the Pool Explorer's URL shape is defined,
 * mirroring `components/projects/queryState.ts`'s exact pattern (that file's
 * own doc comment: "the query-string shape can never drift between the
 * reader and the writers"). The Server Component (`[slug]/pools/page.tsx`)
 * parses incoming `searchParams` with `parsePoolsQueryState`; every client
 * control (`PoolCategoryTabs`, `PoolExplorerFilterBar`, `PoolExplorerSortSelect`)
 * writes the URL back with `buildPoolsQuery`.
 *
 * No business logic lives here — no curation, filtering, or sorting happens
 * in this file. It only translates between `URLSearchParams` and a typed
 * `PoolsQueryState`, and back. The actual pool resolution pipeline
 * (category → search → DEX filter → sort) lives in the page itself, reading
 * the real pool array plus this state.
 */

import { POOL_CATEGORIES, type PoolCategoryId } from "@/components/explorer/pairIntelligenceHelpers";
import { first, type RawSearchParams, type SortOrder } from "@/lib/explorer/queryState-shared";

export type { RawSearchParams, SortOrder };

export const POOL_SORT_FIELDS = ["liquidity", "volume", "age"] as const;
export type PoolSortField = (typeof POOL_SORT_FIELDS)[number];

const POOL_CATEGORY_IDS = POOL_CATEGORIES.map((category) => category.id);

function isPoolCategoryId(value: string): value is PoolCategoryId {
  return (POOL_CATEGORY_IDS as string[]).includes(value);
}

function isPoolSortField(value: string): value is PoolSortField {
  return (POOL_SORT_FIELDS as readonly string[]).includes(value);
}

export type PoolsQueryState = {
  /** Defaults to `"featured"` — landing on the Pool Explorer continues the curated view a reader arrived from, not a raw, uncurated list. */
  category: PoolCategoryId;
  search: string;
  dex: string[];
  sortField: PoolSortField;
  sortOrder: SortOrder;
  /** `true` when the URL itself named a sort — lets the page fall back to the current category's natural order (already liquidity-sorted, or already the category's own meaningful order) rather than silently re-sorting when nobody asked for a specific sort. */
  sortExplicit: boolean;
};

export const DEFAULT_POOLS_QUERY_STATE: PoolsQueryState = {
  category: "featured",
  search: "",
  dex: [],
  sortField: "liquidity",
  sortOrder: "desc",
  sortExplicit: false,
};

function parseDexList(value: string | string[] | undefined): string[] {
  const raw = first(value);
  if (!raw) return [];
  return raw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

/** Parses Next's raw `searchParams` into typed state — an unrecognized or malformed value always falls back to its default rather than throwing. */
export function parsePoolsQueryState(searchParams: RawSearchParams): PoolsQueryState {
  const rawCategory = first(searchParams.category);
  const category = rawCategory && isPoolCategoryId(rawCategory) ? rawCategory : DEFAULT_POOLS_QUERY_STATE.category;

  const rawSortField = first(searchParams.sortField);
  const rawSortOrder = first(searchParams.sortOrder);
  const sortExplicit = Boolean(rawSortField && isPoolSortField(rawSortField));
  const sortField = sortExplicit ? (rawSortField as PoolSortField) : DEFAULT_POOLS_QUERY_STATE.sortField;
  const sortOrder = rawSortOrder === "asc" || rawSortOrder === "desc" ? rawSortOrder : DEFAULT_POOLS_QUERY_STATE.sortOrder;

  return {
    category,
    search: (first(searchParams.search) ?? "").trim(),
    dex: parseDexList(searchParams.dex),
    sortField,
    sortOrder,
    sortExplicit,
  };
}

/**
 * Builds the query string for `state` merged with `overrides` — the single
 * function every control on the Pool Explorer uses to navigate. Returns a
 * `?`-prefixed string, or `""` when every value is default.
 */
export function buildPoolsQuery(state: PoolsQueryState, overrides: Partial<PoolsQueryState> = {}): string {
  const next: PoolsQueryState = { ...state, ...overrides };

  const params = new URLSearchParams();
  if (next.category !== DEFAULT_POOLS_QUERY_STATE.category) params.set("category", next.category);
  if (next.search) params.set("search", next.search);
  if (next.dex.length > 0) params.set("dex", next.dex.join(","));
  if (next.sortExplicit) {
    params.set("sortField", next.sortField);
    params.set("sortOrder", next.sortOrder);
  }

  const query = params.toString();
  return query ? `?${query}` : "";
}
