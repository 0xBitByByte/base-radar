"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Eye } from "lucide-react";

import { AlertFeed } from "@/components/alerts/AlertFeed";
import { AlertFilters } from "@/components/alerts/AlertFilters";
import { AlertHeader } from "@/components/alerts/AlertHeader";
import { EmptyAlerts } from "@/components/alerts/EmptyAlerts";
import { ExecutiveSummary } from "@/components/alerts/ExecutiveSummary";
import { IntelligenceBadge } from "@/components/alerts/IntelligenceBadge";
import { IntelligenceFilters } from "@/components/alerts/IntelligenceFilters";
import { IntelligenceList } from "@/components/alerts/IntelligenceList";
import {
  filterAlerts,
  filterIntelligenceAlerts,
  sortAlerts,
  sortIntelligenceAlerts,
  type IntelligenceSortOrder,
} from "@/lib/alerts/service";
import { useIntelligenceAlerts } from "@/lib/hooks/useIntelligenceAlerts";
import type { ProjectLogoEntry } from "@/lib/branding/resolveProjectLogos";
import { useVisibleAlerts } from "@/lib/hooks/useVisibleAlerts";
import { useWatchedProjectsWithAlerts } from "@/lib/hooks/useWatchedProjectsWithAlerts";
import { useWatchlist } from "@/lib/hooks/useWatchlist";
import type { NarrativeType } from "@/lib/alerts/intelligence/types";
import type { AlertCategory, AlertSeverity, AlertSortOrder, AlertStatusFilter } from "@/lib/alerts/types";

const DEFAULT_STATUS: AlertStatusFilter = "all";
const DEFAULT_SEVERITY: AlertSeverity | "all" = "all";
const DEFAULT_CATEGORY: AlertCategory | "all" = "all";
const DEFAULT_PROJECT_ID = "all";
const DEFAULT_SORT: AlertSortOrder = "newest";

