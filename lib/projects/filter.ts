/**
 * PR-054 — Task 5: filtering over a `LiveProject[]`. Every option in
 * `FilterOptions` is optional and independent — omitted options impose no
 * constraint, present options are ANDed together. No UI logic lives here;
 * a page passes the options a user picked and gets back the matching
 * subset, nothing more.
 */

import type { FilterOptions, LiveProject } from "@/lib/projects/types";

function matches(project: LiveProject, options: FilterOptions): boolean {
  if (options.category !== undefined && project.category !== options.category) return false;
  if (options.status !== undefined && project.status !== options.status) return false;
  if (options.discoveryStatus !== undefined && project.discoveryStatus !== options.discoveryStatus) return false;
  if (options.verificationStatus !== undefined && project.verification.status !== options.verificationStatus) return false;
  if (options.hasMarket !== undefined && project.market.available !== options.hasMarket) return false;
  if (options.hasTvl !== undefined && (project.market.tvlUsd !== null) !== options.hasTvl) return false;
  if (options.hasGithub !== undefined && project.engineering.available !== options.hasGithub) return false;
  if (options.hasGovernance !== undefined && project.governance.configured !== options.hasGovernance) return false;
  if (options.hasContracts !== undefined && (project.contracts.count > 0) !== options.hasContracts) return false;
  if (options.minConfidence !== undefined && project.confidence.score < options.minConfidence) return false;
  return true;
}

/** Returns a new, filtered array — never mutates `projects`. */
export function filterLiveProjects(projects: LiveProject[], options: FilterOptions): LiveProject[] {
  return projects.filter((project) => matches(project, options));
}
