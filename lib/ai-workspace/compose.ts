/**
 * PR-090.01 (AI Workspace — Evidence Dashboard) — the one place raw
 * `DailyIntelligenceBriefing`/`DailyBrief` output is reshaped into
 * `WorkspaceClaim`s. Pure functions only: no provider call, no scoring, no
 * ranking beyond the order each source engine already returns (AI
 * Intelligence briefs are already ranked by `rankBriefs()`; Daily Brief's
 * five highlight arrays are already priority-selected by
 * `lib/brief/sections.ts`'s own `buildTop*`/`build*Highlights` functions).
 * This file only SELECTS and RESHAPES fields that already exist — it never
 * computes a new score, confidence, or narrative.
 */

import { getProject } from "@/data/projects/helpers";
import { EVIDENCE_KIND_LABEL } from "@/lib/ai-intelligence/dashboard-adapter";
import { INTELLIGENCE_SOURCE_LABEL } from "@/lib/ai-intelligence/sources";
import type { AIIntelligenceBrief } from "@/lib/ai-intelligence/types";
import type { DailyIntelligenceBriefing } from "@/lib/ai-intelligence/generator/briefing";
import type { BriefHighlight, BriefOpportunity, BriefRisk, DailyBrief } from "@/lib/brief/types";
import type { WorkspaceClaim, WorkspaceProjectRef, WorkspaceSection, WorkspaceView } from "@/lib/ai-workspace/types";

function projectRefs(ids: string[]): WorkspaceProjectRef[] {
  return ids.map((id) => {
    const project = getProject(id);
    return { id, name: project?.name ?? id, slug: project?.slug ?? null };
  });
}

/** One real `AIIntelligenceBrief` → one `WorkspaceClaim`. Evidence and sources are copied verbatim; `createIntelligenceBrief()` already guarantees both are non-empty, so `limitation` is honestly `null` here. */
function composeAIIntelligenceClaim(brief: AIIntelligenceBrief): WorkspaceClaim {
  return {
    id: brief.id,
    origin: "ai-intelligence",
    category: brief.category,
    headline: brief.headline,
    summary: brief.summary,
    confidence: { kind: "level", level: brief.confidence.level, rationale: brief.confidence.rationale, evidenceCount: brief.confidence.evidenceCount },
    evidence: brief.supportingSignals.map((signal) => ({
      id: signal.id,
      label: EVIDENCE_KIND_LABEL[signal.kind],
      detail: signal.description,
      occurredAt: signal.occurredAt,
      sourceLabel: INTELLIGENCE_SOURCE_LABEL[signal.source],
      url: signal.referenceUrl,
    })),
    sources: brief.supportingSources.map((source) => ({ label: source.label ?? INTELLIGENCE_SOURCE_LABEL[source.source], url: source.url })),
    projects: projectRefs(brief.affectedProjects),
    generatedAt: brief.generatedAt,
    limitation: null,
  };
}

function composeAIIntelligenceSection(briefing: DailyIntelligenceBriefing | null): WorkspaceSection {
  const claims = briefing ? briefing.briefs.map(composeAIIntelligenceClaim) : [];
  return {
    id: "ai-intelligence",
    title: "AI Intelligence Briefs",
    description: "Evidence-backed findings from the AI Intelligence Engine — each one requires at least one real, cited signal to exist at all.",
    claims,
    emptyReason: "No AI Intelligence briefs yet. This pipeline generates evidence-backed findings from real registry and provider changes — none have been detected in this session.",
  };
}

const DAILY_BRIEF_LIMITATION = "Reflects Base Radar's Alert Engine aggregate read — per-signal detail isn't retained at the Daily Brief level.";

