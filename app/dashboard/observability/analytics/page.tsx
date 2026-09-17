import type { Metadata } from "next";

import { AnalyticsDashboardPage } from "@/components/observability/AnalyticsDashboardPage";

export const metadata: Metadata = {
  title: "Analytics",
  description: "Real, anonymous page-view analytics for authorized administrators.",
};

/**
 * PR-097.03 (Observability — Analytics) —
 * `/dashboard/observability/analytics`. Same shape
 * `/dashboard/observability/performance` already established: a plain
 * client component, no server-side page gate — the real authorization
 * boundary is `/api/observability/analytics` (`resolveAdminAccess`),
 * which never returns real data to an unauthorized request.
 */
export default function AnalyticsDashboardRoute() {
  return <AnalyticsDashboardPage />;
}
