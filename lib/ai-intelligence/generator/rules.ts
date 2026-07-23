import type { SupportingSignal } from "@/lib/ai-intelligence/evidence";
import type { SourceReference } from "@/lib/ai-intelligence/sources";
import type { BriefDraft, Rule } from "@/lib/ai-intelligence/generator/types";

/**
 * Six rules, one per example in the PR-041 brief ("Multiple verified
 * projects launched", "Large TVL movement", "Major governance activity",
 * "Significant discovery spike", "Ecosystem growth", "Security
 * incidents"). Every threshold below is a documented starting heuristic —
 * the same honest caveat this codebase already applies to
 * `lib/discovery/duplicates.ts`'s match weights and
 * `lib/ai-intelligence/confidence.ts`'s confidence thresholds — never a
 * claim of statistical validation. No rule invents a project, a
 * percentage, or an event the input didn't actually supply.
 */

const VERIFIED_PROJECT_THRESHOLD = 2;
const TVL_MOVE_THRESHOLD_PCT = 15;
const TVL_MOVE_SIGNIFICANT_PCT = 30;
const GOVERNANCE_ALERT_THRESHOLD = 2;
const DISCOVERY_SPIKE_THRESHOLD = 5;
const SECURITY_ALERT_CAP = 5;

/** Multiple verified projects launched — real `registryUpdates` entries reaching `"verified"`, grouped into a single ecosystem-level draft. */
const multipleVerifiedProjectsRule: Rule = {
  id: "multiple-verified-projects",
  description: `Fires when at least ${VERIFIED_PROJECT_THRESHOLD} projects reach verified status in one run.`,
  evaluate({ registryUpdates }) {
    const verified = registryUpdates.filter(
      (update) => update.kind === "verification-level-change" && update.detail === "verified"
    );
    if (verified.length < VERIFIED_PROJECT_THRESHOLD) return [];

    const supportingSignals: SupportingSignal[] = verified.map((update) => ({
      id: `registry-update:${update.projectId}:${update.occurredAt}`,
      kind: "registry-change",
      description: `${update.projectName} reached Verified status.`,
      source: "base-registry",
      occurredAt: update.occurredAt,
    }));
    const supportingSources: SourceReference[] = [{ source: "base-registry", label: "Base Registry" }];

    const draft: BriefDraft = {
      headline: `${verified.length} projects reached Verified status`,
      summary: `${verified.length} projects in the Base Radar registry were reviewed and reached Verified status: ${verified.map((u) => u.projectName).join(", ")}.`,
      category: "ecosystem",
      impact: "moderate",
      affectedProjects: verified.map((update) => update.projectId),
      supportingSignals,
      supportingSources,
      tags: ["verification", "registry"],
    };
    return [draft];
  },
};

/** Large TVL movement — one draft per project with a real, qualifying TVL change. */
const largeTvlMovementRule: Rule = {
  id: "large-tvl-movement",
  description: `Fires per project whose real reported TVL change is >= ${TVL_MOVE_THRESHOLD_PCT}% in either direction.`,
  evaluate({ providerChanges }) {
    const tvlMoves = providerChanges.filter(
      (change) => change.metric === "tvl" && typeof change.changePct === "number" && Math.abs(change.changePct) >= TVL_MOVE_THRESHOLD_PCT
    );

    return tvlMoves.map((change): BriefDraft => {
      const direction = (change.changePct as number) >= 0 ? "rose" : "fell";
      const magnitude = Math.abs(change.changePct as number);
      const supportingSignals: SupportingSignal[] = [
        {
          id: `provider-change:${change.source}:${change.occurredAt}`,
          kind: "liquidity-movement",
          description: change.description,
          source: change.source,
          occurredAt: change.occurredAt,
          referenceUrl: change.referenceUrl,
        },
      ];
      return {
        headline: `TVL ${direction} ${magnitude.toFixed(1)}%${change.projectId ? "" : " ecosystem-wide"}`,
        summary: change.description,
        category: "defi",
        impact: magnitude >= TVL_MOVE_SIGNIFICANT_PCT ? "significant" : "moderate",
        affectedProjects: change.projectId ? [change.projectId] : [],
        supportingSignals,
        supportingSources: [{ source: change.source }],
        tags: ["tvl", "liquidity"],
      };
    });
  },
};

/** Major governance activity — real `alertEvents` tagged `"governance"`, grouped into one draft once enough accumulate. */
const majorGovernanceActivityRule: Rule = {
  id: "major-governance-activity",
  description: `Fires when at least ${GOVERNANCE_ALERT_THRESHOLD} real governance alerts are supplied in one run.`,
  evaluate({ alertEvents }) {
    const governanceAlerts = alertEvents.filter((alert) => alert.category === "governance");
    if (governanceAlerts.length < GOVERNANCE_ALERT_THRESHOLD) return [];

    const distinctProjects = Array.from(new Set(governanceAlerts.map((alert) => alert.projectId)));
    const supportingSignals: SupportingSignal[] = governanceAlerts.map((alert) => ({
      id: `alert:${alert.id}`,
      kind: "governance-event",
      description: `${alert.projectName}: ${alert.title}`,
      source: "base-registry",
      occurredAt: alert.timestamp,
    }));

    const draft: BriefDraft = {
      headline: `Governance activity across ${distinctProjects.length} project${distinctProjects.length === 1 ? "" : "s"}`,
      summary: `${governanceAlerts.length} governance alerts were raised: ${governanceAlerts.map((alert) => `${alert.projectName} — ${alert.title}`).join("; ")}.`,
      category: "governance",
      impact: "moderate",
      affectedProjects: distinctProjects,
      supportingSignals,
      supportingSources: [{ source: "base-registry", label: "Base Registry" }],
      tags: ["governance"],
    };
    return [draft];
  },
};

