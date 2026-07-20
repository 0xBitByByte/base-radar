"use client";

/**
 * The Personalization Layer's single Dashboard-facing hook (PR22 Part 2).
 * Composes `useWatchlists()` with the six existing engine hooks
 * (`useIntelligenceAlerts`, `useTimeline`, `useNotifications`, `useAutomation`,
 * `usePortfolioIntelligence`, `useDailyBrief`) and applies
 * `lib/personalization/filter.ts`'s pure functions on top — no provider
 * access, no engine recomputation, no duplicated `Project`/event objects.
 *
 * Exposes BOTH the raw engine output (`timeline`, `portfolio`, `dailyBrief` —
 * for headlines/summaries/aggregate metric tiles, which stay un-recomputed
 * per `Timeline.tsx`'s own established precedent) and the personalized,
 * list-shaped data consumers actually render (`timelineEvents`,
 * `notifications`, `automationResults`, plus `portfolio`/`dailyBrief`'s own
 * project-referencing fields already narrowed by `filter.ts`). Notification
 * mutation functions pass straight through so consumers never need a second
 * raw `useNotifications()` call.
 *
 * `isPersonalized` is `true` only when the preference is on AND an active
 * watchlist exists — the one flag every widget/page needs to decide between
 * its generic empty state and its "no results for this watchlist" one.
 * Filtering is O(n) per list (one `Set` build + one `.filter()` each) and
 * every returned array is memoized on its real inputs, never rebuilt
 * unnecessarily.
 */

import { useMemo, useSyncExternalStore } from "react";

import { useAutomation } from "@/lib/hooks/useAutomation";
import { useDailyBrief } from "@/lib/hooks/useDailyBrief";
import { useIntelligenceAlerts } from "@/lib/hooks/useIntelligenceAlerts";
import { useNotifications } from "@/lib/hooks/useNotifications";
import { usePortfolioIntelligence } from "@/lib/hooks/usePortfolioIntelligence";
import { useTimeline } from "@/lib/hooks/useTimeline";
import { useWatchlists } from "@/lib/hooks/useWatchlists";
import {
  filterAutomationResultsByWatchlist,
  filterDailyBriefByWatchlist,
  filterIntelligenceAlertsByWatchlist,
  filterNotificationsByWatchlist,
  filterPortfolioIntelligenceByWatchlist,
  filterTimelineEventsByWatchlist,
} from "@/lib/personalization/filter";
import {
  DEFAULT_PERSONALIZATION_PREFERENCES,
  getPersonalizationPreferences,
  subscribeToPersonalizationPreferences,
} from "@/lib/personalization/preferences";
import type { PersonalWatchlist } from "@/lib/personalization/types";

function getPreferencesServerSnapshot() {
  return DEFAULT_PERSONALIZATION_PREFERENCES;
}

export function usePersonalizedDashboard() {
  const { activeWatchlist } = useWatchlists();
  const preferences = useSyncExternalStore(
    subscribeToPersonalizationPreferences,
    getPersonalizationPreferences,
    getPreferencesServerSnapshot
  );

  const isPersonalized = preferences.filterDashboardByActiveWatchlist && activeWatchlist !== null;
  const watchlistForFiltering: PersonalWatchlist | null = isPersonalized ? activeWatchlist : null;

  const timeline = useTimeline();
  const { notifications: rawNotifications, markRead, markUnread, markAllRead, clearReadState } = useNotifications();
  const { results: rawAutomationResults, enabled: automationEnabled } = useAutomation();
  const rawPortfolio = usePortfolioIntelligence();
  const rawDailyBrief = useDailyBrief();
  const rawIntelligenceAlerts = useIntelligenceAlerts();

  const intelligenceAlerts = useMemo(
    () => filterIntelligenceAlertsByWatchlist(rawIntelligenceAlerts, watchlistForFiltering),
    [rawIntelligenceAlerts, watchlistForFiltering]
  );

  const timelineEvents = useMemo(
    () => filterTimelineEventsByWatchlist(timeline?.events ?? [], watchlistForFiltering),
    [timeline, watchlistForFiltering]
  );

  const notifications = useMemo(
    () => filterNotificationsByWatchlist(rawNotifications, watchlistForFiltering),
    [rawNotifications, watchlistForFiltering]
  );

  const automationResults = useMemo(
    () => filterAutomationResultsByWatchlist(rawAutomationResults, watchlistForFiltering),
    [rawAutomationResults, watchlistForFiltering]
  );

  const portfolio = useMemo(
    () => filterPortfolioIntelligenceByWatchlist(rawPortfolio, watchlistForFiltering),
    [rawPortfolio, watchlistForFiltering]
  );

  const dailyBrief = useMemo(
    () => filterDailyBriefByWatchlist(rawDailyBrief, watchlistForFiltering),
    [rawDailyBrief, watchlistForFiltering]
  );

  return {
    activeWatchlist,
    isPersonalized,
    intelligenceAlerts,
    hasIntelligenceAlerts: rawIntelligenceAlerts.length > 0,
    timeline,
    timelineEvents,
    notifications,
    hasNotifications: rawNotifications.length > 0,
    markRead,
    markUnread,
    markAllRead,
    clearReadState,
    automationResults,
    hasAutomationResults: rawAutomationResults.length > 0,
    automationEnabled,
    portfolio,
    dailyBrief,
  };
}
