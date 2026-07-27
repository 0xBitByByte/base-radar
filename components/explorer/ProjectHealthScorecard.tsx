import { Suspense } from "react";
import { BadgeCheck, Code2, Droplets, Gauge, HeartPulse, Landmark, ShieldAlert, Users, type LucideIcon } from "lucide-react";

import { ProfileDeveloperTileAsync } from "@/components/explorer/ProfileDeveloperTileAsync";
import { ProfileSectionCard } from "@/components/explorer/ProfileSectionCard";
import { cn } from "@/lib/utils";
import type { ScorecardSeverity, ScorecardTile } from "@/lib/intelligence/scorecard";
import type { Confidence, Health, Risk } from "@/lib/intelligence/types";
import type { VerificationStatus } from "@/data/projects/enums";
import type { CommitActivity, ContributorCount, ReleaseSummary } from "@/lib/providers/github/service";
import type { ProviderResult } from "@/lib/providers/common/types";

type ProjectHealthScorecardProps = {
  tiles: ScorecardTile[];
  health: Health;
  confidence: Confidence;
  risk: Risk;
  verificationStatus: VerificationStatus;
  /** PR13.7 Goal 6 — real evidence for the Developer tile, streamed in once the extended GitHub calls resolve; the tile shown here from `tiles` (always "Not Assessed" in the fast path) is this Suspense boundary's fallback. */
  commitActivityPromise: Promise<ProviderResult<CommitActivity> | null>;
  contributorCountPromise: Promise<ProviderResult<ContributorCount> | null>;
  releasesPromise: Promise<ProviderResult<ReleaseSummary[]> | null>;
};

const SEVERITY_CLASS: Record<ScorecardSeverity, string> = {
  excellent: "text-radar-success",
  strong: "text-radar-success",
  moderate: "text-radar-warning",
  weak: "text-radar-danger",
  unknown: "text-radar-light-muted dark:text-radar-muted",
};

const SEVERITY_ICON_BG: Record<ScorecardSeverity, string> = {
  excellent: "bg-radar-success/10",
  strong: "bg-radar-success/10",
  moderate: "bg-radar-warning/10",
  weak: "bg-radar-danger/10",
  unknown: "bg-radar-light-muted/10 dark:bg-radar-muted/10",
};

const SEVERITY_BAR_GRADIENT: Record<ScorecardSeverity, string> = {
  excellent: "bg-gradient-to-r from-radar-success/60 to-radar-success",
  strong: "bg-gradient-to-r from-radar-success/60 to-radar-success",
  moderate: "bg-gradient-to-r from-radar-warning/60 to-radar-warning",
  weak: "bg-gradient-to-r from-radar-danger/60 to-radar-danger",
  unknown: "bg-radar-light-muted/40 dark:bg-radar-muted/40",
};

const HEALTH_SEVERITY: Record<Health["label"], ScorecardSeverity> = {
  excellent: "excellent",
  good: "strong",
  fair: "moderate",
  poor: "weak",
  unknown: "unknown",
};

const CONFIDENCE_SEVERITY: Record<Confidence["level"], ScorecardSeverity> = {
  high: "excellent",
  medium: "moderate",
  low: "weak",
};

const RISK_SEVERITY: Record<Risk["level"], ScorecardSeverity> = {
  low: "excellent",
  moderate: "moderate",
  elevated: "moderate",
  high: "weak",
};

const VERIFICATION_SEVERITY: Record<VerificationStatus, ScorecardSeverity> = {
  verified: "excellent",
  community: "strong",
  unverified: "moderate",
  flagged: "weak",
};

const VERIFICATION_LABEL: Record<VerificationStatus, string> = {
  verified: "Verified",
  community: "Community-Reviewed",
  unverified: "Unverified",
  flagged: "Flagged",
};

export type MetaCard = {
  id: string;
  icon: LucideIcon;
  title: string;
  value: string;
  helper: string;
  severity: ScorecardSeverity;
  progress: number | null;
  tooltip: string;
};

const TILE_ICON: Record<string, LucideIcon> = {
  developer: Code2,
  community: Users,
  liquidity: Droplets,
  governance: Landmark,
};

/**
 * PR-050 final pass — static, factual "what/why" copy per metric. Never
 * data-dependent (no numbers, no per-project facts) — that real evidence
 * comes from each tile's own `tooltip` (== `ScorecardTile.detail`), shown
 * separately below. This pair of sentences answers the two questions a
 * bare percentage can't: what is actually being measured, and why a reader
 * should care whether it's High, Medium, or Low.
 */