/** Significant discovery spike — a real batch of `discoveryCandidates` above the threshold. */
const discoverySpikeRule: Rule = {
  id: "significant-discovery-spike",
  description: `Fires when the Discovery Engine surfaces at least ${DISCOVERY_SPIKE_THRESHOLD} candidates in one run.`,
  evaluate({ discoveryCandidates }) {
    if (discoveryCandidates.length < DISCOVERY_SPIKE_THRESHOLD) return [];

    const supportingSignals: SupportingSignal[] = discoveryCandidates.map((candidate) => ({
      id: `candidate:${candidate.source}:${candidate.externalId}`,
      kind: "other",
      description: `${candidate.displayName} surfaced via ${candidate.source}.`,
      source: candidate.source === "ai-discovery" || candidate.source === "farcaster" || candidate.source === "community" || candidate.source === "base-ecosystem"
        ? "discovery-engine"
        : candidate.source,
      occurredAt: candidate.discoveredAt,
    }));

    const draft: BriefDraft = {
      headline: `${discoveryCandidates.length} new candidate projects discovered`,
      summary: `The Discovery Engine surfaced ${discoveryCandidates.length} candidate projects in this run: ${discoveryCandidates.map((candidate) => candidate.displayName).join(", ")}.`,
      category: "ecosystem",
      impact: "informational",
      // Candidates are not yet registry projects — no real `Project.id` exists for any of them.
      affectedProjects: [],
      supportingSignals,
      supportingSources: [{ source: "discovery-engine", label: "Discovery Engine" }],
      tags: ["discovery"],
    };
    return [draft];
  },
};

/** Ecosystem growth — real new registry entries corroborated by real discovery activity in the same run. */
const ecosystemGrowthRule: Rule = {
  id: "ecosystem-growth",
  description: "Fires when at least one real new registry entry coincides with at least one real discovery candidate in the same run.",
  evaluate({ registryUpdates, discoveryCandidates }) {
    const newEntries = registryUpdates.filter((update) => update.kind === "new-entry");
    if (newEntries.length === 0 || discoveryCandidates.length === 0) return [];

    const supportingSignals: SupportingSignal[] = [
      ...newEntries.map(
        (update): SupportingSignal => ({
          id: `registry-update:${update.projectId}:${update.occurredAt}`,
          kind: "registry-change",
          description: `${update.projectName} added to the registry.`,
          source: "base-registry",
          occurredAt: update.occurredAt,
        })
      ),
      ...discoveryCandidates.slice(0, 5).map(
        (candidate): SupportingSignal => ({
          id: `candidate:${candidate.source}:${candidate.externalId}`,
          kind: "other",
          description: `${candidate.displayName} surfaced via ${candidate.source}, awaiting review.`,
          source: "discovery-engine",
          occurredAt: candidate.discoveredAt,
        })
      ),
    ];

    const draft: BriefDraft = {
      headline: `Ecosystem expanding: ${newEntries.length} new registry entr${newEntries.length === 1 ? "y" : "ies"}, ${discoveryCandidates.length} candidate${discoveryCandidates.length === 1 ? "" : "s"} in review`,
      summary: `${newEntries.length} project${newEntries.length === 1 ? " was" : "s were"} added to the registry this run, alongside ${discoveryCandidates.length} candidate${discoveryCandidates.length === 1 ? "" : "s"} still awaiting review from the Discovery Engine.`,
      category: "ecosystem",
      impact: "informational",
      affectedProjects: newEntries.map((update) => update.projectId),
      supportingSignals,
      supportingSources: [
        { source: "base-registry", label: "Base Registry" },
        { source: "discovery-engine", label: "Discovery Engine" },
      ],
      tags: ["ecosystem", "growth"],
    };
    return [draft];
  },
};

/** Security incidents — every real critical security alert gets its own draft (never batched away), capped so one run can't return an unbounded list. */
const securityIncidentsRule: Rule = {
  id: "security-incidents",
  description: `Fires once per real critical security alert, capped at the first ${SECURITY_ALERT_CAP} per run.`,
  evaluate({ alertEvents }) {
    const criticalSecurityAlerts = alertEvents
      .filter((alert) => alert.category === "security" && alert.severity === "critical")
      .slice(0, SECURITY_ALERT_CAP);

    return criticalSecurityAlerts.map((alert): BriefDraft => {
      const supportingSignals: SupportingSignal[] = [
        {
          id: `alert:${alert.id}`,
          kind: "other",
          description: `${alert.projectName}: ${alert.summary}`,
          source: "base-registry",
          occurredAt: alert.timestamp,
        },
      ];
      return {
        headline: `Security alert: ${alert.projectName} — ${alert.title}`,
        summary: alert.summary,
        category: "security",
        impact: "critical",
        affectedProjects: [alert.projectId],
        supportingSignals,
        supportingSources: [{ source: "base-registry", label: alert.source }],
        tags: ["security", "critical"],
      };
    });
  },
};

/** Every rule this generator ships with, in the order they're evaluated. Order affects only the order drafts are produced before ranking — `ranking.ts` re-sorts the final result, so this order is not itself the priority order. */
export const DAILY_BRIEF_RULES: Rule[] = [
  securityIncidentsRule,
  multipleVerifiedProjectsRule,
  largeTvlMovementRule,
  majorGovernanceActivityRule,
  discoverySpikeRule,
  ecosystemGrowthRule,
];
