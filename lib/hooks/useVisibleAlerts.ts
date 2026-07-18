"use client";

/**
 * The Watchlist-aware counterpart to `useAlerts()` (PR15.1) — same
 * `useSyncExternalStore` binding, but reads `getVisibleAlerts()` (watched
 * AND not muted) instead of the unfiltered `getAlerts()`. Every UI surface
 * that should honor "only alerts for projects you're watching" (the
 * Alerts page, and — via `useUnreadAlertCount`/`usePinnedAlerts`, which
 * are built on this hook — the Sidebar badge and Topbar bell) uses this,
 * never `useAlerts()` directly.
 */

import { useSyncExternalStore } from "react";

import * as alertService from "@/lib/alerts/service";
import type { Alert } from "@/lib/alerts/types";

const EMPTY_ALERTS: Alert[] = [];

function getServerSnapshot(): Alert[] {
  return EMPTY_ALERTS;
}

export function useVisibleAlerts() {
  const alerts = useSyncExternalStore(alertService.subscribe, alertService.getVisibleAlerts, getServerSnapshot);

  return {
    alerts,
    markRead: alertService.markRead,
    markUnread: alertService.markUnread,
    markAllRead: alertService.markAllRead,
    pin: alertService.pin,
    unpin: alertService.unpin,
    togglePin: alertService.togglePin,
    dismiss: alertService.dismiss,
  };
}
