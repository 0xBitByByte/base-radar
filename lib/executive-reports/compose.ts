/**
 * PR-090.05 (AI Executive Reports) — the one place raw `WorkspaceView`/
 * `DailyBrief`/`SmartCollectionResult[]` output is regrouped into
 * `ExecutiveReport`s. Pure functions only: no provider call, no scoring, no
 * new evidence pipeline, no second Daily Brief engine. Every claim/match
 * cited is the exact same object AI Workspace/Smart Collections already
 * built — this file only SELECTS and GROUPS by report-relevant theme
 * (Risks, Opportunities, Governance, Developer Activity, …), the same
 * "compose, never recompute" discipline `lib/ai-workspace/compose.ts` and
 * `lib/smart-collections/aggregate.ts` already established.
 *
 * Executive summaries are deterministic, template-composed sentences over
 * real counts — never a language model, and this file's own exported
 * `REPORT_GENERATION_NOTICE` says so explicitly on every report, honoring
 * this app's standing "never describe deterministic rules as generative
 * AI" rule (PR-090.01) from the opposite direction: never let a synthesized
 * summary read as a raw observation either.
 */

import type { WorkspaceClaim } from "@/lib/ai-workspace/types";
import type { ExecutiveReport, ExecutiveReportInput, ReportLimitation, ReportSection, ReportType } from "@/lib/executive-reports/types";
import type { SmartCollectionMatch } from "@/lib/smart-collections/types";

export const REPORT_GENERATION_NOTICE: ReportLimitation = {
  label: "How this report is generated",
  detail: "Every section below cites a real, already-computed finding from Base Radar's Alert Engine, AI Intelligence Engine, or Smart Collections. The summary above deterministically describes and groups them — it is not written by a language model, and never adds a fact not already present below.",
};

const NO_HISTORY_LIMITATION: ReportLimitation = {
  label: "No historical intelligence persistence yet",
  detail: "Base Radar does not currently persist ecosystem-wide intelligence snapshots over time, so this report cannot show a true period-over-period comparison (e.g. projects gaining or losing intelligence quality). It reflects the latest available intelligence as a single point in time. Historical trend tracking depends on future persistence infrastructure.",
};

function isRiskClaim(claim: WorkspaceClaim): boolean {
  return (claim.origin === "ai-intelligence" && claim.category === "security") || (claim.origin === "daily-brief" && claim.category === "Risk");
}

function isOpportunityClaim(claim: WorkspaceClaim): boolean {
  return claim.origin === "daily-brief" && claim.category === "Opportunity";
}

function isGovernanceClaim(claim: WorkspaceClaim): boolean {
  return (claim.origin === "ai-intelligence" && claim.category === "governance") || (claim.origin === "daily-brief" && claim.category === "Governance");
}

function isDeveloperClaim(claim: WorkspaceClaim): boolean {
  return (claim.origin === "ai-intelligence" && claim.category === "developer") || (claim.origin === "daily-brief" && claim.category === "Development");
}

function allClaims(input: ExecutiveReportInput): WorkspaceClaim[] {
  return input.workspaceView.sections.flatMap((section) => section.claims);
}

function collectionMatches(input: ExecutiveReportInput, id: string): SmartCollectionMatch[] {
  return input.smartCollections.find((result) => result.id === id)?.matches ?? [];
}

function section(id: string, title: string, description: string, parts: Partial<Pick<ReportSection, "claims" | "collectionMatches" | "metrics">>, emptyReason: string): ReportSection {
  const claims = parts.claims ?? [];
  const collectionMatchList = parts.collectionMatches ?? [];
  const metrics = parts.metrics ?? [];
  return { id, title, description, claims, collectionMatches: collectionMatchList, metrics, emptyReason };
}

