/**
 * PR-084.03 — the one place the Contract Explorer's URL shape is defined,
 * mirroring `lib/pools/queryState.ts`'s exact pattern (see that file's own
 * header comment). The Server Component (`[slug]/contracts/page.tsx`)
 * parses incoming `searchParams` with `parseContractsQueryState`; every
 * client control (`ContractCategoryTabs`, `ContractExplorerFilterBar`,
 * `ContractExplorerSortSelect`) writes the URL back with
 * `buildContractsQuery`.
 *
 * No business logic lives here — no curation, filtering, or sorting happens
 * in this file. It only translates between `URLSearchParams` and a typed
 * `ContractsQueryState`, and back.
 */

import { CONTRACT_CATEGORIES, type ContractCategoryId } from "@/components/explorer/contractIntelligenceHelpers";
import { first, type RawSearchParams, type SortOrder } from "@/lib/explorer/queryState-shared";

export type { RawSearchParams, SortOrder };

export const CONTRACT_SORT_FIELDS = ["type", "verified", "address"] as const;
export type ContractSortField = (typeof CONTRACT_SORT_FIELDS)[number];

const CONTRACT_CATEGORY_IDS = CONTRACT_CATEGORIES.map((category) => category.id);

function isContractCategoryId(value: string): value is ContractCategoryId {
  return (CONTRACT_CATEGORY_IDS as string[]).includes(value);
}

function isContractSortField(value: string): value is ContractSortField {
  return (CONTRACT_SORT_FIELDS as readonly string[]).includes(value);
}

export type ContractsQueryState = {
  /** Defaults to `"all"` — unlike Pools' `"featured"`, there's no meaningful ranking axis for contracts (no liquidity-style "most important" signal), so the honest, complete default for a typically small list is everything. */
  category: ContractCategoryId;
  search: string;
  chain: string[];
  sortField: ContractSortField;
  sortOrder: SortOrder;
  /** `true` when the URL itself named a sort — lets the page keep the category's own natural (registry) order otherwise. */
  sortExplicit: boolean;
  /**
   * PR-097.01 (Performance — C1) — 1-indexed, mirroring the Whale
   * Explorer's own `WhaleQueryState.page` (`lib/whale/queryState.ts`),
   * itself mirroring `ProjectsQueryState.page`. Bounds the per-render
   * contract count the same way.
   */
  page: number;
};

export const DEFAULT_CONTRACTS_QUERY_STATE: ContractsQueryState = {
  category: "all",
  search: "",
  chain: [],
  sortField: "type",
  sortOrder: "asc",
  sortExplicit: false,
  page: 1,
};

/** Query params whose change should reset `page` back to 1 — anything that changes what set of contracts is being paginated through. Mirrors `lib/whale/queryState.ts`'s `PAGE_RESETTING_KEYS` exactly. */
const PAGE_RESETTING_KEYS: (keyof ContractsQueryState)[] = ["category", "search", "chain", "sortField", "sortOrder"];

function parseChainList(value: string | string[] | undefined): string[] {
  const raw = first(value);
  if (!raw) return [];
  return raw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

/** Parses Next's raw `searchParams` into typed state — an unrecognized or malformed value always falls back to its default rather than throwing. */
export function parseContractsQueryState(searchParams: RawSearchParams): ContractsQueryState {
  const rawCategory = first(searchParams.category);
  const category = rawCategory && isContractCategoryId(rawCategory) ? rawCategory : DEFAULT_CONTRACTS_QUERY_STATE.category;

  const rawSortField = first(searchParams.sortField);
  const rawSortOrder = first(searchParams.sortOrder);
  const sortExplicit = Boolean(rawSortField && isContractSortField(rawSortField));
  const sortField = sortExplicit ? (rawSortField as ContractSortField) : DEFAULT_CONTRACTS_QUERY_STATE.sortField;
  const sortOrder = rawSortOrder === "asc" || rawSortOrder === "desc" ? rawSortOrder : DEFAULT_CONTRACTS_QUERY_STATE.sortOrder;

  const rawPage = Number(first(searchParams.page));
  const page = Number.isInteger(rawPage) && rawPage > 0 ? rawPage : DEFAULT_CONTRACTS_QUERY_STATE.page;

  return {
    category,
    search: (first(searchParams.search) ?? "").trim(),
    chain: parseChainList(searchParams.chain),
    sortField,
    sortOrder,
    sortExplicit,
    page,
  };
}

/**
 * Builds the query string for `state` merged with `overrides` — the single
 * function every control on the Contract Explorer uses to navigate. Returns
 * a `?`-prefixed string, or `""` when every value is default. Any real
 * change to what's being paginated through (category/search/chain/sort)
 * resets `page` back to 1, unless the caller explicitly overrides `page`
 * itself.
 */
export function buildContractsQuery(state: ContractsQueryState, overrides: Partial<ContractsQueryState> = {}): string {
  const next: ContractsQueryState = { ...state, ...overrides };

  const scopeChanged = PAGE_RESETTING_KEYS.some((key) => overrides[key] !== undefined && overrides[key] !== state[key]);
  if (scopeChanged && overrides.page === undefined) {
    next.page = 1;
  }

  const params = new URLSearchParams();
  if (next.category !== DEFAULT_CONTRACTS_QUERY_STATE.category) params.set("category", next.category);
  if (next.search) params.set("search", next.search);
  if (next.chain.length > 0) params.set("chain", next.chain.join(","));
  if (next.sortExplicit) {
    params.set("sortField", next.sortField);
    params.set("sortOrder", next.sortOrder);
  }
  if (next.page > 1) params.set("page", String(next.page));

  const query = params.toString();
  return query ? `?${query}` : "";
}
