/**
 * V3-WALLET-004 — the 6 wallet automation rules, plus their `enabled`
 * overlay persistence. Mirrors `lib/automation/rules.ts` exactly (same
 * `Map<ruleId, enabled>` + `localStorage` + `listeners`/`notify()` +
 * `useSyncExternalStore`-ready shape, its own storage key) — the same
 * pattern this codebase already uses for every module-scope preference
 * store (`lib/notifications/preferences.ts`, `lib/account/service.ts`).
 *
 * Each rule is a real `AutomationRule` (`lib/automation/types.ts`,
 * unmodified) so `AutomationRuleCard`/`AutomationTriggerBadge`/
 * `AutomationActionBadge` render it identically to the 5 built-in rules
 * with zero new UI code. `trigger` is deliberately the EXISTING `"portfolio"`
 * notification type (not a new one) — wallet events reach the user by
 * being fed directly into `AutomationResult[]` (see `engine.ts`'s own doc
 * comment), never by being matched through `lib/automation/engine.ts`'s
 * generic `matchesRule` against an arbitrary `Notification` stream, so
 * `trigger`/`conditions` here are descriptive metadata for the UI, not
 * inputs to a matcher. Extending `lib/timeline/types.ts`'s `TimelineEventType`
 * with new wallet-specific members was evaluated and rejected: that union
 * is documented as closed to "exactly three already-computed sources," and
 * `Timeline.eventCounts`/its filter UI iterate it exhaustively — adding
 * unreachable wallet members would show permanently-zero entries in the
 * unrelated, already-shipped `/dashboard/timeline` filter dropdown, a real
 * regression to a previously-shipped feature.
 */

import type { AutomationRule } from "@/lib/automation/types";
import type { WalletAutomationRule, WalletRuleId } from "@/lib/wallet-automation/types";
import { WALLET_RULE_IDS } from "@/lib/wallet-automation/types";

const DEFAULT_RULE_TIMESTAMP = "2026-09-04T00:00:00.000Z";

function rule(partial: Omit<AutomationRule, "trigger" | "conditions" | "createdAt" | "updatedAt" | "metadata"> & { id: WalletRuleId }): WalletAutomationRule {
  return {
    ...partial,
    trigger: "portfolio",
    conditions: [],
    createdAt: DEFAULT_RULE_TIMESTAMP,
    updatedAt: DEFAULT_RULE_TIMESTAMP,
    metadata: {},
  };
}

export const DEFAULT_WALLET_AUTOMATION_RULES: WalletAutomationRule[] = [
  rule({
    id: "wallet-rule:concentration",
    name: "High Concentration",
    description: "Notifies when your portfolio's concentration risk becomes High (one asset ≥75% of known value).",
    enabled: true,
    actions: ["create-notification-entry"],
    priority: "high",
  }),
  rule({
    id: "wallet-rule:stablecoin",
    name: "Stablecoin Alert",
    description: "Notifies when your stablecoin exposure drops to 0% — no defensive allocation detected.",
    enabled: true,
    actions: ["create-notification-entry"],
    priority: "medium",
  }),
  rule({
    id: "wallet-rule:unknown-assets",
    name: "Unknown Assets",
    description: "Notifies when a new unpriced (unknown) asset is detected in your wallet.",
    enabled: true,
    actions: ["create-notification-entry"],
    priority: "medium",
  }),
  rule({
    id: "wallet-rule:pricing-coverage",
    name: "Pricing Coverage",
    description: "Notifies when less than 80% of your holdings are priced — portfolio visibility is limited.",
    enabled: true,
    actions: ["create-notification-entry"],
    priority: "medium",
  }),
  rule({
    id: "wallet-rule:largest-holding",
    name: "Largest Position Changed",
    description: "Notifies when your largest holding changes to a different asset.",
    enabled: true,
    actions: ["create-notification-entry"],
    priority: "low",
  }),
  rule({
    id: "wallet-rule:health",
    name: "Portfolio Health",
    description: "Notifies when your portfolio health score changes significantly (improved or declined).",
    enabled: true,
    actions: ["queue-daily-digest"],
    priority: "low",
  }),
  // V4-AUTOMATION-001 (Phase 3/8) — 5 new rules. Reuses this file's exact
  // same `rule()` helper and the generic `enabled`-overlay/persistence
  // system above unchanged — every one of these gets a working toggle in
  // Automation Preferences and a card in the Automation Center for free,
  // since both already render `getWalletAutomationRules()`'s output
  // generically (confirmed via this phase's own investigation).
  rule({
    id: "wallet-rule:confidence",
    name: "Confidence Dropped",
    description: "Notifies when Base Radar's confidence in its own analysis drops significantly — pricing, verification, or classification coverage got materially worse.",
    enabled: true,
    actions: ["create-notification-entry"],
    priority: "medium",
  }),
  rule({
    id: "wallet-rule:fingerprint",
    name: "Portfolio Type Changed",
    description: "Notifies when your portfolio's rule-based classification changes (e.g. Balanced to Concentrated).",
    enabled: true,
    actions: ["create-notification-entry"],
    priority: "low",
  }),
  rule({
    id: "wallet-rule:recommendation",
    name: "Top Recommendation Changed",
    description: "Notifies when your highest-priority recommendation changes.",
    enabled: true,
    actions: ["create-notification-entry"],
    priority: "medium",
  }),
  rule({
    id: "wallet-rule:risk",
    name: "Risk Increased",
    description: "Notifies when your portfolio's risk score increases significantly.",
    enabled: true,
    actions: ["create-notification-entry"],
    priority: "high",
  }),
  rule({
    id: "wallet-rule:top-warning",
    name: "Top Warning Changed",
    description: "Notifies when the single most important risk warning for your portfolio changes.",
    enabled: true,
    actions: ["create-notification-entry"],
    priority: "medium",
  }),
];

