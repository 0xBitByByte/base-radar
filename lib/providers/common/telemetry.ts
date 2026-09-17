/**
 * PR-110 — API Budget & Provider Observability. A lightweight, process-
 * local, in-memory layer that measures what this provider stack already
 * does (cache hits/misses, retries, timeouts, HTTP outcomes, self-rate-
 * limiter allow/reject, circuit-breaker transitions) without changing any
 * of that behavior. Deliberately mirrors `common/cache.ts`/`common/
 * health.ts`/`common/circuitBreaker.ts`'s own existing shape: a plain
 * in-memory Map, same process-lifetime scope, no persistence, no Redis, no
 * database — this is measurement only, not a new architecture.
 *
 * Vercel-safety (PR-108.1/108.2/108.4's established doctrine): this module
 * never touches SQLite, never depends on persistence being available, and
 * never assumes its own in-memory counters represent a global,
 * cross-instance total. Every snapshot this module returns is explicitly
 * scoped to "this process, since its last cold start" (`scope`/
 * `processStartedAt`) — PR-108/PR-108.4 already demonstrated, with real
 * production evidence, that multiple independent Vercel processes exist
 * simultaneously. This module makes no attempt to reconcile them and
 * states that limitation directly in its own exported data rather than
 * implying a complete production picture.
 *
 * Fail-open by construction (PR-110 Phase 14): every recording function
 * swallows its own internal errors via `safely()` rather than ever letting
 * a telemetry bug break the real provider call it's observing — telemetry
 * is diagnostic, never load-bearing.
 */

import { getCircuitState, type CircuitState } from "@/lib/providers/common/circuitBreaker";
import type { ProviderName } from "@/lib/providers/common/types";

/**
 * This module's own superset of `common/types.ts`'s `PROVIDER_NAMES`
 * (which currently omits "snapshot" — that provider is smuggled into the
 * shared `ProviderName` type elsewhere via a type assertion, see
 * `lib/providers/snapshot/client.ts`'s own doc comment on `PROVIDER_TAG`).
 * Not a fix to that pre-existing gap (out of PR-110's scope — no
 * redesign of the provider layer) — just ensures this new observability
 * module covers all 7 real providers regardless.
 */
export const TELEMETRY_PROVIDER_NAMES = ["base", "blockscout", "coingecko", "defillama", "dexscreener", "github", "snapshot"] as const;
export type TelemetryProviderName = (typeof TELEMETRY_PROVIDER_NAMES)[number];

/** Every outcome one logical `fetchJson()` call can resolve to. Mirrors `ProviderErrorCode` (`common/errors.ts`) plus "success" and "circuit_open" (the one outcome that short-circuits before any HTTP attempt). */
export type ProviderCallOutcome = "success" | "http_error" | "timeout" | "network_error" | "rate_limited" | "circuit_open" | "parse_error";

/**
 * One logical call's full outcome — one record per logical `fetchJson()`
 * call, never one per raw HTTP attempt. `attempts`/`retryCount` preserve
 * the distinction this codebase already draws between a LOGICAL CALL and
 * its UPSTREAM ATTEMPTS (see `utilities.ts`'s own doc comment): a call
 * that times out once then succeeds on retry is `attempts: 2,
 * retryCount: 1, outcome: "success"`, never counted as two logical calls.
 */
export type ProviderCallObservation = {
  provider: TelemetryProviderName;
  durationMs: number;
  attempts: number;
  retryCount: number;
  outcome: ProviderCallOutcome;
  httpStatus?: number;
  timedOut: boolean;
};

const MAX_LATENCY_SAMPLES = 200;
/** Below this many latency samples, a p95 would report noise as if it were a real percentile (PR-110 Phase 10's explicit instruction) — `getProviderTelemetrySnapshot` returns `null` instead. */
const MIN_SAMPLES_FOR_P95 = 20;

type ProviderCounters = {
  calls: number;
  attempts: number;
  retries: number;
  outcomes: Record<ProviderCallOutcome, number>;
  cacheHits: number;
  cacheMisses: number;
  rateLimitAllowed: number;
  rateLimitRejected: number;
  /** closed -> open transitions only, not every rejected request while open (see `circuitRejections`). */
  circuitOpens: number;
  /** Requests short-circuited because the breaker was open/half-open-busy — never a real network attempt. */
  circuitRejections: number;
  /** Bounded ring buffer — oldest sample evicted once `MAX_LATENCY_SAMPLES` is reached. Duration only, nothing else: no URL, no payload, no headers. */
  latencySamplesMs: number[];
};

