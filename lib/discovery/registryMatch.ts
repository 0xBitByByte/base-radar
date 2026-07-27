/**
 * PR-053 — Registry Matching (Task 3). Classifies a discovered candidate
 * against the existing Project Registry into exactly one of six outcomes,
 * built on top of `duplicates.ts`'s `findDuplicateMatches()` (unchanged
 * matching mechanics — this module only interprets its output) rather than
 * introducing a second, competing comparison engine.
 *
 * "Never rely only on project name" (the brief's own words) is enforced
 * structurally here: every branch below requires at least one non-name
 * signal (`contract`/`coingeckoId`/`github`/`website`/`defillamaSlug`)
 * before a candidate can be classified as anything other than `"new"` or
 * `"needs-review"` — a bare name match alone can only ever produce
 * `"needs-review"`, never `"duplicate"`/`"updated"`/`"renamed"`/`"alias"`.
 */

import { normalizeName } from "@/lib/discovery/normalize";
import { findDuplicateMatches, type DuplicateMatch, type DuplicateMatchField } from "@/lib/discovery/duplicates";
import type { CandidateProject } from "@/lib/discovery/types";
import type { Project } from "@/data/projects/types";

export const REGISTRY_MATCH_TYPES = ["new", "duplicate", "updated", "renamed", "alias", "needs-review"] as const;
export type RegistryMatchType = (typeof REGISTRY_MATCH_TYPES)[number];

/** A unique-identifier signal — essentially never a coincidence when it matches (an address, a CoinGecko id, a specific GitHub repo). Distinct from a "secondary" signal (website/Twitter), which two related-but-distinct entities (e.g. a DAO and its foundation) can legitimately share. */
const UNIQUE_IDENTIFIER_FIELDS: DuplicateMatchField[] = ["contract", "coingeckoId", "github"];

export type RegistryMatch = {
  type: RegistryMatchType;
  /** The matched registry project — `null` only when `type === "new"`. */
  project: Project | null;
  /** Every ranked match against the full registry (`findDuplicateMatches`'s raw output) — kept for audit/review, not just the winner. */
  matches: DuplicateMatch[];
  /** `matches[0]`, or `null` when `matches` is empty. */
  strongestMatch: DuplicateMatch | null;
  /** Plain-English justification for `type` — always references the real signal(s) that decided it, never a bare label. */
  reason: string;
};

function hasUniqueIdentifierMatch(match: DuplicateMatch): boolean {
  return match.matchedOn.some((field) => UNIQUE_IDENTIFIER_FIELDS.includes(field));
}

/** A weaker-but-real secondary signal (website or a fuzzy DefiLlama slug) without any unique identifier alongside it. */
function hasOnlySecondarySignal(match: DuplicateMatch): boolean {
  const hasSecondary = match.matchedOn.some((field) => field === "website" || field === "defillamaSlug" || field === "twitter");
  return hasSecondary && !hasUniqueIdentifierMatch(match);
}

/**
 * Does the candidate carry a real field the registry's matched project
 * doesn't already have on record, or a conflicting value for a field both
 * have? This is what separates `"duplicate"` (nothing new to learn) from
 * `"updated"` (this rediscovery surfaced something worth a registry
 * refresh) — checked only against fields both a `CandidateProject` and a
 * `Project` genuinely carry, never a guess.
 */
function candidateHasNewOrDifferingData(candidate: CandidateProject, project: Project): boolean {
  if (candidate.website && project.websiteUrl && !project.websiteUrl.includes(candidate.website.replace(/^https?:\/\//i, ""))) {
    return true;
  }
  if (candidate.website && !project.websiteUrl) return true;
  if (candidate.github && !project.github) return true;
  if (candidate.socials.twitter && !project.social.twitter) return true;
  if (candidate.contracts.length > 0 && candidate.contracts.some((c) => !project.contracts.some((pc) => pc.address.toLowerCase() === c.address.toLowerCase()))) {
    return true;
  }
  return false;
}

/**
 * Classifies one candidate against the full registry. Pure — never
 * mutates `candidate`, `existingProjects`, or any `Project` record.
 */
export function matchAgainstRegistry(candidate: CandidateProject, existingProjects: Project[]): RegistryMatch {
  const matches = findDuplicateMatches(candidate, existingProjects);
  const strongestMatch = matches[0] ?? null;

  if (!strongestMatch) {
    return { type: "new", project: null, matches, strongestMatch: null, reason: "No existing registry project shares any identifier with this candidate." };
  }

  const project = existingProjects.find((p) => p.id === strongestMatch.existingProjectId) ?? null;
  const nameMatches = candidate.normalizedName === (project ? normalizeName(project.name) : "");
  const uniqueMatch = hasUniqueIdentifierMatch(strongestMatch);

  // A bare name match (or a match too weak to trust on its own) — never
  // auto-classified as anything more confident than "needs-review."
  if (!uniqueMatch && !hasOnlySecondarySignal(strongestMatch)) {
    return {
      type: "needs-review",
      project,
      matches,
      strongestMatch,
      reason: `Only a name match was found (matched on: ${strongestMatch.matchedOn.join(", ")}) — not strong enough evidence to auto-classify without a human review.`,
    };
  }

  if (uniqueMatch && nameMatches) {
    if (project && candidateHasNewOrDifferingData(candidate, project)) {
      return {
        type: "updated",
        project,
        matches,
        strongestMatch,
        reason: `Matched ${project.name} on a unique identifier (${strongestMatch.matchedOn.join(", ")}) and the same name, but this candidate carries data not yet on the registry record — worth a refresh.`,
      };
    }
    return {
      type: "duplicate",
      project,
      matches,
      strongestMatch,
      reason: `Matched ${project?.name ?? strongestMatch.existingProjectId} on a unique identifier (${strongestMatch.matchedOn.join(", ")}) and the same name — this is the already-tracked project, rediscovered.`,
    };
  }

  if (uniqueMatch && !nameMatches) {
    return {
      type: "renamed",
      project,
      matches,
      strongestMatch,
      reason: `Matched ${project?.name ?? strongestMatch.existingProjectId} on a unique identifier (${strongestMatch.matchedOn.join(", ")}), but the reported name ("${candidate.displayName}") differs from the registry's ("${project?.name}") — likely a rebrand.`,
    };
  }

  // A secondary-only signal (website/Twitter/fuzzy DefiLlama slug) with no
  // unique identifier backing it up — plausible alternate branding, but
  // real risk of a false positive (e.g. a shared marketing site), so this
  // is deliberately never auto-classified as strongly as "renamed."
  return {
    type: "alias",
    project,
    matches,
    strongestMatch,
    reason: `Matched ${project?.name ?? strongestMatch.existingProjectId} only on a secondary signal (${strongestMatch.matchedOn.join(", ")}), without a unique identifier to confirm it — flagged as a possible alias, needs a human look.`,
  };
}