const SCORECARD_EXPLANATION: Record<string, { measures: string; matters: string }> = {
  health: {
    measures: "Base Radar's overall fundamentals score, blending TVL, GitHub activity, and price momentum.",
    matters: "A quick, transparent read on how strong this project's core signals are right now.",
  },
  confidence: {
    measures: "How much of this report is backed by live provider data versus registry defaults.",
    matters: "Tells you how much weight to put on the rest of this page's numbers.",
  },
  risk: {
    measures: "How many of the 7 assessed risk factors currently show a real concern.",
    matters: "Flags projects worth a closer look before relying on their numbers.",
  },
  verification: {
    measures: "Base Radar's own editorial review status for this project's identity and links.",
    matters: "Distinguishes reviewed, trusted listings from unverified or community-submitted ones.",
  },
  developer: {
    measures: "Recent GitHub commit activity, releases, and contributor count.",
    matters: "Active development is a strong signal a project is still being built and maintained.",
  },
  liquidity: {
    measures: "Aggregated DEX liquidity depth across this project's tracked trading pairs.",
    matters: "Deeper liquidity means large trades move the price less.",
  },
  governance: {
    measures: "On-chain governance participation via Snapshot proposals.",
    matters: "Active governance shows a real, engaged token-holder base, not just a listed contract.",
  },
  community: {
    measures: "Share of official/community links (docs, socials, governance forum) configured in the registry.",
    matters: "A fuller profile suggests a more established, more discoverable, more accountable project.",
  },
};

/**
 * PR-050 final pass — redesigned from a dense, tooltip-driven 4-column tile
 * grid into a taller, self-explanatory 2-column card. Every card now states,
 * always visible (never hover-only): what this measures, why it matters, and
 * the real evidence (or, for `severity === "unknown"`, what evidence is
 * missing) behind the number — so "Medium" or a bare score never appears
 * without a reason a reader can act on. Shared by every synchronous card and
 * the async-swapped Developer card (`ProfileDeveloperTileAsync`, a Client
 * Component, imports this directly rather than receiving it as a render-prop,
 * since functions can't cross the Server→Client boundary as props).
 */
export function ScorecardCardView({ card }: { card: MetaCard }) {
  const explanation = SCORECARD_EXPLANATION[card.id];
  const isUnassessed = card.severity === "unknown";

  return (
    <div
      role="listitem"
      className="flex flex-col gap-3 rounded-xl border border-radar-light-border bg-radar-light-surface p-4 dark:border-white/10 dark:bg-white/[0.02]"
    >
      <div className="flex items-start gap-3">
        <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg", SEVERITY_ICON_BG[card.severity])}>
          <card.icon className={cn("size-4.5 shrink-0", SEVERITY_CLASS[card.severity])} aria-hidden="true" />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5">
            <span className="text-[10.5px] font-semibold tracking-wide text-radar-light-muted uppercase dark:text-radar-muted">
              {card.title}
            </span>
            <span className="shrink-0 rounded-full bg-radar-light-border/60 px-1.5 py-0.5 text-[10px] font-medium text-radar-light-muted dark:bg-white/5 dark:text-radar-muted">
              {card.helper}
            </span>
          </div>
          <span className={cn("truncate text-xl font-bold tabular-nums", SEVERITY_CLASS[card.severity])}>{card.value}</span>
        </div>
      </div>

      {card.progress !== null && (
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-radar-light-border dark:bg-white/10">
          <div
            className={cn("h-full rounded-full transition-[width] duration-700 ease-out motion-reduce:transition-none", SEVERITY_BAR_GRADIENT[card.severity])}
            style={{ width: `${card.progress}%` }}
          />
        </div>
      )}

      {explanation && (
        <div className="flex flex-col gap-1.5 border-t border-radar-light-border pt-2.5 text-[11.5px] leading-relaxed dark:border-white/10">
          <p className="text-radar-light-muted dark:text-radar-muted">
            <span className="font-semibold text-radar-light-text dark:text-radar-white">Measures: </span>
            {explanation.measures}
          </p>
          <p className="text-radar-light-muted dark:text-radar-muted">
            <span className="font-semibold text-radar-light-text dark:text-radar-white">Why it matters: </span>
            {explanation.matters}
          </p>
        </div>
      )}

      <p
        className={cn(
          "rounded-lg border p-2 text-[11.5px] leading-relaxed",
          isUnassessed
            ? "border-dashed border-radar-light-border text-radar-light-muted dark:border-white/10 dark:text-radar-muted"
            : "border-radar-light-border bg-radar-light-card text-radar-light-text dark:border-white/10 dark:bg-white/[0.03] dark:text-radar-white"
        )}
      >
        <span className={cn("font-semibold", isUnassessed ? "text-radar-light-muted dark:text-radar-muted" : SEVERITY_CLASS[card.severity])}>
          {isUnassessed ? "What's missing: " : "Evidence: "}
        </span>
        {card.tooltip}
      </p>
    </div>
  );
}