function createEmptyOutcomes(): Record<ProviderCallOutcome, number> {
  return { success: 0, http_error: 0, timeout: 0, network_error: 0, rate_limited: 0, circuit_open: 0, parse_error: 0 };
}

function createEmptyCounters(): ProviderCounters {
  return {
    calls: 0,
    attempts: 0,
    retries: 0,
    outcomes: createEmptyOutcomes(),
    cacheHits: 0,
    cacheMisses: 0,
    rateLimitAllowed: 0,
    rateLimitRejected: 0,
    circuitOpens: 0,
    circuitRejections: 0,
    latencySamplesMs: [],
  };
}

const counters = new Map<TelemetryProviderName, ProviderCounters>(TELEMETRY_PROVIDER_NAMES.map((provider) => [provider, createEmptyCounters()]));

/** The one process-lifetime timestamp every snapshot reports alongside its counters, so a consumer can tell "23 calls" apart from "23 calls since 6 hours ago" vs "23 calls in the 4 minutes since a cold start." */
const processStartedAt = new Date().toISOString();

function getCounters(provider: TelemetryProviderName): ProviderCounters {
  let entry = counters.get(provider);
  if (!entry) {
    entry = createEmptyCounters();
    counters.set(provider, entry);
  }
  return entry;
}

function isTelemetryProviderName(value: string): value is TelemetryProviderName {
  return (TELEMETRY_PROVIDER_NAMES as readonly string[]).includes(value);
}

/**
 * Every cache key in this codebase's provider layer starts with
 * `${PROVIDER}:` (confirmed convention across every `service.ts` —
 * `` `${PROVIDER}:network-status` ``, `` `${PROVIDER}:repo:${fullName}` ``,
 * etc.). This reads only that safe prefix — never the rest of the key,
 * which can contain real project/repo identifiers — and returns `null`
 * for anything that doesn't match a known provider, so a differently-
 * shaped key (`common/cache.ts` is deliberately provider-agnostic and
 * could in principle be reused for something else) is silently ignored
 * rather than mis-attributed to a bogus "provider."
 */
export function providerFromCacheKey(key: string): TelemetryProviderName | null {
  const separator = key.indexOf(":");
  if (separator <= 0) return null;
  const prefix = key.slice(0, separator);
  return isTelemetryProviderName(prefix) ? prefix : null;
}

function safely(fn: () => void): void {
  try {
    fn();
  } catch {
    // Fail-open (PR-110 Phase 14) — a bug in telemetry must never surface
    // as a failure of the real provider call it's only trying to observe.
  }
}

/** Cache hit/miss, keyed by provider — `provider: null` (an unrecognized key shape) is a deliberate no-op, not an error. */
export function recordCacheEvent(provider: TelemetryProviderName | null, hit: boolean): void {
  if (!provider) return;
  safely(() => {
    const entry = getCounters(provider);
    if (hit) entry.cacheHits += 1;
    else entry.cacheMisses += 1;
  });
}

/** This app's own self-imposed budget (`common/rate-limit.ts`'s `assertRateLimit`) — never the external provider's own ceiling, which this process cannot observe directly for most providers. */
export function recordRateLimitEvent(provider: TelemetryProviderName, allowed: boolean): void {
  safely(() => {
    const entry = getCounters(provider);
    if (allowed) entry.rateLimitAllowed += 1;
    else entry.rateLimitRejected += 1;
  });
}

/** A closed->open transition specifically — call once per real trip, not once per subsequent rejection (see `recordCircuitRejection` for those). */
export function recordCircuitOpen(provider: TelemetryProviderName): void {
  safely(() => {
    getCounters(provider).circuitOpens += 1;
  });
}

/** A request the breaker refused before any network attempt — because it was open, or half-open with a trial already in flight. */
export function recordCircuitRejection(provider: TelemetryProviderName): void {
  safely(() => {
    getCounters(provider).circuitRejections += 1;
  });
}

