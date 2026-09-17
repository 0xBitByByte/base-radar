/**
 * PR-090.04 (Smart Collections) — one pure evaluator per collection. No
 * provider call, no new scoring engine, no persisted history: every
 * function here reads only fields `LiveProject`/`IntelligenceAlert`/
 * `DailyBrief`/`WhaleEvent` already carry, and returns a fresh result every
 * call — the same "deterministic, evidence-only, reuse over reinvention"
 * discipline `lib/ai-workspace/compose.ts` and `lib/ai-watch/evaluate.ts`
 * already established this cycle.
 *
 * Ordering is always a stable sort on a real field, with `project.id` as a
 * deterministic tiebreak (matching `lib/projects/sort.ts`'s own
 * `sortLiveProjects` convention) — never a fabricated ranking.
 *
 * IMPORTANT data-availability note (confirmed by reading
 * `components/projects/viewMeta.ts`'s own documented history of the "Fast
 * Growing" collection): `EngineeringSummary.commitsLast7d`/`commitTrendPct`/
 * `hasRecentActivity` are effectively ALWAYS `null`/`false` across the full
 * registry — the commit-history GitHub endpoint is only ever fetched for a
 * single Project Profile page's extended path, never at catalog scale. Any
 * collection here that reads "developer momentum" therefore uses real
 * `stars`/`forks` instead — the one engineering signal genuinely populated
 * for every tracked project — exactly the same substitution "Fast Growing"
 * itself already had to make, not a new limitation this file introduces.
 */

import { getProject } from "@/data/projects/helpers";
import type { IntelligenceAlert, NarrativeType } from "@/lib/alerts/intelligence/types";
import type { DailyBrief } from "@/lib/brief/types";
import type { LiveProject } from "@/lib/projects/types";
import { sortLiveProjects } from "@/lib/projects/sort";
import type { WhaleEvent } from "@/lib/whale/types";
import type { SmartCollectionEvidence, SmartCollectionMatch, SmartCollectionMeta } from "@/lib/smart-collections/types";

const MAX_MATCHES = 24;

export const SMART_COLLECTION_META: Record<import("@/lib/smart-collections/types").SmartCollectionId, SmartCollectionMeta> = {
  "ai-picks": {
    id: "ai-picks",
    name: "AI Picks",
    description: "Projects Base Radar's own scoring rates A or A+ — a real blend of Health and Confidence, never a separate opinion.",
  },
  "whale-accumulation": {
    id: "whale-accumulation",
    name: "Whale Accumulation",
    description: "Projects with real, recently-detected large on-chain transfers. Reflects detected transfer volume, not a confirmed buy/sell direction — Base Radar's whale detection doesn't classify accumulation vs. distribution yet.",
  },
  "developer-momentum": {
    id: "developer-momentum",
    name: "Developer Momentum",
    description: "Ranked by real GitHub stars and forks — the clearest engineering-engagement signal available across the full tracked catalog. (Commit-velocity data is only computed on a project's own profile page, not across the full registry.)",
  },
  "high-conviction": {
    id: "high-conviction",
    name: "High Conviction",
    description: "High Confidence, real Health of 70+, and Low or Moderate Risk — every signal pointing the same direction, all already computed, never a new composite score.",
  },
  "low-risk": {
    id: "low-risk",
    name: "Low Risk",
    description: "Projects the Risk Analysis engine already rates Low overall — cited with its own real contributing factors.",
  },
  "governance-active": {
    id: "governance-active",
    name: "Governance Active",
    description: "Projects with a configured governance process and at least one real, currently active proposal.",
  },
  "trending-narratives": {
    id: "trending-narratives",
    name: "Trending Narratives",
    description: "Projects whose most recent Alert Engine signal matches whichever real narrative is most common across the ecosystem right now.",
  },
  undervalued: {
    id: "undervalued",
    name: "Undervalued",
    description: "Base Radar rates these B+ or higher on Confidence and AI Grade, yet their market cap sits below the median for that same quality tier — the market hasn't caught up to the intelligence yet.",
  },
  "stable-projects": {
    id: "stable-projects",
    name: "Stable Projects",
    description: "Projects the Alert Engine's own narrative detection currently classifies as Stable.",
  },
  "yield-opportunities": {
    id: "yield-opportunities",
    name: "Yield Opportunities",
    description: "Today's Daily Brief opportunities — real, scored signals from the Alert Engine, the same ones AI Ask's own opportunity answer reads.",
  },
};

function fact(label: string, value: string): SmartCollectionEvidence {
  return { label, value };
}

function matchFromLiveProject(project: LiveProject, reason: string, evidence: SmartCollectionEvidence[]): SmartCollectionMatch {
  return { projectId: project.id, projectName: project.identity.name, projectSlug: project.slug, liveProject: project, reason, evidence };
}

function matchFromProjectRef(projectId: string, projectName: string, reason: string, evidence: SmartCollectionEvidence[]): SmartCollectionMatch {
  const project = getProject(projectId);
  return { projectId, projectName: project?.name ?? projectName, projectSlug: project?.slug ?? null, liveProject: null, reason, evidence };
}

