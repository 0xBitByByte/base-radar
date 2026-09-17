import Link from "next/link";

import { NarrativeBadge } from "@/components/alerts/NarrativeBadge";
import { ProjectLogo } from "@/components/branding/ProjectLogo";
import { getProject } from "@/data/projects/helpers";
import type { BriefOpportunity } from "@/lib/brief/types";
import type { ProjectLogoEntry } from "@/lib/branding/resolveProjectLogos";

/**
 * Final UI/UX Consistency PR — the shared full-page "opportunity" card,
 * previously defined twice, identically save variable names: `DailyBrief.tsx`'s
 * `OpportunityRow` and `PortfolioOverview.tsx`'s `PerformerRow`. `BriefRisk`
 * is a type alias for `BriefOpportunity` (`lib/brief/types.ts`), so this
 * also covers a risk entry rendered at this card density — today only
 * Top Opportunities/Top Performers use it; Risks render via the separate,
 * intentionally denser `ProjectSignalRow` (see that file's own doc comment
 * for why the two densities were kept as two components, not one with a
 * variant prop).
 */
export function ProjectOpportunityCard({
  opportunity,
  logoMap,
}: {
  opportunity: BriefOpportunity;
  logoMap: Record<string, ProjectLogoEntry>;
}) {
  const project = getProject(opportunity.projectId);
  const logo = logoMap[opportunity.projectId];

  return (
    <li className="group relative flex h-full flex-col gap-2 rounded-xl border border-radar-light-border bg-radar-light-card p-4 transition-colors hover:bg-radar-light-surface dark:border-white/10 dark:bg-white/[0.02] dark:hover:bg-white/[0.05]">
      {project && (
        <Link
          href={`/dashboard/projects/${project.slug}`}
          aria-label={`${opportunity.headline}. View ${opportunity.projectName}'s Project Profile.`}
          className="absolute inset-0 z-0 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-radar-primary/50"
        />
      )}

      <div className="relative z-[1] flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
          <span className="flex max-w-[160px] items-center gap-1.5 rounded-full border border-radar-light-border bg-radar-light-surface px-2 py-0.5 text-[10.5px] font-medium text-radar-light-text dark:border-white/10 dark:bg-white/[0.03] dark:text-radar-white">
            <ProjectLogo logoUrl={logo?.logoUrl} fallbackUrls={logo?.logoUrlFallbacks} name={opportunity.projectName} size={14} />
            <span className="truncate">{opportunity.projectName}</span>
          </span>
          <NarrativeBadge narrative={opportunity.narrative} />
        </div>
        <span className="shrink-0 text-[10.5px] font-medium text-radar-light-muted dark:text-radar-muted">
          {opportunity.confidence}% confidence
        </span>
      </div>

      <div className="relative z-[1] flex flex-1 flex-col gap-1">
        <p className="line-clamp-1 text-sm font-semibold text-radar-light-text dark:text-radar-white">{opportunity.headline}</p>
        <p className="line-clamp-2 text-xs leading-relaxed text-radar-light-muted dark:text-radar-muted">{opportunity.reason}</p>
      </div>

      <div className="relative z-[1] flex items-center justify-end gap-1.5 text-[10.5px] text-radar-light-muted dark:text-radar-muted">
        Score <span className="font-semibold text-radar-light-text dark:text-radar-white">{opportunity.score}</span>
      </div>
    </li>
  );
}