/** Mean real confidence across every section's claims/matches that carry one — a descriptive statistic over real numbers, never a fabricated score. */
function computeAverageConfidence(sections: ReportSection[]): number | null {
  const scores: number[] = [];
  for (const s of sections) {
    for (const claim of s.claims) {
      if (claim.confidence?.kind === "score") scores.push(claim.confidence.value);
    }
    for (const match of s.collectionMatches) {
      if (match.liveProject) scores.push(match.liveProject.confidence.score);
    }
  }
  if (scores.length === 0) return null;
  return Math.round(scores.reduce((sum, v) => sum + v, 0) / scores.length);
}

/** Handles the one irregular plural this file's own noun list needs ("opportunity" → "opportunities") — every other noun just takes a trailing "s". */
function pluralize(noun: string, n: number): string {
  if (n === 1) return noun;
  if (noun.endsWith("y") && !/[aeiou]y$/i.test(noun)) return `${noun.slice(0, -1)}ies`;
  return `${noun}s`;
}

function countLabel(n: number, noun: string): string {
  return `${n} ${pluralize(noun, n)}`;
}

const REPORT_TITLES: Record<ReportType, string> = {
  "daily-brief": "Daily Brief",
  weekly: "Weekly Report",
  monthly: "Monthly Report",
  "market-outlook": "Market Outlook",
  ecosystem: "Ecosystem Report",
  opportunity: "Opportunity Report",
};

function buildReport(id: ReportType, sections: ReportSection[], executiveSummary: string, limitations: ReportLimitation[], generatedAt: string): ExecutiveReport {
  return {
    id,
    title: REPORT_TITLES[id],
    subtitle: "Generated from the latest available Base Radar intelligence — not real-time monitoring, and not a scheduled or background report.",
    status: "ready",
    generatedAt,
    executiveSummary,
    sections,
    averageConfidence: computeAverageConfidence(sections),
    limitations: [...limitations, REPORT_GENERATION_NOTICE],
  };
}

// ---------------------------------------------------------------------------
// 1. Daily Brief — the existing engine's own claims, regrouped by theme.
// ---------------------------------------------------------------------------

export function buildDailyBriefReport(input: ExecutiveReportInput, generatedAt: string): ExecutiveReport {
  const claims = allClaims(input);
  const keyFindings = claims.slice(0, 5);
  const risks = claims.filter(isRiskClaim);
  const opportunities = claims.filter(isOpportunityClaim);

  const sections = [
    section("key-findings", "Key Findings", "The highest-priority real findings across the AI Intelligence Engine and Daily Brief, in their own already-computed order.", { claims: keyFindings }, "No findings recorded yet this session."),
    section("risks", "Risks", "Real security and decline-narrative findings.", { claims: risks }, "No risks currently recorded."),
    section("opportunities", "Opportunities", "Real Daily Brief opportunity findings.", { claims: opportunities }, "No opportunities currently recorded."),
  ];

  const summary = claims.length === 0
    ? "Base Radar has no real Daily Brief or AI Intelligence findings recorded this session yet."
    : `Today's Daily Brief cites ${countLabel(keyFindings.length, "key finding")}, ${countLabel(risks.length, "real risk")}, and ${countLabel(opportunities.length, "real opportunity")}, sourced directly from Base Radar's Alert Engine and AI Intelligence Engine.`;

  return buildReport("daily-brief", sections, summary, [], generatedAt);
}

// ---------------------------------------------------------------------------
// 2 & 3. Weekly / Monthly — an honest current-intelligence snapshot, never a
// fabricated period-over-period comparison (see NO_HISTORY_LIMITATION).
// ---------------------------------------------------------------------------

