"use client";

/**
 * Aggregates every searchable source — the static command registry, the
 * static Project Registry, and four already-computed engine outputs
 * (Timeline, Notifications, Automation, Portfolio Intelligence, Daily
 * Brief) — into one common `SearchableItem[]`, then scores/groups them
 * against `query`. Every data source is read via its own existing hook
 * (`useTimeline`, `useNotifications`, `useAutomation`,
 * `usePortfolioIntelligence`, `useDailyBrief`) or existing static helper
 * (`getProjects`, `COMMANDS`) — this hook never calls a provider, never
 * recomputes an engine, and contains no routing logic of its own.
 *
 * Aggregation and scoring are memoized separately: the normalized
 * `SearchableItem[]` only rebuilds when the underlying engine data actually
 * changes, and `globalSearch` only re-runs when `query` or that aggregated
 * list changes — typing never re-normalizes anything.
 *
 * PR22 Part 2: also reads the active Personal Watchlist (`useWatchlists()`)
 * and passes its `projectIds` through to `globalSearch` as
 * `prioritizedProjectIds` — a pure ranking hint, never a second filter
 * pass, so no result is ever hidden by having (or lacking) an active
 * watchlist.
 *
 * PR22 Part 3: that prioritization is itself gated by the
 * `enableSearchPrioritization` preference — when off,
 * `prioritizedProjectIds` is `undefined` regardless of the active
 * watchlist, so `globalSearch()` behaves byte-for-byte like PR21 (scoring
 * itself is never touched by this hook either way).
 */

import { useMemo } from "react";

import { getProjects } from "@/data/projects/helpers";
import { COMMANDS } from "@/lib/command/commands";
import { useAutomation } from "@/lib/hooks/useAutomation";
import { useDailyBrief } from "@/lib/hooks/useDailyBrief";
import { useNotifications } from "@/lib/hooks/useNotifications";
import { usePersonalizationPreferences } from "@/lib/hooks/usePersonalizationPreferences";
import { usePortfolioIntelligence } from "@/lib/hooks/usePortfolioIntelligence";
import { useTimeline } from "@/lib/hooks/useTimeline";
import { useWatchlists } from "@/lib/hooks/useWatchlists";
import {
  globalSearch,
  normalizeAutomationResult,
  normalizeCommand,
  normalizeDailyBrief,
  normalizeNotification,
  normalizePortfolio,
  normalizeProject,
  normalizeTimelineEvent,
} from "@/lib/search/globalSearch";
import type { SearchableItem } from "@/lib/search/types";

export function useGlobalSearch(query: string): SearchableItem[] {
  const timeline = useTimeline();
  const { notifications } = useNotifications();
  const { results: automationResults } = useAutomation();
  const portfolio = usePortfolioIntelligence();
  const dailyBrief = useDailyBrief();
  const { activeWatchlist } = useWatchlists();
  const { preferences } = usePersonalizationPreferences();

  const items = useMemo<SearchableItem[]>(() => {
    return [
      ...COMMANDS.map(normalizeCommand),
      ...getProjects().map(normalizeProject),
      ...(timeline?.events ?? []).map(normalizeTimelineEvent),
      ...notifications.map(normalizeNotification),
      ...automationResults.map(normalizeAutomationResult),
      ...(portfolio ? [normalizePortfolio(portfolio)] : []),
      ...(dailyBrief ? [normalizeDailyBrief(dailyBrief)] : []),
    ];
  }, [timeline, notifications, automationResults, portfolio, dailyBrief]);

  const prioritizedProjectIds = useMemo(
    () => (preferences.enableSearchPrioritization && activeWatchlist ? new Set(activeWatchlist.projectIds) : undefined),
    [preferences.enableSearchPrioritization, activeWatchlist]
  );

  return useMemo(() => globalSearch(query, items, prioritizedProjectIds), [query, items, prioritizedProjectIds]);
}
