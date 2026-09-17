import { Bot } from "lucide-react";

import { WatchedProjectRow } from "@/components/dashboard/WatchedProjectRow";
import { WidgetCard } from "@/components/dashboard/WidgetCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { categoryAwarePrimaryMetricValue } from "@/lib/projects/primaryMetric";
import type { LiveProject } from "@/lib/projects/types";

type AIProjectsWidgetProps = {
  liveProjects: LiveProject[];
  lastUpdated: string;
};

const MAX_PROJECTS = 6;

/**
 * Universal Project Card, PR-5 — retired the legacy `AIProject[]` model
 * (a raw CoinGecko-market name-heuristic, entirely independent of the
 * Project Registry) in favor of the one canonical `LiveProject` model every
 * other migrated consumer already reads, per this Standard's "one source of
 * truth" principle (§3). Selection is exactly `category === "ai"` — no
 * second, widget-specific classification pipeline — sorted by
 * `categoryAwarePrimaryMetricValue` (the same value function Category Rank,
 * §9, already uses), never a re-derived ranking metric.
 *
 * The legacy "New" launch badge and Activity progress bar are not
 * recreated — both were already effectively dead in production
 * (`isNewLaunch` was hardcoded `false` in the old live data path).
 *
 * Bug fix (visual formatting) — rows render via `WatchedProjectRow`, this
 * dashboard's own two-line row (name+grade, then chain+value+24h trend),
 * shared with `WatchlistWidget` rather than `LiveProjectCard`'s
 * `variant="micro"` — see that component's own doc comment.
 */
export function AIProjectsWidget({ liveProjects, lastUpdated }: AIProjectsWidgetProps) {
  const aiProjects = liveProjects
    .filter((project) => project.category === "ai")
    .sort((a, b) => {
      const av = categoryAwarePrimaryMetricValue(a);
      const bv = categoryAwarePrimaryMetricValue(b);
      if (av === null && bv === null) return 0;
      if (av === null) return 1;
      if (bv === null) return -1;
      return bv - av;
    })
    .slice(0, MAX_PROJECTS);

  return (
    <WidgetCard
      icon={<Bot className="size-5" aria-hidden="true" />}
      title="AI Ecosystem"
      subtitle="AI-category projects tracked on Base"
      accent="purple"
      lastUpdated={lastUpdated}
      className="gap-3 p-4 sm:p-5"
    >
      {aiProjects.length === 0 ? (
        <EmptyState
          icon={Bot}
          title="No AI projects tracked yet"
          description="AI-category projects will appear here once the registry or live discovery classifies one."
        />
      ) : (
        <div className="flex flex-col gap-2">
          {aiProjects.map((project) => (
            <WatchedProjectRow key={project.id} project={project} />
          ))}
        </div>
      )}
    </WidgetCard>
  );
}
