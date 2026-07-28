/**
 * PR-057 — Task 6: the one reusable rail wrapper behind every curated
 * section (Curated Discovery / Leaderboards / Attention). Renders whatever
 * `LiveProject[]` it's given, capped at `maxCards` — the section itself
 * decides which collection/filter+sort feeds it (`app/dashboard/projects/page.tsx`),
 * this component only lays it out.
 *
 * PR-058 — Task 7: "View All" is a plain `<Link>` to `#directory` with the
 * corresponding `?view=` param already merged in by the caller
 * (`viewAllHref`, built via `buildProjectsQuery()` in `page.tsx` — no query
 * building happens in this component). Pure navigation, no client state.
 *
 * PR-059 — Task 3: every card in a rail renders `LiveProjectCard`'s
 * `"compact"` variant — the Full Directory is the only `"detailed"`
 * consumer. Card width narrows to match the denser compact layout.
 */

import Link from "next/link";
import type { LucideIcon } from "lucide-react";

import { LiveProjectCard } from "@/components/projects/LiveProjectCard";
import { RailEmptyState } from "@/components/projects/RailEmptyState";
import { cn } from "@/lib/utils";
import type { LiveProject } from "@/lib/projects/types";

export type RailAccent = "primary" | "success" | "purple" | "orange" | "danger" | "accent";

const ACCENT_ICON_CLASS: Record<RailAccent, string> = {
  primary: "bg-radar-primary/10 text-radar-primary",
  success: "bg-radar-success/10 text-radar-success",
  purple: "bg-radar-purple/10 text-radar-purple",
  orange: "bg-radar-orange/10 text-radar-orange",
  danger: "bg-radar-danger/10 text-radar-danger",
  accent: "bg-radar-accent/10 text-radar-accent",
};

type ProjectRailProps = {
  title: string;
  description?: string;
  icon: LucideIcon;
  accent: RailAccent;
  projects: LiveProject[];
  maxCards: number;
  emptyTitle: string;
  emptyDescription: string;
  /** Pre-built href (`buildProjectsQuery()` + `#directory`) — omitted only when the rail has nothing to view all of (an empty rail's own empty state already explains why). */
  viewAllHref?: string;
};

export function ProjectRail({
  title,
  description,
  icon: Icon,
  accent,
  projects,
  maxCards,
  emptyTitle,
  emptyDescription,
  viewAllHref,
}: ProjectRailProps) {
  const visible = projects.slice(0, maxCards);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-xl", ACCENT_ICON_CLASS[accent])}>
          <Icon className="size-4" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base font-semibold text-radar-light-text dark:text-radar-white">{title}</h3>
          {description && <p className="truncate text-xs text-radar-light-muted dark:text-radar-muted">{description}</p>}
        </div>
        {viewAllHref && visible.length > 0 && (
          <Link
            href={viewAllHref}
            className="shrink-0 text-xs font-medium text-radar-primary outline-none transition-colors hover:underline focus-visible:ring-2 focus-visible:ring-radar-primary/50"
          >
            View All
          </Link>
        )}
      </div>

      {visible.length === 0 ? (
        <RailEmptyState icon={Icon} title={emptyTitle} description={emptyDescription} />
      ) : (
        <div className="flex snap-x gap-3 overflow-x-auto pb-1">
          {visible.map((project) => (
            <div key={project.id} className="w-[236px] shrink-0 snap-start">
              <LiveProjectCard project={project} variant="compact" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
