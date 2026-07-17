"use client";

/**
 * React binding for `lib/alerts/service.ts` — the same `useSyncExternalStore`
 * pattern `useWatchlist` already uses for an outside-React source of truth.
 * Every component calling this hook automatically subscribes on mount and
 * unsubscribes on unmount, and re-renders the instant `markRead`/`pin`/
 * `dismiss`/etc. runs anywhere in the app — no prop drilling, no manual
 * subscribe/unsubscribe wiring of its own.
 */

import { useSyncExternalStore } from "react";

import * as alertService from "@/lib/alerts/service";
import type { Alert } from "@/lib/alerts/types";

const EMPTY_ALERTS: Alert[] = [];

function getServerSnapshot(): Alert[] {
  return EMPTY_ALERTS;
}

export function useAlerts() {
  const alerts = useSyncExternalStore(alertService.subscribe, alertService.getAlerts, getServerSnapshot);

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