export function scorecardTileToMetaCard(id: string, tile: ScorecardTile): MetaCard {
  const unavailable = tile.severity === "unknown";
  return {
    id,
    icon: TILE_ICON[id],
    title: id === "developer" ? "Developer" : tile.label,
    value: unavailable ? "—" : tile.scoreLabel,
    helper: tile.statusLabel,
    severity: tile.severity,
    progress: tile.score,
    tooltip: tile.detail,
  };
}

export function ProjectHealthScorecard({
  tiles,
  health,
  confidence,
  risk,
  verificationStatus,
  commitActivityPromise,
  contributorCountPromise,
  releasesPromise,
}: ProjectHealthScorecardProps) {
  const findTile = (id: string) => tiles.find((tile) => tile.id === id)!;

  const metaCards: MetaCard[] = [
    {
      id: "health",
      icon: HeartPulse,
      title: "Health",
      value: `${health.score}/100`,
      helper: health.label[0].toUpperCase() + health.label.slice(1),
      severity: HEALTH_SEVERITY[health.label],
      progress: health.score,
      tooltip:
        health.factors.length > 0
          ? health.factors.join(", ")
          : "No live signals (TVL, GitHub activity, or price momentum) are available to assess health yet.",
    },
    {
      id: "confidence",
      icon: Gauge,
      title: "Confidence",
      value: `${confidence.score}/100`,
      helper: confidence.level[0].toUpperCase() + confidence.level.slice(1),
      severity: CONFIDENCE_SEVERITY[confidence.level],
      progress: confidence.score,
      tooltip:
        confidence.factors.length > 0
          ? confidence.factors.join(", ")
          : "No live provider sources are currently backing this report.",
    },
    {
      id: "risk",
      icon: ShieldAlert,
      title: "Risk",
      value: risk.level[0].toUpperCase() + risk.level.slice(1),
      helper: `${risk.contributors.length} factor${risk.contributors.length === 1 ? "" : "s"} assessed`,
      severity: RISK_SEVERITY[risk.level],
      progress: null,
      tooltip: risk.explanation,
    },
    {
      id: "verification",
      icon: BadgeCheck,
      title: "Verification",
      value: VERIFICATION_LABEL[verificationStatus],
      helper: "Registry status",
      severity: VERIFICATION_SEVERITY[verificationStatus],
      progress: null,
      tooltip: "Base Radar's own editorial review — see docs/PROJECT_REGISTRY.md for what verification requires.",
    },
  ];

  const developerFallback = scorecardTileToMetaCard("developer", findTile("developer"));
  const restTileCards: MetaCard[] = (["community", "liquidity", "governance"] as const).map((id) =>
    scorecardTileToMetaCard(id, findTile(id))
  );

  return (
    <ProfileSectionCard title="Project Health Scorecard" icon={Gauge} className="gap-4">
      <p className="text-xs leading-relaxed text-radar-light-muted dark:text-radar-muted">
        Eight independent scores, each with what it measures, why it matters, and the real evidence (or missing evidence)
        behind it — nothing here is an unexplained percentage.
      </p>
      <div role="list" aria-label="Project health score matrix" className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {metaCards.map((card) => (
          <ScorecardCardView key={card.id} card={card} />
        ))}

        <Suspense fallback={<ScorecardCardView card={developerFallback} />}>
          <ProfileDeveloperTileAsync
            commitActivityPromise={commitActivityPromise}
            contributorCountPromise={contributorCountPromise}
            releasesPromise={releasesPromise}
            fallback={findTile("developer")}
          />
        </Suspense>

        {restTileCards.map((card) => (
          <ScorecardCardView key={card.id} card={card} />
        ))}
      </div>
    </ProfileSectionCard>
  );
}
