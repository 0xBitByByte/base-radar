import Link from "next/link";

import { SeverityBadge } from "@/components/alerts/SeverityBadge";
import { ProjectLogo } from "@/components/branding/ProjectLogo";
import { getProject } from "@/data/projects/helpers";
import type { BriefHighlight } from "@/lib/brief/types";
import type { ProjectLogoEntry } from "@/lib/branding/resolveProjectLogos";

/**
 * Final UI/UX Consistency PR — the shared full-page "highlight" card,
 * previously defined twice, identically save variable names: `DailyBrief.tsx`'s
 * `HighlightRow` and `PortfolioOverview.tsx`'s own `HighlightRow`. Both read
 * the same `BriefHighlight[]` shape for Security/Governance/Development/TVL
 * Highlights and Projects Needing Attention.
 */
export function ProjectHighlightCard({
  highlight,
  logoMap,
}: {
  highlight: BriefHighlight;
  logoMap: Record<string, ProjectLogoEntry>;
}) {
  const project = getProject(highlight.projectId);
  const logo = logoMap[highlight.projectId];

  return (
    <li className="group relative flex h-full flex-col gap-1.5 rounded-xl border border-radar-light-border bg-radar-light-card p-4 transition-colors hover:bg-radar-light-surface dark:border-white/10 dark:bg-white/[0.02] dark:hover:bg-white/[0.05]">
      {project && (
        <Link
          href={`/dashboard/projects/${project.slug}`}
          aria-label={`${highlight.headline}. View ${highlight.projectName}'s Project Profile.`}
          className="absolute inset-0 z-0 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-radar-primary/50"
        />
      )}

      <div className="relative z-[1] flex min-w-0 flex-wrap items-center gap-1.5">
        <span className="flex max-w-[160px] items-center gap-1.5 rounded-full border border-radar-light-border bg-radar-light-surface px-2 py-0.5 text-[10.5px] font-medium text-radar-light-text dark:border-white/10 dark:bg-white/[0.03] dark:text-radar-white">
          <ProjectLogo logoUrl={logo?.logoUrl} fallbackUrls={logo?.logoUrlFallbacks} name={highlight.projectName} size={14} />
          <span className="truncate">{highlight.projectName}</span>
        </span>
        <SeverityBadge severity={highlight.severity} />
      </div>

      <p className="line-clamp-1 text-sm font-semibold text-radar-light-text dark:text-radar-white">{highlight.headline}</p>
      <p className="line-clamp-2 flex-1 text-xs leading-relaxed text-radar-light-muted dark:text-radar-muted">{highlight.detail}</p>
    </li>
  );
}
