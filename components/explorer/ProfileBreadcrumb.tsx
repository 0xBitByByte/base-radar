import { ArrowLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

type ProfileBreadcrumbProps = {
  projectName: string;
};

/**
 * PR13.3 Goal 1 — breadcrumb trail (Dashboard / Projects / current project)
 * plus a direct "Back to Projects" link. Both use `next/link` to
 * `/dashboard/projects` rather than `router.back()`, so the destination is
 * deterministic regardless of how the user arrived at this page.
 */
export function ProfileBreadcrumb({ projectName }: ProfileBreadcrumbProps) {
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
          <li aria-current="page" className="truncate font-semibold text-radar-light-text dark:text-radar-white">
            {projectName}
          </li>
        </ol>
      </nav>

      <Link
        href="/dashboard/projects"
        className="group inline-flex w-fit items-center gap-1.5 rounded-lg text-xs font-medium text-radar-light-muted outline-none transition-colors hover:text-radar-light-text focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:text-radar-muted dark:hover:text-radar-white"
      >
        <ArrowLeft className="size-3.5 shrink-0 transition-transform duration-200 group-hover:-translate-x-0.5" aria-hidden="true" />
        Back to Projects
      </Link>
    </div>
  );
}
