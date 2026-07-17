"use client";

import { useMemo, useState } from "react";

import { AlertFeed } from "@/components/alerts/AlertFeed";
import { AlertFilters } from "@/components/alerts/AlertFilters";
import { AlertHeader } from "@/components/alerts/AlertHeader";
import { EmptyAlerts } from "@/components/alerts/EmptyAlerts";
import { filterAlerts, sortAlerts } from "@/lib/alerts/service";
import { useAlerts } from "@/lib/hooks/useAlerts";
import type { AlertCategory, AlertSeverity, AlertSortOrder, AlertStatusFilter } from "@/lib/alerts/types";

const DEFAULT_STATUS: AlertStatusFilter = "all";
const DEFAULT_SEVERITY: AlertSeverity | "all" = "all";
const DEFAULT_CATEGORY: AlertCategory | "all" = "all";
const DEFAULT_PROJECT_ID = "all";
const DEFAULT_SORT: AlertSortOrder = "newest";

/**
 * The Alerts screen's client shell — everything here is derived from
 * `useAlerts()`'s already-in-memory feed (`lib/alerts/service.ts`, backed
 * by local mock data + a `localStorage` overlay). No fetch, no provider
 * call, no Suspense boundary: the whole page renders synchronously.
 * `filterAlerts`/`sortAlerts` are pure functions from the service layer,
 * memoized here so neither recomputes unless the alert list or an actual
 * filter/sort control changed.
 */
export function AlertsPageClient() {
  const { alerts, markRead, markAllRead, togglePin } = useAlerts();

  const [status, setStatus] = useState<AlertStatusFilter>(DEFAULT_STATUS);
  const [severity, setSeverity] = useState<AlertSeverity | "all">(DEFAULT_SEVERITY);
  const [category, setCategory] = useState<AlertCategory | "all">(DEFAULT_CATEGORY);
  const [projectId, setProjectId] = useState<string>(DEFAULT_PROJECT_ID);
  const [sort, setSort] = useState<AlertSortOrder>(DEFAULT_SORT);

  const unreadCount = useMemo(() => alerts.filter((alert) => !alert.read).length, [alerts]);
  const pinnedCount = useMemo(() => alerts.filter((alert) => alert.pinned).length, [alerts]);

  const projectOptions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const alert of alerts) {
      if (!seen.has(alert.projectId)) seen.set(alert.projectId, alert.projectName);
    }
    return Array.from(seen, ([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [alerts]);

  const visibleAlerts = useMemo(() => {
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

      {alerts.length > 0 && (
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

      {alerts.length === 0 ? (
        <EmptyAlerts />
      ) : visibleAlerts.length === 0 ? (
        <EmptyAlerts filtered onClearFilters={filtersActive ? clearFilters : undefined} />
      ) : (
        <AlertFeed alerts={visibleAlerts} onOpen={markRead} onTogglePin={togglePin} />
      )}
    </div>
  );
}
