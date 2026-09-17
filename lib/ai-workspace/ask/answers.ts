/**
 * PR-090.02 (AI Ask) — one deterministic answer-builder per question id.
 * Every function here only SELECTS and (where the question is literally
 * about ordering by a real field, e.g. recency) SORTS already-real
 * `WorkspaceClaim`s off a `WorkspaceView` — none of them compute a score, a
 * risk level, a new confidence tier, or any other judgment. Sections are
 * read in the order `compose.ts` already produced them (AI Intelligence
 * briefs are already ranked by `rankBriefs()`; Daily Brief's five buckets
 * are already priority-selected by `lib/brief/sections.ts`) — that order is
 * reused as-is wherever "important"/"priority" is the question, never
 * re-derived. The two exceptions (`recentChanges`, and the Daily Brief half
 * of `strongestConfidence`) sort by the exact real field the question asks
 * about (`generatedAt`, `confidence.value`) — reading an existing field to
 * answer a question literally about that field, not synthesizing a new one.
 */

import { ASK_QUESTIONS } from "@/lib/ai-workspace/ask/questions";
import type { AskAnswerBuilder, AskQuestionId, AskResponse, AskResponseGroup } from "@/lib/ai-workspace/ask/types";
import type { WorkspaceClaim, WorkspaceView } from "@/lib/ai-workspace/types";

function section(view: WorkspaceView, id: "ai-intelligence" | "daily-brief"): WorkspaceClaim[] {
  return view.sections.find((s) => s.id === id)?.claims ?? [];
}

function respond(id: AskQuestionId, summary: string, citedClaims: WorkspaceClaim[]): AskResponse {
  return { questionId: id, question: ASK_QUESTIONS[id].prompt, summary, citedClaims };
}

function importantFindings(view: WorkspaceView): AskResponse {
  const claims = [...section(view, "ai-intelligence"), ...section(view, "daily-brief")].slice(0, 3);
  if (claims.length === 0) {
    return respond(
      "importantFindings",
      "Base Radar doesn't have any findings recorded yet — the AI Intelligence Engine hasn't detected real registry or provider changes this session, and the Daily Brief has no Watchlist alerts to summarize.",
      []
    );
  }
  return respond("importantFindings", `${claims.length} finding${claims.length === 1 ? "" : "s"} stand out right now, in Base Radar's own priority order:`, claims);
}

function strongestOpportunities(view: WorkspaceView): AskResponse {
  const opportunities = section(view, "daily-brief")
    .filter((c) => c.category === "Opportunity")
    .slice(0, 3);
  if (opportunities.length === 0) {
    return respond("strongestOpportunities", "No opportunity findings are on record yet — this populates once the Alert Engine has real Watchlist activity to score.", []);
  }
  return respond(
    "strongestOpportunities",
    `The Daily Brief's highest-priority opportunities right now, in the Daily Brief's existing Alert Engine priority order: ${opportunities.map((c) => c.projects[0]?.name ?? c.headline).join(", ")}. Base Radar doesn't retain per-signal evidence at this tier — see each item's limitation note below.`,
    opportunities
  );
}

/**
 * PR-090.02 correction — was reading Daily Brief "Security" highlights
 * (`securityHighlights`, `security-risk` narrative only), which silently
 * omitted every real `decline`-narrative finding. Now reads the Daily
 * Brief's own "Risk" claims (from `DailyBrief.topRisks`, covering BOTH
 * `decline` and `security-risk` — see `lib/brief/sections.ts`'s
 * `RISK_NARRATIVES`), the same real, already-composed claims the section
 * above already shows — never a second risk computation.
 */
function topRisks(view: WorkspaceView): AskResponse {
  const aiRisks = section(view, "ai-intelligence").filter((c) => c.category === "security");
  const briefRisks = section(view, "daily-brief").filter((c) => c.category === "Risk");
  const claims = [...aiRisks, ...briefRisks].slice(0, 3);
  if (claims.length === 0) {
    return respond("topRisks", "No risks or concerns are currently recorded — neither the AI Intelligence Engine nor the Daily Brief's Risk findings have flagged anything right now.", []);
  }
  return respond("topRisks", `${claims.length} risk${claims.length === 1 ? "" : "s"} or concern${claims.length === 1 ? "" : "s"} to be aware of:`, claims);
}

