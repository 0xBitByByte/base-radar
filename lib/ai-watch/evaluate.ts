/**
 * PR-090.03 (AI Watch — Stage 1) — pure evaluation only. No provider call,
 * no scoring, no ranking, no new "risk" concept: a claim counts as a Risk
 * finding using the exact same two real categories AI Ask's own `topRisks`
 * answer already reads (`lib/ai-workspace/ask/answers.ts`) — an AI
 * Intelligence claim categorized `"security"`, or a Daily Brief claim
 * categorized `"Risk"` (PR-090.02's `topRisks` composition, covering both
 * `decline` and `security-risk` narratives). Reused, never redefined.
 *
 * Hardening (post-Stage-1) — `WorkspaceClaim.id` embeds the source engine's
 * own generation timestamp (`lib/brief/sections.ts`'s `buildTopRisks()` uses
 * the real alert's `timestamp`; `lib/ai-intelligence/generator/generate.ts`
 * embeds `now` directly, e.g. `` `brief:${rule.id}:${index}:${now}` ``) —
 * neither is a stable "this is the same underlying condition" identity
 * across two separate page loads, since both the Alert Engine's demo data
 * and the AI Intelligence generator recompute fresh on every load with no
 * persisted history of their own (confirmed live: the identical real
 * Aerodrome security condition re-appeared across reloads with a different
 * `id`, a different `confidence`, yet the SAME `headline`). `findingKey()`
 * is AI Watch's own, local, content-derived identity — built only from
 * fields that stayed stable across that same live test (`origin`,
 * `category`, the claim's real project ids, and `headline`, the one field
 * the Alert Engine keeps textually stable for "the same kind of finding on
 * the same project") — never from `id`, `confidence`, `evidence`, or any
 * timestamp. This is entirely local to `lib/ai-watch/`; nothing in
 * `lib/alerts/`, `lib/brief/`, or `lib/ai-intelligence/` was touched.
 */

import type { WorkspaceClaim, WorkspaceView } from "@/lib/ai-workspace/types";

function isRiskClaim(claim: WorkspaceClaim): boolean {
  return (claim.origin === "ai-intelligence" && claim.category === "security") || (claim.origin === "daily-brief" && claim.category === "Risk");
}

/** Every real Risk claim whose project is a member of the given Watchlist — never a second Watchlist-membership computation; `watchlistProjectIds` is the caller's own already-canonical `useWatchlist().projectIds`. */
export function findWatchlistRiskClaims(view: WorkspaceView, watchlistProjectIds: readonly string[]): WorkspaceClaim[] {
  if (watchlistProjectIds.length === 0) return [];
  const watched = new Set(watchlistProjectIds);
  return view.sections.flatMap((section) => section.claims).filter((claim) => isRiskClaim(claim) && claim.projects.some((project) => watched.has(project.id)));
}

/**
 * A stable, content-derived identity for "the same underlying finding" —
 * deliberately excludes `id`/`generatedAt`/`confidence`/`evidence` (all
 * observed or documented as volatile across two separate real computations
 * of the same condition) in favor of the fields that actually identify
 * WHAT the finding is about: which engine produced it, its category, which
 * real project(s) it names, and its real headline. Project ids are sorted
 * so a claim naming the same projects in a different order still matches.
 */
export function computeFindingKey(claim: WorkspaceClaim): string {
  const projectIds = [...claim.projects.map((project) => project.id)].sort().join(",");
  return `${claim.origin}:${claim.category}:${projectIds}:${claim.headline}`;
}

/** Pure diff: only claims whose stable `computeFindingKey()` was never seen before. Never re-fires on an already-surfaced finding — even if the Alert Engine gave it a new `id`/timestamp/confidence on this reload — and never invents a "new" finding that isn't genuinely new. */
export function findNewRiskClaims(currentRiskClaims: readonly WorkspaceClaim[], previouslySeenFindingKeys: ReadonlySet<string>): WorkspaceClaim[] {
  return currentRiskClaims.filter((claim) => !previouslySeenFindingKeys.has(computeFindingKey(claim)));
}
