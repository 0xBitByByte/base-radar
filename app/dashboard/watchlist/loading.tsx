import { RouteLoading } from "@/components/dashboard/RouteLoading";

/**
 * This route still awaits `getAllProjectIntelligence()` fully before
 * rendering (same as Explorer's own `loading.tsx`), so this fallback is a
 * real, meaningfully-used loading state — the same shared `RouteLoading`
 * component every other dashboard route uses, not a second implementation.
 */
export default function WatchlistLoading() {
  return <RouteLoading />;
}
