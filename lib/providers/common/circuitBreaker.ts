/**
 * V1-PHASE-2 (ADR V1-BLOCKER-001) — per-provider circuit breaker state,
 * sitting immediately around `fetchJson()`'s own retry loop (never inside
 * `fetchJsonOnce`, never in `service.ts`/`client.ts`/`cache.ts` — see that
 * ADR's Phase 2 investigation for why this is the one location every
 * provider's every endpoint already funnels through unconditionally).
 *
 * In-memory only, same process-lifetime scope as `common/cache.ts` and
 * `common/health.ts` — no persistence, no database, no Redis, no
 * filesystem. Resets on server restart/redeploy, same as those two.
 *
 * Deliberately provider-agnostic: nothing here is Blockscout-specific, even
 * though Blockscout is the provider currently exercising it in practice.
 *
 * This module owns DECISION STATE only (should a live attempt be allowed
 * right now, and did the last one succeed or fail). It does not replace
 * `common/health.ts`, which stays the separate, unmodified reporting layer
 * — the two intentionally do not share state (see that file's own doc
 * comment on why its cumulative, cache-hit-inclusive counters can't serve
 * as breaker decision input).
 */

import { PROVIDER_NAMES, type ProviderName } from "@/lib/providers/common/types";

export type CircuitState = "closed" | "open" | "half-open";

type CircuitEntry = {
  state: CircuitState;
  consecutiveFailures: number;
  openedAt: number | null;
};

/**
 * Centralized, not hardcoded at each call site. ADR-conservative defaults:
 * trip after a handful of consecutive failures (low enough to react well
 * within a single Dashboard load's worth of attempts; high enough not to
 * trip on one or two transient blips), cool down for 45s (long enough to
 * meaningfully stop re-hammering a degraded host across several poll
 * cycles — see `useLiveTicker`'s own 45s interval — short enough that a
 * real recovery isn't held open needlessly).
 */
export const CIRCUIT_BREAKER_CONFIG = {
  tripThreshold: 4,
  cooldownMs: 45_000,
} as const;

/** Disabled by default — set to the literal string "true" to bypass the breaker entirely. No feature-flag framework, just one env var. */
const KILL_SWITCH_ENV_VAR = "CIRCUIT_BREAKER_DISABLED";

function isKillSwitchEnabled(): boolean {
  return process.env[KILL_SWITCH_ENV_VAR] === "true";
}

function createClosedEntry(): CircuitEntry {
  return { state: "closed", consecutiveFailures: 0, openedAt: null };
}

const circuits = new Map<ProviderName, CircuitEntry>(PROVIDER_NAMES.map((provider) => [provider, createClosedEntry()]));

/**
 * V1-IMPLEMENT-002A — tracks whether the single Half-Open recovery probe is
 * currently outstanding, so a second/third concurrent caller can be rejected
 * instead of also being admitted as a "trial". Kept as its own map (not a
 * field on `CircuitEntry`) so `getCircuitState()`'s public shape — already
 * relied on by existing tests and any future diagnostics — stays unchanged.
 */
const trialInFlight = new Map<ProviderName, boolean>();

/** Minimal structured logging — transitions only, never per-request. */
function logTransition(provider: ProviderName, transition: string, consecutiveFailures: number): void {
  console.warn(
    `[circuit-breaker] provider=${provider} transition=${transition} failureCount=${consecutiveFailures} at=${new Date().toISOString()}`
  );
}

