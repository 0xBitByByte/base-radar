import { memo, type ReactNode } from "react";
import Image from "next/image";

import { VerificationBadge } from "@/components/explorer/VerificationBadge";
import { ScoreBadge } from "@/components/explorer/ScoreBadge";
import { RowActions } from "@/components/explorer/RowActions";
import { formatLabel } from "@/components/explorer/format";
import { formatCompactCurrency, formatCompactNumber, formatPercent, formatPrice } from "@/lib/data/format";
import { cn } from "@/lib/utils";
import type { ProjectIntelligence } from "@/lib/intelligence/types";

type ProjectRowProps = {
  project: ProjectIntelligence;
  /** No-op until Quick View exists (Milestone 7, PR6) — docs/explorer/06 §4. */
  onActivate?: () => void;
};

const CELL_CLASS = "px-3 py-2.5 align-middle text-sm text-radar-light-text dark:text-radar-white";
const UNAVAILABLE_CLASS = "text-radar-light-muted dark:text-radar-muted";
/** Sticky in both directions with the row's own background — its own opaque bg would otherwise mask the row's `hover:bg`, so it mirrors that state via `group-hover` instead. Scrolled content never shows through — docs/explorer §PR5 "pin only Logo + Name". */
const PINNED_CELL_CLASS =
  "sticky left-0 z-[1] border-r border-radar-light-border bg-radar-light-card group-hover:bg-radar-light-surface dark:border-white/10 dark:bg-radar-card dark:group-hover:bg-white/[0.03]";

function Cell({ children, align = "left", className }: { children: ReactNode; align?: "left" | "right"; className?: string }) {
  return (
    <td className={cn(CELL_CLASS, align === "right" && "min-w-20 text-right tabular-nums", className)}>{children}</td>
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
  const { identity, community, market, tvl, health, confidence, github } = project;
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
          {identity.logoUrl ? (
            <Image
              src={identity.logoUrl}
              alt=""
              width={24}
              height={24}
              unoptimized
              className="size-6 shrink-0 rounded-full object-cover"
            />
          ) : (
            <span
              className="flex size-6 shrink-0 items-center justify-center rounded-full bg-radar-light-surface text-[10px] font-semibold text-radar-light-muted dark:bg-white/5 dark:text-radar-muted"
              aria-hidden="true"
            >
              {identity.name.slice(0, 2).toUpperCase()}
            </span>
          )}
          <span className="min-w-0 truncate font-medium">{identity.name}</span>
        </div>
      </Cell>

      <Cell>{primaryCategory ? formatLabel(primaryCategory) : <span className={UNAVAILABLE_CLASS}>—</span>}</Cell>

      <Cell>
        <VerificationBadge status={community.verificationStatus} />
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
        <ScoreBadge type="health" score={health.score} label={health.label} showLabel={false} />
      </Cell>

      <Cell>
        <ScoreBadge type="confidence" score={confidence.score} label={confidence.level} showLabel={false} />
      </Cell>

      <Cell align="right">
        {githubAvailable ? formatCompactNumber(github.stars as number) : <span className={UNAVAILABLE_CLASS}>—</span>}
      </Cell>

      <Cell>
        <RowActions onActivate={onActivate} />
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