const DEFAULT_RULE_IDS = new Set<string>(WALLET_RULE_IDS);

const WALLET_RULE_STATE_STORAGE_KEY = "base-radar:wallet-automation-rule-state";
const WALLET_RULE_STATE_VERSION = 1;

type PersistedRuleState = {
  version: number;
  enabledByRuleId: Record<string, boolean>;
};

function isValidPersistedRuleState(value: unknown): value is PersistedRuleState {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<PersistedRuleState>;
  if (candidate.version !== WALLET_RULE_STATE_VERSION) return false;
  if (typeof candidate.enabledByRuleId !== "object" || candidate.enabledByRuleId === null) return false;
  return Object.entries(candidate.enabledByRuleId).every(([ruleId, enabled]) => DEFAULT_RULE_IDS.has(ruleId) && typeof enabled === "boolean");
}

const ruleOverrides = new Map<string, boolean>();
let hydrated = false;

function ensureHydrated(): void {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;

  try {
    const raw = window.localStorage.getItem(WALLET_RULE_STATE_STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (!isValidPersistedRuleState(parsed)) return;
    for (const [ruleId, enabled] of Object.entries(parsed.enabledByRuleId)) {
      ruleOverrides.set(ruleId, enabled);
    }
  } catch {
    // Intentionally swallowed — same "corrupted value starts from an empty overlay" convention as lib/automation/rules.ts.
  }
}

function persistRuleState(): void {
  if (typeof window === "undefined") return;
  try {
    const enabledByRuleId = Object.fromEntries(ruleOverrides);
    window.localStorage.setItem(WALLET_RULE_STATE_STORAGE_KEY, JSON.stringify({ version: WALLET_RULE_STATE_VERSION, enabledByRuleId }));
  } catch {
    // Intentionally swallowed — best-effort persistence, same as lib/automation/rules.ts.
  }
}

let rulesVersion = 0;
let cachedMergedRulesVersion = -1;
let cachedMergedRules: WalletAutomationRule[] | null = null;

const listeners = new Set<() => void>();

function notify(): void {
  for (const listener of listeners) listener();
}

export function getWalletAutomationRules(): WalletAutomationRule[] {
  ensureHydrated();
  if (!cachedMergedRules || cachedMergedRulesVersion !== rulesVersion) {
    cachedMergedRules = DEFAULT_WALLET_AUTOMATION_RULES.map((r) => {
      const override = ruleOverrides.get(r.id);
      return override === undefined ? r : { ...r, enabled: override };
    });
    cachedMergedRulesVersion = rulesVersion;
  }
  return cachedMergedRules;
}

export function setWalletRuleEnabled(ruleId: string, enabled: boolean): void {
  ensureHydrated();
  if (!DEFAULT_RULE_IDS.has(ruleId)) return;
  if (ruleOverrides.get(ruleId) === enabled) return;

  ruleOverrides.set(ruleId, enabled);
  rulesVersion += 1;
  persistRuleState();
  notify();
}

export function resetWalletAutomationRules(): void {
  ensureHydrated();
  if (ruleOverrides.size === 0) return;

  ruleOverrides.clear();
  rulesVersion += 1;
  persistRuleState();
  notify();
}

export function subscribeToWalletAutomationRules(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
