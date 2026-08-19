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
};

export const DEFAULT_WHALE_QUERY_STATE: WhaleQueryState = {
  category: "all",
  search: "",
  sortField: "timestamp",
  sortOrder: "desc",
  sortExplicit: false,
};

/** Parses Next's raw `searchParams` into typed state — an unrecognized or malformed value always falls back to its default rather than throwing. */
export function parseWhaleQueryState(searchParams: RawSearchParams): WhaleQueryState {
  const rawCategory = first(searchParams.category);
  const category = rawCategory && isWhaleCategoryId(rawCategory) ? rawCategory : DEFAULT_WHALE_QUERY_STATE.category;

  const rawSortField = first(searchParams.sortField);
  const rawSortOrder = first(searchParams.sortOrder);
  const sortExplicit = Boolean(rawSortField && isWhaleSortField(rawSortField));
  const sortField = sortExplicit ? (rawSortField as WhaleSortField) : DEFAULT_WHALE_QUERY_STATE.sortField;
  const sortOrder = rawSortOrder === "asc" || rawSortOrder === "desc" ? rawSortOrder : DEFAULT_WHALE_QUERY_STATE.sortOrder;

  return {
    category,
    search: (first(searchParams.search) ?? "").trim(),
    sortField,
    sortOrder,
    sortExplicit,
  };
}

/**
 * Builds the query string for `state` merged with `overrides` — the single
 * function every control on the Whale Explorer uses to navigate. Returns a
 * `?`-prefixed string, or `""` when every value is default.
 */
export function buildWhaleQuery(state: WhaleQueryState, overrides: Partial<WhaleQueryState> = {}): string {
  const next: WhaleQueryState = { ...state, ...overrides };

  const params = new URLSearchParams();
  if (next.category !== DEFAULT_WHALE_QUERY_STATE.category) params.set("category", next.category);
  if (next.search) params.set("search", next.search);
  if (next.sortExplicit) {
    params.set("sortField", next.sortField);
    params.set("sortOrder", next.sortOrder);
  }

  const query = params.toString();
  return query ? `?${query}` : "";
}
