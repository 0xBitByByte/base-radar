import { BrandLoader } from "@/components/shared/BrandLoader";

/**
 * PR-065 — the Projects page (and every dedicated collection route nested
 * under it — `/blue-chips`, `/top-tvl`, etc., which have no `loading.tsx`
 * of their own and fall back to this one) still awaits `getLiveProjects()`
 * fully before rendering, so this fallback is real and meaningfully shown.
 * Replaces the previous content-shaped `ProjectsPageSkeleton` with the
 * branded page loader shared by every dashboard route.
 */
export default function ProjectsLoading() {
  return <BrandLoader fullscreen size="lg" label="Resolving trusted providers…" />;
}
