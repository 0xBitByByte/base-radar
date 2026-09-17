/**
 * PR-057 — Task 3: the new Projects page header. Title, description, real
 * project count, and a last-updated indicator derived from the
 * already-fetched `LiveProject[]` — no action that doesn't exist yet (no
 * "Add Project," no export button).
 *
 * PR-085.05, Task 1 — the "Browse All Projects" CTA moves here, beside the
 * title, right-aligned. Same button style the "Back to Discover" CTA on
 * `ProjectsCollectionPage.tsx` already uses (byte-identical classes) — not
 * a new button style. Replaces the end-of-rail CTA `page.tsx` used to
 * render at the bottom of Discovery, which is now removed entirely.
 *
 * PR-085.05A, Task 3 — reviewed renaming this CTA to "Project Explorer,"
 * left unchanged: the destination page's own `<h1>`, tab title, and
 * `viewMeta.ts` metadata all say "All Projects" — introducing "Project
 * Explorer" only here would make the button promise a different name than
 * the page it lands on actually uses, which is a worse, not better,
 * outcome for exactly the terminology-consistency this task cares about.
 *
 * PR-085.05A, Task 4 — the subtitle is now two short lines instead of one
 * long "Browse the Base ecosystem · N tracked projects · Updated just now"
 * run-on sentence: "Browse the Base ecosystem" on its own line, then the
 * live count (+ timestamp, when present) below it. Same `gap-0.5`/`gap-1.5`
 * spacing scale this header already used — no new spacing system.
 */

import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Timestamp } from "@/components/explorer/Timestamp";
import { PROJECTS_PATH } from "@/components/projects/queryState";
import { formatNumber } from "@/lib/data/format";

type ProjectsHeaderProps = {
  totalCount: number;
  /** Most recent `LiveProject.lastUpdated` across the whole set — `null` only if there are zero projects, which never reaches this component (the page renders an empty state first). */
  lastUpdated: string | null;
};

export function ProjectsHeader({ totalCount, lastUpdated }: ProjectsHeaderProps) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-2xl font-semibold tracking-tight text-radar-light-text dark:text-radar-white">Projects</h1>
        <div className="flex flex-col gap-0.5 text-sm text-radar-light-muted dark:text-radar-muted">
          <p>Browse the Base ecosystem</p>
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span>
              {formatNumber(totalCount)} project{totalCount === 1 ? "" : "s"} tracked
            </span>
            {lastUpdated && (
              <>
                <span aria-hidden="true">·</span>
                <Timestamp iso={lastUpdated} />
              </>
            )}
          </p>
        </div>
      </div>
      <Link
        href={`${PROJECTS_PATH}/all`}
        className="flex shrink-0 items-center justify-center gap-1.5 rounded-xl border border-radar-light-border bg-radar-light-card px-4 py-2.5 text-sm font-medium text-radar-light-text outline-none transition-colors hover:border-radar-primary/30 hover:text-radar-primary focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:border-white/10 dark:bg-radar-card dark:text-radar-white"
      >
        Browse All Projects
        <ArrowRight className="size-3.5" aria-hidden="true" />
      </Link>
    </div>
  );
}
