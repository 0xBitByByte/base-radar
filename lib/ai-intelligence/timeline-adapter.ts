import { getProject } from "@/data/projects/helpers";
import type { AIIntelligenceBrief } from "@/lib/ai-intelligence/types";

/**
 * A shape deliberately field-compatible with `lib/timeline/types.ts`'s
 * `TimelineEvent` (id/timestamp/projectId/projectName/title/summary/
 * source/link/metadata all match that type's own names and meaning) —
 * without importing from `lib/timeline/` or registering a new
 * `TimelineEventType`. This PR's brief is explicit: "Do not implement the
 * timeline UI. Simply ensure the model is timeline-friendly." Wiring this
 * adapter's output into the real `Timeline` (adding an `"ai-intelligence-
 * brief"` entry to `TIMELINE_EVENT_TYPES`, merging it into
 * `buildTimeline()`) is future work for whoever actually integrates the
 * two.
 *
 * `severity`, `score`, and `category` are intentionally absent from this
 * shape rather than force-mapped from `impact`/`confidence`/
 * `IntelligenceCategory` onto `TimelineEvent`'s `AlertSeverity`/`number`/
 * `AlertCategory` fields — those are different vocabularies (the exact
 * conflation `docs/PRODUCT_BIBLE/05_INTELLIGENCE_FRAMEWORK.md`'s "Every
 * Domain Has a Single Scoring Vocabulary" principle warns against). They
 * travel in `metadata` instead, honestly labeled as their own kind, not
 * coerced into a field that means something else.
 */
export type TimelineFriendlyEntry = {
  id: string;
  timestamp: string;
  projectId: string | null;
  projectName: string | null;
  title: string;
  summary: string;
  source: string;
  link: string | null;
  metadata: Record<string, unknown>;
};

/**
 * `projectId`/`projectName` are only populated when a brief concerns
 * exactly one project — matching `TimelineEvent`'s own documented
 * convention that `null` is the honest representation for an
 * aggregate-level event, never a fabricated pick among several real
 * candidates.
 */
export function toTimelineFriendlyEntry(brief: AIIntelligenceBrief): TimelineFriendlyEntry {
  const singleProjectId = brief.affectedProjects.length === 1 ? brief.affectedProjects[0] : null;
  const project = singleProjectId ? getProject(singleProjectId) : undefined;

  return {
    id: `ai-intelligence-brief:${brief.id}`,
    timestamp: brief.generatedAt,
    projectId: singleProjectId,
    projectName: project?.name ?? null,
    title: brief.headline,
    summary: brief.summary,
    source: "AI Intelligence Engine",
    link: project ? `/dashboard/projects/${project.slug}` : null,
    metadata: {
      category: brief.category,
      impact: brief.impact,
      confidenceLevel: brief.confidence.level,
      evidenceCount: brief.confidence.evidenceCount,
      tags: brief.tags,
      affectedProjects: brief.affectedProjects,
      supportingSourceCount: brief.supportingSources.length,
    },
  };
}
