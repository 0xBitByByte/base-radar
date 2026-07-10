import { PROJECT_CATEGORIES, VERIFICATION_STATUSES } from "@/data/projects/enums";
import { formatLabel } from "@/components/explorer/format";
import { sortAlphabetically } from "@/lib/utils";
import type { ProjectCategory, VerificationStatus } from "@/data/projects/enums";
import type { ConfidenceLevel, HealthLabel, ProjectIntelligence } from "@/lib/intelligence/types";

/**
 * PR3's filter facets only — Category, Verification, Health, Confidence,
 * per this task's explicit scope. Tags, Status, Chain, Developer Activity,
 * TVL, Market Cap, Source Availability, and Risk are real MVP facets
 * (docs/explorer/05-data-mapping.md §10) deferred to a later PR.
 */
export type ExplorerFilters = {
  categories: ProjectCategory[];
  verificationStatuses: VerificationStatus[];
  healthLabels: HealthLabel[];
  confidenceLevels: ConfidenceLevel[];
};

export const EMPTY_FILTERS: ExplorerFilters = {
  categories: [],
  verificationStatuses: [],
  healthLabels: [],
  confidenceLevels: [],
};

const HEALTH_LABEL_ORDER: HealthLabel[] = ["excellent", "good", "fair", "poor", "unknown"];
const CONFIDENCE_LEVEL_ORDER: ConfidenceLevel[] = ["high", "medium", "low"];

function availableValues<T>(canonicalOrder: readonly T[], present: Set<T>): T[] {
  return canonicalOrder.filter((value) => present.has(value));
}

/** Every category actually present in `projects`, alphabetically by display label (never the registry's declared/backend order, never every possible category) — so the picker never offers a facet value with zero real matches, and always reads A→Z. */
export function availableCategories(projects: ProjectIntelligence[]): ProjectCategory[] {
  const present = new Set(projects.flatMap((project) => project.identity.categories));
  return sortAlphabetically(availableValues(PROJECT_CATEGORIES, present), formatLabel);
}

export function availableVerificationStatuses(projects: ProjectIntelligence[]): VerificationStatus[] {
  const present = new Set(projects.map((project) => project.community.verificationStatus));
  return availableValues(VERIFICATION_STATUSES, present);
}

export function availableHealthLabels(projects: ProjectIntelligence[]): HealthLabel[] {
  const present = new Set(projects.map((project) => project.health.label));
  return availableValues(HEALTH_LABEL_ORDER, present);
}

export function availableConfidenceLevels(projects: ProjectIntelligence[]): ConfidenceLevel[] {
  const present = new Set(projects.map((project) => project.confidence.level));
  return availableValues(CONFIDENCE_LEVEL_ORDER, present);
}

/**
 * Filters projects per docs/explorer/05-data-mapping.md §10 —
 * `identity.categories`, `community.verificationStatus`, `health.label`,
 * `confidence.level` only. Selected values within one facet combine with
 * OR (a project matches if it has ANY selected category); active facets
 * combine with AND — per docs/explorer/03-screen-specifications.md §7.
 * This is the one place this predicate is computed; nothing else
 * recomputes or duplicates it.
 */
export function filterProjects(projects: ProjectIntelligence[], filters: ExplorerFilters): ProjectIntelligence[] {
  return projects.filter((project) => matchesFilters(project, filters));
}

function matchesFilters(project: ProjectIntelligence, filters: ExplorerFilters): boolean {
  const { categories, verificationStatuses, healthLabels, confidenceLevels } = filters;

  if (categories.length > 0 && !project.identity.categories.some((category) => categories.includes(category))) {
    return false;
  }
  if (verificationStatuses.length > 0 && !verificationStatuses.includes(project.community.verificationStatus)) {
    return false;
  }
  if (healthLabels.length > 0 && !healthLabels.includes(project.health.label)) {
    return false;
  }
  if (confidenceLevels.length > 0 && !confidenceLevels.includes(project.confidence.level)) {
    return false;
  }

  return true;
}

export function countActiveFilters(filters: ExplorerFilters): number {
  return (
    filters.categories.length +
    filters.verificationStatuses.length +
    filters.healthLabels.length +
    filters.confidenceLevels.length
  );
}

export function hasActiveFilters(filters: ExplorerFilters): boolean {
  return countActiveFilters(filters) > 0;
}
