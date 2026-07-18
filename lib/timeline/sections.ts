/**
 * Per-event-type pure builders for the Intelligence Timeline pipeline
 * (`engine.ts`). Every project-scoped builder (Alert/Opportunity/Security/
 * Governance/Development/TVL) joins back to the source `IntelligenceAlert`
 * by `projectId` to recover `severity`/`confidence`/`score`/`narrative`/
 * `timestamp` — `BriefOpportunity`/`BriefHighlight` only ever kept the
 * subset of fields their own Daily Brief/Portfolio UI needed, so this join
 * is the honest way to give the Timeline the richer, real values without
 * recomputing any of them. If a highlight's project has no matching
 * `IntelligenceAlert` (shouldn't happen given how Daily Brief itself is
 * built, but the Timeline takes its three inputs as independent
 * parameters), that event is skipped rather than built with fabricated
 * values.
 */

import { getProject } from "@/data/projects/helpers";
import type { IntelligenceAlert } from "@/lib/alerts/intelligence/types";
import { SEVERITY_RANK } from "@/lib/alerts/intelligence/engine";
import type { BriefHighlight, BriefOpportunity, DailyBrief } from "@/lib/brief/types";
import type { PortfolioIntelligence } from "@/lib/portfolio/types";
import { TIMELINE_EVENT_TYPES } from "@/lib/timeline/types";
import type { TimelineEvent, TimelineEventType } from "@/lib/timeline/types";
import type { AlertSeverity } from "@/lib/alerts/types";

function projectLink(projectId: string): string | null {
  const project = getProject(projectId);
  return project ? `/dashboard/projects/${project.slug}` : null;
}

function findAlert(alerts: IntelligenceAlert[], projectId: string): IntelligenceAlert | undefined {
  return alerts.find((alert) => alert.projectId === projectId);
}

/** One event per real `IntelligenceAlert` — the Timeline's base layer, independent of which Daily Brief section (if any) a project also appears in. */
export function buildAlertEvents(alerts: IntelligenceAlert[]): TimelineEvent[] {
  return alerts.map((alert) => ({
    id: `timeline:alert:${alert.id}`,
    timestamp: alert.timestamp,
    projectId: alert.projectId,
    projectName: alert.projectName,
    title: alert.headline,
    summary: alert.summary,
    eventType: "alert",
    source: "AI Intelligence Engine",
    severity: alert.severity,
    confidence: alert.confidence,
    score: alert.score,
    narrative: alert.narrative,
    category: null,
    link: projectLink(alert.projectId),
    metadata: { relatedAlertCount: alert.relatedAlertIds.length },
  }));
}

function buildOpportunityEvent(opportunity: BriefOpportunity, alerts: IntelligenceAlert[]): TimelineEvent | null {
  const alert = findAlert(alerts, opportunity.projectId);
  if (!alert) return null;

  return {
    id: `timeline:opportunity:${opportunity.projectId}`,
    timestamp: opportunity.timestamp,
    projectId: opportunity.projectId,
    projectName: opportunity.projectName,
    title: opportunity.headline,
    summary: opportunity.reason,
    eventType: "opportunity",
    source: "Daily Brief",
    severity: alert.severity,
    confidence: opportunity.confidence,
    score: opportunity.score,
    narrative: opportunity.narrative,
    category: null,
    link: projectLink(opportunity.projectId),
    metadata: {},
  };
}

export function buildOpportunityEvents(dailyBrief: DailyBrief, alerts: IntelligenceAlert[]): TimelineEvent[] {
  return dailyBrief.topOpportunities
    .map((opportunity) => buildOpportunityEvent(opportunity, alerts))
    .filter((event): event is TimelineEvent => event !== null);
}

function buildHighlightEvent(
  highlight: BriefHighlight,
  alerts: IntelligenceAlert[],
  eventType: "security" | "governance" | "development" | "tvl",
  source: string
): TimelineEvent | null {
  const alert = findAlert(alerts, highlight.projectId);
  if (!alert) return null;

  return {
    id: `timeline:${eventType}:${highlight.projectId}`,
    timestamp: alert.timestamp,
    projectId: highlight.projectId,
    projectName: highlight.projectName,
    title: highlight.headline,
    summary: highlight.detail,
    eventType,
    source,
    severity: highlight.severity,
    confidence: alert.confidence,
    score: alert.score,
    narrative: alert.narrative,
    category: eventType === "tvl" ? "tvl" : null,
    link: projectLink(highlight.projectId),
    metadata: {},
  };
}

