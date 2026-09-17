import type { Metadata } from "next";

import { AdminRolesPage } from "@/components/admin/AdminRolesPage";

export const metadata: Metadata = {
  title: "Roles & Permissions — Admin",
  description: "Real role assignments for the Administration Platform, for authorized administrators.",
};

/**
 * PR-095.06 — `/dashboard/admin/roles`. Same shape as every other admin
 * page: a plain client component, no server-side page gate — the real
 * authorization boundary is `/api/admin/roles*`
 * (`resolveAdminPermission`, checked against the real `roles:manage`
 * permission), which never returns real role data to an unauthorized
 * request.
 */
export default function AdminRolesRoute() {
  return <AdminRolesPage />;
}
