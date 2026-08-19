/**
 * PR-084.07 — the three pieces every domain's `queryState.ts` (Pools,
 * Contracts, Governance, Whale) independently re-implemented byte-for-byte:
 * the raw Next.js `searchParams` shape, the "first value if repeated" reader,
 * and the shared `asc`/`desc` sort-order type. None of these carry any
 * domain-specific logic — no curation, filtering, or sorting happens here,
 * same as every file that now re-exports from this one. Extracted only
 * after confirming all 4 originals were identical; each domain's own
 * category/sort-field types and parse/build functions stay exactly where
 * they were.
 */

/** Next's resolved `searchParams` shape — a value may be a single string, repeated (array), or absent. */
export type RawSearchParams = Record<string, string | string[] | undefined>;

export function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export type SortOrder = "asc" | "desc";
