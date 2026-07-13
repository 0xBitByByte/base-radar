import { RouteLoading } from "@/components/dashboard/RouteLoading";

/**
 * Explorer's page still awaits `getAllProjectIntelligence()` fully before
 * rendering, so this fallback remains a real, meaningfully-used loading
 * state. Renders the same shared `RouteLoading` component
 * `app/dashboard/loading.tsx` uses (PR9.5.2) — one implementation, not two
 * independently-maintained copies.
 */
export default function ExplorerLoading() {
  return <RouteLoading />;
}
