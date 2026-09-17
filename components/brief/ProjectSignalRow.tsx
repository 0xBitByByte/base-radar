import Link from "next/link";

import { NarrativeBadge } from "@/components/alerts/NarrativeBadge";
import { ProjectLogo } from "@/components/branding/ProjectLogo";
import { getProject } from "@/data/projects/helpers";
import type { BriefOpportunity } from "@/lib/brief/types";
import type { ProjectLogoEntry } from "@/lib/branding/resolveProjectLogos";

/**
 * Final UI/UX Consistency PR — the shared compact list-item, previously
 * defined twice, identically save variable names: `EcosystemOpportunitiesWidget.tsx`'s
 * `OpportunityRow` and `EcosystemRisksWidget.tsx`'s `RiskRow`. `BriefRisk` is
 * a type alias for `BriefOpportunity` (`lib/brief/types.ts`), so one
 * component covers both — only each widget's own icon/title/accent color
 * differ, and those stay owned by the widget, not this row.
 *
 * Deliberately a separate component from `ProjectOpportunityCard`, not a
 * shared component with a density prop: this one lives inside a narrow
 * `WidgetCard` sidebar tile on the Dashboard and drops the bordered-card
 * chrome, confidence/score footer, and larger 24px-vs-14px-pill logo
 * treatment that `ProjectOpportunityCard`'s full-page context has room for
 * — the same "compact tier legitimately shows fewer fields" reasoning
 * `LiveProjectCard`'s own density tiers already use, not an oversight.
 */
export function ProjectSignalRow({
  signal,
  logoMap,
}: {
  signal: BriefOpportunity;
  logoMap: Record<string, ProjectLogoEntry>;
}) {
  const project = getProject(signal.projectId);
  const logo = logoMap[signal.projectId];
  return (
    <li className="group relative flex items-start gap-2.5">
      {project && (
        <Link
          href={`/dashboard/projects/${project.slug}`}
          aria-label={`${signal.headline}. View ${signal.projectName}'s Project Profile.`}
          className="absolute inset-0 z-0 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-radar-primary/50"
        />
      )}
      <ProjectLogo logoUrl={logo?.logoUrl} fallbackUrls={logo?.logoUrlFallbacks} name={signal.projectName} size={24} className="relative z-[1] shrink-0" />
      <div className="relative z-[1] min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="truncate text-xs font-semibold text-radar-light-text dark:text-radar-white">{signal.projectName}</span>
          <NarrativeBadge narrative={signal.narrative} />
        </div>
        <p className="line-clamp-1 text-[11px] leading-relaxed text-radar-light-muted dark:text-radar-muted">{signal.reason}</p>
      </div>
    </li>
  );
}
