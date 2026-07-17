"use client";

/**
 * Derives the unread count from `useAlerts()`'s own array rather than
 * subscribing to the alert store a second time — `alerts` only changes
 * reference on a real mutation (`lib/alerts/service.ts`'s cached-snapshot
 * contract), so this `useMemo` recomputes only when it actually needs to.
 * Shared by the Sidebar's "Alerts" nav badge and the Topbar's notification
 * bell so both always agree.
 */

import { useMemo } from "react";

import { useAlerts } from "@/lib/hooks/useAlerts";

export function useUnreadAlertCount(): number {
  const { alerts } = useAlerts();
  return useMemo(() => alerts.filter((alert) => !alert.read).length, [alerts]);
}
