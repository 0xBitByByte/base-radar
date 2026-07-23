import {
  CHAINS,
  PROJECT_CATEGORIES,
  PROJECT_STATUSES,
  REGISTRY_LIFECYCLE_STATES,
  VERIFICATION_LEVELS,
  VERIFICATION_STATUSES,
} from "@/data/projects/enums";
import { getProject } from "@/data/projects/helpers";
import { formatLabel } from "@/components/explorer/format";
import { verificationStatusLabel } from "@/components/explorer/VerificationBadge";
import { CHAIN_BRANDING, getSortedChains } from "@/lib/branding/chains";
import { sortAlphabetically } from "@/lib/utils";
import type {
  Chain,
  ProjectCategory,
  ProjectStatus,
  RegistryLifecycleState,
  VerificationLevel,
  VerificationStatus,
} from "@/data/projects/enums";
import type { ConfidenceLevel, HealthLabel, ProjectIntelligence } from "@/lib/intelligence/types";

/**
 * PR3's filter facets — Category, Verification, Health, Confidence — plus
 * Chain (PR10 Part 8: chain data is already on every project, so this facet
 * needed no new data, just a filter). Tags, Developer Activity, TVL, Market
 * Cap, Source Availability, and Risk are real MVP facets
 * (docs/explorer/05-data-mapping.md §10) still deferred to a later PR.
 *
 * PR-038 adds three registry-model facets on top: `projectStatuses` (real
 * data — `status` is a required field on every `Project`, so this facet is
 * populated immediately), and `verificationLevels`/`lifecycleStates` (the
 * new PR-037 fields — both are optional and unset on every current seed
 * project, so `available*` below correctly returns `[]` for them today;
 * `FilterGroup` already hides a facet with zero options, so neither filter
 * renders until registry data actually adopts these fields).
 */
export type ExplorerFilters = {
  categories: ProjectCategory[];
  verificationStatuses: VerificationStatus[];
  healthLabels: HealthLabel[];
  confidenceLevels: ConfidenceLevel[];
  chains: Chain[];
  projectStatuses: ProjectStatus[];
  verificationLevels: VerificationLevel[];
  lifecycleStates: RegistryLifecycleState[];
};

export const EMPTY_FILTERS: ExplorerFilters = {
  categories: [],
  verificationStatuses: [],
  healthLabels: [],
  confidenceLevels: [],
  chains: [],
  projectStatuses: [],
  verificationLevels: [],
  lifecycleStates: [],
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

/** Every chain actually present in `projects`, Base-first (`getSortedChains`) — the same priority order Grid/Table/Quick View's chain rows already use, not alphabetical. */
export function availableChains(projects: ProjectIntelligence[]): Chain[] {
  const present = new Set(projects.flatMap((project) => project.chain.chains));
  return getSortedChains(availableValues(CHAINS, present)) as Chain[];
}

/** PR-038 — `status` is required on every `Project`, so this facet is real, populated data today (unlike the two below). */
export function availableProjectStatuses(projects: ProjectIntelligence[]): ProjectStatus[] {
  const present = new Set(projects.map((project) => project.identity.status));
  return availableValues(PROJECT_STATUSES, present);
}

/**
 * PR-038 — `verificationLevel`/`lifecycle` live on the registry's `Project`
 * record (`data/projects/`), not on `ProjectIntelligence` — looked up once
 * per project via `getProject`, not threaded through the Intelligence
 * Engine. Correctly returns `[]` today: no current seed project has either
 * field set, so both facets disappear from the filter bar until a future
 * pass actually populates them — never fabricated, never defaulted.
 */
export function availableVerificationLevels(projects: ProjectIntelligence[]): VerificationLevel[] {
  const present = new Set(
    projects
      .map((project) => getProject(project.identity.id)?.verificationLevel?.level)
      .filter((level): level is VerificationLevel => level !== undefined)
  );
  return availableValues(VERIFICATION_LEVELS, present);
}

export function availableLifecycleStates(projects: ProjectIntelligence[]): RegistryLifecycleState[] {
  const present = new Set(
    projects
      .map((project) => getProject(project.identity.id)?.lifecycle?.state)
      .filter((state): state is RegistryLifecycleState => state !== undefined)
  );
  return availableValues(REGISTRY_LIFECYCLE_STATES, present);
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
  const {
    categories,
    verificationStatuses,
    healthLabels,
    confidenceLevels,
    chains,
    projectStatuses,
    verificationLevels,
    lifecycleStates,
  } = filters;

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
  if (chains.length > 0 && !project.chain.chains.some((chain) => chains.includes(chain))) {
    return false;
  }
  if (projectStatuses.length > 0 && !projectStatuses.includes(project.identity.status)) {
    return false;
  }
  if (verificationLevels.length > 0 || lifecycleStates.length > 0) {
    const registryProject = getProject(project.identity.id);
    if (verificationLevels.length > 0) {
      const level = registryProject?.verificationLevel?.level;
      if (!level || !verificationLevels.includes(level)) return false;
    }
    if (lifecycleStates.length > 0) {
      const state = registryProject?.lifecycle?.state;
      if (!state || !lifecycleStates.includes(state)) return false;
    }
  }

  return true;
}

export function countActiveFilters(filters: ExplorerFilters): number {
  return (
    filters.categories.length +
    filters.verificationStatuses.length +
    filters.healthLabels.length +
    filters.confidenceLevels.length +
    filters.chains.length +
    filters.projectStatuses.length +
    filters.verificationLevels.length +
    filters.lifecycleStates.length
  );
}

export function hasActiveFilters(filters: ExplorerFilters): boolean {
  return countActiveFilters(filters) > 0;
}

/**
 * PR-038 — one entry per active facet, paired with its own selected-value
 * labels, for a registry-aware "no results" message. Only facets with at
 * least one active selection are included. `NoResultsState` decides how
 * many of these it's willing to summarize in one sentence before falling
 * back to the existing generic copy — nothing here decides that cutoff.
 */
export function describeActiveFilterSummary(filters: ExplorerFilters): Array<{ facet: string; values: string[] }> {
  const facets: Array<[string, string[]]> = [
    ["Category", filters.categories.map(formatLabel)],
    ["Verification", filters.verificationStatuses.map(verificationStatusLabel)],
    ["Health", filters.healthLabels.map(formatLabel)],
    ["Confidence", filters.confidenceLevels.map(formatLabel)],
    ["Chain", filters.chains.map((chain) => CHAIN_BRANDING[chain]?.label ?? formatLabel(chain))],
    ["Project Status", filters.projectStatuses.map(formatLabel)],
    ["Verification Level", filters.verificationLevels.map(formatLabel)],
    ["Lifecycle", filters.lifecycleStates.map(formatLabel)],
  ];
  return facets.filter(([, values]) => values.length > 0).map(([facet, values]) => ({ facet, values }));
}
