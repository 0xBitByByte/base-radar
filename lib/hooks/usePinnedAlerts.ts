"use client";

/** PR15.1 — reads `useVisibleAlerts()` (watched + not muted), not the unfiltered `useAlerts()`: "no exceptions" to Watchlist visibility applies to pinned alerts too. */

import { useMemo } from "react";

import { useVisibleAlerts } from "@/lib/hooks/useVisibleAlerts";
import type { Alert } from "@/lib/alerts/types";

export function usePinnedAlerts(): Alert[] {
  const { alerts } = useVisibleAlerts();
  return useMemo(() => alerts.filter((alert) => alert.pinned), [alerts]);
}
