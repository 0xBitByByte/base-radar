/**
 * Icon/label/color display metadata for `SyncState` — the one place a
 * state maps to a real `lucide-react` icon and Tailwind color class, the
 * same `components/watchlists/meta.ts` convention. `lib/sync/` itself
 * stays framework-agnostic; only this UI-layer file knows about React
 * components or Tailwind classes.
 */

import { AlertTriangle, Check, RefreshCw, WifiOff, XCircle, type LucideIcon } from "lucide-react";

import type { SyncState } from "@/lib/sync/types";

type SyncStateDisplay = {
  label: string;
  icon: LucideIcon;
  textClass: string;
  spin?: boolean;
};

export const SYNC_STATE_DISPLAY: Record<SyncState, SyncStateDisplay> = {
  idle: { label: "Synced", icon: Check, textClass: "text-radar-success" },
  success: { label: "Synced", icon: Check, textClass: "text-radar-success" },
  pending: { label: "Pending", icon: RefreshCw, textClass: "text-radar-light-muted dark:text-radar-muted" },
  syncing: { label: "Syncing", icon: RefreshCw, textClass: "text-radar-primary dark:text-radar-accent", spin: true },
  offline: { label: "Offline", icon: WifiOff, textClass: "text-radar-warning" },
  conflict: { label: "Conflict", icon: AlertTriangle, textClass: "text-radar-warning" },
  error: { label: "Error", icon: XCircle, textClass: "text-radar-danger" },
};
