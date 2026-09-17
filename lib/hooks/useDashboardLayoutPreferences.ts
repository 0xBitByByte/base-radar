"use client";

/**
 * React binding for `lib/dashboard-layout/preferences.ts` — the same
 * `useSyncExternalStore` pattern every other preference hook in this app
 * uses (`lib/hooks/useNotificationPreferences.ts` is the closest sibling).
 * `getServerSnapshot` returns an empty array — "nothing hidden" — the same
 * value a fresh client render sees before `localStorage` has been read, so
 * hydration never mismatches even when a real stored preference hides a
 * widget: the server (and the client's first paint) render every widget,
 * and hidden ones disappear once the store hydrates from `localStorage`,
 * the same "renders everything, then narrows client-side" shape
 * `RelativeTime`'s hydration-safe placeholder already established.
 */

import { useCallback, useSyncExternalStore } from "react";

import {
  getHiddenWidgetIds,
  setWidgetHidden,
  subscribeToDashboardLayoutPreferences,
} from "@/lib/dashboard-layout/preferences";
import type { DashboardWidgetId } from "@/lib/dashboard-layout/types";

const EMPTY_HIDDEN_WIDGET_IDS: DashboardWidgetId[] = [];

function getServerSnapshot(): DashboardWidgetId[] {
  return EMPTY_HIDDEN_WIDGET_IDS;
}

export function useDashboardLayoutPreferences() {
  const hiddenWidgetIds = useSyncExternalStore(subscribeToDashboardLayoutPreferences, getHiddenWidgetIds, getServerSnapshot);

  const isHidden = useCallback((id: DashboardWidgetId) => hiddenWidgetIds.includes(id), [hiddenWidgetIds]);
  const setHidden = useCallback((id: DashboardWidgetId, hidden: boolean) => setWidgetHidden(id, hidden), []);

  return { hiddenWidgetIds, isHidden, setHidden };
}
