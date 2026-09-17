/**
 * PR-090.02 (AI Ask) — domain types for the deterministic Q&A layer over the
 * AI Workspace. This deliberately does NOT reuse `lib/ai-chat/`'s
 * `ConversationInput`/`AIChatFact`/`AIChatResponse` shapes: those exist to
 * assemble several wallet-specific hook results into one input object, a
 * problem this feature doesn't have — the AI Workspace's canonical input is
 * already exactly one object, `WorkspaceView` (see `lib/ai-workspace/types.ts`),
 * built once by `buildWorkspaceView()`. An `AskResponse` cites real
 * `WorkspaceClaim`s directly rather than reducing them to a flat fact list —
 * `EvidenceClaimCard` already renders a claim's evidence/sources/confidence/
 * limitation correctly, so citing the claim itself (never re-deriving those
 * fields into a second shape) is what keeps this answer engine from
 * becoming a second, competing presentation of the same data.
 */

import type { WorkspaceClaim, WorkspaceView } from "@/lib/ai-workspace/types";

export const ASK_QUESTION_IDS = ["importantFindings", "strongestOpportunities", "topRisks", "recentChanges", "strongestConfidence", "evidenceToReviewFirst"] as const;
export type AskQuestionId = (typeof ASK_QUESTION_IDS)[number];

export type AskQuestion = { id: AskQuestionId; prompt: string };

/**
 * PR-090.02 correction — a labeled partition of `citedClaims`, used ONLY by
 * a question whose real underlying data spans two models that must never be
 * compared, merged, or ranked against each other (e.g. AI Intelligence's
 * categorical confidence vs. Daily Brief's numeric score). `label` names
 * which real model the group's claims use — never a fabricated "combined"
 * label.
 */
export type AskResponseGroup = { label: string; claims: WorkspaceClaim[] };

export type AskResponse = {
  questionId: AskQuestionId;
  question: string;
  /** A deterministic, template-composed sentence — never invented, always describing `citedClaims`/`groups` (or their real absence) below. */
  summary: string;
  /** The exact, already-composed `WorkspaceClaim`s this answer draws from — rendered via the same `EvidenceClaimCard` the sections above use, so evidence/sources/confidence/limitation are never re-derived or restated in a second shape. Empty when the honest answer is "not enough data yet." When `groups` is present, this is simply the concatenation of every group's claims (kept for callers that only need the flat list). */
  citedClaims: WorkspaceClaim[];
  /** Present only when the answer must visibly separate claims from two non-comparable models — see `AskResponseGroup`. Absent (never an empty array) for every other question; when present and non-empty, the UI renders these labeled groups instead of the flat `citedClaims` list. */
  groups?: AskResponseGroup[];
};

/** Every builder reads only `WorkspaceView` — the same object `AIWorkspaceView` already built via `buildWorkspaceView()` — never a provider, hook, or engine call of its own. */
export type AskAnswerBuilder = (view: WorkspaceView) => AskResponse;
