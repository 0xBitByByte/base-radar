/**
 * PR-090.01 (AI Workspace — Evidence Dashboard) — presentation-only types.
 * Every field here reshapes an already-computed value from
 * `lib/ai-intelligence/` or `lib/brief/`; nothing is computed here. New
 * types only because neither existing module's own shape can express
 * "claim + evidence + source + freshness + confidence + limitation" in
 * one consistent record across two different origin engines — colocated
 * with this feature's own composition layer, the same convention
 * `lib/notification-explain/types.ts` already established for a
 * presentation-only reshape of Cross-Feature Intelligence.
 *
 * `WorkspaceConfidence` deliberately has exactly the two variants that
 * already exist elsewhere in this codebase (`IntelligenceConfidence` from
 * `lib/ai-intelligence/confidence.ts`, and the plain 0-100 score
 * `IntelligenceAlert`/`BriefOpportunity` already carry) — never a third,
 * unified shape. Each claim keeps its real source's real value.
 */

import type { IntelligenceConfidenceLevel } from "@/lib/ai-intelligence/confidence";

export type WorkspaceConfidence =
  | { kind: "level"; level: IntelligenceConfidenceLevel; rationale: string; evidenceCount: number }
  | { kind: "score"; value: number };

export type WorkspaceEvidenceItem = {
  id: string;
  label: string;
  detail: string;
  occurredAt: string | null;
  sourceLabel: string | null;
  url?: string;
};

export type WorkspaceSourceRef = { label: string; url?: string };

/** `slug` is `null` only when the project id no longer resolves in the registry — the UI renders a plain (non-linking) name in that case, never a broken link. */
export type WorkspaceProjectRef = { id: string; name: string; slug: string | null };

export type WorkspaceClaim = {
  id: string;
  /** Which real engine produced this claim — shown so a reader always knows the provenance without guessing. */
  origin: "ai-intelligence" | "daily-brief";
  /** A short, real category label already present on the source record (e.g. "Security", "Opportunity") — never invented. */
  category: string;
  headline: string;
  summary: string;
  /** `null` only when this claim's real source record carries no confidence value at all (e.g. a severity-only highlight) — rendered as an honest "not available," never a fabricated 0%. */
  confidence: WorkspaceConfidence | null;
  evidence: WorkspaceEvidenceItem[];
  sources: WorkspaceSourceRef[];
  projects: WorkspaceProjectRef[];
  /** The real timestamp this claim is anchored to — the specific event's own timestamp when one exists, else the containing brief/report's own `generatedAt`. Never fabricated. */
  generatedAt: string;
  /** A real, honest reason evidence or sources are thin for THIS claim — `null` when there's nothing to caveat. Never a generic disclaimer. */
  limitation: string | null;
};

export type WorkspaceSection = {
  id: string;
  title: string;
  description: string;
  claims: WorkspaceClaim[];
  /** Shown only when `claims.length === 0` — a real, specific reason, never a generic "nothing here." */
  emptyReason: string;
};

export type WorkspaceView = {
  sections: WorkspaceSection[];
  generatedAt: string;
};
