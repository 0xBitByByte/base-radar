/**
 * PR-092.04 (Portfolio Monitoring) — runtime cache, persistence, and public
 * entry point. Same shape every other local store in this app already uses
 * (`lib/ai-watch/storage.ts` is the direct precedent): an in-memory cache,
 * an SSR-safe versioned `localStorage` envelope that falls back to an
 * empty/disabled state on any corruption rather than throwing, and a
 * `subscribe`/`notify` pair shaped for `useSyncExternalStore`.
 *
 * No backend, no polling, no timers. `runPortfolioMonitoringCheck()` is the
 * one place evaluation actually happens — called by
 * `lib/hooks/usePortfolioMonitoring.ts` on mount/whenever its real inputs
 * change (client-side, on-visit only, never on an interval).
 */

import { currentGovernanceCounts, findGovernanceAlerts, findWhaleAlerts, toAlert } from "@/lib/portfolio-monitoring/evaluate";
import type { PortfolioMonitoringAlert, PortfolioMonitoringConfig } from "@/lib/portfolio-monitoring/types";
import type { HeldProjectLink } from "@/lib/portfolio-intelligence/projectLinks";
import type { WhaleEvent } from "@/lib/whale/types";

const CONFIG_STORAGE_KEY = "base-radar:portfolio-monitoring-config";
const ALERTS_STORAGE_KEY = "base-radar:portfolio-monitoring-alerts";
const GOVERNANCE_BASELINE_STORAGE_KEY = "base-radar:portfolio-monitoring-governance-baseline";
const STORAGE_VERSION = 1;
const MAX_ALERTS = 50;

const DEFAULT_CONFIG: PortfolioMonitoringConfig = { enabled: false, createdAt: null };

type PersistedConfig = { version: number; config: PortfolioMonitoringConfig };
type PersistedAlerts = { version: number; alerts: PortfolioMonitoringAlert[] };
type PersistedGovernanceBaseline = { version: number; counts: Record<string, number> };

function isValidConfig(value: unknown): value is PortfolioMonitoringConfig {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<PortfolioMonitoringConfig>;
  return typeof candidate.enabled === "boolean" && (candidate.createdAt === null || typeof candidate.createdAt === "string");
}

function isValidAlert(value: unknown): value is PortfolioMonitoringAlert {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<PortfolioMonitoringAlert>;
  return typeof candidate.id === "string" && typeof candidate.firstSeenAt === "string" && typeof candidate.isRead === "boolean" && typeof candidate.projectId === "string";
}

let cachedConfig: PortfolioMonitoringConfig = DEFAULT_CONFIG;
let cachedAlerts: PortfolioMonitoringAlert[] = [];
let cachedGovernanceBaseline: Record<string, number> = {};
let hydrated = false;

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

  try {
    const rawBaseline = window.localStorage.getItem(GOVERNANCE_BASELINE_STORAGE_KEY);
    if (rawBaseline) {
      const parsed = JSON.parse(rawBaseline) as Partial<PersistedGovernanceBaseline>;
      if (parsed.version === STORAGE_VERSION && parsed.counts && typeof parsed.counts === "object") cachedGovernanceBaseline = parsed.counts;
    }
  } catch {
    // Corrupted value — start with no baseline, so this visit's real counts become the new baseline instead of comparing against garbage.
  }
}

function persistConfig(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify({ version: STORAGE_VERSION, config: cachedConfig } satisfies PersistedConfig));
  } catch {
    // Best-effort.
  }
}

function persistAlerts(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(ALERTS_STORAGE_KEY, JSON.stringify({ version: STORAGE_VERSION, alerts: cachedAlerts } satisfies PersistedAlerts));
  } catch {
    // Best-effort.
  }
}

function persistGovernanceBaseline(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(GOVERNANCE_BASELINE_STORAGE_KEY, JSON.stringify({ version: STORAGE_VERSION, counts: cachedGovernanceBaseline } satisfies PersistedGovernanceBaseline));
  } catch {
    // Best-effort.
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

export function getPortfolioMonitoringConfig(): PortfolioMonitoringConfig {
  ensureHydrated();
  return cachedConfig;
}

export function getPortfolioMonitoringAlerts(): PortfolioMonitoringAlert[] {
  ensureHydrated();
  return cachedAlerts;
}

export function setPortfolioMonitoringEnabled(enabled: boolean): void {
  ensureHydrated();
  if (cachedConfig.enabled === enabled) return;
  cachedConfig = { enabled, createdAt: enabled ? (cachedConfig.createdAt ?? new Date().toISOString()) : cachedConfig.createdAt };
  persistConfig();
  notify();
}

/** "Remove this watch" — disables it and forgets every alert and the governance baseline, a genuine reset. Re-enabling afterward starts fresh. */
export function removePortfolioMonitoring(): void {
  ensureHydrated();
  cachedConfig = DEFAULT_CONFIG;
  cachedAlerts = [];
  cachedGovernanceBaseline = {};
  persistConfig();
  persistAlerts();
  persistGovernanceBaseline();
  notify();
}

export function markPortfolioMonitoringAlertRead(id: string): void {
  ensureHydrated();
  const alert = cachedAlerts.find((a) => a.id === id);
  if (!alert || alert.isRead) return;
  cachedAlerts = cachedAlerts.map((a) => (a.id === id ? { ...a, isRead: true, readAt: new Date().toISOString() } : a));
  persistAlerts();
  notify();
}

export function markPortfolioMonitoringAlertUnread(id: string): void {
  ensureHydrated();
  const alert = cachedAlerts.find((a) => a.id === id);
  if (!alert || !alert.isRead) return;
  cachedAlerts = cachedAlerts.map((a) => (a.id === id ? { ...a, isRead: false, readAt: null } : a));
  persistAlerts();
  notify();
}

let cachedEvaluatedKey: string | null = null;

/**
 * Runs both real checks (whale, governance) ONCE per genuinely new
 * `(links, whaleEvents)` pair — cheap to call every render, most calls just
 * see the same reference/key and return immediately. Returns the alerts
 * newly added this call (empty when disabled, nothing changed, or every
 * finding was already seen). Governance's baseline is captured/updated on
 * every real call so the NEXT visit has something honest to compare
 * against — the very first observation of a project never fires a
 * governance alert (nothing to compare its count to yet).
 */
export function runPortfolioMonitoringCheck(links: HeldProjectLink[], whaleEvents: WhaleEvent[]): PortfolioMonitoringAlert[] {
  ensureHydrated();
  if (!cachedConfig.enabled) return [];

  const evaluatedKey = `${links.map((l) => l.project.id).join(",")}|${whaleEvents.length}`;
  if (cachedEvaluatedKey === evaluatedKey) return [];
  cachedEvaluatedKey = evaluatedKey;

  const alreadySeenIds = new Set(cachedAlerts.map((a) => a.id));
  const pendingWhale = findWhaleAlerts(links, whaleEvents);
  const pendingGovernance = findGovernanceAlerts(links, cachedGovernanceBaseline);

  cachedGovernanceBaseline = currentGovernanceCounts(links);
  persistGovernanceBaseline();

  const firstSeenAt = new Date().toISOString();
  const newAlerts = [...pendingWhale, ...pendingGovernance].map((pending) => toAlert(pending, firstSeenAt)).filter((alert) => !alreadySeenIds.has(alert.id));
  if (newAlerts.length === 0) return [];

  cachedAlerts = [...newAlerts, ...cachedAlerts].slice(0, MAX_ALERTS);
  persistAlerts();
  notify();
  return newAlerts;
}
