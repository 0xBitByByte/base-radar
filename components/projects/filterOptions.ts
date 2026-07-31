/**
 * PR-058 — which facet values are worth offering in the Filter Bar.
 * Computed over the full, unfiltered `LiveProject[]` (never the current
 * filtered/searched/viewed subset) — the same "never offer an option with
 * zero real matches, and never let active filters shrink the choices out
 * from under themselves" rule Explorer's own `availableCategories()` etc.
 * already established (`components/explorer/filters.ts`).
 */

import { DISCOVERY_STATUSES, type DiscoveryStatus } from "@/lib/discovery/status";
import { availableFinancialRanges } from "@/lib/projects/financial";
import { FINANCIAL_METRICS, type FinancialMetric, type FinancialRangeDef, type LiveProject } from "@/lib/projects/types";

/**
 * PR-071 Round 6 — "Discovery Status" answers exactly one question: where is
 * this project in Base Radar's own lifecycle (tracked, new, needs review,
 * recently updated, ...)? `"verified"` is excluded from what's offered here
 * even though it's a real `DiscoveryStatus` value elsewhere in the pipeline
 * (`lib/discovery/status.ts`, still used by `isVerified()`/the "Verified
 * Projects" Smart View) — verification is a trust judgment, not a lifecycle
 * stage, and exposing it here duplicated the panel's own (now-removed, see
 * `ProjectsFilterBar.tsx`) Verification section under an identical "Verified"
 * label with no way for a user to tell the two apart. This is a display-time
 * filter, not a type change: `DiscoveryStatus` itself is untouched, so every
 * other consumer of `discoveryStatus === "verified"` keeps working exactly
 * as before.
 */
export function availableDiscoveryStatuses(projects: LiveProject[]): DiscoveryStatus[] {
  const present = new Set(projects.map((project) => project.discoveryStatus).filter((status): status is DiscoveryStatus => status !== null));
  return DISCOVERY_STATUSES.filter((status) => status !== "verified" && present.has(status));
}

/**
 * PR-063 — Task 1/2: per-metric range options worth offering, computed once
 * server-side over the full, unfiltered registry so the client Filter Bar
 * never receives (or recomputes over) the raw project list. An entirely
 * empty array for a metric means "no reliable data for this metric — hide
 * the whole filter" (Task 1); a present metric with only some empty buckets
 * omits just those buckets, the same "never offer a zero-match option" rule
 * this file already applies to Discovery Status.
 */
export function financialRangeOptions(projects: LiveProject[]): Record<FinancialMetric, FinancialRangeDef[]> {
  return Object.fromEntries(FINANCIAL_METRICS.map((metric) => [metric, availableFinancialRanges(projects, metric)])) as Record<
    FinancialMetric,
    FinancialRangeDef[]
  >;
}
