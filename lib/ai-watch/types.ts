/**
 * PR-090.03 (AI Watch — Stage 1). Domain types for the ONE fixed watch this
 * slice ships: "notify me if a Watchlist project's Risk category gains a
 * new finding." No custom rule builder — matching Project Automation's own
 * "a small, closed set... deliberately not a general query DSL"
 * (`lib/automation/rules.ts`), this is smaller still: exactly one template,
 * enable/disable only.
 *
 * `AIWatchAlert.claim` carries the exact, already-composed `WorkspaceClaim`
 * that triggered it (see `lib/ai-workspace/types.ts`) — evidence, sources,
 * confidence, and limitation are never re-derived or restated in a second
 * shape, the same discipline AI Ask's `citedClaims` already established.
 */

import type { WorkspaceClaim } from "@/lib/ai-workspace/types";

/** A fixed id — Stage 1 has exactly one watch, never a user-created list. */
export const AI_WATCH_ID = "risk-findings" as const;

export type AIWatchConfig = {
  enabled: boolean;
  /** `null` until the user has ever enabled the watch. */
  createdAt: string | null;
};

/**
 * `"ready"` — the Alert Engine has real data and the watch can be trusted.
 * `"checking"` — the Alert Engine's own one-shot refresh hasn't resolved
 * yet (mirrors `AlertRefreshStatus === "loading"`).
 * `"unavailable"` — the Alert Engine's own refresh genuinely failed
 * (`AlertRefreshStatus === "error"`); AI Watch must never evaluate or
 * fire in this state — see `lib/hooks/useAIWatch.ts`'s hard stale-data gate.
 */
export type AIWatchStatus = "ready" | "checking" | "unavailable";

export type AIWatchAlert = {
  /** `ai-watch:${claim.id}` — deterministic, so the same real claim is never persisted twice. */
  id: string;
  /** The real moment THIS DEVICE first observed the claim as new — never the claim's own `generatedAt`, which is a different, real fact (when the finding itself occurred). */
  firstSeenAt: string;
  isRead: boolean;
  readAt: string | null;
  claim: WorkspaceClaim;
};
