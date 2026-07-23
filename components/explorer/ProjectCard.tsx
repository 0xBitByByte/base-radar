import { memo, type KeyboardEvent } from "react";
import { motion } from "framer-motion";

import { ChainBadgeGroup } from "@/components/branding/ChainBadgeGroup";
import { ProjectCardHeader } from "@/components/explorer/ProjectCardHeader";
import { ProjectCardDescription } from "@/components/explorer/ProjectCardDescription";
import { ProjectCategoryChips } from "@/components/explorer/ProjectCategoryChips";
import { ProjectMetricsGrid } from "@/components/explorer/ProjectMetricsGrid";
import { ScoreBadge } from "@/components/explorer/ScoreBadge";
import { MetricItem } from "@/components/explorer/MetricItem";
import { ProjectCardFooter } from "@/components/explorer/ProjectCardFooter";
import { formatLabel } from "@/components/explorer/format";
import {
  CONFIDENCE_SCORE_INFO_TOOLTIP,
  GITHUB_STARS_INFO_TOOLTIP,
  HEALTH_SCORE_INFO_TOOLTIP,
} from "@/components/explorer/metricTooltips";
import { getProject } from "@/data/projects/helpers";
import { formatCompactCurrency, formatCompactNumber } from "@/lib/data/format";
import { cn } from "@/lib/utils";
import type { ProjectIntelligence } from "@/lib/intelligence/types";

type ProjectCardProps = {
  project: ProjectIntelligence;
  /** Opens this project's full Profile page (PR13.5 — the Quick View drawer this used to open has been removed). */
  onActivate?: () => void;
};

/**
 * One project, glanceable — docs/explorer/04-component-specification.md §9.
 * Composes the five approved sections; every metric slot always renders,
 * including its explicit "unavailable" treatment (card consistency,
 * docs/explorer/03 §13) — never a reflow, never an omitted slot.
 */
function ProjectCardComponent({ project, onActivate }: ProjectCardProps) {
  const { identity, community, health, confidence, tvl, github, freshness, chain } = project;
  const primaryCategory = identity.categories[0];

  /**
   * PR-038 — `verificationLevel`/`lifecycle` live on the registry's `Project`
   * record, not on `ProjectIntelligence`, so they're looked up directly
   * rather than threaded through the Intelligence Engine (mirrors the
   * precedent already set by `ProfileRelatedIntelligence.tsx`). Both are
   * `undefined` for every current seed project — the badges below render
   * nothing until registry data actually adopts these fields.
   */
  const registryProject = getProject(identity.id);

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
        "flex cursor-pointer flex-col gap-4 rounded-2xl border border-radar-light-border bg-gradient-to-b from-radar-light-card/90 to-radar-light-surface/70 p-5 shadow-[0_1px_2px_rgba(16,34,58,0.04)] outline-none backdrop-blur-xl transition-[border-color,box-shadow] duration-200",
        "hover:border-radar-primary/30 hover:shadow-[0_0_50px_-15px_rgba(var(--color-radar-primary-rgb),0.12)]",
        "focus-visible:ring-2 focus-visible:ring-radar-primary/50",
        "dark:border-radar-border dark:bg-gradient-to-b dark:from-radar-elevated/60 dark:to-radar-card/70 dark:shadow-[0_1px_2px_rgba(0,0,0,0.2)] dark:hover:border-radar-border-hover dark:hover:shadow-[0_0_50px_-15px_rgba(var(--color-radar-primary-rgb),0.15)]"
      )}
    >
      <ProjectCardHeader
        identity={identity}
        community={community}
        verificationLevel={registryProject?.verificationLevel?.level}
        lifecycleState={registryProject?.lifecycle?.state}
      />
      <ProjectCardDescription shortDescription={identity.shortDescription} />
      {/* Chain (network identity, colored + logo-bearing) always leads,
          on its own row — deliberately distinct from Category (a neutral
          taxonomy chip) below, so the two are never mistaken for one
          merged concept. `flex-nowrap` keeps this row's height identical
          across every card regardless of chain count — overflow becomes
          "+N" instead of a second line or a clipped/overflowing badge.
          max=1: exactly one real chain badge ("Base") always leads, with
          every other chain collapsing into "+N" — never two full badges
          side by side ("Base Optimism"), even for a 2-chain project. This
          is also the narrowest possible value, so it's automatically safe
          against the Grid's tightest real width (2-column layout at the
          `lg`/1024px breakpoint, where the Sidebar narrows each card to
          ~213px). */}
      <ChainBadgeGroup chains={chain.chains} size="sm" max={1} className="flex-nowrap self-start" />
      <ProjectCategoryChips categories={identity.categories} tags={identity.tags} reserveHeight />

      <ProjectMetricsGrid>
        <ScoreBadge
          type="health"
          score={health.score}
          label={health.label}
          infoTooltip={HEALTH_SCORE_INFO_TOOLTIP}
        />
        <ScoreBadge
          type="confidence"
          score={confidence.score}
          label={confidence.level}
          infoTooltip={CONFIDENCE_SCORE_INFO_TOOLTIP}
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
          infoTooltip={GITHUB_STARS_INFO_TOOLTIP}
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
