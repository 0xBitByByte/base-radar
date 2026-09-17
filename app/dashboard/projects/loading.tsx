import { BrandLoader } from "@/components/shared/BrandLoader";

/**
 * PR-065 — every dedicated collection route nested under this one
 * (`/blue-chips`, `/top-tvl`, etc., which have no `loading.tsx` of their
 * own) still awaits `getLiveProjects()` fully before rendering, so this
 * fallback is real and meaningfully shown for those routes.
 *
 * PR-085.02B — the main Projects page (`page.tsx`) no longer awaits its
 * data at the top level; it streams behind three in-page `<Suspense>`
 * boundaries with their own real, layout-matched skeletons instead, so
 * this fullscreen fallback now only fires on this route in the brief
 * instant before the RSC payload itself arrives — copy updated to plain,
 * user-focused wording either way, per the Loading Strategy Standard.
 */
export default function ProjectsLoading() {
  return <BrandLoader fullscreen size="lg" label="Loading projects…" />;
}
