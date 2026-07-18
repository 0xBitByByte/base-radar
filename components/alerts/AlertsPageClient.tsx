"use client";

import { useMemo, useState } from "react";

import { AlertFeed } from "@/components/alerts/AlertFeed";
import { AlertFilters } from "@/components/alerts/AlertFilters";
import { AlertHeader } from "@/components/alerts/AlertHeader";
import { EmptyAlerts } from "@/components/alerts/EmptyAlerts";
import { filterAlerts, sortAlerts } from "@/lib/alerts/service";
import { useVisibleAlerts } from "@/lib/hooks/useVisibleAlerts";
import { useWatchedProjectsWithAlerts } from "@/lib/hooks/useWatchedProjectsWithAlerts";
import { useWatchlist } from "@/lib/hooks/useWatchlist";
import type { AlertCategory, AlertSeverity, AlertSortOrder, AlertStatusFilter } from "@/lib/alerts/types";

const DEFAULT_STATUS: AlertStatusFilter = "all";
const DEFAULT_SEVERITY: AlertSeverity | "all" = "all";
const DEFAULT_CATEGORY: AlertCategory | "all" = "all";
const DEFAULT_PROJECT_ID = "all";
const DEFAULT_SORT: AlertSortOrder = "newest";

/**
 * The Alerts screen's client shell — everything here is derived from
 * `useVisibleAlerts()`'s already-in-memory, Watchlist-filtered feed
 * (`lib/alerts/service.ts`, backed by local mock data + a `localStorage`
 * overlay). No fetch, no provider call, no Suspense boundary: the whole
 * page renders synchronously.
 *
 * PR15.1 — three distinct empty states, not one: no watched projects at
 * all (`useWatchlist().count === 0`), watched projects but zero visible
 * alerts for them (`alerts.length === 0`), and watched projects with
 * alerts but the active filters matching none of them (unchanged from
 * PR15.0). The project filter's options come from
 * `useWatchedProjectsWithAlerts()` — only ever watched projects, per the
 * spec's "Project filter should only list watched projects" — not from
 * whatever projects happen to appear in the current alert list.
 */
export function AlertsPageClient() {
  const { alerts, markRead, markAllRead, togglePin } = useVisibleAlerts();
  const { count: watchlistCount } = useWatchlist();
  const watchedProjects = useWatchedProjectsWithAlerts();

  const [status, setStatus] = useState<AlertStatusFilter>(DEFAULT_STATUS);
  const [severity, setSeverity] = useState<AlertSeverity | "all">(DEFAULT_SEVERITY);
  const [category, setCategory] = useState<AlertCategory | "all">(DEFAULT_CATEGORY);
  const [projectId, setProjectId] = useState<string>(DEFAULT_PROJECT_ID);
  const [sort, setSort] = useState<AlertSortOrder>(DEFAULT_SORT);

  const unreadCount = useMemo(() => alerts.filter((alert) => !alert.read).length, [alerts]);
  const pinnedCount = useMemo(() => alerts.filter((alert) => alert.pinned).length, [alerts]);

  const projectOptions = useMemo(
    () =>
      watchedProjects
        .map((project) => ({ id: project.projectId, name: project.projectName }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [watchedProjects]
  );

  const displayedAlerts = useMemo(() => {
    const filtered = filterAlerts(alerts, { status, severity, category, projectId });
    return sortAlerts(filtered, sort);
  }, [alerts, status, severity, category, projectId, sort]);

  const filtersActive = status !== "all" || severity !== "all" || category !== "all" || projectId !== "all";

  function clearFilters() {
    setStatus(DEFAULT_STATUS);
    setSeverity(DEFAULT_SEVERITY);
    setCategory(DEFAULT_CATEGORY);
    setProjectId(DEFAULT_PROJECT_ID);
  }

  return (
    <div className="flex flex-col gap-5">
      <AlertHeader unreadCount={unreadCount} onMarkAllRead={markAllRead} />

      {watchlistCount > 0 && alerts.length > 0 && (
        <AlertFilters
          status={status}
          onStatusChange={setStatus}
          severity={severity}
          onSeverityChange={setSeverity}
          category={category}
          onCategoryChange={setCategory}
          projectId={projectId}
          onProjectIdChange={setProjectId}
          projectOptions={projectOptions}
          sort={sort}
          onSortChange={setSort}
          counts={{ all: alerts.length, unread: unreadCount, pinned: pinnedCount }}
        />
      )}

      {watchlistCount === 0 ? (
        <EmptyAlerts variant="no-watchlist" />
      ) : alerts.length === 0 ? (
        <EmptyAlerts variant="no-alerts" />
      ) : displayedAlerts.length === 0 ? (
        <EmptyAlerts variant="filtered" onClearFilters={filtersActive ? clearFilters : undefined} />
      ) : (
        <AlertFeed alerts={displayedAlerts} onOpen={markRead} onTogglePin={togglePin} />
      )}
    </div>
  );
}
