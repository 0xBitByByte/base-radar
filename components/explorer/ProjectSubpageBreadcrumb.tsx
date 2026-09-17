import { ArrowLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

type ProjectSubpageBreadcrumbProps = {
  /** Real project name, or `null` when the registry lookup missed (matches every existing call site's `?? "Project"` fallback). */
  projectName: string | null;
  projectHref: string;
  /** The current page's label in the trail, e.g. "Pools", "AI Intelligence Report", "Contracts". */
  currentPageLabel: string;
};

/**
 * PR-086.03 — the one shared breadcrumb for every `/dashboard/projects/[slug]/*`
 * sub-route (`ai`, `pools`, `contracts`, `governance`, `whale`). Each of
 * those five pages previously hand-rolled this exact same
 * Dashboard/Projects/<project>/<page> trail + "Back to <project>" link
 * independently — five byte-for-byte-identical copies save the current-page
 * label and project-name variable name. Consolidated here so the pattern
 * can't drift between pages, and so a sixth sub-route only needs to pass
 * three props instead of copy-pasting the block again.
 *
 * Mirrors `ProfileBreadcrumb.tsx`'s exact trail/back-link shape (the
 * Project Profile page's own breadcrumb), just parameterized for a
 * sub-route's extra trail segment. `Topbar.tsx`'s `useBreadcrumb()` hook
 * suppresses its own generic breadcrumb for every route this component
 * covers (`segments.length >= 3` under `/dashboard/projects/[slug]`), so
 * this remains the single breadcrumb on screen, not a second one.
 */
export function ProjectSubpageBreadcrumb({ projectName, projectHref, currentPageLabel }: ProjectSubpageBreadcrumbProps) {
  const displayName = projectName ?? "Project";

  return (
    <div className="flex flex-col gap-2">
      <nav aria-label="Breadcrumb">
        <ol className="flex flex-wrap items-center gap-1.5 text-xs text-radar-light-muted dark:text-radar-muted">
          <li>
            <Link
              href="/dashboard"
              className="rounded-md font-medium outline-none transition-colors hover:text-radar-light-text focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:hover:text-radar-white"
            >
              Dashboard
            </Link>
          </li>
          <li aria-hidden="true">
            <ChevronRight className="size-3.5" />
          </li>
          <li>
            <Link
              href="/dashboard/projects"
              className="rounded-md font-medium outline-none transition-colors hover:text-radar-light-text focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:hover:text-radar-white"
            >
              Projects
            </Link>
          </li>
          <li aria-hidden="true">
            <ChevronRight className="size-3.5" />
          </li>
          <li>
            <Link
              href={projectHref}
              className="rounded-md font-medium outline-none transition-colors hover:text-radar-light-text focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:hover:text-radar-white"
            >
              {displayName}
            </Link>
          </li>
          <li aria-hidden="true">
            <ChevronRight className="size-3.5" />
          </li>
          <li aria-current="page" className="truncate font-semibold text-radar-light-text dark:text-radar-white">
            {currentPageLabel}
          </li>
        </ol>
      </nav>
      <Link
        href={projectHref}
        className="group inline-flex w-fit items-center gap-1.5 rounded-lg text-xs font-medium text-radar-light-muted outline-none transition-colors hover:text-radar-light-text focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:text-radar-muted dark:hover:text-radar-white"
      >
        <ArrowLeft className="size-3.5 shrink-0 transition-transform duration-200 group-hover:-translate-x-0.5" aria-hidden="true" />
        Back to {displayName}
      </Link>
    </div>
  );
}
