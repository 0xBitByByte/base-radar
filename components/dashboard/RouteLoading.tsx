import { BrandSpinner } from "@/components/ui/BrandSpinner";

/**
 * The one loading UI for every `/dashboard/*` route segment (PR9.5.2) —
 * `app/dashboard/loading.tsx` and `app/dashboard/projects/loading.tsx` both
 * render this, so there is exactly one implementation, one animation, and
 * one timing across the Dashboard, not two independently-maintained copies
 * that could drift apart.
 */
export function RouteLoading() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <BrandSpinner tier="lg" />
    </div>
  );
}
