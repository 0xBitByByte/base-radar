/**
 * PR-077 — cross-rail deduplication for the Projects page's curated
 * sections (Curated Discovery / Leaderboards / Needs Your Attention).
 * Every rail on that page already computes its own correctly-ranked
 * `LiveProject[]` (via `buildCollections`/`sortLiveProjects`/`filterLiveProjects` —
 * untouched, still the single source of truth for *which* projects qualify
 * and in *what order*). This module only decides which already-ranked
 * candidates a rail is allowed to actually render, so the same handful of
 * projects (Aave, Aerodrome, etc.) stop reappearing in nearly every section.
 *
 * Deliberately scoped to the Projects page's own curated rails — the Full
 * Directory (`ProjectsDirectory`/`buildDirectoryPipeline`) and every
 * dedicated single-collection route (`/dashboard/projects/{slug}`) still
 * show their true, complete, undeduplicated set; this only governs what's
 * visible on the shared landing page before a reader opts into "View All."
 */

import type { LiveProject } from "@/lib/projects/types";

/** A project may claim at most this many curated-rail slots across the whole page. */
export const MAX_CURATED_APPEARANCES = 2;

export type CuratedRailInput = {
  /** Stable key for this rail — used only to key the returned record, never read for ranking. */
  key: string;
  /**
   * This rail's own candidates, already filtered and sorted by its real
   * ranking criteria (e.g. `sortLiveProjects(..., "tvl", "desc")`) — never
   * re-sorted here. Sections are deduplicated in the order they appear in
   * `sections`, so pass them in the page's actual display order: earlier
   * rails keep first claim on a project, later rails fall through to their
   * next-ranked eligible candidate.
   */
  ranked: LiveProject[];
  /** The rail's real render cap (`ProjectsViewMeta.maxCards`) — never exceeded, never padded past what `ranked` can actually supply. */
  maxCards: number;
};

/**
 * Greedy, priority-ordered, single-pass dedup across every curated rail.
 * For each rail (in the given order), walks its own `ranked` list start to
 * finish and keeps a candidate only if it hasn't already claimed
 * `MAX_CURATED_APPEARANCES` slots in this or an earlier rail — i.e. the
 * "next highest eligible project" a section's own ranking would produce
 * once already-doubled-up projects are skipped. A project's total
 * appearance count is tracked in one `Map`, so each candidate is a single
 * O(1) lookup — the whole pass is O(total candidates examined across every
 * rail), never a nested per-rail re-filter of the others.
 */
export function dedupeCuratedRails(sections: CuratedRailInput[]): Record<string, LiveProject[]> {
  const appearanceCount = new Map<string, number>();
  const result: Record<string, LiveProject[]> = {};

  for (const { key, ranked, maxCards } of sections) {
    const picked: LiveProject[] = [];

    for (const project of ranked) {
      if (picked.length >= maxCards) break;

      const count = appearanceCount.get(project.id) ?? 0;
      if (count >= MAX_CURATED_APPEARANCES) continue;

      picked.push(project);
      appearanceCount.set(project.id, count + 1);
    }

    result[key] = picked;
  }

  return result;
}
