"use client";

/**
 * V3-WALLET-004 — the one hook every "Wallet Automations" UI surface
 * (Automation Center, Dashboard's Automation widget, the wallet page) reads
 * through. Owns the only stateful part of this feature: remembering the
 * previous `PortfolioIntelligence`/wallet-lifecycle snapshot (session-only,
 * via `useRef` — never persisted, since a fresh page load has no prior
 * snapshot to have "changed" from, and the brief's own "no polling/cron,
 * event-driven only" rule means there's nothing to replay on mount anyway)
 * and diffing it against the current one exactly once per real change.
 *
 * Never fetches anything itself — `useWalletPortfolioIntelligence()` (and
 * transitively `usePortfolio()`) is the only data source, memoized there
 * already, so this hook only re-diffs when that reference actually changes
 * (a genuine refresh/reconnect/chain-switch), never on an unrelated
 * re-render. `automationEnabled` mirrors the EXISTING global Automation
 * master switch — wallet rules turn off together with every other rule,
 * not via a second on/off concept.
 *
 * V4-AUTOMATION-001 — the original `buildPortfolioContentEvents`/
 * `buildWalletAutomationResults` calls below are byte-for-byte unchanged;
 * this hook additionally calls the new `buildSmartPortfolioEvents`/
 * `buildSmartWalletAutomationResults` (Phase 3) in the same effect tick and
 * merges their output into the same `events`/`results` state, so "Wallet
 * Automation" stays the one, single automation engine/hook from every
 * consumer's point of view — nothing downstream needs to know two builders
 * ran. `snapshot`/`previousSnapshot`/`diff`/`metadata` (Phase 9) are pure,
 * already-computed values derived from the same `intelligence`/`rules`/
 * `results`/`events` this hook already holds — no new subscription, no new
 * persistence.
 */

import { useEffect, useMemo, useRef, useState } from "react";

import { useWallet } from "@/lib/hooks/useWallet";
import { useWalletPortfolioIntelligence } from "@/lib/hooks/useWalletPortfolioIntelligence";
import { useAutomationPreferences } from "@/lib/hooks/useAutomationPreferences";
import { useWalletAutomationRules } from "@/lib/hooks/useWalletAutomationRules";
import { buildLifecycleEvents, buildPortfolioContentEvents, buildSmartPortfolioEvents } from "@/lib/wallet-automation/events";
import { buildWalletAutomationResults, buildSmartWalletAutomationResults } from "@/lib/wallet-automation/engine";
import { buildAutomationDiff, buildAutomationMetadata, buildAutomationSnapshot } from "@/lib/wallet-automation/snapshot";
import type { AutomationDiff, AutomationMetadata, AutomationSnapshot, WalletEvent, WalletLifecycleState } from "@/lib/wallet-automation/types";
import type { AutomationResult } from "@/lib/automation/types";
import type { PortfolioIntelligence } from "@/lib/portfolio-intelligence/types";

const MAX_RECENT_EVENTS = 50;

export type UseWalletAutomationResult = {
  events: WalletEvent[];
  results: AutomationResult[];
  rules: ReturnType<typeof useWalletAutomationRules>["rules"];
  setRuleEnabled: (ruleId: string, enabled: boolean) => void;
  resetRules: () => void;
  automationEnabled: boolean;
  /** V4-AUTOMATION-001 (Phase 9) — `null` while disconnected/no priced holdings; a pure read of the current `PortfolioIntelligence`, not a new subscription. */
  snapshot: AutomationSnapshot | null;
  previousSnapshot: AutomationSnapshot | null;
  diff: AutomationDiff | null;
  metadata: AutomationMetadata;
};

