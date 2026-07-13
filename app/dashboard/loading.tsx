import { RouteLoading } from "@/components/dashboard/RouteLoading";

/**
 * PR9.5.2 — `app/dashboard/page.tsx` is `async` again and awaits its
 * critical data at the top level (no inner Suspense split), so this
 * fallback now genuinely fires for the duration of that fetch, exactly
 * like `app/dashboard/projects/loading.tsx`. Both render the same
 * `RouteLoading` component — one shared implementation, not a duplicate.
 */
export default function DashboardLoading() {
  return <RouteLoading />;
}
