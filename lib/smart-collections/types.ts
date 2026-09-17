/**
 * PR-090.04 (Smart Collections) — domain types. A Smart Collection is a
 * fixed, deterministic view over already-computed intelligence — never a
 * user-defined query, never a new scoring/ranking engine. Every evaluator
 * (`evaluate.ts`) only SELECTS and RESHAPES fields that already exist on
 * `LiveProject` (`lib/projects/types.ts`), `IntelligenceAlert`
 * (`lib/alerts/intelligence/types.ts`), `DailyBrief` (`lib/brief/types.ts`),
 * or `WhaleEvent` (`lib/whale/types.ts`).
 *
 * `SmartCollectionMatch.liveProject` is `null` for the three collections
 * that can only be evaluated from client-only Alert Engine/Daily Brief data
 * (Trending Narratives, Stable Projects, Yield Opportunities) — resolving
 * the full ~1,000-project registry client-side just to look up a name/slug
 * would mean shipping the entire catalog to the browser for three
 * collections that don't need it. `projectId`/`projectName`/`projectSlug`
 * are still always real (resolved via `data/projects/helpers`'s
 * `getProject()`, the same lightweight lookup `lib/ai-workspace/compose.ts`
 * already uses for its own project references) — never fabricated.
 */

import type { LiveProject } from "@/lib/projects/types";

export const SMART_COLLECTION_IDS = [
  "ai-picks",
  "whale-accumulation",
  "developer-momentum",
  "high-conviction",
  "low-risk",
  "governance-active",
  "trending-narratives",
  "undervalued",
  "stable-projects",
  "yield-opportunities",
] as const;
export type SmartCollectionId = (typeof SMART_COLLECTION_IDS)[number];

/** Evaluated entirely server-side from `getLiveProjects()`/`getRawWhaleEvents()` — real `LiveProject` data, no client-only dependency. */
export const SERVER_EVALUATED_COLLECTION_IDS = ["ai-picks", "whale-accumulation", "developer-momentum", "high-conviction", "low-risk", "governance-active", "undervalued"] as const satisfies readonly SmartCollectionId[];

/** Need the client-only Alert Engine/Daily Brief — hard-gated by the same freshness check `useAIWatch` already established. */
export const CLIENT_EVALUATED_COLLECTION_IDS = ["trending-narratives", "stable-projects", "yield-opportunities"] as const satisfies readonly SmartCollectionId[];

export type SmartCollectionMeta = {
  id: SmartCollectionId;
  name: string;
  /** The real "why these projects belong here" sentence, matching `ProjectsViewMeta.description`'s own convention. */
  description: string;
};

/** One real, already-computed fact backing a match — never a generated sentence. */
export type SmartCollectionEvidence = { label: string; value: string };

export type SmartCollectionMatch = {
  projectId: string;
  projectName: string;
  projectSlug: string | null;
  /** The full enriched record for the 7 server-evaluated collections; `null` for the 3 client-evaluated ones — see this file's own doc comment. */
  liveProject: LiveProject | null;
  /** A real, deterministic, template-composed sentence — never invented. */
  reason: string;
  evidence: SmartCollectionEvidence[];
};

export type SmartCollectionStatus = "ready" | "checking" | "unavailable";

export type SmartCollectionResult = {
  id: SmartCollectionId;
  name: string;
  description: string;
  /** `"checking"`/`"unavailable"` for a client-evaluated collection whose real Alert Engine data hasn't loaded or failed — `matches` is always `[]` in either state, never a stale or fabricated result. Server-evaluated collections are always `"ready"` — the data they need was already awaited before this result was built. */
  status: SmartCollectionStatus;
  matches: SmartCollectionMatch[];
  /** The real moment this result was computed — a fresh evaluation on every visit, never persisted, never implying background monitoring. */
  lastEvaluatedAt: string;
  /** Mean real confidence across `matches` that carry one — `null` when no match has a real confidence value to average. A descriptive statistic over real numbers, never a fabricated score. */
  averageConfidence: number | null;
};
