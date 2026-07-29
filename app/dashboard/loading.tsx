import { BrandLoader } from "@/components/shared/BrandLoader";

/**
 * PR-065 — `app/dashboard/page.tsx` awaits its critical data at the top
 * level (no inner Suspense split), so this fallback genuinely fires for the
 * duration of that fetch. Replaces the previous generic `RouteLoading`
 * spinner with the branded page loader shared by every dashboard route.
 */
export default function DashboardLoading() {
  return <BrandLoader fullscreen size="lg" label="Loading ecosystem intelligence…" />;
}
