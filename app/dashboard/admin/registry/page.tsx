import type { Metadata } from "next";

import { AdminRegistryPage } from "@/components/admin/AdminRegistryPage";

export const metadata: Metadata = {
  title: "Project Registry — Admin",
  description: "Real Project Registry data, validation, and provider coverage for authorized administrators.",
};

/**
 * PR-095.02 — `/dashboard/admin/registry`. Same shape as
 * `/dashboard/admin` (PR-095.01): a plain client component, no server-side
 * page gate — the real authorization boundary is `/api/admin/registry`
 * (`resolveAdminAccess`), which never returns real registry data to an
 * unauthorized request.
 */
export default function AdminRegistryRoute() {
  return <AdminRegistryPage />;
}