export function useWalletAutomation(): UseWalletAutomationResult {
  const { isConnected, isSupportedNetwork } = useWallet();
  const { intelligence, chainSupported } = useWalletPortfolioIntelligence();
  const { preferences } = useAutomationPreferences();
  const { rules, setEnabled, reset } = useWalletAutomationRules();

  const [events, setEvents] = useState<WalletEvent[]>([]);
  const [results, setResults] = useState<AutomationResult[]>([]);
  // Phase 9's `previousSnapshot`/`diff` are returned to consumers (not just
  // read internally by this effect), so they're plain state — set inside
  // the effect below — rather than refs: reading a ref's `.current` during
  // render (as the returned value would require) is exactly what React's
  // own `react-hooks/refs` rule flags, since it can silently miss a
  // re-render when the ref changes without a parallel state update.
  const [previousSnapshot, setPreviousSnapshot] = useState<AutomationSnapshot | null>(null);
  const [diff, setDiff] = useState<AutomationDiff | null>(null);

  const previousIntelligenceRef = useRef<PortfolioIntelligence | null>(null);
  const previousLifecycleRef = useRef<WalletLifecycleState | null>(null);
  const previousSnapshotRef = useRef<AutomationSnapshot | null>(null);

  useEffect(() => {
    const currentLifecycle: WalletLifecycleState = {
      isConnected,
      isSupportedNetwork,
      chainSupported,
      lastUpdated: intelligence?.lastUpdated ?? null,
    };
    const now = new Date().toISOString();

    const lifecycleEvents = buildLifecycleEvents(previousLifecycleRef.current, currentLifecycle, now);
    const contentEvents = intelligence ? buildPortfolioContentEvents(previousIntelligenceRef.current, intelligence) : [];
    const smartContentEvents = intelligence ? buildSmartPortfolioEvents(previousIntelligenceRef.current, intelligence) : [];
    const newEvents = [...contentEvents, ...smartContentEvents, ...lifecycleEvents];

    if (newEvents.length > 0) {
      setEvents((prev) => [...newEvents, ...prev].slice(0, MAX_RECENT_EVENTS));
    }

    if (intelligence) {
      const newResults = [
        ...buildWalletAutomationResults(previousIntelligenceRef.current, intelligence, rules, preferences.enabled),
        ...buildSmartWalletAutomationResults(previousIntelligenceRef.current, intelligence, rules, preferences.enabled),
      ].sort((a, b) => b.triggeredAt.localeCompare(a.triggeredAt));
      if (newResults.length > 0) {
        setResults((prev) => [...newResults, ...prev].slice(0, MAX_RECENT_EVENTS));
      }
    }

    // Phase 9's `previousSnapshot`/`diff`, computed and stored as state here
    // (not read from a ref during render — see the state declarations
    // above) using `previousSnapshotRef`'s value from BEFORE this tick
    // overwrites it, so `diff` genuinely compares "what it was" to
    // "what it is now."
    if (intelligence) {
      const nextSnapshot = buildAutomationSnapshot(intelligence);
      setPreviousSnapshot(previousSnapshotRef.current);
      setDiff(buildAutomationDiff(previousSnapshotRef.current, nextSnapshot));
      previousSnapshotRef.current = nextSnapshot;
      previousIntelligenceRef.current = intelligence;
    }
    previousLifecycleRef.current = currentLifecycle;
    // `rules`/`preferences.enabled` deliberately excluded — toggling a rule's
    // enabled state (or the master switch) should never itself retroactively
    // fire a "new" trigger for a condition that was already true before the
    // toggle; only a genuine intelligence/wallet-state change should.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intelligence, isConnected, isSupportedNetwork, chainSupported]);

  const snapshot = useMemo(() => (intelligence ? buildAutomationSnapshot(intelligence) : null), [intelligence]);
  const metadata = useMemo(() => buildAutomationMetadata(rules, results, events, new Date().toISOString()), [rules, results, events]);

  return {
    events,
    results,
    rules,
    setRuleEnabled: setEnabled,
    resetRules: reset,
    automationEnabled: preferences.enabled,
    snapshot,
    previousSnapshot,
    diff,
    metadata,
  };
}
