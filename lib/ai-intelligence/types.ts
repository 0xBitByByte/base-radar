import type { IntelligenceConfidence } from "@/lib/ai-intelligence/confidence";
import type { SupportingSignal } from "@/lib/ai-intelligence/evidence";
import type { IntelligenceCategory } from "@/lib/ai-intelligence/categories";
import type { IntelligenceImpactLevel } from "@/lib/ai-intelligence/impact";
import type { SourceReference } from "@/lib/ai-intelligence/sources";

/**
 * The reusable Intelligence Brief model — PR-040's central deliverable.
 * Named `AIIntelligenceBrief`, not `IntelligenceBrief`, to avoid a real
 * naming collision: `IntelligenceBrief` already exists in
 * `lib/data/types.ts` (a much simpler `{ points: IntelligenceBriefPoint[];
 * generatedAt }` shape powering the Dashboard's "Base Intelligence Brief"
 * widget, `components/dashboard/IntelligenceBrief.tsx`). The two are
 * unrelated shapes that happen to share a domain name — see
 * docs/AI_INTELLIGENCE_ENGINE.md's naming note. This PR does not modify,
 * replace, or wire into that existing widget.
 *
 * Meant to be reusable across every surface the brief lists (Dashboard,
 * Daily Brief, Project pages, Notifications, a future email digest) —
 * nothing about this type is Dashboard-specific or Project-page-specific.
 * This PR does not wire it into any of them; it only defines the shape.
 */
export type AIIntelligenceBrief = {
  /** Deterministic — see `createIntelligenceBrief()` in `builder.ts`. */
  id: string;
  generatedAt: string;
  /** One sentence, headline-style — "what happened." */
  headline: string;
  /** A few sentences of plain-language explanation — "why it matters," expanding on the headline. */
  summary: string;
  /** Always derived from `supportingSignals` via `deriveConfidence()` — never hand-set. See `confidence.ts`. */
  confidence: IntelligenceConfidence;
  /** How much this matters if true — independent of confidence. See `impact.ts`. */
  impact: IntelligenceImpactLevel;
  category: IntelligenceCategory;
  /** `Project.id` values (`data/projects/`) this brief concerns. Empty for a genuinely ecosystem-wide brief — never a single arbitrary project picked to fill the field. */
  affectedProjects: string[];
  /** At least one required — see `createIntelligenceBrief()`. */
  supportingSignals: SupportingSignal[];
  /** At least one required — see `createIntelligenceBrief()`. */
  supportingSources: SourceReference[];
  /** Free-form, lowercase, for search/filter UIs — no fixed vocabulary (unlike `category`). */
  tags: string[];
};
