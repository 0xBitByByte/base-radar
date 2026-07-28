/**
 * PR-054 — Task 5: filtering over a `LiveProject[]`. Every option in
 * `FilterOptions` is optional and independent — omitted options impose no
 * constraint, present options are ANDed together. No UI logic lives here;
 * a page passes the options a user picked and gets back the matching
 * subset, nothing more.
 *
 * PR-056 — `category`/`status`/`discoveryStatus`/`verificationStatus` now
 * accept a single value or an array (multi-select, OR-within-facet); a
 * bare single value is normalized to a one-element array so both forms
 * share one matching path. `verified` and `hasVolume` are new boolean
 * facets — see their doc comments on `FilterOptions` for the exact rule
 * each implements.
 */

import { isVerified } from "@/lib/projects/collections";
import type { FilterOptions, LiveProject } from "@/lib/projects/types";

function toArray<T>(value: T | T[] | undefined): T[] | undefined {
  if (value === undefined) return undefined;
  return Array.isArray(value) ? value : [value];
}

/** `undefined`/empty selection imposes no constraint (matches everything); otherwise `value` must be one of `selected` — the OR-within-facet rule. */
function matchesAny<T>(value: T, selected: T[] | undefined): boolean {
  if (selected === undefined || selected.length === 0) return true;
  return selected.includes(value);
}

function matches(project: LiveProject, options: FilterOptions): boolean {
  if (!matchesAny(project.category, toArray(options.category))) return false;
  if (!matchesAny(project.status, toArray(options.status))) return false;
  if (!matchesAny(project.discoveryStatus, toArray(options.discoveryStatus))) return false;
  if (!matchesAny(project.verification.status, toArray(options.verificationStatus))) return false;
  if (options.hasMarket !== undefined && project.market.available !== options.hasMarket) return false;
  if (options.hasTvl !== undefined && (project.market.tvlUsd !== null) !== options.hasTvl) return false;
  if (options.hasVolume !== undefined && (project.market.volume24hUsd !== null) !== options.hasVolume) return false;
  if (options.hasGithub !== undefined && project.engineering.available !== options.hasGithub) return false;
  if (options.hasGovernance !== undefined && project.governance.configured !== options.hasGovernance) return false;
  if (options.hasContracts !== undefined && (project.contracts.count > 0) !== options.hasContracts) return false;
  if (options.minConfidence !== undefined && project.confidence.score < options.minConfidence) return false;
  if (options.verified !== undefined && isVerified(project) !== options.verified) return false;
  return true;
}

/** Returns a new, filtered array — never mutates `projects`. */
export function filterLiveProjects(projects: LiveProject[], options: FilterOptions): LiveProject[] {
  return projects.filter((project) => matches(project, options));
}
