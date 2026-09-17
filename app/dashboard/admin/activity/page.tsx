import type { Metadata } from "next";

import { AdminActivityPage } from "@/components/admin/AdminActivityPage";

export const metadata: Metadata = {
  title: "Activity Log — Admin",
  description: "Real administrative activity history for authorized administrators.",
};

/**
 * PR-095.05 — `/dashboard/admin/activity`. Same shape as
 * `/dashboard/admin` and `/dashboard/admin/registry`: a plain client
 * component, no server-side page gate — the real authorization boundary
 * is `/api/admin/activity` (`resolveAdminAccess`), which never returns
 * real activity data to an unauthorized request.
 */
export default function AdminActivityRoute() {
  return <AdminActivityPage />;
}