// ---------------------------------------------------------------------------
// Server-evaluated collections — real LiveProject[] / WhaleEvent[] only.
// ---------------------------------------------------------------------------

export function evaluateAiPicks(liveProjects: LiveProject[]): SmartCollectionMatch[] {
  const candidates = liveProjects.filter((project) => project.aiRating === "A+" || project.aiRating === "A");
  const sorted = sortLiveProjects(candidates, "confidence", "desc").slice(0, MAX_MATCHES);
  return sorted.map((project) =>
    matchFromLiveProject(
      project,
      `Rated ${project.aiRating} — ${project.health ? `${project.health.label} health` : "strong health"} and ${project.confidence.level} confidence.`,
      [
        fact("AI Grade", project.aiRating as string),
        fact("Confidence", `${project.confidence.score}/100 (${project.confidence.level})`),
        ...(project.health ? [fact("Health", `${project.health.score}/100 (${project.health.label})`)] : []),
      ]
    )
  );
}

export function evaluateWhaleAccumulation(liveProjects: LiveProject[], whaleEvents: WhaleEvent[]): SmartCollectionMatch[] {
  const eventsByProject = new Map<string, WhaleEvent[]>();
  for (const event of whaleEvents) {
    const list = eventsByProject.get(event.projectId) ?? [];
    list.push(event);
    eventsByProject.set(event.projectId, list);
  }

  const candidates = liveProjects.filter((project) => (eventsByProject.get(project.id)?.length ?? 0) > 0);
  const sorted = [...candidates].sort((a, b) => {
    const totalA = (eventsByProject.get(a.id) ?? []).reduce((sum, e) => sum + e.usdValue, 0);
    const totalB = (eventsByProject.get(b.id) ?? []).reduce((sum, e) => sum + e.usdValue, 0);
    return totalB - totalA || a.id.localeCompare(b.id);
  });

  return sorted.slice(0, MAX_MATCHES).map((project) => {
    const events = eventsByProject.get(project.id) ?? [];
    const totalUsd = events.reduce((sum, e) => sum + e.usdValue, 0);
    const latest = events.reduce((latestEvent, e) => (new Date(e.timestamp) > new Date(latestEvent.timestamp) ? e : latestEvent), events[0]);
    return matchFromLiveProject(
      project,
      `${events.length} real large transfer${events.length === 1 ? "" : "s"} detected, totaling $${totalUsd.toLocaleString()}.`,
      [
        fact("Detected Transfers", String(events.length)),
        fact("Total Value", `$${totalUsd.toLocaleString()}`),
        fact("Most Recent", latest.timestamp),
      ]
    );
  });
}

const DEVELOPER_MOMENTUM_MIN_STARS = 10;

export function evaluateDeveloperMomentum(liveProjects: LiveProject[]): SmartCollectionMatch[] {
  const candidates = liveProjects.filter((project) => project.engineering.available && (project.engineering.stars ?? 0) >= DEVELOPER_MOMENTUM_MIN_STARS);
  const sorted = sortLiveProjects(candidates, "stars", "desc").slice(0, MAX_MATCHES);
  return sorted.map((project) =>
    matchFromLiveProject(project, `${project.engineering.stars?.toLocaleString()} real GitHub stars${project.engineering.forks ? `, ${project.engineering.forks.toLocaleString()} forks` : ""}.`, [
      fact("GitHub Stars", String(project.engineering.stars ?? 0)),
      ...(project.engineering.forks !== null ? [fact("Forks", String(project.engineering.forks))] : []),
    ])
  );
}

const HIGH_CONVICTION_MIN_HEALTH = 70;

export function evaluateHighConviction(liveProjects: LiveProject[]): SmartCollectionMatch[] {
  const candidates = liveProjects.filter(
    (project) => project.confidence.level === "high" && project.health !== null && project.health.score >= HIGH_CONVICTION_MIN_HEALTH && (project.riskLevel === "low" || project.riskLevel === "moderate")
  );
  const sorted = sortLiveProjects(candidates, "confidence", "desc").slice(0, MAX_MATCHES);
  return sorted.map((project) =>
    matchFromLiveProject(project, `High confidence, ${project.health?.score}/100 health, and ${project.riskLevel} risk — every real signal aligned.`, [
      fact("Confidence", `${project.confidence.score}/100 (High)`),
      fact("Health", `${project.health?.score}/100 (${project.health?.label})`),
      fact("Risk", project.riskLevel as string),
    ])
  );
}

export function evaluateLowRisk(liveProjects: LiveProject[]): SmartCollectionMatch[] {
  const candidates = liveProjects.filter((project) => project.riskLevel === "low");
  const sorted = sortLiveProjects(candidates, "confidence", "desc").slice(0, MAX_MATCHES);
  return sorted.map((project) => {
    const topFactors = project.riskContributors.slice(0, 2);
    return matchFromLiveProject(
      project,
      `Rated Low overall risk by the Risk Analysis engine.`,
      [fact("Risk Level", "Low"), ...topFactors.map((c) => fact(c.label, c.detail))]
    );
  });
}

