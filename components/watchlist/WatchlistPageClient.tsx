"use client";

import { useRouter } from "next/navigation";
import { Eye } from "lucide-react";
import Link from "next/link";

import { AlertToggle } from "@/components/alerts/AlertToggle";
import { ExplorerGridLayout } from "@/components/explorer/ExplorerGridLayout";
import { ProjectCard } from "@/components/explorer/ProjectCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { useWatchedProjects } from "@/lib/hooks/useWatchedProjects";
import type { ProjectIntelligence } from "@/lib/intelligence/types";

type WatchlistPageClientProps = {
  /** The full registry's intelligence, already resolved by `app/dashboard/watchlist/page.tsx` via `getAllProjectIntelligence()` — never fetched here, only filtered down to whatever's watched. */
  projects: ProjectIntelligence[];
};

/**
 * PR13.1 — the dedicated Watchlist screen. Reuses Explorer's own
 * `ProjectCard`/`ExplorerGridLayout` rather than a second card
 * implementation; a card's `onActivate` opens the full Project Profile
 * (this page has no Quick View drawer/search/filter state of its own to
 * reuse for a lighter preview). Live: the grid updates the instant a
 * project is un-starred from anywhere in the app, including this page's
 * own cards.
 *
 * PR15.1 — extends (never redesigns) each card with one additional row:
 * `AlertToggle`, the on/off switch for that project's alerts. `ProjectCard`
 * itself is untouched (it's shared with Explorer, which has no concept of
 * alert preferences) — the toggle lives in this page's own wrapper `<div>`
 * around each card instead.
 */
export function WatchlistPageClient({ projects }: WatchlistPageClientProps) {
  const router = useRouter();
  const watched = useWatchedProjects(projects);

  if (watched.length === 0) {
    return (
      <EmptyState
        icon={Eye}
        title="No watched projects yet."
        description="Star a project from Explorer or its profile page to track it here."
        className="py-16"
        action={
          <Link
            href="/dashboard/projects"
            className="rounded-lg bg-radar-primary px-4 py-2 text-sm font-medium text-white outline-none transition-colors hover:bg-radar-primary/90 focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:bg-radar-accent dark:text-radar-bg dark:hover:bg-radar-accent/90"
          >
            Explore Projects
          </Link>
        }
      />
    );
  }

  return (
    <ExplorerGridLayout>
      {watched.map((project) => (
        <div key={project.identity.id} className="flex flex-col gap-2">
          <ProjectCard
            project={project}
            onActivate={() => router.push(`/dashboard/projects/${project.identity.slug}`)}
          />
          <AlertToggle projectId={project.identity.id} projectName={project.identity.name} />
        </div>
      ))}
    </ExplorerGridLayout>
  );
}
