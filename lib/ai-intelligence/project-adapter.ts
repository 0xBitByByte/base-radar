import type { AIIntelligenceBrief } from "@/lib/ai-intelligence/types";
import type { IntelligenceConfidenceLevel } from "@/lib/ai-intelligence/confidence";
import type { IntelligenceImpactLevel } from "@/lib/ai-intelligence/impact";

/**
 * PR-043 — the Project Intelligence Panel's presentation shape for a
 * single brief. A narrower READ-projection of `AIIntelligenceBrief`, not a
 * competing model: it drops `category`/`affectedProjects`/`tags`/
 * `supportingSignals`/`supportingSources` (the Panel surfaces those
 * separately, via `lib/ai-intelligence/dashboard-adapter.ts`'s existing,
 * reused evidence/source functions — never duplicated here) and flattens
 * `confidence.level` for direct display.
 */
export type ProjectIntelligenceHighlight = {
  id: string;
  headline: string;
  summary: string;
  impact: IntelligenceImpactLevel;
  confidenceLevel: IntelligenceConfidenceLevel;
  timestamp: string;
};

function toHighlight(brief: AIIntelligenceBrief): ProjectIntelligenceHighlight {
  return {
    id: brief.id,
    headline: brief.headline,
    summary: brief.summary,
    impact: brief.impact,
    confidenceLevel: brief.confidence.level,
    timestamp: brief.generatedAt,
  };
}

/**
 * The Panel's "Latest Intelligence" headline — the single highest-priority
 * brief. `briefs` is expected already ranked (as `getProjectAIIntelligence()`
 * returns it); this never re-sorts. `undefined` when the project has no
 * briefs at all, the signal the Panel uses to hide "Latest Intelligence"
 * entirely rather than showing a placeholder.
 */
export function toLatestProjectHighlight(briefs: AIIntelligenceBrief[]): ProjectIntelligenceHighlight | undefined {
  return briefs[0] ? toHighlight(briefs[0]) : undefined;
}

/**
 * The Panel's "Related Intelligence" chronological list — every brief
 * after the latest one. Empty when there's only one (or zero) briefs, so
 * the Panel never renders a redundant one-item "related" list under a
 * "latest" section showing that same single brief.
 */
export function toRelatedProjectHighlights(briefs: AIIntelligenceBrief[]): ProjectIntelligenceHighlight[] {
  return briefs.slice(1).map(toHighlight);
}
