import { memo, type ReactNode } from "react";

import { ChainBadgeGroup } from "@/components/branding/ChainBadgeGroup";
import { ProjectLogo } from "@/components/branding/ProjectLogo";
import { ACTION_COLUMN_CLASS } from "@/components/explorer/ColumnHeader";
import { VerificationBadge } from "@/components/explorer/VerificationBadge";
import { ScoreBadge } from "@/components/explorer/ScoreBadge";
import { RowActions } from "@/components/explorer/RowActions";
import { formatLabel } from "@/components/explorer/format";
import {
  CONFIDENCE_SCORE_INFO_TOOLTIP,
  GITHUB_STARS_INFO_TOOLTIP,
  HEALTH_SCORE_INFO_TOOLTIP,
} from "@/components/explorer/metricTooltips";
import { RichTooltip } from "@/components/ui/RichTooltip";
import { Tooltip } from "@/components/ui/Tooltip";
import { formatCompactCurrency, formatCompactNumber, formatPercent, formatPrice } from "@/lib/data/format";
import { cn } from "@/lib/utils";
import type { ProjectIntelligence } from "@/lib/intelligence/types";

type ProjectRowProps = {
  project: ProjectIntelligence;
  /** Opens this project's full Profile page (PR13.5 — the Quick View drawer this used to open has been removed). */
  onActivate?: () => void;
};

const CELL_CLASS = "px-3 py-2.5 align-middle text-sm text-radar-light-text dark:text-radar-white";
const UNAVAILABLE_CLASS = "text-radar-light-muted dark:text-radar-muted";
/** Sticky in both directions with the row's own background — its own opaque bg would otherwise mask the row's `hover:bg`, so it mirrors that state via `group-hover` instead. Scrolled content never shows through — docs/explorer §PR5 "pin only Logo + Name". */
const PINNED_CELL_CLASS =
  "sticky left-0 z-[1] border-r border-radar-light-border bg-radar-light-card group-hover:bg-radar-light-surface dark:border-white/10 dark:bg-radar-card dark:group-hover:bg-white/[0.03]";

function Cell({
  children,
  align = "left",
  className,
}: {
  children: ReactNode;
  align?: "left" | "right" | "center";
  className?: string;
}) {
  return (
    <td
      className={cn(
        CELL_CLASS,
        align === "right" && "min-w-20 text-right tabular-nums",
        align === "center" && "text-center",
        className
      )}
    >
      {children}
    </td>
  );
}

/**
 * One project, dense — the row-view equivalent of `ProjectCard`
 * (docs/explorer/04 §10). Flat: one `<td>` per column, no nested row
 * sections, since a table row has no multi-field grouping the way
 * `ProjectMetricsGrid` grouped Grid's metrics. Reuses `ScoreBadge` and
 * `VerificationBadge` directly — no duplicate rendering implementation.
 */
function ProjectRowComponent({ project, onActivate }: ProjectRowProps) {
  const { identity, community, market, tvl, health, confidence, github, chain } = project;
  const primaryCategory = identity.categories[0];

  const priceAvailable = market.available && market.priceUsd !== null;
  const changeAvailable = market.available && market.changePct24h !== null;
  const tvlAvailable = tvl.available && tvl.tvlUsd !== null;
  const githubAvailable = github.available && github.stars !== null;

  const changeValue = changeAvailable ? (market.changePct24h as number) : null;
  const changeColor =
    changeValue === null
      ? UNAVAILABLE_CLASS
      : changeValue > 0
        ? "text-radar-success"
        : changeValue < 0
          ? "text-radar-danger"
          : "text-radar-light-text dark:text-radar-white";

  return (
    <tr
      className={cn(
        "group transition-colors hover:bg-radar-light-surface dark:hover:bg-white/[0.03]",
        onActivate && "cursor-pointer"
      )}
      onClick={onActivate}
    >
      <Cell className={PINNED_CELL_CLASS}>
        <div className="flex min-w-0 items-center gap-2.5">
          <ProjectLogo logoUrl={identity.logoUrl} name={identity.name} size={24} />
          <span title={identity.name} className="min-w-0 truncate font-medium">
            {identity.name}
          </span>
        </div>
      </Cell>

      <Cell>
        {/* max=1: always the single leading (Base-first) chain badge, plus
            "+N" for the rest — denser than showing multiple full badges,
            and `flex-nowrap` keeps every row the same single-line height
            regardless of chain count. */}
        <ChainBadgeGroup chains={chain.chains} size="sm" max={1} className="flex-nowrap" />
      </Cell>

      <Cell>
        {/* Plain text, not a badge — Chain/Verification/Health/Confidence
            already carry the row's badge visual weight; a fifth pill here
            would read as noise. Matches `ChainBadge`'s "sm" 10px text size
            so the column stays as compact as the badge version was, without
            the pill chrome. */}
        {primaryCategory ? (
          <span className="text-[10px] font-medium text-radar-light-muted dark:text-radar-muted">
            {formatLabel(primaryCategory)}
          </span>
        ) : (
          <span className={UNAVAILABLE_CLASS}>—</span>
        )}
      </Cell>

      <Cell>
        <VerificationBadge status={community.verificationStatus} compact />
      </Cell>

      <Cell align="right">
        {priceAvailable ? formatPrice(market.priceUsd as number) : <span className={UNAVAILABLE_CLASS}>—</span>}
      </Cell>

      <Cell align="right" className={changeColor}>
        {changeAvailable ? formatPercent(changeValue as number) : <span className={UNAVAILABLE_CLASS}>—</span>}
      </Cell>

      <Cell align="right">
        {tvlAvailable ? formatCompactCurrency(tvl.tvlUsd as number) : <span className={UNAVAILABLE_CLASS}>—</span>}
      </Cell>

      <Cell>
        <ScoreBadge
          type="health"
          score={health.score}
          label={health.label}
          showLabel={false}
          bare
          infoTooltip={HEALTH_SCORE_INFO_TOOLTIP}
        />
      </Cell>

      <Cell>
        <ScoreBadge
          type="confidence"
          score={confidence.score}
          label={confidence.level}
          showLabel={false}
          bare
          infoTooltip={CONFIDENCE_SCORE_INFO_TOOLTIP}
        />
      </Cell>

      <Cell align="right">
        {githubAvailable ? (
          <Tooltip content={<RichTooltip title="GitHub Stars" description={GITHUB_STARS_INFO_TOOLTIP} />}>
            <span tabIndex={0} className="rounded outline-none focus-visible:ring-2 focus-visible:ring-radar-primary/50">
              {formatCompactNumber(github.stars as number)}
            </span>
          </Tooltip>
        ) : (
          <span className={UNAVAILABLE_CLASS}>—</span>
        )}
      </Cell>

      <Cell align="center" className={ACTION_COLUMN_CLASS}>
        <RowActions projectId={identity.id} projectName={identity.name} onActivate={onActivate} />
      </Cell>
    </tr>
  );
}

/**
 * Memoized — same justification as `ProjectCard`: `.filter()`/`.sort()`
 * preserve object identity for unaffected projects, so this skips
 * re-rendering rows a given Search/Filter/Sort change didn't touch.
 */
export const ProjectRow = memo(ProjectRowComponent);