function recentChanges(view: WorkspaceView): AskResponse {
  const all = [...section(view, "ai-intelligence"), ...section(view, "daily-brief")];
  const claims = [...all].sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime()).slice(0, 3);
  if (claims.length === 0) {
    return respond("recentChanges", "Nothing has been recorded yet to describe as a recent change.", []);
  }
  return respond("recentChanges", `The most recent findings, newest first:`, claims);
}

const AI_INTELLIGENCE_CONFIDENCE_GROUP_LABEL = "AI Intelligence confidence";
const DAILY_BRIEF_CONFIDENCE_GROUP_LABEL = "Daily Brief confidence";

/**
 * PR-090.02 correction — AI Intelligence's categorical confidence
 * (low/medium/high/very-high) and Daily Brief's numeric 0-100 Alert Engine
 * score are two real, non-comparable models (same rule as
 * `WorkspaceConfidence` in `lib/ai-workspace/types.ts`: never a third,
 * unified shape). This builder never merges, normalizes, or ranks one
 * against the other — each real group is selected using only its OWN
 * model's existing values (an enum membership check for level; the
 * already-real numeric field for score, sorted only within its own group)
 * and returned as separate, clearly labeled `groups`, never a single
 * flattened ranking.
 */
function strongestConfidence(view: WorkspaceView): AskResponse {
  const highConfidenceBriefs = section(view, "ai-intelligence").filter((c) => c.confidence?.kind === "level" && (c.confidence.level === "high" || c.confidence.level === "very-high"));
  const topScoredDailyBrief = section(view, "daily-brief")
    .filter((c): c is WorkspaceClaim & { confidence: { kind: "score"; value: number } } => c.confidence?.kind === "score")
    .sort((a, b) => b.confidence.value - a.confidence.value)
    .slice(0, 2);

  const groups: AskResponseGroup[] = [];
  if (highConfidenceBriefs.length > 0) groups.push({ label: AI_INTELLIGENCE_CONFIDENCE_GROUP_LABEL, claims: highConfidenceBriefs });
  if (topScoredDailyBrief.length > 0) groups.push({ label: DAILY_BRIEF_CONFIDENCE_GROUP_LABEL, claims: topScoredDailyBrief });

  const question = ASK_QUESTIONS.strongestConfidence;
  if (groups.length === 0) {
    return { questionId: "strongestConfidence", question: question.prompt, summary: "No findings currently carry a confidence value strong enough to highlight — check back once more evidence has been gathered.", citedClaims: [] };
  }

  const summary =
    groups.length === 2
      ? "AI Intelligence Briefs and Daily Brief findings each use their own real confidence model — shown below as two separate groups, never combined into one ranking."
      : `Only ${groups[0].label} findings currently qualify. Shown using its own real confidence model — never combined with the other, which has no data right now.`;

  return { questionId: "strongestConfidence", question: question.prompt, summary, citedClaims: [...highConfidenceBriefs, ...topScoredDailyBrief], groups };
}

function evidenceToReviewFirst(view: WorkspaceView): AskResponse {
  const claims = section(view, "ai-intelligence")
    .filter((c) => c.evidence.length > 0)
    .slice(0, 3);
  if (claims.length === 0) {
    return respond(
      "evidenceToReviewFirst",
      "There's no cited evidence to review yet. AI Intelligence Briefs are the only findings in this workspace that carry per-signal evidence, and none have been generated this session.",
      []
    );
  }
  const evidenceCount = claims.reduce((total, c) => total + c.evidence.length, 0);
  return respond("evidenceToReviewFirst", `${evidenceCount} cited evidence item${evidenceCount === 1 ? "" : "s"} across ${claims.length} finding${claims.length === 1 ? "" : "s"} — start here:`, claims);
}

export const ASK_ANSWER_BUILDERS: Record<AskQuestionId, AskAnswerBuilder> = {
  importantFindings,
  strongestOpportunities,
  topRisks,
  recentChanges,
  strongestConfidence,
  evidenceToReviewFirst,
};
