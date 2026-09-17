import type { Metadata } from "next";

import { PerformanceDashboardPage } from "@/components/observability/PerformanceDashboardPage";

export const metadata: Metadata = {
  title: "Performance Dashboard",
  description: "Real Core Web Vitals for authorized administrators.",
};

/**
 * PR-097.03 (Observability — Performance Dashboards) —
 * `/dashboard/observability/performance`. Same shape the PR-095 admin
 * pages already established: a plain client component, no server-side
 * page gate — the real authorization boundary is
 * `/api/observability/performance` (`resolveAdminAccess`), which never
 * returns real metric data to an unauthorized request.
 */
export default function PerformanceDashboardRoute() {
  return <PerformanceDashboardPage />;
}
