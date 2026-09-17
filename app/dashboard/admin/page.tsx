import type { Metadata } from "next";

import { AdminOverviewPage } from "@/components/admin/AdminOverviewPage";

export const metadata: Metadata = {
  title: "Admin Dashboard",
  description: "Internal platform overview and operational metrics for authorized administrators.",
};

/**
 * PR-095.01 — `/dashboard/admin`. Renders entirely client-side
 * (`AdminOverviewPage`), the same shape `SearchPreferencesRoute` already
 * established for a settings-style page with no server-fetched initial
 * data of its own. The real authorization boundary is NOT here — a
 * Server Component gate would only be cosmetic, since this app has no
 * existing server-side page-auth pattern to extend (every dashboard page
 * is reachable and renders its own honest state client-side; see
 * `useAuthSession`). The real boundary is `/api/admin/overview`
 * (`resolveAdminAccess`): an unauthorized visitor to this URL sees the
 * page shell and an honest "not authorized" state, but never receives a
 * single real metric value over the network.
 */
export default function AdminDashboardRoute() {
  return <AdminOverviewPage />;
}
