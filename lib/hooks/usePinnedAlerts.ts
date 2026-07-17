"use client";

import { useMemo } from "react";

import { useAlerts } from "@/lib/hooks/useAlerts";
import type { Alert } from "@/lib/alerts/types";

export function usePinnedAlerts(): Alert[] {
  const { alerts } = useAlerts();
  return useMemo(() => alerts.filter((alert) => alert.pinned), [alerts]);
}
