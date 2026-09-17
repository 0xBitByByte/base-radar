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

/**
 * PR-111 — Next.js compiles each route (a Page, a Route Handler) into its
 * own server bundle, and a "shared" module like this one is not
 * guaranteed to be `require()`'d only once across those bundles — PR-110.1
 * proved, by directly grepping `.next/server`'s compiled output, that this
 * module's code is genuinely duplicated into several separate chunk files.
 * A plain module-scope `const counters = new Map(...)` is then NOT a true
 * process-wide singleton: each bundle that pulls in its own copy gets its
 * own private `Map`, so a real provider call recorded from a Page route
 * (one bundle) was invisible to the Admin Observability Route Handler
 * reading from a different bundle — reproduced live, repeatedly, in
 * PR-110.1's investigation, including against a clean production build.
 *
 * `globalThis` is not scoped to any module or bundle at all — it is the
 * one real JS global object for this Node.js process, identical no matter
 * how many separate copies of this module's code got compiled. Storing
 * the counters there (behind a `Symbol.for(...)` key, which — unlike a
 * plain string property — is guaranteed to resolve to the exact same
 * global registry entry for the same key from any module, with no
 * realistic risk of colliding with some unrelated global) makes every
 * bundle's copy of `getCounters()` resolve to the identical `Map`
 * instance. This is the same, well-established pattern Next.js's own
 * documented Prisma Client setup uses for the analogous "one client
 * instance, not one per hot-reloaded/re-bundled module" problem.
 *
 * Still genuinely process-local: `globalThis` is per-process, not
 * per-machine or cross-instance — a separate Vercel serverless instance
 * has its own separate process and therefore its own separate
 * `globalThis`, so this fixes cross-ROUTE visibility within one process
 * only, never cross-INSTANCE aggregation (still explicitly out of scope —
 * see this module's top-of-file comment on `scope: "process-local"`).
 *
 * Idempotent by construction: re-evaluating this module (a dev-mode Fast
 * Refresh reload, or simply a different bundle's own first `require()`)
 * finds the existing global entry, if one exists, and reuses it rather
 * than resetting real counters back to zero — the desired behavior, since
 * a file save mid-session should not silently wipe real telemetry.
 */
const TELEMETRY_GLOBAL_KEY = Symbol.for("base-radar:provider-telemetry:v1");

type TelemetryGlobalStore = {
  counters: Map<TelemetryProviderName, ProviderCounters>;
  processStartedAt: string;
};

function getGlobalStore(): TelemetryGlobalStore {
  const globalRef = globalThis as Record<symbol, TelemetryGlobalStore | undefined>;
  let store = globalRef[TELEMETRY_GLOBAL_KEY];
  if (!store) {
    store = {
      counters: new Map(TELEMETRY_PROVIDER_NAMES.map((provider) => [provider, createEmptyCounters()])),
      processStartedAt: new Date().toISOString(),
    };
    globalRef[TELEMETRY_GLOBAL_KEY] = store;
  }
  return store;
}

function getCounters(provider: TelemetryProviderName): ProviderCounters {
  const { counters } = getGlobalStore();
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
    processStartedAt: getGlobalStore().processStartedAt,
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
      //
      // PR-111 — deliberately NOT globalized: `opens`/`rejectedWhileOpen`
      // below are this module's own counters (recorded via
      // `recordCircuitOpen`/`recordCircuitRejection`, called FROM
      // `circuitBreaker.ts` regardless of which bundle's copy of that
      // module runs) and are correctly cross-route-shared by this file's
      // own `globalThis` fix. `currentState` is different: it's a live,
      // direct read of `circuitBreaker.ts`'s OWN separate `circuits` Map,
      // which PR-111 intentionally leaves untouched (out of scope — no
      // evidence this PR gathered proves the breaker's own protective
      // decision-making needs cross-bundle sharing, only that this
      // observability snapshot's *visibility* of it does). Practical
      // effect: `currentState` reflects whichever bundle's own circuit
      // instance is reachable from here, which may lag or differ from a
      // trip that happened via a different route's bundle — a known,
      // accepted limitation, not a bug this PR claims to have fixed.
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

/**
 * Test-only reset — production code never calls this. Mirrors `cache.ts`'s
 * `__resetProviderCacheForTests()`/`circuitBreaker.ts`'s
 * `__resetCircuitBreakerForTests()` exactly.
 *
 * PR-111 — resets the real shared `globalThis` store's contents in place
 * (not just a local reference), so every test file — regardless of
 * whether its own module import happens to be a fresh evaluation or a
 * cached one — observes the reset through the one real shared store.
 */
export function __resetProviderTelemetryForTests(): void {
  const { counters } = getGlobalStore();
  for (const provider of TELEMETRY_PROVIDER_NAMES) {
    counters.set(provider, createEmptyCounters());
  }
}
