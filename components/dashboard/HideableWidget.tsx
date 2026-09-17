"use client";

/**
 * PR-093.04 (Dashboard Customization) — the one real, generic wrapper every
 * hideable Dashboard widget goes through. `app/dashboard/page.tsx` stays a
 * Server Component that fetches and renders every widget's real data
 * exactly as it already did; this island only decides, client-side,
 * whether the already-rendered result is shown. Renders `children`
 * unconditionally until `useDashboardLayoutPreferences()` hydrates (see
 * that hook's own doc comment) — so the server-rendered HTML and the
 * client's first paint always match, and a hidden widget disappears only
 * after hydration, never causing a mismatch.
 */

import { useDashboardLayoutPreferences } from "@/lib/hooks/useDashboardLayoutPreferences";
import type { DashboardWidgetId } from "@/lib/dashboard-layout/types";

export function HideableWidget({ id, children }: { id: DashboardWidgetId; children: React.ReactNode }) {
  const { isHidden } = useDashboardLayoutPreferences();
  if (isHidden(id)) return null;
  return <>{children}</>;
}
