import { Users } from "lucide-react";

import { LiveProjectCard } from "@/components/projects/LiveProjectCard";
import { ProfileSectionCard } from "@/components/explorer/ProfileSectionCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { CATEGORY_BRANDING } from "@/lib/branding/categories";
import { filterLiveProjects } from "@/lib/projects/filter";
import { getLiveProjects } from "@/lib/projects/service";
import { sortLiveProjects } from "@/lib/projects/sort";
import type { ProjectCategory, ProjectTag } from "@/data/projects/enums";
import type { LiveProject } from "@/lib/projects/types";

type ProfileRelatedProjectsProps = {
  currentProjectId: string;
  category: ProjectCategory;
  tags: ProjectTag[];
};

const MAX_RELATED = 6;

/**
 * PR-062 Task 7 — Related Projects. Reuses the exact same
 * `getLiveProjects()`/`filterLiveProjects()`/`sortLiveProjects()` the
 * Projects list page already calls (`lib/projects/`, PR-054) — no second
 * ranking or matching implementation, no embeddings, no AI similarity.
 * Relationship is purely deterministic registry metadata: same category
 * first (confidence-ranked), backfilled with any project sharing at least
 * one tag when the category alone has fewer than `MAX_RELATED` peers.
 * Rendered via the existing `LiveProjectCard`'s `"compact"` variant — the
 * same card the Projects list page's curated rails already use, never a
 * second card component (Task 10).
 */
export async function ProfileRelatedProjects({ currentProjectId, category, tags }: ProfileRelatedProjectsProps) {
  let related: LiveProject[] = [];
  let loadFailed = false;

  try {
    const projects = await getLiveProjects();
    const others = projects.filter((project) => project.id !== currentProjectId);

    const sameCategory = sortLiveProjects(filterLiveProjects(others, { category }), "confidence", "desc");

    if (sameCategory.length < MAX_RELATED && tags.length > 0) {
      const sameCategoryIds = new Set(sameCategory.map((project) => project.id));
      const sameTag = sortLiveProjects(
        others.filter((project) => !sameCategoryIds.has(project.id) && project.subcategories.some((tag) => tags.includes(tag))),
        "confidence",
        "desc"
      );
      related = [...sameCategory, ...sameTag].slice(0, MAX_RELATED);
    } else {
      related = sameCategory.slice(0, MAX_RELATED);
    }
  } catch {
    loadFailed = true;
  }

  const categoryLabel = CATEGORY_BRANDING[category].label;

  return (
    <ProfileSectionCard id="related-projects" title="Related Projects" icon={Users}>
      <p className="text-xs leading-relaxed text-radar-light-muted dark:text-radar-muted">
        Other {categoryLabel} projects tracked on Base, ranked by the same confidence score used throughout this report.
      </p>
      {loadFailed ? (
        <EmptyState
          icon={Users}
          title="Related projects couldn't be loaded"
          description="The Live Projects Service didn't respond just now. This will retry automatically on the next request."
          className="bg-radar-light-surface/60 dark:bg-white/[0.02]"
        />
      ) : related.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No related projects found"
          description={`No other ${categoryLabel} projects — or projects sharing a tag with this one — are currently tracked in the registry.`}
          className="bg-radar-light-surface/60 dark:bg-white/[0.02]"
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {related.map((project) => (
            <LiveProjectCard key={project.id} project={project} variant="compact" />
          ))}
        </div>
      )}
    </ProfileSectionCard>
  );
}
