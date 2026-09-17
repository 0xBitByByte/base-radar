import { BrandLoader } from "@/components/shared/BrandLoader";

/**
 * PR-097.02 (Bundle Optimization — Route Optimization) — this route makes
 * real, awaited governance-provider calls with no `loading.tsx` of its
 * own before this file existed, so the nearest ancestor fallback (the
 * Project Profile page's own `loading.tsx`, or nothing at all once that
 * page itself has resolved) never fired for a direct or client-side
 * navigation into this specific sub-page. Same shared `BrandLoader`
 * convention every other dashboard route's `loading.tsx` already uses.
 */
export default function ProjectGovernanceLoading() {
  return <BrandLoader fullscreen size="lg" label="Loading governance…" />;
}
