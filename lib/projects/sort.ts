/**
 * PR-054 — Task 4: deterministic sorting over a `LiveProject[]`. The UI
 * should never re-sort a list itself — every consumer calls
 * `sortLiveProjects()` with one of the fixed `SortField`s below and gets
 * the same order every time for the same input, regardless of the array's
 * original order.
 *
 * Two rules hold for every field: a project with no real value for the
 * chosen field always sorts last, in *either* direction (a `null` isn't
 * "the smallest number" — it's "no data," and burying it at the bottom of
 * a descending "sort by TVL" list is exactly as correct as burying it at
 * the bottom of an ascending one). Ties break on `id` ascending, so the
 * output is stable across repeated calls even when many projects share a
 * value (e.g. several projects all having `null` TVL).
 *
 * PR-056 — `"stars"` (`engineering.stars`) and `"verifiedDate"`
 * (`verification.verifiedAt`) added. Both are ordinary `SortValue`s and
 * fall through the exact same nulls-last/id-tie-break machinery as every
 * other field — no special-casing needed.
 */

import type { LiveProject, SortField, SortOrder } from "@/lib/projects/types";

type SortValue = number | string | null;

function toEpochMs(iso: string | null): number | null {
  if (!iso) return null;
  const parsed = Date.parse(iso);
  return Number.isNaN(parsed) ? null : parsed;
}

function valueForField(project: LiveProject, field: SortField): SortValue {
  switch (field) {
    case "confidence":
      return project.confidence.score;
    case "marketCap":
      return project.market.marketCapUsd;
    case "tvl":
      return project.market.tvlUsd;
    case "volume":
      return project.market.volume24hUsd;
    case "liquidity":
      return project.market.liquidityUsd;
    case "activity":
      return project.engineering.commitsLast7d;
    case "alphabetical":
      return project.identity.name.toLowerCase();
    case "discoveryDate":
      return toEpochMs(project.discoveryMetadata?.discoveredAt ?? null);
    case "updatedDate":
      return toEpochMs(project.lastUpdated);
    case "stars":
      return project.engineering.stars;
    case "verifiedDate":
      return toEpochMs(project.verification.verifiedAt);
    default:
      return null;
  }
}

function compareValues(a: SortValue, b: SortValue, order: SortOrder): number {
  if (a === null && b === null) return 0;
  if (a === null) return 1; // nulls always last, regardless of direction
  if (b === null) return -1;

  let result: number;
  if (typeof a === "string" && typeof b === "string") {
    result = a.localeCompare(b);
  } else {
    result = (a as number) - (b as number);
  }

  return order === "asc" ? result : -result;
}

/**
 * Returns a new, sorted array — never mutates `projects`. Ties (including
 * every project sharing a `null` value) break on `id` ascending so repeated
 * calls with the same input always produce the same order.
 */
export function sortLiveProjects(projects: LiveProject[], field: SortField, order: SortOrder = "desc"): LiveProject[] {
  return [...projects].sort((a, b) => {
    const primary = compareValues(valueForField(a, field), valueForField(b, field), order);
    if (primary !== 0) return primary;
    return a.id.localeCompare(b.id);
  });
}