function buildPeriodReport(id: "weekly" | "monthly", periodLabel: string, input: ExecutiveReportInput, generatedAt: string): ExecutiveReport {
  const claims = allClaims(input);
  const risks = claims.filter(isRiskClaim);
  const opportunities = claims.filter(isOpportunityClaim);
  const governance = claims.filter(isGovernanceClaim);
  const developer = claims.filter(isDeveloperClaim);
  const whaleMatches = collectionMatches(input, "whale-accumulation");
  const narrativeMetrics = (input.dailyBrief?.emergingNarratives ?? []).map((trend) => ({ label: trend.narrative, value: `${countLabel(trend.count, "project")}, avg. score ${trend.averageScore}` }));

  const sections = [
    section(
      "what-changed",
      `What Stands Out ${periodLabel}`,
      `The most recent, highest-priority real intelligence Base Radar currently has — not a ${periodLabel.toLowerCase()}-over-period comparison (see Limitations).`,
      { claims: claims.slice(0, 5) },
      "No findings currently recorded."
    ),
    section("major-risks", "Major Risks", "Real security and decline-narrative findings.", { claims: risks }, "No major risks currently recorded."),
    section("major-opportunities", "Major Opportunities", "Real Daily Brief opportunity findings.", { claims: opportunities }, "No major opportunities currently recorded."),
    section("whale-activity", "Significant Whale Activity", "Real, recently-detected large on-chain transfers, reusing Smart Collections' own Whale Accumulation criteria.", { collectionMatches: whaleMatches }, "No significant whale activity currently detected."),
    section("governance-activity", "Governance Activity", "Real governance-related findings.", { claims: governance }, "No governance activity currently recorded."),
    section("developer-activity", "Developer / Project Activity", "Real development-related findings.", { claims: developer }, "No developer activity currently recorded."),
    section("narratives", "Ecosystem Narratives", "Real narrative counts from today's Daily Brief.", { metrics: narrativeMetrics }, "No narrative data currently recorded."),
    section(
      "quality-changes",
      "Projects Gaining or Losing Intelligence Quality",
      "Would require a persisted history of AI Grade/Confidence over time.",
      {},
      "Base Radar doesn't yet persist historical AI Grade/Confidence snapshots, so this can't be shown honestly — see Limitations."
    ),
  ];

  const summary = `This ${id} snapshot cites ${countLabel(risks.length, "real risk")}, ${countLabel(opportunities.length, "real opportunity")}, ${countLabel(governance.length, "governance finding")}, and ${countLabel(
    developer.length,
    "developer-activity finding"
  )} from Base Radar's current intelligence. It is a single point-in-time snapshot, not a tracked trend — see Limitations.`;

  return buildReport(id, sections, summary, [NO_HISTORY_LIMITATION], generatedAt);
}

export function buildWeeklyReport(input: ExecutiveReportInput, generatedAt: string): ExecutiveReport {
  return buildPeriodReport("weekly", "This Week", input, generatedAt);
}

export function buildMonthlyReport(input: ExecutiveReportInput, generatedAt: string): ExecutiveReport {
  return buildPeriodReport("monthly", "This Month", input, generatedAt);
}

// ---------------------------------------------------------------------------
// 4. Market Outlook — real, already-computed ecosystem stats, no new
// forecasting engine.
// ---------------------------------------------------------------------------

export function buildMarketOutlookReport(input: ExecutiveReportInput, generatedAt: string): ExecutiveReport {
  const claims = allClaims(input);
  const risks = claims.filter(isRiskClaim);
  const opportunities = claims.filter(isOpportunityClaim);
  const importantProjects = collectionMatches(input, "high-conviction");

  const brief = input.dailyBrief;
  const conditionMetrics = brief
    ? [
        { label: "Average Confidence", value: `${brief.averageConfidence}%` },
        { label: "Highest Score", value: String(brief.highestScore) },
        { label: "Projects Analyzed", value: String(brief.projectCount) },
      ]
    : [];
  const narrativeMetrics = (brief?.emergingNarratives ?? []).map((trend) => ({ label: trend.narrative, value: `${countLabel(trend.count, "project")}, avg. score ${trend.averageScore}` }));

  const sections = [
    section("market-conditions", "Market Conditions", "Real, already-computed ecosystem-wide statistics from today's Daily Brief.", { metrics: conditionMetrics }, "No Daily Brief statistics currently available."),
    section("leading-narratives", "Leading Narratives", "Real narrative counts from today's Daily Brief.", { metrics: narrativeMetrics }, "No narrative data currently recorded."),
    section("risk-environment", "Risk Environment", "Real security and decline-narrative findings across the ecosystem.", { claims: risks }, "No ecosystem risks currently recorded."),
    section("opportunity-environment", "Opportunity Environment", "Real Daily Brief opportunity findings.", { claims: opportunities }, "No ecosystem opportunities currently recorded."),
    section("important-projects", "Important Projects", "Reuses Smart Collections' own High Conviction criteria.", { collectionMatches: importantProjects }, "No projects currently meet the High Conviction criteria."),
  ];

  const summary = brief
    ? `The Base ecosystem currently averages ${brief.averageConfidence}% confidence across ${countLabel(brief.projectCount, "project")}, with ${countLabel(risks.length, "real risk")} and ${countLabel(opportunities.length, "real opportunity")} on record.`
    : "Ecosystem-wide statistics aren't available yet this session.";

  return buildReport("market-outlook", sections, summary, [], generatedAt);
}