/**
 * `BriefRisk` (PR-085.02, `lib/brief/types.ts`) is declared as `= BriefOpportunity` —
 * same shape, same score/confidence/timestamp/narrative fields, since a risk
 * is scored/reasoned exactly like an opportunity, just selected from the
 * opposite set of narratives (`decline`/`security-risk` vs.
 * `growth`/`accumulation`/`development-active`). One shared composer for
 * both, distinguished only by the real `category` label passed in
 * ("Opportunity" vs. "Risk") — never a second, parallel mapping to drift
 * out of sync with this one.
 */
function composeScoredDailyBriefClaim(item: BriefOpportunity | BriefRisk, category: string, dailyBriefGeneratedAt: string): WorkspaceClaim {
  return {
    id: `${category.toLowerCase()}:${item.projectId}:${item.timestamp}`,
    origin: "daily-brief",
    category,
    headline: item.headline,
    summary: item.reason,
    confidence: { kind: "score", value: item.confidence },
    evidence: [],
    sources: [{ label: "Base Radar Alert Engine" }],
    projects: projectRefs([item.projectId]),
    generatedAt: item.timestamp || dailyBriefGeneratedAt,
    limitation: DAILY_BRIEF_LIMITATION,
  };
}

function composeHighlightClaim(item: BriefHighlight, category: string, dailyBriefGeneratedAt: string): WorkspaceClaim {
  return {
    id: `${category.toLowerCase()}:${item.projectId}:${item.headline}`,
    origin: "daily-brief",
    category,
    headline: item.headline,
    summary: item.detail,
    confidence: null,
    evidence: [],
    sources: [{ label: "Base Radar Alert Engine" }],
    projects: projectRefs([item.projectId]),
    generatedAt: dailyBriefGeneratedAt,
    limitation: DAILY_BRIEF_LIMITATION,
  };
}

/**
 * A `BriefHighlight` carries `severity`, never a numeric confidence — this
 * app has no existing severity→confidence mapping, and inventing one would
 * be exactly the "new confidence value" this PR must not create. Every
 * highlight-derived claim below honestly reports `confidence: null` ("not
 * available") rather than fabricating a score from severity.
 */
function composeDailyBriefSection(dailyBrief: DailyBrief | null): WorkspaceSection {
  const claims: WorkspaceClaim[] = dailyBrief
    ? [
        ...dailyBrief.topOpportunities.map((item) => composeScoredDailyBriefClaim(item, "Opportunity", dailyBrief.generatedAt)),
        ...dailyBrief.topRisks.map((item) => composeScoredDailyBriefClaim(item, "Risk", dailyBrief.generatedAt)),
        ...dailyBrief.securityHighlights.map((item) => composeHighlightClaim(item, "Security", dailyBrief.generatedAt)),
        ...dailyBrief.governanceHighlights.map((item) => composeHighlightClaim(item, "Governance", dailyBrief.generatedAt)),
        ...dailyBrief.developmentHighlights.map((item) => composeHighlightClaim(item, "Development", dailyBrief.generatedAt)),
        ...dailyBrief.tvlHighlights.map((item) => composeHighlightClaim(item, "TVL", dailyBrief.generatedAt)),
      ]
    : [];

  return {
    id: "daily-brief",
    title: "Daily Brief Findings",
    description: "Today's curated read across Opportunities, Risks, Security, Governance, Development, and TVL — built entirely from the Alert Engine's own scored output.",
    claims,
    emptyReason: "No Daily Brief findings yet. This section populates once the Alert Engine has real Watchlist alerts to summarize.",
  };
}

/** `generatedAt` is the real AI Intelligence briefing timestamp (always server-computed, never `Date.now()` at render time) — a stable, honest "as of" stamp for the page header, independent of whether the client-side Daily Brief has hydrated yet. */
export function buildWorkspaceView(briefing: DailyIntelligenceBriefing | null, dailyBrief: DailyBrief | null): WorkspaceView {
  return {
    sections: [composeAIIntelligenceSection(briefing), composeDailyBriefSection(dailyBrief)],
    generatedAt: briefing?.generatedAt ?? dailyBrief?.generatedAt ?? "",
  };
}