/** One record per logical `fetchJson()` call — see `ProviderCallObservation`'s own doc comment on why this is never one-per-attempt. */
export function recordProviderCall(observation: ProviderCallObservation): void {
  safely(() => {
    const entry = getCounters(observation.provider);
    entry.calls += 1;
    entry.attempts += observation.attempts;
    entry.retries += observation.retryCount;
    entry.outcomes[observation.outcome] += 1;
    entry.latencySamplesMs.push(observation.durationMs);
    if (entry.latencySamplesMs.length > MAX_LATENCY_SAMPLES) {
      entry.latencySamplesMs.shift();
    }
  });
}

export type ProviderTelemetrySnapshot = {
  provider: TelemetryProviderName;
  /** Always `"process-local"` — see this module's own top comment. Never implies a global, cross-instance total. */
  scope: "process-local";
  processStartedAt: string;
  calls: number;
  attempts: number;
  retries: number;
  outcomes: Record<ProviderCallOutcome, number>;
  cache: {
    hits: number;
    misses: number;
    /** `null` when this process has recorded neither a hit nor a miss yet for this provider — never a fabricated 0%. */
    hitRatePercent: number | null;
  };
  rateLimiter: {
    allowed: number;
    rejected: number;
  };
  circuitBreaker: {
    currentState: CircuitState;
    opens: number;
    rejectedWhileOpen: number;
  };
  latency: {
    sampleCount: number;
    avgMs: number | null;
    minMs: number | null;
    maxMs: number | null;
    /** `null` below `MIN_SAMPLES_FOR_P95` samples — never a fabricated percentile from too few points (PR-110 Phase 10). */
    p95Ms: number | null;
  };
};

function percentile(sortedAsc: number[], p: number): number {
  const index = Math.ceil((p / 100) * sortedAsc.length) - 1;
  return sortedAsc[Math.min(Math.max(index, 0), sortedAsc.length - 1)]!;
}

export function getProviderTelemetrySnapshot(provider: TelemetryProviderName): ProviderTelemetrySnapshot {
  const entry = getCounters(provider);
  const totalCacheChecks = entry.cacheHits + entry.cacheMisses;
  const samples = entry.latencySamplesMs;

  return {
    provider,
    scope: "process-local",
    processStartedAt,
    calls: entry.calls,
    attempts: entry.attempts,
    retries: entry.retries,
    outcomes: { ...entry.outcomes },
    cache: {
      hits: entry.cacheHits,
      misses: entry.cacheMisses,
      hitRatePercent: totalCacheChecks > 0 ? Math.round((entry.cacheHits / totalCacheChecks) * 1000) / 10 : null,
    },
    rateLimiter: {
      allowed: entry.rateLimitAllowed,
      rejected: entry.rateLimitRejected,
    },
    circuitBreaker: {
      // `getCircuitState` is typed against the 6-name `ProviderName` union;
      // "snapshot" is real but excluded from it (see this file's own
      // top-of-module comment) — the same widening cast
      // `lib/providers/snapshot/client.ts` already applies for the exact
      // same reason, reused here rather than inventing a second approach.
      currentState: getCircuitState(provider as ProviderName).state,
      opens: entry.circuitOpens,
      rejectedWhileOpen: entry.circuitRejections,
    },
    latency: {
      sampleCount: samples.length,
      avgMs: samples.length > 0 ? Math.round(samples.reduce((a, b) => a + b, 0) / samples.length) : null,
      minMs: samples.length > 0 ? Math.min(...samples) : null,
      maxMs: samples.length > 0 ? Math.max(...samples) : null,
      p95Ms: samples.length >= MIN_SAMPLES_FOR_P95 ? percentile([...samples].sort((a, b) => a - b), 95) : null,
    },
  };
}

export function getAllProviderTelemetrySnapshots(): ProviderTelemetrySnapshot[] {
  return TELEMETRY_PROVIDER_NAMES.map((provider) => getProviderTelemetrySnapshot(provider));
}

/** Test-only reset — production code never calls this. Mirrors `cache.ts`'s `__resetProviderCacheForTests()`/`circuitBreaker.ts`'s `__resetCircuitBreakerForTests()` exactly. */
export function __resetProviderTelemetryForTests(): void {
  for (const provider of TELEMETRY_PROVIDER_NAMES) {
    counters.set(provider, createEmptyCounters());
  }
}
