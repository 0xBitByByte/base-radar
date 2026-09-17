import { formatLabel } from "@/components/explorer/format";
import { VerificationBadge } from "@/components/explorer/VerificationBadge";
import { ProjectStatusBadge } from "@/components/projects/ProjectStatusBadge";
import { RiskBadge } from "@/components/projects/RiskBadge";
import { GlowBadge } from "@/components/ui/GlowBadge";
import { cn } from "@/lib/utils";
import type { RiskLevel } from "@/lib/intelligence-engine";
import type { DiscoveryStatus } from "@/lib/discovery/status";
import type { ProjectStatus } from "@/data/projects/enums";
import type { LiveProject } from "@/lib/projects/types";

/**
 * Universal Project Card, PR-2A (Product Standard §10, Trust Indicators).
 *
 * Consolidates the three signals §10 names — registry verification status,
 * Confidence score, and data-source freshness — into one cluster, replacing
 * today's separately-positioned verification row and inline Confidence
 * badge. Discovery-only projects keep the existing "Discovered" treatment
 * (no `verification.status` exists for them — never fabricated).
 *
 * PR-2B — at `compact`, Confidence renders as plain neutral text rather
 * than a high/medium/low semantic color.
 *
 * PR-085.03B — Finding 1: the raw numeric confidence score no longer
 * renders on the discovery card at either density (it stays fully
 * available on the Project Profile page, which reads `confidence.score`
 * directly, untouched by this file). Executive users read the interpreted
 * level ("High confidence"), not the number — the score competed visually
 * with the primary KPI without adding decision value at a glance. Finding
 * 2: the freshness timestamp is removed entirely (near-zero information
 * value during discovery, changes on every request, and cost a full row's
 * worth of space) — `project.lastUpdated` itself is untouched; only this
 * card's display of it is gone.
 */
type TrustIndicatorsProps = {
  project: LiveProject;
  isCompact: boolean;
  className?: string;
  /**
   * Layout Engine audit — the right-column badges (§8 Risk, §7 Lifecycle),
   * optional. `compact`'s card previously rendered `RiskBadge`/
   * `ProjectStatusBadge` as flat `flex-wrap` siblings *after* this
   * component in `LiveProjectCard.tsx`, so Risk's X position was whatever
   * horizontal space the verification badge's own text happened to leave
   * — confirmed live: "Low" measured x=147 beside "Verified" but x=165
   * beside "Community" on an identically-sized card, purely from the
   * verification label's own width. Passing them in here instead lets
   * this component own the fixed two-column grid (below) that makes Risk
   * independent of the verification label's width — not achievable by
   * reordering or spacing the old flat siblings. `detailed` doesn't pass
   * these — its own Row 5 already renders Risk first in an otherwise-empty
   * row, so it was never subject to this specific bug and is unchanged.
   */
  riskLevel?: RiskLevel | null;
  status?: ProjectStatus | null;
  discoveryStatus?: DiscoveryStatus | null;
};

export function TrustIndicators({ project, isCompact, className, riskLevel, status, discoveryStatus }: TrustIndicatorsProps) {
  const isDiscoveryOnly = project.source === "discovery";
  const { verification, confidence } = project;
  const hasRightColumn = riskLevel !== undefined;
  // Product Semantics audit — a discovery-only card with a real
  // `discoveryStatus` already gets a Lifecycle badge elsewhere on this same
  // card (`ProjectStatusBadge`, this row's own right column at `compact`,
  // `LiveProjectCard`'s Row 5 at `detailed`) — "Newly Discovered" for the
  // common case, or a genuinely different, more specific state (Needs
  // Review, Recently Updated, ...). This flat "Discovered" fallback said
  // the exact same "not registry-reviewed" fact a second time, confirmed
  // live: every discovery-only card showed both simultaneously. Shown only
  // when there's truly no more specific lifecycle signal to defer to.
  const showGenericDiscoveredBadge = isDiscoveryOnly && !project.discoveryStatus;

  return (
    <div
      className={cn(
        // Layout Engine audit — a fixed two-column grid (`1fr auto`), not a
        // single `flex` row. The left column (verification/discovered
        // badge, confidence, lifecycle) can be any width without affecting
        // the right column's start position — CSS Grid gives the right
        // ("auto") column its own track, sized to its own content only,
        // always anchored to the grid's right edge regardless of how much
        // or how little the left column renders. A flat `flex-wrap` row
        // (the prior structure) could never guarantee this: the right
        // badge's X position was whatever space the left content didn't
        // consume, which varies with the verification label's own text
        // width ("Verified" vs "Community").
        hasRightColumn ? "grid grid-cols-[1fr_auto] items-center gap-2" : "flex flex-col justify-center gap-1",
        !isCompact && "min-h-[52px]",
        className
      )}
    >
      <div className={cn("flex flex-col justify-center gap-1", hasRightColumn && "min-w-0")}>
        <div className={cn("flex flex-wrap items-center gap-1.5", !isCompact && "min-h-[26px]")}>
          {showGenericDiscoveredBadge ? (
            <GlowBadge color="muted" className={cn(isCompact && "gap-1 px-1.5 py-0.5 text-[10px]")}>
              Discovered
            </GlowBadge>
          ) : (
            !isDiscoveryOnly && verification.status && <VerificationBadge status={verification.status} compact={isCompact} />
          )}
        </div>
        <span className={cn("text-radar-light-muted dark:text-radar-muted", isCompact ? "text-xs" : "text-[11px]")}>
          {formatLabel(confidence.level)} confidence
        </span>
        {hasRightColumn && (status !== null || discoveryStatus !== null) && (
          <div className="flex flex-wrap items-center gap-1.5">
            <ProjectStatusBadge status={status ?? null} discoveryStatus={discoveryStatus ?? null} compact={isCompact} />
          </div>
        )}
      </div>
      {hasRightColumn && (
        <div className="flex shrink-0 items-center self-start">
          <RiskBadge riskLevel={riskLevel} contributors={project.riskContributors} compact={isCompact} />
        </div>
      )}
    </div>
  );
}