// ---------------------------------------------------------------------------
// 5. Ecosystem Report — reuses Smart Collections' own results wherever
// useful, never a re-derivation of their criteria.
// ---------------------------------------------------------------------------

export function buildEcosystemReport(input: ExecutiveReportInput, generatedAt: string): ExecutiveReport {
  const claims = allClaims(input);
  const risks = claims.filter(isRiskClaim);
  const opportunities = claims.filter(isOpportunityClaim);
  const brief = input.dailyBrief;

  const healthMetrics = brief ? [{ label: "Average Confidence", value: `${brief.averageConfidence}%` }, { label: "Projects Analyzed", value: String(brief.projectCount) }] : [];
  const narrativeMetrics = (brief?.emergingNarratives ?? []).map((trend) => ({ label: trend.narrative, value: `${countLabel(trend.count, "project")}, avg. score ${trend.averageScore}` }));

  const sections = [
    section("ecosystem-health", "Ecosystem Health", "Real, already-computed ecosystem-wide statistics.", { metrics: healthMetrics }, "No ecosystem statistics currently available."),
    section("major-narratives", "Major Narratives", "Real narrative counts from today's Daily Brief.", { metrics: narrativeMetrics }, "No narrative data currently recorded."),
    section("notable-projects", "Notable Projects", "Reuses Smart Collections' own AI Picks criteria.", { collectionMatches: collectionMatches(input, "ai-picks") }, "No projects currently meet the AI Picks criteria."),
    section("governance", "Governance", "Reuses Smart Collections' own Governance Active criteria.", { collectionMatches: collectionMatches(input, "governance-active") }, "No projects currently meet the Governance Active criteria."),
    section("developer-activity", "Developer Activity", "Reuses Smart Collections' own Developer Momentum criteria.", { collectionMatches: collectionMatches(input, "developer-momentum") }, "No projects currently meet the Developer Momentum criteria."),
    section("whale-activity", "Whale Activity", "Reuses Smart Collections' own Whale Accumulation criteria.", { collectionMatches: collectionMatches(input, "whale-accumulation") }, "No significant whale activity currently detected."),
    section("risks", "Risks", "Real security and decline-narrative findings.", { claims: risks }, "No ecosystem risks currently recorded."),
    section("opportunities", "Opportunities", "Real Daily Brief opportunity findings.", { claims: opportunities }, "No ecosystem opportunities currently recorded."),
  ];

  const summary = `The Base ecosystem report cites ${countLabel(sections.reduce((n, s) => n + s.claims.length + s.collectionMatches.length, 0), "real finding")} across health, narratives, governance, developer activity, whale activity, risk, and opportunity — every one already computed elsewhere in Base Radar.`;

  return buildReport("ecosystem", sections, summary, [], generatedAt);
}

// ---------------------------------------------------------------------------
// 6. Opportunity Report — reuses Smart Collections' own opportunity-shaped
// criteria; never a second scoring pass.
// ---------------------------------------------------------------------------