function buildHighlightEvents(
  highlights: BriefHighlight[],
  alerts: IntelligenceAlert[],
  eventType: "security" | "governance" | "development" | "tvl"
): TimelineEvent[] {
  return highlights
    .map((highlight) => buildHighlightEvent(highlight, alerts, eventType, "Daily Brief"))
    .filter((event): event is TimelineEvent => event !== null);
}

export function buildSecurityEvents(dailyBrief: DailyBrief, alerts: IntelligenceAlert[]): TimelineEvent[] {
  return buildHighlightEvents(dailyBrief.securityHighlights, alerts, "security");
}

export function buildGovernanceEvents(dailyBrief: DailyBrief, alerts: IntelligenceAlert[]): TimelineEvent[] {
  return buildHighlightEvents(dailyBrief.governanceHighlights, alerts, "governance");
}

export function buildDevelopmentEvents(dailyBrief: DailyBrief, alerts: IntelligenceAlert[]): TimelineEvent[] {
  return buildHighlightEvents(dailyBrief.developmentHighlights, alerts, "development");
}

export function buildTVLEvents(dailyBrief: DailyBrief, alerts: IntelligenceAlert[]): TimelineEvent[] {
  return buildHighlightEvents(dailyBrief.tvlHighlights, alerts, "tvl");
}

/**
 * One event per narrative trend row — genuinely not about a single
 * project, so `projectId`/`projectName` are `null` and the timestamp is
 * the Daily Brief's own `generatedAt` (the real moment this batch of
 * narrative counts was compiled). `score` reuses the trend's own real
 * `averageScore`; `confidence` has no equivalent figure for an aggregate
 * row, so it stays `null` rather than a fabricated number.
 */
export function buildNarrativeEvents(dailyBrief: DailyBrief): TimelineEvent[] {
  return dailyBrief.emergingNarratives.map((trend) => ({
    id: `timeline:narrative:${trend.narrative}`,
    timestamp: dailyBrief.generatedAt,
    projectId: null,
    projectName: null,
    title: `${trend.count} project${trend.count === 1 ? "" : "s"} showing ${trend.narrative}`,
    summary: `Average score ${trend.averageScore} across ${trend.count} project${trend.count === 1 ? "" : "s"}.`,
    eventType: "narrative",
    source: "Daily Brief",
    severity: null,
    confidence: null,
    score: trend.averageScore,
    narrative: trend.narrative,
    category: null,
    link: null,
    metadata: { count: trend.count },
  }));
}

/**
 * One event per recommendation string, from BOTH Daily Brief and
 * Portfolio Intelligence (both are explicitly allowed data sources) —
 * never generated here, only carried through unchanged.
 */
export function buildRecommendationEvents(dailyBrief: DailyBrief, portfolio: PortfolioIntelligence): TimelineEvent[] {
  const briefEvents = dailyBrief.recommendations.map((recommendation, index) => ({
    id: `timeline:recommendation:daily-brief:${index}`,
    timestamp: dailyBrief.generatedAt,
    projectId: null,
    projectName: null,
    title: recommendation,
    summary: recommendation,
    eventType: "recommendation" as const,
    source: "Daily Brief",
    severity: null,
    confidence: null,
    score: null,
    narrative: null,
    category: null,
    link: "/dashboard/brief",
    metadata: {},
  }));

  const portfolioEvents = portfolio.recommendations.map((recommendation, index) => ({
    id: `timeline:recommendation:portfolio:${index}`,
    timestamp: portfolio.generatedAt,
    projectId: null,
    projectName: null,
    title: recommendation,
    summary: recommendation,
    eventType: "recommendation" as const,
    source: "Portfolio Intelligence",
    severity: null,
    confidence: null,
    score: null,
    narrative: null,
    category: null,
    link: "/dashboard/portfolio",
    metadata: {},
  }));

  return [...briefEvents, ...portfolioEvents];
}

