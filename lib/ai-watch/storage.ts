/**
 * PR-090.03 (AI Watch — Stage 1) — the watch's runtime cache, persistence,
 * and public entry point. Same shape every other local store in this app
 * already uses (`lib/notifications/storage.ts`, `lib/automation/rules.ts`):
 * an in-memory cache, an SSR-safe versioned `localStorage` envelope that
 * falls back to an empty/disabled state on any corruption rather than
 * throwing, and a `subscribe`/`notify` pair shaped for `useSyncExternalStore`.
 *
 * No backend, no polling, no timers. `runAIWatchCheck()` is the one place
 * evaluation actually happens — called by `lib/hooks/useAIWatch.ts` on
 * mount/whenever its real inputs change (client-side, on-visit only, never
 * on an interval) — never invoked by this module itself.
 */

import { computeFindingKey, findNewRiskClaims, findWatchlistRiskClaims } from "@/lib/ai-watch/evaluate";
import type { AIWatchAlert, AIWatchConfig } from "@/lib/ai-watch/types";
import type { WorkspaceView } from "@/lib/ai-workspace/types";

const CONFIG_STORAGE_KEY = "base-radar:ai-watch-config";
const ALERTS_STORAGE_KEY = "base-radar:ai-watch-alerts";
const STORAGE_VERSION = 1;
const MAX_ALERTS = 50;

const DEFAULT_CONFIG: AIWatchConfig = { enabled: false, createdAt: null };

type PersistedConfig = { version: number; config: AIWatchConfig };
type PersistedAlerts = { version: number; alerts: AIWatchAlert[] };

function isValidConfig(value: unknown): value is AIWatchConfig {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<AIWatchConfig>;
  return typeof candidate.enabled === "boolean" && (candidate.createdAt === null || typeof candidate.createdAt === "string");
}

function isValidAlert(value: unknown): value is AIWatchAlert {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<AIWatchAlert>;
  return typeof candidate.id === "string" && typeof candidate.firstSeenAt === "string" && typeof candidate.isRead === "boolean" && typeof candidate.claim === "object" && candidate.claim !== null;
}

let cachedConfig: AIWatchConfig = DEFAULT_CONFIG;
let cachedAlerts: AIWatchAlert[] = [];
let hydrated = false;

/** SSR-safe, resilient to a corrupted/foreign value under either key — starts from the honest default rather than throwing. */
function ensureHydrated(): void {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;

  try {
    const rawConfig = window.localStorage.getItem(CONFIG_STORAGE_KEY);
    if (rawConfig) {
      const parsed = JSON.parse(rawConfig) as Partial<PersistedConfig>;
      if (parsed.version === STORAGE_VERSION && isValidConfig(parsed.config)) cachedConfig = parsed.config;
    }
  } catch {
    // Corrupted value — start disabled, same as a first-ever visit.
  }

  try {
    const rawAlerts = window.localStorage.getItem(ALERTS_STORAGE_KEY);
    if (rawAlerts) {
      const parsed = JSON.parse(rawAlerts) as Partial<PersistedAlerts>;
      if (parsed.version === STORAGE_VERSION && Array.isArray(parsed.alerts) && parsed.alerts.every(isValidAlert)) cachedAlerts = parsed.alerts;
    }
  } catch {
    // Corrupted value — start with zero alerts, never a fabricated backlog.
  }
}

function persistConfig(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify({ version: STORAGE_VERSION, config: cachedConfig } satisfies PersistedConfig));
  } catch {
    // Best-effort — quota/private-browsing failures still leave the in-memory state correct for this tab's session.
  }
}

function persistAlerts(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(ALERTS_STORAGE_KEY, JSON.stringify({ version: STORAGE_VERSION, alerts: cachedAlerts } satisfies PersistedAlerts));
  } catch {
    // Best-effort — see persistConfig().
  }
}

const listeners = new Set<() => void>();
function notify(): void {
  for (const listener of listeners) listener();
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getAIWatchConfig(): AIWatchConfig {
  ensureHydrated();
  return cachedConfig;
}

export function getAIWatchAlerts(): AIWatchAlert[] {
  ensureHydrated();
  return cachedAlerts;
}

export function setAIWatchEnabled(enabled: boolean): void {
  ensureHydrated();
  if (cachedConfig.enabled === enabled) return;
  cachedConfig = { enabled, createdAt: enabled ? (cachedConfig.createdAt ?? new Date().toISOString()) : cachedConfig.createdAt };
  persistConfig();
  notify();
}

/** "Remove this watch" — disables it and forgets every alert and seen-claim record, a genuine reset rather than merely hiding the UI. Re-enabling afterward starts fresh, exactly like a first-ever visit. */
export function removeAIWatch(): void {
  ensureHydrated();
  cachedConfig = DEFAULT_CONFIG;
  cachedAlerts = [];
  persistConfig();
  persistAlerts();
  notify();
}

export function markAIWatchAlertRead(id: string): void {
  ensureHydrated();
  const alert = cachedAlerts.find((a) => a.id === id);
  if (!alert || alert.isRead) return;
  cachedAlerts = cachedAlerts.map((a) => (a.id === id ? { ...a, isRead: true, readAt: new Date().toISOString() } : a));
  persistAlerts();
  notify();
}

export function markAIWatchAlertUnread(id: string): void {
  ensureHydrated();
  const alert = cachedAlerts.find((a) => a.id === id);
  if (!alert || !alert.isRead) return;
  cachedAlerts = cachedAlerts.map((a) => (a.id === id ? { ...a, isRead: false, readAt: null } : a));
  persistAlerts();
  notify();
}

let cachedEvaluatedView: WorkspaceView | null = null;
let cachedEvaluatedWatchlistKey: string | null = null;

/**
 * Runs the fixed Risk-findings check ONCE per genuinely new `(view,
 * watchlistProjectIds)` pair — cheap to call on every render, since most
 * calls just see the same reference/key and return immediately without
 * recomputing or re-persisting. Returns the alerts newly added this call
 * (empty when the watch is disabled, nothing changed, or every current
 * Risk claim was already seen before — "already seen" is derived directly
 * from `cachedAlerts`' own already-fired claims via `computeFindingKey()`,
 * never a second, separate seen-set that could drift from what's actually
 * displayed).
 */
export function runAIWatchCheck(view: WorkspaceView, watchlistProjectIds: readonly string[]): AIWatchAlert[] {
  ensureHydrated();
  if (!cachedConfig.enabled) return [];

  const watchlistKey = [...watchlistProjectIds].sort().join(",");
  if (cachedEvaluatedView === view && cachedEvaluatedWatchlistKey === watchlistKey) return [];
  cachedEvaluatedView = view;
  cachedEvaluatedWatchlistKey = watchlistKey;

  const riskClaims = findWatchlistRiskClaims(view, watchlistProjectIds);
  // Stable, content-derived identity — not `claim.id`, which embeds a generation timestamp that can differ across two separate loads of the SAME real condition (see `evaluate.ts`'s own hardening note).
  const alreadySeenFindingKeys = new Set(cachedAlerts.map((alert) => computeFindingKey(alert.claim)));
  const newClaims = findNewRiskClaims(riskClaims, alreadySeenFindingKeys);
  if (newClaims.length === 0) return [];

  const firstSeenAt = new Date().toISOString();
  const newAlerts: AIWatchAlert[] = newClaims.map((claim) => ({ id: `ai-watch:${claim.id}`, firstSeenAt, isRead: false, readAt: null, claim }));

  cachedAlerts = [...newAlerts, ...cachedAlerts].slice(0, MAX_ALERTS);
  persistAlerts();
  notify();
  return newAlerts;
}