export function buildOpportunityReport(input: ExecutiveReportInput, generatedAt: string): ExecutiveReport {
  const risks = allClaims(input).filter(isRiskClaim);

  const highConviction = collectionMatches(input, "high-conviction");
  const undervalued = collectionMatches(input, "undervalued");
  const yieldOpportunities = collectionMatches(input, "yield-opportunities");
  const momentum = collectionMatches(input, "trending-narratives");
  const whale = collectionMatches(input, "whale-accumulation");

  const sections = [
    section("highest-conviction", "Highest-Conviction Opportunities", "Reuses Smart Collections' own High Conviction criteria.", { collectionMatches: highConviction }, "No projects currently meet the High Conviction criteria."),
    section("undervalued", "Undervalued Projects", "Reuses Smart Collections' own Undervalued criteria.", { collectionMatches: undervalued }, "No projects currently meet the Undervalued criteria."),
    section("yield-opportunities", "Yield Opportunities", "Reuses Smart Collections' own Yield Opportunities criteria — the same Daily Brief opportunities AI Ask's own answer reads.", { collectionMatches: yieldOpportunities }, "No yield opportunities currently recorded."),
    section("emerging-momentum", "Emerging Momentum", "Reuses Smart Collections' own Trending Narratives criteria.", { collectionMatches: momentum }, "No trending-narrative projects currently recorded."),
    section("whale-activity", "Whale Activity", "Reuses Smart Collections' own Whale Accumulation criteria.", { collectionMatches: whale }, "No significant whale activity currently detected."),
    section(
      "positive-changes",
      "Positive Intelligence Changes",
      "Would require a persisted history of AI Grade/Confidence over time.",
      {},
      "Base Radar doesn't yet persist historical intelligence snapshots, so recent positive changes can't be shown honestly — see Limitations."
    ),
    section("risk-caveats", "Risk Caveats", "Real security and decline-narrative findings — the honest flip side of every opportunity above.", { claims: risks }, "No offsetting risks currently recorded."),
  ];

  const opportunityCount = highConviction.length + undervalued.length + yieldOpportunities.length + momentum.length;
  const summary = `${countLabel(opportunityCount, "real opportunity-shaped project")} currently meet at least one of Base Radar's own Smart Collections criteria, alongside ${countLabel(whale.length, "project")} with detected whale activity and ${countLabel(risks.length, "offsetting risk")} to weigh against them.`;

  return buildReport("opportunity", sections, summary, [NO_HISTORY_LIMITATION], generatedAt);
}

export const REPORT_BUILDERS: Record<ReportType, (input: ExecutiveReportInput, generatedAt: string) => ExecutiveReport> = {
  "daily-brief": buildDailyBriefReport,
  weekly: buildWeeklyReport,
  monthly: buildMonthlyReport,
  "market-outlook": buildMarketOutlookReport,
  ecosystem: buildEcosystemReport,
  opportunity: buildOpportunityReport,
};

export function buildAllExecutiveReports(input: ExecutiveReportInput, generatedAt: string): ExecutiveReport[] {
  return REPORT_TYPES_IN_ORDER.map((id) => REPORT_BUILDERS[id](input, generatedAt));
}

const REPORT_TYPES_IN_ORDER: ReportType[] = ["daily-brief", "weekly", "monthly", "market-outlook", "ecosystem", "opportunity"];

/** Honest `"checking"`/`"unavailable"` result — every section empty, never a fabricated finding while real data hasn't loaded or failed. Used by `lib/hooks/useExecutiveReports.ts` before it's safe to call any builder above. */
export function buildUnavailableReport(id: ReportType, status: "checking" | "unavailable", generatedAt: string): ExecutiveReport {
  return {
    id,
    title: REPORT_TITLES[id],
    subtitle: "Generated from the latest available Base Radar intelligence — not real-time monitoring, and not a scheduled or background report.",
    status,
    generatedAt,
    executiveSummary: status === "checking" ? "Checking the latest available intelligence…" : "This report's underlying intelligence didn't load this visit.",
    sections: [],
    averageConfidence: null,
    limitations: [REPORT_GENERATION_NOTICE],
  };
}
