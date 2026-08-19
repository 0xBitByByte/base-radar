/**
 * PR-084.04 — the one place the Governance Explorer's URL shape is defined,
 * mirroring `lib/contracts/queryState.ts`'s exact pattern (see that file's
 * own header comment). The Server Component (`[slug]/governance/page.tsx`)
 * parses incoming `searchParams` with `parseGovernanceQueryState`; every
 * client control (`GovernanceCategoryTabs`, `GovernanceExplorerFilterBar`,
 * `GovernanceExplorerSortSelect`) writes the URL back with
 * `buildGovernanceQuery`.
 *
 * No business logic lives here — no curation, filtering, or sorting happens
 * in this file. It only translates between `URLSearchParams` and a typed
 * `GovernanceQueryState`, and back.
 */

import { GOVERNANCE_CATEGORIES, type GovernanceCategoryId } from "@/components/explorer/governanceIntelligenceHelpers";
import { first, type RawSearchParams, type SortOrder } from "@/lib/explorer/queryState-shared";

export type { RawSearchParams, SortOrder };

export const GOVERNANCE_SORT_FIELDS = ["end", "voterCount"] as const;
export type GovernanceSortField = (typeof GOVERNANCE_SORT_FIELDS)[number];

const GOVERNANCE_CATEGORY_IDS = GOVERNANCE_CATEGORIES.map((category) => category.id);

function isGovernanceCategoryId(value: string): value is GovernanceCategoryId {
  return (GOVERNANCE_CATEGORY_IDS as string[]).includes(value);
}

function isGovernanceSortField(value: string): value is GovernanceSortField {
  return (GOVERNANCE_SORT_FIELDS as readonly string[]).includes(value);
}

export type GovernanceQueryState = {
  /** The page itself picks the real default ("active" only when a real active proposal exists, else "all") since that depends on the fetched data, not a fixed default here. */
  category: GovernanceCategoryId;
  search: string;
  sortField: GovernanceSortField;
  sortOrder: SortOrder;
  /** `true` when the URL itself named a sort — lets the page keep the category's own natural order otherwise. */
  sortExplicit: boolean;
};

export const DEFAULT_GOVERNANCE_QUERY_STATE: GovernanceQueryState = {
  category: "all",
  search: "",
  sortField: "end",
  sortOrder: "desc",
  sortExplicit: false,
};

/** Parses Next's raw `searchParams` into typed state — an unrecognized or malformed value always falls back to its default rather than throwing. */
export function parseGovernanceQueryState(searchParams: RawSearchParams): GovernanceQueryState {
  const rawCategory = first(searchParams.category);
  const category = rawCategory && isGovernanceCategoryId(rawCategory) ? rawCategory : DEFAULT_GOVERNANCE_QUERY_STATE.category;

  const rawSortField = first(searchParams.sortField);
  const rawSortOrder = first(searchParams.sortOrder);
  const sortExplicit = Boolean(rawSortField && isGovernanceSortField(rawSortField));
  const sortField = sortExplicit ? (rawSortField as GovernanceSortField) : DEFAULT_GOVERNANCE_QUERY_STATE.sortField;
  const sortOrder = rawSortOrder === "asc" || rawSortOrder === "desc" ? rawSortOrder : DEFAULT_GOVERNANCE_QUERY_STATE.sortOrder;

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
 * function every control on the Governance Explorer uses to navigate.
 * Returns a `?`-prefixed string, or `""` when every value is default.
 */
export function buildGovernanceQuery(state: GovernanceQueryState, overrides: Partial<GovernanceQueryState> = {}): string {
  const next: GovernanceQueryState = { ...state, ...overrides };

  const params = new URLSearchParams();
  if (next.category !== DEFAULT_GOVERNANCE_QUERY_STATE.category) params.set("category", next.category);
  if (next.search) params.set("search", next.search);
  if (next.sortExplicit) {
    params.set("sortField", next.sortField);
    params.set("sortOrder", next.sortOrder);
  }

  const query = params.toString();
  return query ? `?${query}` : "";
}
