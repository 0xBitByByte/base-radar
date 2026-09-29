/**
 * Public payload audit follow-up — the serialization boundary between the
 * internal `LiveProject` domain model and anything served to an anonymous
 * browser. Confirmed by tracing every public consumer (`LiveProjectCard.tsx`
 * is the ONLY one that reads `discoveryEvidence` at all, and it reads
 * exactly one field: `discoveryEvidence.statusReason`) that
 * `discoveryEvidence.registryMatch.matches`/`.strongestMatch` — the
 * Discovery Engine's internal duplicate-detection audit trail
 * (`candidateExternalId`, `existingProjectId`, `confidence` weight,
 * `matchedOn`; see `lib/discovery/duplicates.ts`'s own doc comment: "kept
 * for audit/review," "a starting heuristic for a future reviewer UI") — is
 * never rendered by the public product, yet was flowing straight into
 * `getCachedLiveProjects()`'s public consumers unredacted.
 *
 * Deliberately NOT a new, narrower TypeScript type (`PublicLiveProject`
 * distinct from `LiveProject`). `toPublicLiveProject` returns a NEW object
 * (never mutates its input) that is still exactly `LiveProject`-shaped —
 * `registryMatch.matches`/`strongestMatch` are emptied (`[]`/`null`), not
 * removed from the type — so every existing pure function this app already
 * has (`computeHeroSnapshot`, `computeProjectsPageData`,
 * `buildDirectoryPipelineFromState`, `filterLiveProjects`,
 * `sortLiveProjects`, `LiveProjectCard`, ...) keeps working against it with
 * zero signature changes anywhere. This is still a real serialization
 * boundary: the ORIGINAL `LiveProject[]` from `getLiveProjects()`/
 * `getCachedLiveProjects()` is completely untouched — those functions, and
 * every other consumer of them (Discovery Engine, duplicate detection,
 * registry matching, `[slug]/ai/page.tsx`'s own server-side-only rank
 * comparison, any future admin/reviewer tooling), still see the full,
 * real, un-redacted data. Only the two public Projects pages call this
 * function, and only on the copy they're about to hand to a `"use client"`
 * component (i.e. about to serialize across the RSC boundary into the
 * public HTML payload).
 *
 * An emptied `matches: []` is also indistinguishable from a project that
 * genuinely had no duplicate-match candidates (the common case — 1,023 of
 * 1,035 real projects today) — redacting doesn't itself reveal "this
 * project had matches we hid," which a sentinel/omitted-field approach
 * would risk implying.
 */

import type { LiveProject } from "@/lib/projects/types";

export function toPublicLiveProject(project: LiveProject): LiveProject {
  if (!project.discoveryEvidence) return project;
  return {
    ...project,
    discoveryEvidence: {
      ...project.discoveryEvidence,
      registryMatch: {
        ...project.discoveryEvidence.registryMatch,
        matches: [],
        strongestMatch: null,
      },
    },
  };
}

export function toPublicLiveProjects(projects: LiveProject[]): LiveProject[] {
  return projects.map(toPublicLiveProject);
}
