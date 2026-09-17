"use client";

import { Activity, AlertTriangle, Bookmark, FolderKanban, Link2, Lock, ShieldAlert, ShieldCheck, Users } from "lucide-react";

import { AdminMetric } from "@/components/admin/AdminMetric";
import { AdminNav } from "@/components/admin/AdminNav";
import { PAGE_HEADER_GROUP_CLASS, PAGE_HEADER_SUBTITLE_CLASS, PAGE_HEADER_TITLE_CLASS } from "@/components/dashboard/pageHeaderStyles";
import { WidgetSkeleton } from "@/components/dashboard/WidgetSkeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { useAdminOverview } from "@/lib/hooks/useAdminOverview";

/**
 * PR-095.01 — `/dashboard/admin`. Real authorization is enforced entirely
 * server-side by `/api/admin/overview` (`resolveAdminAccess`) — this
 * component never decides who can see admin data, it only renders
 * whatever the server actually returned. A Guest or a signed-in non-admin
 * genuinely never receives a metric value in the network response, so
 * there is nothing to hide here even for a moment; the distinct
 * `"unauthenticated"`/`"forbidden"` states below exist purely to give an
 * honest, specific explanation, not to gate anything themselves.
 *
 * Deliberately just two sections, matching PR-095.01's own scope: an
 * Administration Overview (who/what is using the platform right now) and
 * Platform Operational Metrics (the platform's own real, current scale).
 * Project Registry management, Content Management, Activity Logs, and
 * Roles & Permissions are later PR-095 sub-items — this page never
 * pretends any of them already exist.
 */
export function AdminOverviewPage() {
  const { state, retry } = useAdminOverview();

  return (
    <div className="flex flex-col gap-6">
      <div className={PAGE_HEADER_GROUP_CLASS}>
        <h1 className={PAGE_HEADER_TITLE_CLASS}>Admin Dashboard</h1>
        <p className={PAGE_HEADER_SUBTITLE_CLASS}>
          Internal platform overview and operational metrics. Visible only to authorized administrators.
        </p>
      </div>

      <AdminNav />

      {state.status === "loading" && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4" role="status" aria-live="polite" aria-label="Loading admin overview">
          {Array.from({ length: 8 }).map((_, index) => (
            <WidgetSkeleton key={index} className="h-[92px]" />
          ))}
        </div>
      )}

      {state.status === "unauthenticated" && (
        <EmptyState
          icon={Lock}
          title="Sign in required"
          description="The Admin Dashboard is only visible to a signed-in, authorized account. Sign in from the account menu, then reload this page."
        />
      )}

      {state.status === "forbidden" && (
        <EmptyState
          icon={ShieldAlert}
          title="Access restricted"
          description="Your account is signed in but isn't authorized to view the Admin Dashboard."
        />
      )}

      {state.status === "error" && (
        <EmptyState
          icon={AlertTriangle}
          title="Couldn't load the Admin Dashboard"
          description="Something went wrong while loading platform metrics. Please try again."
          action={
            <button
              type="button"
              onClick={retry}
              className="rounded-lg border border-radar-light-border px-3 py-1.5 text-xs font-medium text-radar-light-text outline-none transition-colors hover:bg-radar-light-surface focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:border-white/10 dark:text-radar-white dark:hover:bg-white/5"
            >
              Try again
            </button>
          }
        />
      )}

      {state.status === "ready" && (
        <>
          <section aria-labelledby="admin-overview-heading" className="flex flex-col gap-3">
            <h2 id="admin-overview-heading" className="text-sm font-semibold text-radar-light-text dark:text-radar-white">
              Administration Overview
            </h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              <AdminMetric icon={Users} label="Total Accounts" value={state.metrics.totalAccounts} description="Every account that has ever signed in" />
              <AdminMetric
                icon={ShieldCheck}
                label="Active (24h)"
                value={state.metrics.accountsActiveLast24h}
                description="Accounts active in the last 24 hours"
              />
              <AdminMetric icon={Lock} label="Active Sessions" value={state.metrics.activeSessions} description="Real, currently-valid sessions" />
              <AdminMetric
                icon={Link2}
                label="Linked Wallets"
                value={state.metrics.additionalLinkedWallets}
                description="Additional wallets linked beyond an account's primary address"
              />
            </div>
          </section>

          <section aria-labelledby="admin-platform-metrics-heading" className="flex flex-col gap-3">
            <h2 id="admin-platform-metrics-heading" className="text-sm font-semibold text-radar-light-text dark:text-radar-white">
              Platform Operational Metrics
            </h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              <AdminMetric icon={FolderKanban} label="Tracked Projects" value={state.metrics.trackedProjects} description="Projects in the Registry" />
              <AdminMetric icon={Bookmark} label="Watchlists" value={state.metrics.totalWatchlists} description="Real Watchlists across every account" />
              <AdminMetric
                icon={Bookmark}
                label="Saved Searches"
                value={state.metrics.totalSavedSearches}
                description="Live Saved Searches across every account"
              />
              <AdminMetric
                icon={Activity}
                label="Sync Ops (24h)"
                value={state.metrics.syncOperationsLast24h}
                description="Sync operations applied in the last 24 hours"
              />
            </div>
          </section>
        </>
      )}
    </div>
  );
}