/**
 * Whether a live attempt should be allowed right now for `provider`. Also
 * performs the time-based Open → Half-Open transition lazily, on this same
 * check — the same "no real timer, just compare against Date.now() on next
 * access" pattern `common/cache.ts`'s own TTL expiry already uses.
 *
 * V1-IMPLEMENT-002A — Half-Open admits exactly one outstanding trial; any
 * concurrent caller while that trial is unresolved is rejected. `openedAt`
 * is repurposed while half-open to mark when the current trial started
 * (rather than when the circuit originally opened) purely as a self-heal
 * bound: `fetchJson` deliberately never calls `recordRequestOutcome` for a
 * non-retryable failure (404/429/parse_error — see `utilities.ts`), so a
 * trial that ends in one of those would otherwise leave `trialInFlight` set
 * forever with no outcome ever reported to release it. Treating a trial
 * older than one cooldown window as abandoned prevents that from becoming a
 * permanent lockout, while still requiring a full cooldown before a second
 * attempt — no shorter than Open→Half-Open already requires.
 */
export function shouldAllowRequest(provider: ProviderName): boolean {
  if (isKillSwitchEnabled()) return true;

  const entry = circuits.get(provider) ?? createClosedEntry();

  if (entry.state === "half-open") {
    const trialStartedAt = entry.openedAt;
    const trialAbandoned = trialStartedAt === null || Date.now() - trialStartedAt >= CIRCUIT_BREAKER_CONFIG.cooldownMs;
    if (trialInFlight.get(provider) && !trialAbandoned) return false;
    trialInFlight.set(provider, true);
    entry.openedAt = Date.now();
    circuits.set(provider, entry);
    return true;
  }

  if (entry.state !== "open") return true;

  const elapsed = entry.openedAt !== null ? Date.now() - entry.openedAt : Infinity;
  if (elapsed < CIRCUIT_BREAKER_CONFIG.cooldownMs) return false;

  entry.state = "half-open";
  entry.openedAt = Date.now();
  circuits.set(provider, entry);
  trialInFlight.set(provider, true);
  logTransition(provider, "open->half-open", entry.consecutiveFailures);
  return true;
}

/**
 * Records the outcome of one logical `fetchJson()` call — after its own
 * internal retry loop has already concluded, never once per raw HTTP
 * attempt (see that function's own doc comment for why this distinction
 * matters). A no-op while the kill switch is enabled, so re-enabling the
 * breaker later always starts from a clean `closed` state rather than
 * inheriting whatever happened while disabled.
 */
export function recordRequestOutcome(provider: ProviderName, outcome: "success" | "failure"): void {
  if (isKillSwitchEnabled()) return;

  const entry = circuits.get(provider) ?? createClosedEntry();

  if (outcome === "success") {
    const wasOpenOrHalfOpen = entry.state !== "closed";
    entry.state = "closed";
    entry.consecutiveFailures = 0;
    entry.openedAt = null;
    circuits.set(provider, entry);
    trialInFlight.delete(provider);
    if (wasOpenOrHalfOpen) logTransition(provider, "half-open->closed", 0);
    return;
  }

  entry.consecutiveFailures += 1;

  if (entry.state === "half-open") {
    entry.state = "open";
    entry.openedAt = Date.now();
    circuits.set(provider, entry);
    trialInFlight.delete(provider);
    logTransition(provider, "half-open->open", entry.consecutiveFailures);
    return;
  }

  if (entry.state === "closed" && entry.consecutiveFailures >= CIRCUIT_BREAKER_CONFIG.tripThreshold) {
    entry.state = "open";
    entry.openedAt = Date.now();
    circuits.set(provider, entry);
    logTransition(provider, "closed->open", entry.consecutiveFailures);
    return;
  }

  circuits.set(provider, entry);
}

/** Read-only snapshot — for tests and any future diagnostics; never used to drive decisions elsewhere. */
export function getCircuitState(provider: ProviderName): CircuitEntry {
  return { ...(circuits.get(provider) ?? createClosedEntry()) };
}

/** Test-only reset — production code never calls this; state otherwise only ever changes via real outcomes. */
export function __resetCircuitBreakerForTests(): void {
  for (const provider of PROVIDER_NAMES) {
    circuits.set(provider, createClosedEntry());
    trialInFlight.delete(provider);
  }
}
