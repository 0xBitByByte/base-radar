"use client";

/**
 * Derives the unread count from `useVisibleAlerts()`'s own array (PR15.1 —
 * previously `useAlerts()`, the unfiltered set) rather than subscribing to
 * the alert store a second time — `alerts` only changes reference on a
 * real mutation or Watchlist change (`lib/alerts/service.ts`'s cached-
 * snapshot contract), so this `useMemo` recomputes only when it actually
 * needs to. Shared by the Sidebar's "Alerts" nav badge and the Topbar's
 * notification bell, so both always agree — and both now only ever count
 * alerts for projects the user is actually watching.
 */

import { useMemo } from "react";

import { useVisibleAlerts } from "@/lib/hooks/useVisibleAlerts";

export function useUnreadAlertCount(): number {
  const { alerts } = useVisibleAlerts();
  return useMemo(() => alerts.filter((alert) => !alert.read).length, [alerts]);
}
