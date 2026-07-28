import { ProjectsPageSkeleton } from "@/components/projects/ProjectsPageSkeleton";

/**
 * PR-057 — the Projects page still awaits `getLiveProjects()` fully before
 * rendering, so this fallback is real and meaningfully shown. Shaped like
 * the new page layout (header, search, KPI pulse, category rail, rails,
 * directory grid) rather than the previous generic `RouteLoading` spinner,
 * per Task 8's "skeleton loading" requirement.
 */
export default function ProjectsLoading() {
  return <ProjectsPageSkeleton />;
}
