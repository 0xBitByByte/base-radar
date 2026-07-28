/**
 * PR-058 — which facet values are worth offering in the Filter Bar.
 * Computed over the full, unfiltered `LiveProject[]` (never the current
 * filtered/searched/viewed subset) — the same "never offer an option with
 * zero real matches, and never let active filters shrink the choices out
 * from under themselves" rule Explorer's own `availableCategories()` etc.
 * already established (`components/explorer/filters.ts`).
 */

import { VERIFICATION_STATUSES, type VerificationStatus } from "@/data/projects/enums";
import { DISCOVERY_STATUSES, type DiscoveryStatus } from "@/lib/discovery/status";
import { availableFinancialRanges } from "@/lib/projects/financial";
import { FINANCIAL_METRICS, type FinancialMetric, type FinancialRangeDef, type LiveProject } from "@/lib/projects/types";

export function availableDiscoveryStatuses(projects: LiveProject[]): DiscoveryStatus[] {
  const present = new Set(projects.map((project) => project.discoveryStatus).filter((status): status is DiscoveryStatus => status !== null));
  return DISCOVERY_STATUSES.filter((status) => present.has(status));
}

export function availableVerificationStatuses(projects: LiveProject[]): VerificationStatus[] {
  const present = new Set(
    projects.map((project) => project.verification.status).filter((status): status is VerificationStatus => status !== null)
  );
  return VERIFICATION_STATUSES.filter((status) => present.has(status));
}

/**
 * PR-063 — Task 1/2: per-metric range options worth offering, computed once
 * server-side over the full, unfiltered registry so the client Filter Bar
 * never receives (or recomputes over) the raw project list. An entirely
 * empty array for a metric means "no reliable data for this metric — hide
 * the whole filter" (Task 1); a present metric with only some empty buckets
 * omits just those buckets, the same "never offer a zero-match option" rule
 * this file already applies to Discovery/Verification Status.
 */
export function financialRangeOptions(projects: LiveProject[]): Record<FinancialMetric, FinancialRangeDef[]> {
  return Object.fromEntries(FINANCIAL_METRICS.map((metric) => [metric, availableFinancialRanges(projects, metric)])) as Record<
    FinancialMetric,
    FinancialRangeDef[]
  >;
}