export function evaluateGovernanceActive(liveProjects: LiveProject[]): SmartCollectionMatch[] {
  const candidates = liveProjects.filter((project) => project.governance.configured && (project.governance.activeProposalCount ?? 0) > 0);
  const sorted = [...candidates].sort((a, b) => (b.governance.activeProposalCount ?? 0) - (a.governance.activeProposalCount ?? 0) || a.id.localeCompare(b.id));
  return sorted.slice(0, MAX_MATCHES).map((project) =>
    matchFromLiveProject(project, `${project.governance.activeProposalCount} real active proposal${project.governance.activeProposalCount === 1 ? "" : "s"} right now.`, [
      fact("Active Proposals", String(project.governance.activeProposalCount)),
      ...(project.governance.totalProposalCount !== null ? [fact("Total Proposals", String(project.governance.totalProposalCount))] : []),
    ])
  );
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

const UNDERVALUED_QUALITY_GRADES = new Set(["A+", "A", "B+"]);

export function evaluateUndervalued(liveProjects: LiveProject[]): SmartCollectionMatch[] {
  const qualityTier = liveProjects.filter((project) => project.aiRating !== null && UNDERVALUED_QUALITY_GRADES.has(project.aiRating) && project.confidence.level !== "low");
  const marketCapMedian = median(qualityTier.map((project) => project.market.marketCapUsd).filter((value): value is number => value !== null));
  if (marketCapMedian === null) return [];

  const candidates = qualityTier.filter((project) => project.market.marketCapUsd !== null && project.market.marketCapUsd < marketCapMedian);
  const sorted = sortLiveProjects(candidates, "marketCap", "asc").slice(0, MAX_MATCHES);
  return sorted.map((project) =>
    matchFromLiveProject(project, `Rated ${project.aiRating} quality, but a market cap of $${project.market.marketCapUsd?.toLocaleString()} — below the $${marketCapMedian.toLocaleString()} median for projects at this quality tier.`, [
      fact("AI Grade", project.aiRating as string),
      fact("Confidence", project.confidence.level),
      fact("Market Cap", `$${project.market.marketCapUsd?.toLocaleString()}`),
      fact("Quality-Tier Median Market Cap", `$${marketCapMedian.toLocaleString()}`),
    ])
  );
}

// ---------------------------------------------------------------------------
// Client-evaluated collections — real IntelligenceAlert[] / DailyBrief only.
// ---------------------------------------------------------------------------

/** Narratives read as ecosystem "momentum" for Trending Narratives — deliberately excludes `decline`/`security-risk` (negative, not something to surface as "trending" in a discovery context) and `stable` (its own dedicated collection below). */
const TRENDING_NARRATIVES: NarrativeType[] = ["growth", "accumulation", "development-active", "governance-active"];

export function evaluateTrendingNarratives(alerts: IntelligenceAlert[]): SmartCollectionMatch[] {
  const counts = new Map<NarrativeType, number>();
  for (const alert of alerts) {
    if (!TRENDING_NARRATIVES.includes(alert.narrative)) continue;
    counts.set(alert.narrative, (counts.get(alert.narrative) ?? 0) + 1);
  }
  if (counts.size === 0) return [];
  const topCount = Math.max(...counts.values());
  const topNarratives = new Set([...counts.entries()].filter(([, count]) => count === topCount).map(([narrative]) => narrative));

  const matching = alerts.filter((alert) => topNarratives.has(alert.narrative)).sort((a, b) => b.score - a.score || a.projectId.localeCompare(b.projectId));
  return matching.slice(0, MAX_MATCHES).map((alert) =>
    matchFromProjectRef(alert.projectId, alert.projectName, alert.headline, [
      fact("Narrative", alert.narrative),
      fact("Ecosystem-wide Count", String(topCount)),
      fact("Confidence", `${alert.confidence}/100`),
    ])
  );
}

export function evaluateStableProjects(alerts: IntelligenceAlert[]): SmartCollectionMatch[] {
  const stableAlerts = alerts.filter((alert) => alert.narrative === "stable").sort((a, b) => b.confidence - a.confidence || a.projectId.localeCompare(b.projectId));
  return stableAlerts.slice(0, MAX_MATCHES).map((alert) =>
    matchFromProjectRef(alert.projectId, alert.projectName, alert.headline, [fact("Narrative", "Stable"), fact("Confidence", `${alert.confidence}/100`)])
  );
}

export function evaluateYieldOpportunities(dailyBrief: DailyBrief | null): SmartCollectionMatch[] {
  if (!dailyBrief) return [];
  return dailyBrief.topOpportunities.slice(0, MAX_MATCHES).map((opportunity) =>
    matchFromProjectRef(opportunity.projectId, opportunity.projectName, opportunity.reason, [
      fact("Score", String(opportunity.score)),
      fact("Confidence", `${opportunity.confidence}/100`),
      fact("Narrative", opportunity.narrative),
    ])
  );
}
