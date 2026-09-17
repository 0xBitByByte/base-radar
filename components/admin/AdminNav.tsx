"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const ADMIN_NAV_ITEMS = [
  { href: "/dashboard/admin", label: "Overview" },
  { href: "/dashboard/admin/registry", label: "Project Registry" },
  { href: "/dashboard/admin/activity", label: "Activity Log" },
  { href: "/dashboard/admin/roles", label: "Roles & Permissions" },
  { href: "/dashboard/observability/analytics", label: "Analytics" },
  { href: "/dashboard/observability/performance", label: "Performance" },
];

/**
 * PR-095.02/PR-095.05/PR-095.06 — real, working navigation between the
 * Admin surfaces that now exist. Every destination is a real,
 * already-protected page (its own `resolveAdminAccess`/
 * `resolveAdminPermission` check is what actually gates it); this is
 * plain routing, not a cosmetic control.
 *
 * PR-097.03 (Observability) — the last two entries register the real
 * Analytics/Performance Dashboards (`/dashboard/observability/*`) into
 * this same real navigation, closing the one gap that closeout found:
 * both pages already existed, fully built and admin-protected via their
 * own `resolveAdminAccess` check, but had no in-app link anywhere.
 */
export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Admin sections" className="flex gap-1 border-b border-radar-light-border dark:border-white/10">
      {ADMIN_NAV_ITEMS.map((item) => {
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "border-b-2 px-3 py-2 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-radar-primary/50",
              isActive
                ? "border-radar-primary text-radar-primary"
                : "border-transparent text-radar-light-muted hover:text-radar-light-text dark:text-radar-muted dark:hover:text-radar-white"
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