/** One roll-up event marking that a Portfolio Intelligence read exists at `portfolio.generatedAt` — a chronological marker, not a duplicate of Portfolio Intelligence's own model. */
export function buildPortfolioEvents(portfolio: PortfolioIntelligence): TimelineEvent[] {
  return [
    {
      id: `timeline:portfolio:${portfolio.id}`,
      timestamp: portfolio.generatedAt,
      projectId: null,
      projectName: null,
      title: portfolio.headline,
      summary: portfolio.summary,
      eventType: "portfolio",
      source: "Portfolio Intelligence",
      severity: null,
      confidence: portfolio.averageConfidence,
      score: portfolio.averageScore,
      narrative: null,
      category: null,
      link: "/dashboard/portfolio",
      metadata: { overallHealth: portfolio.overallHealth, projectCount: portfolio.projectCount },
    },
  ];
}

/** One roll-up event marking that a Daily Brief read exists at `dailyBrief.generatedAt`. */
export function buildDailyBriefEvents(dailyBrief: DailyBrief): TimelineEvent[] {
  return [
    {
      id: `timeline:daily-brief:${dailyBrief.id}`,
      timestamp: dailyBrief.generatedAt,
      projectId: null,
      projectName: null,
      title: dailyBrief.headline,
      summary: dailyBrief.summary,
      eventType: "daily-brief",
      source: "Daily Brief",
      severity: null,
      confidence: dailyBrief.averageConfidence,
      score: dailyBrief.highestScore,
      narrative: null,
      category: null,
      link: "/dashboard/brief",
      metadata: { projectCount: dailyBrief.projectCount },
    },
  ];
}

/**
 * Descending by timestamp — relies on `Array.prototype.sort`'s spec-
 * guaranteed stability (ES2019+) for "stable ordering": events with an
 * identical timestamp keep their original relative order rather than
 * being shuffled.
 */
export function sortEventsByTimestampDescending(events: TimelineEvent[]): TimelineEvent[] {
  return [...events].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

/**
 * Defensive de-duplication by `id` — the per-builder id scheme above
 * already guarantees uniqueness, but "no duplicate IDs" is an explicit
 * pipeline requirement, so this is enforced directly rather than only
 * assumed. First occurrence wins.
 */
export function dedupeEventsById(events: TimelineEvent[]): TimelineEvent[] {
  const seen = new Set<string>();
  const deduped: TimelineEvent[] = [];
  for (const event of events) {
    if (seen.has(event.id)) continue;
    seen.add(event.id);
    deduped.push(event);
  }
  return deduped;
}

export type TimelineStats = {
  totalEvents: number;
  highestSeverity: AlertSeverity | null;
  averageConfidence: number;
  averageScore: number;
  eventCounts: Record<TimelineEventType, number>;
};

function emptyEventCounts(): Record<TimelineEventType, number> {
  return Object.fromEntries(TIMELINE_EVENT_TYPES.map((type) => [type, 0])) as Record<TimelineEventType, number>;
}

/** Reuses the AI Intelligence Engine's own `SEVERITY_RANK` for "highest severity" — never a second severity ordering. Confidence/score averages are computed only over events that carry a real (non-`null`) value of that kind. */
export function computeTimelineStats(events: TimelineEvent[]): TimelineStats {
  const eventCounts = emptyEventCounts();
  let highestSeverity: AlertSeverity | null = null;
  let confidenceTotal = 0;
  let confidenceCount = 0;
  let scoreTotal = 0;
  let scoreCount = 0;

  for (const event of events) {
    eventCounts[event.eventType] += 1;

    if (event.severity && (!highestSeverity || SEVERITY_RANK[event.severity] > SEVERITY_RANK[highestSeverity])) {
      highestSeverity = event.severity;
    }
    if (event.confidence !== null) {
      confidenceTotal += event.confidence;
      confidenceCount += 1;
    }
    if (event.score !== null) {
      scoreTotal += event.score;
      scoreCount += 1;
    }
  }

  return {
    totalEvents: events.length,
    highestSeverity,
    averageConfidence: confidenceCount === 0 ? 0 : Math.round(confidenceTotal / confidenceCount),
    averageScore: scoreCount === 0 ? 0 : Math.round(scoreTotal / scoreCount),
    eventCounts,
  };
}
