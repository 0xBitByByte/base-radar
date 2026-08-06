import { Suspense } from "react";
import { BadgeCheck, Code2, Droplets, Gauge, HeartPulse, Info, Landmark, ShieldAlert, Users, type LucideIcon } from "lucide-react";

import { ProfileDeveloperTileAsync } from "@/components/explorer/ProfileDeveloperTileAsync";
import { ProfileSectionCard } from "@/components/explorer/ProfileSectionCard";
import { RelativeTime } from "@/components/shared/RelativeTime";
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
  /** PR-062 Task 4 — real freshness timestamp (`profile.freshness.overall`, already computed by the Intelligence Engine from the newest live source's `fetchedAt`) — never a synthetic "just now." `null` only when no live source contributed at all. */
  lastUpdated: string | null;
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
/**
 * PR-074 REVIEW #10 — was 4 stacked blocks per card (header, progress bar,
 * a static "Measures:"/"Why it matters:" explanation always rendered in
 * full, and the real per-project evidence line) — confirmed via repeated
 * review feedback as too tall across 8 tiles. The "Measures"/"Why it
 * matters" text never changes per project (it's a fixed definition of what
 * the tile means), so it moves into an info-icon hover tooltip — the exact
 * pattern `MetricItem`'s `infoTooltip` already uses elsewhere on this page
 * — while the real, per-project evidence line (`Evidence:`/`What's
 * missing:`) stays always-visible since that's the part that's actually
 * dynamic and worth the space. No information removed, only relocated.
 */
export function ScorecardCardView({ card }: { card: MetaCard }) {
  const explanation = SCORECARD_EXPLANATION[card.id];
  const isUnassessed = card.severity === "unknown";

  return (
    <div
      role="listitem"
      className="flex flex-col gap-2 rounded-xl border border-radar-light-border bg-radar-light-surface p-3 dark:border-white/10 dark:bg-white/[0.02]"
    >
      <div className="flex items-start gap-2.5">
        <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-lg", SEVERITY_ICON_BG[card.severity])}>
          <card.icon className={cn("size-4 shrink-0", SEVERITY_CLASS[card.severity])} aria-hidden="true" />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5">
            <span className="flex items-center gap-1 text-[10.5px] font-semibold tracking-wide text-radar-light-muted uppercase dark:text-radar-muted">
              {card.title}
              {explanation && (
                // PR-074 REVIEW #10/#15 fix — confirmed live via real browser QA
                // (production build): a raw `onClick` here broke the page with
                // "Event handlers cannot be passed to Client Component props,"
                // because this file is a Server Component (see this component's
                // own doc comment above on why the Developer tile can't cross
                // that boundary either) — unlike `MetricItem.tsx`'s identical-
                // looking `infoTooltip` button, which works because that file is
                // `"use client"`. No handler is needed here: there's no outer
                // click target on this card for a click to bubble into.
                <Tooltip content={<RichTooltip title={card.title} description={`${explanation.measures} ${explanation.matters}`} />}>
                  <button
                    type="button"
                    aria-label={`About ${card.title}`}
                    className="cursor-pointer text-radar-light-muted/60 outline-none transition-colors hover:text-radar-light-muted focus-visible:text-radar-light-muted dark:text-radar-muted/50 dark:hover:text-radar-muted dark:focus-visible:text-radar-muted"
                  >
                    <Info className="size-3" aria-hidden="true" />
                  </button>
                </Tooltip>
              )}
            </span>
            <span className="shrink-0 rounded-full bg-radar-light-border/60 px-1.5 py-0.5 text-[10px] font-medium text-radar-light-muted dark:bg-white/5 dark:text-radar-muted">
              {card.helper}
            </span>
          </div>
          <span className={cn("truncate text-lg font-bold tabular-nums", SEVERITY_CLASS[card.severity])}>{card.value}</span>
        </div>
      </div>

      {card.progress !== null && (
        <div className="h-1 w-full overflow-hidden rounded-full bg-radar-light-border dark:bg-white/10">
          <div
            className={cn("h-full rounded-full transition-[width] duration-700 ease-out motion-reduce:transition-none", SEVERITY_BAR_GRADIENT[card.severity])}
            style={{ width: `${card.progress}%` }}
          />
        </div>
      )}

      <p
        className={cn(
          "truncate text-[11px] leading-relaxed",
          isUnassessed ? "text-radar-light-muted dark:text-radar-muted" : "text-radar-light-text dark:text-radar-white"
        )}
        title={card.tooltip}
      >
        <span className={cn("font-semibold", isUnassessed ? "text-radar-light-muted dark:text-radar-muted" : SEVERITY_CLASS[card.severity])}>
          {isUnassessed ? "Missing: " : "Evidence: "}
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
  lastUpdated,
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
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs leading-relaxed text-radar-light-muted dark:text-radar-muted">
          Eight independent scores, each with what it measures, why it matters, and the real evidence (or missing
          evidence) behind it — nothing here is an unexplained percentage.
        </p>
        {/* PR-062 Task 4 — real freshness, so "Is it active?" also answers "as of when?" */}
        <span className="shrink-0 text-[10.5px] font-medium whitespace-nowrap text-radar-light-muted/80 dark:text-radar-muted/70">
          {lastUpdated ? (
            <>
              Updated <RelativeTime iso={lastUpdated} />
            </>
          ) : (
            "Freshness not available"
          )}
        </span>
      </div>
      {/* PR-074 FINAL REVIEW — was `sm:grid-cols-2` (4 rows of 8 tiles) on a
          content column wide enough that each tile stretched to ~570px,
          far more width than a compact stat card needs — "still too large,
          still dominates the page" was a real, measurable density problem,
          not a subjective one. `lg:grid-cols-4` halves the row count to 2
          on desktop without touching card content — the evidence line was
          already `truncate` (a real, already-tested single-line clamp), so
          narrower cards don't wrap or clip. */}
      <div role="list" aria-label="Project health score matrix" className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
        {metaCards.map((card) => (
          <ScorecardCardView key={card.id} card={card} />
        ))}

        {/* PR-074 FINAL UX POLISH — the fast-path Developer tile is always
            "Not Assessed" (commit activity only resolves in the extended/
            streamed fetch); marking it `data-loading-skeleton` so the splash
            genuinely waits for the real grade instead of completing on a
            placeholder that's about to be replaced. */}
        <Suspense
          fallback={
            <span data-loading-skeleton="true" className="contents">
              <ScorecardCardView card={developerFallback} />
            </span>
          }
        >
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