const DEFAULT_INTELLIGENCE_SEARCH = "";
const DEFAULT_INTELLIGENCE_SEVERITY_TIER: AlertSeverity | "all" = "all";
const DEFAULT_INTELLIGENCE_NARRATIVE: NarrativeType | "all" = "all";
const DEFAULT_INTELLIGENCE_PROJECT_ID = "all";
const DEFAULT_INTELLIGENCE_SORT: IntelligenceSortOrder = "score";

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
export function AlertsPageClient({ logoMap }: { logoMap: Record<string, ProjectLogoEntry> }) {
  const { alerts, markRead, markAllRead, togglePin } = useVisibleAlerts();
  const { count: watchlistCount } = useWatchlist();
  const watchedProjects = useWatchedProjectsWithAlerts();
  const intelligenceAlerts = useIntelligenceAlerts();

  const [status, setStatus] = useState<AlertStatusFilter>(DEFAULT_STATUS);
  const [severity, setSeverity] = useState<AlertSeverity | "all">(DEFAULT_SEVERITY);
  const [category, setCategory] = useState<AlertCategory | "all">(DEFAULT_CATEGORY);
  const [projectId, setProjectId] = useState<string>(DEFAULT_PROJECT_ID);
  const [sort, setSort] = useState<AlertSortOrder>(DEFAULT_SORT);

  const [intelligenceSearch, setIntelligenceSearch] = useState(DEFAULT_INTELLIGENCE_SEARCH);
  const [intelligenceSeverityTier, setIntelligenceSeverityTier] = useState<AlertSeverity | "all">(
    DEFAULT_INTELLIGENCE_SEVERITY_TIER
  );
  const [intelligenceNarrative, setIntelligenceNarrative] = useState<NarrativeType | "all">(
    DEFAULT_INTELLIGENCE_NARRATIVE
  );
  const [intelligenceProjectId, setIntelligenceProjectId] = useState(DEFAULT_INTELLIGENCE_PROJECT_ID);
  const [intelligenceSort, setIntelligenceSort] = useState<IntelligenceSortOrder>(DEFAULT_INTELLIGENCE_SORT);

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

  // The Intelligence project filter only ever lists projects that CURRENTLY
  // have an Intelligence Alert — not every watched project (`projectOptions`
  // above serves the raw-alerts filter and intentionally differs) — so a
  // project with no scoreable signals never appears as a selectable, always
  // empty option.
  const intelligenceProjectOptions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const alert of intelligenceAlerts) seen.set(alert.projectId, alert.projectName);
    return Array.from(seen, ([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [intelligenceAlerts]);

  const displayedIntelligenceAlerts = useMemo(() => {
    const filtered = filterIntelligenceAlerts(intelligenceAlerts, {
      severityTier: intelligenceSeverityTier,
      narrative: intelligenceNarrative,
      projectId: intelligenceProjectId,
      search: intelligenceSearch,
    });
    return sortIntelligenceAlerts(filtered, intelligenceSort);
  }, [intelligenceAlerts, intelligenceSeverityTier, intelligenceNarrative, intelligenceProjectId, intelligenceSearch, intelligenceSort]);

  const intelligenceSearchActive = intelligenceSearch.trim() !== "";

  const intelligenceEmptyMessage =
    intelligenceAlerts.length > 0 && displayedIntelligenceAlerts.length === 0
      ? intelligenceSearchActive
        ? "No intelligence matches your search."
        : "No intelligence matches the selected filters."
      : undefined;

  return (
    // PR-086.05 — gap-5 -> gap-6, matching the shared page-header rhythm
    // every other flat top-level page (Watchlists/Automation/Notifications/
    // Settings) already uses between its header and first section.
    <div className="flex flex-col gap-6">
      <AlertHeader unreadCount={unreadCount} onMarkAllRead={markAllRead} />

      {watchlistCount > 0 && (
        <section aria-labelledby="intelligence-heading" className="flex flex-col gap-3">
          <div className="flex items-center gap-1.5">
            <IntelligenceBadge variant="icon" />
            <h2
              id="intelligence-heading"
              className="text-sm font-semibold text-radar-light-text dark:text-radar-white"
            >
              AI Intelligence
            </h2>
          </div>
          <ExecutiveSummary />
          {/* PR-090.06 — Alerts Integration. Zero changes to the Alert
              Engine or this page's own alert data/filtering — a single,
              honest cross-navigation link into AI Watch, which is a
              separate, Watchlist-scoped feature (not a replacement for
              these alerts). Exact required wording preserved verbatim. */}
          <Link
            href="/dashboard/ai-workspace"
            className="group flex w-fit items-center gap-1.5 text-xs font-medium text-radar-light-muted outline-none transition-colors hover:text-radar-primary focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:text-radar-muted dark:hover:text-radar-accent"
          >
            <Eye className="size-3.5 shrink-0" aria-hidden="true" />
            Want proactive risk notifications for your Watchlist? AI Watch checks your saved watch when you open AI Workspace — it doesn&apos;t run in the background.
            <ArrowRight className="size-3 shrink-0 opacity-0 transition-opacity group-hover:opacity-100" aria-hidden="true" />
          </Link>
          {intelligenceAlerts.length > 0 && (
            <IntelligenceFilters
              search={intelligenceSearch}
              onSearchChange={setIntelligenceSearch}
              severityTier={intelligenceSeverityTier}
              onSeverityTierChange={setIntelligenceSeverityTier}
              narrative={intelligenceNarrative}
              onNarrativeChange={setIntelligenceNarrative}
              projectId={intelligenceProjectId}
              onProjectIdChange={setIntelligenceProjectId}
              projectOptions={intelligenceProjectOptions}
              sort={intelligenceSort}
              onSortChange={setIntelligenceSort}
            />
          )}
          <IntelligenceList
            alerts={displayedIntelligenceAlerts}
            emptyMessage={intelligenceEmptyMessage}
            preserveOrder
            logoMap={logoMap}
          />
        </section>
      )}

      {watchlistCount === 0 ? (
        <EmptyAlerts variant="no-watchlist" />
      ) : (
        // PR-086.06 — mirrors the "AI Intelligence" section's own
        // `aria-labelledby` heading above: without this, the page went
        // from one clearly-labeled section straight into an unlabeled
        // filter bar + card list, so scrolling past the Intelligence
        // section gave no visual cue that a distinct "raw alerts" section
        // had begun. Shown under the same condition the Intelligence
        // section itself uses (`watchlistCount > 0`), not gated on
        // `alerts.length` — same as `IntelligenceList` still rendering its
        // own empty message rather than disappearing, this section keeps
        // its heading through the "no alerts yet" and "filtered to zero"
        // states too, not just when there's a feed to show.
        <section aria-labelledby="all-alerts-heading" className="flex flex-col gap-3">
          <h2 id="all-alerts-heading" className="text-sm font-semibold text-radar-light-text dark:text-radar-white">
            All Alerts
          </h2>

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
            <EmptyAlerts variant="no-alerts" />
          ) : displayedAlerts.length === 0 ? (
            <EmptyAlerts variant="filtered" onClearFilters={filtersActive ? clearFilters : undefined} />
          ) : (
            <AlertFeed alerts={displayedAlerts} onOpen={markRead} onTogglePin={togglePin} logoMap={logoMap} />
          )}
        </section>
      )}
    </div>
  );
}
