import { Suspense } from "react";
import { BadgeCheck, Code2, Droplets, Gauge, HeartPulse, Landmark, ShieldAlert, Users, type LucideIcon } from "lucide-react";

import { ProfileDeveloperTileAsync } from "@/components/explorer/ProfileDeveloperTileAsync";
import { ProfileSectionCard } from "@/components/explorer/ProfileSectionCard";
import { RichTooltip } from "@/components/ui/RichTooltip";
import { Tooltip } from "@/components/ui/Tooltip";
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
 * PR13.4 Goal 3 — the compact tile grid (PR13.3) is redesigned into the
 * spec's exact 8-card set: Health, Confidence, Risk, Verification (the same
 * real, already-computed top-level `ProjectIntelligence` fields the Profile
 * Header's badges already show — reused here, not recalculated) alongside
 * four of the Health Scorecard's own tiles (Developer, Community, Liquidity,
 * Governance — `buildHealthScorecard()`, unchanged). 4 columns × 2 rows on
 * desktop, every card the same compact icon/title/value/helper-text shape.
 */
/** One card's markup — shared by every synchronous card and the async-swapped Developer card (`ProfileDeveloperTileAsync`, a Client Component, imports this directly rather than receiving it as a render-prop, since functions can't cross the Server→Client boundary as props), so a streamed-in evidence tile renders through the exact same recipe as every other tile. */
export function ScorecardCardView({ card }: { card: MetaCard }) {
  return (
    <Tooltip className="block h-full" content={<RichTooltip title={card.title} description={card.tooltip} />}>
      <div
        role="listitem"
        tabIndex={0}
        className="flex h-full cursor-default flex-col gap-2.5 rounded-xl border border-radar-light-border bg-radar-light-surface p-3.5 outline-none transition-all duration-200 hover:-translate-y-0.5 hover:border-radar-primary/30 hover:bg-radar-light-card hover:shadow-md focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-radar-primary/50 motion-reduce:hover:translate-y-0 dark:border-white/10 dark:bg-white/[0.02] dark:hover:border-radar-accent/30 dark:hover:bg-white/[0.04]"
      >
        <div className="flex items-center justify-between">
          <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-lg", SEVERITY_ICON_BG[card.severity])}>
            <card.icon className={cn("size-4 shrink-0", SEVERITY_CLASS[card.severity])} aria-hidden="true" />
          </span>
        </div>

        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="truncate text-[10.5px] font-semibold tracking-wide text-radar-light-muted uppercase dark:text-radar-muted">
            {card.title}
          </span>
          <span className={cn("truncate text-lg font-bold tabular-nums", SEVERITY_CLASS[card.severity])}>{card.value}</span>
        </div>

        {card.progress !== null && (
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-radar-light-border dark:bg-white/10">
            <div
              className={cn("h-full rounded-full transition-[width] duration-700 ease-out motion-reduce:transition-none", SEVERITY_BAR_GRADIENT[card.severity])}
              style={{ width: `${card.progress}%` }}
            />
          </div>
        )}

        <span className="w-fit rounded-full bg-radar-light-border/60 px-1.5 py-0.5 text-[10px] font-medium text-radar-light-muted dark:bg-white/5 dark:text-radar-muted">
          {card.helper}
        </span>

        {/* Goal 6 — every tile explains itself inline, not only on hover; `title` carries the full sentence for anything the single line truncates. */}
        <p className="truncate text-[10.5px] leading-snug text-radar-light-muted dark:text-radar-muted" title={card.tooltip}>
          {card.tooltip}
        </p>
      </div>
    </Tooltip>
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
      tooltip: "Base Radar's transparent Health score — see the Header badge and AI Intelligence section for the full factor breakdown.",
    },
    {
      id: "confidence",
      icon: Gauge,
      title: "Confidence",
      value: `${confidence.score}/100`,
      helper: confidence.level[0].toUpperCase() + confidence.level.slice(1),
      severity: CONFIDENCE_SEVERITY[confidence.level],
      progress: confidence.score,
      tooltip: "How much live data backed this analysis — see the AI Intelligence section for the full factor breakdown.",
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
      tooltip: "Base Radar's own editorial trust signal — see docs/PROJECT_REGISTRY.md.",
    },
  ];

  const developerFallback = scorecardTileToMetaCard("developer", findTile("developer"));
  const restTileCards: MetaCard[] = (["community", "liquidity", "governance"] as const).map((id) =>
    scorecardTileToMetaCard(id, findTile(id))
  );

  return (
    <ProfileSectionCard title="Project Health Scorecard" icon={Gauge}>
      <div role="list" aria-label="Project health score matrix" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
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
