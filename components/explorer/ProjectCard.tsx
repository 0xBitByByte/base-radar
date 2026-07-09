import { memo, type KeyboardEvent } from "react";
import { motion } from "framer-motion";

import { ProjectCardHeader } from "@/components/explorer/ProjectCardHeader";
import { ProjectCardDescription } from "@/components/explorer/ProjectCardDescription";
import { ProjectCategoryChips } from "@/components/explorer/ProjectCategoryChips";
import { ProjectMetricsGrid } from "@/components/explorer/ProjectMetricsGrid";
import { ScoreBadge } from "@/components/explorer/ScoreBadge";
import { MetricItem } from "@/components/explorer/MetricItem";
import { ProjectCardFooter } from "@/components/explorer/ProjectCardFooter";
import { formatLabel } from "@/components/explorer/format";
import { formatCompactCurrency, formatCompactNumber } from "@/lib/data/format";
import { cn } from "@/lib/utils";
import type { ProjectIntelligence } from "@/lib/intelligence/types";

type ProjectCardProps = {
  project: ProjectIntelligence;
  /** No-op until Quick View exists (Milestone 7, PR6) — docs/explorer/06 §4. */
  onActivate?: () => void;
};

/**
 * One project, glanceable — docs/explorer/04-component-specification.md §9.
 * Composes the five approved sections; every metric slot always renders,
 * including its explicit "unavailable" treatment (card consistency,
 * docs/explorer/03 §13) — never a reflow, never an omitted slot.
 */
function ProjectCardComponent({ project, onActivate }: ProjectCardProps) {
  const { identity, community, health, confidence, tvl, github, freshness } = project;
  const primaryCategory = identity.categories[0];

  const tvlAvailable = tvl.available && tvl.tvlUsd !== null;
  const githubAvailable = github.available && github.stars !== null;

  function activate() {
    onActivate?.();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      activate();
    }
  }

  const ariaLabel = [
    identity.name,
    primaryCategory ? formatLabel(primaryCategory) : null,
    `Health ${formatLabel(health.label)}`,
    `Confidence ${formatLabel(confidence.level)}`,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <motion.div
      role="button"
      tabIndex={0}
      aria-label={ariaLabel}
      onClick={activate}
      onKeyDown={handleKeyDown}
      whileHover={{ y: -3 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className={cn(
        "flex cursor-pointer flex-col gap-4 rounded-2xl border border-radar-light-border bg-radar-light-card/80 p-5 outline-none backdrop-blur-xl transition-[border-color,box-shadow] duration-200",
        "hover:border-radar-primary/30 hover:shadow-lg dark:hover:shadow-[0_12px_40px_-12px_rgba(0,82,255,0.25)]",
        "focus-visible:ring-2 focus-visible:ring-radar-primary/50",
        "dark:border-white/10 dark:bg-radar-card/60 dark:hover:border-radar-primary/40"
      )}
    >
      <ProjectCardHeader identity={identity} community={community} />
      <ProjectCardDescription shortDescription={identity.shortDescription} />
      <ProjectCategoryChips categories={identity.categories} tags={identity.tags} />

      <ProjectMetricsGrid>
        <ScoreBadge
          type="health"
          score={health.score}
          label={health.label}
          infoTooltip="A 0–100 score blending live market, TVL, and GitHub activity signals into one health read."
        />
        <ScoreBadge
          type="confidence"
          score={confidence.score}
          label={confidence.level}
          infoTooltip="A 0–100 score reflecting how much live data and registry verification back this record."
        />
        <MetricItem
          label="TVL"
          value={tvlAvailable ? formatCompactCurrency(tvl.tvlUsd as number) : undefined}
          unavailable={!tvlAvailable}
        />
        <MetricItem
          label="GitHub Stars"
          value={githubAvailable ? formatCompactNumber(github.stars as number) : undefined}
          unavailable={!githubAvailable}
          infoTooltip="The project's GitHub star count, sourced live from the GitHub API."
        />
      </ProjectMetricsGrid>

      {/* mt-auto: grid rows stretch every card to the tallest sibling's
          height, so the footer must anchor to the bottom regardless of how
          much content sits above it — keeps footers aligned row-to-row. */}
      <ProjectCardFooter freshness={freshness} className="mt-auto" />
    </motion.div>
  );
}

/**
 * Memoized: `project` keeps a stable reference across re-renders for any
 * project unaffected by a given Search/Filter/Sort change (`.filter()`/
 * `.sort()` preserve object identity for included items), so this skips
 * re-rendering cards that don't need it — docs/explorer/04 §18.
 */
export const ProjectCard = memo(ProjectCardComponent);
