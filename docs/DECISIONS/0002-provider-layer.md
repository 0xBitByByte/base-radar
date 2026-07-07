# 0002 — Provider Layer

## Status

Accepted (implemented)

## Context

The dashboard needs real network, market, and developer-activity data, but
Base Radar has no budget assumption for paid data APIs and needed a way to
integrate multiple, independently unreliable third-party services without
letting any one of them threaten page rendering. See
[API.md](../API.md#provider-layer) for the resulting per-provider detail.

## Decision

- One module per external API under `lib/data/providers/`: `baseRpc.ts`,
  `blockscout.ts`, `coingecko.ts`, `defillama.ts`, `dexscreener.ts`,
  `github.ts`.
- Every provider function follows one contract: return typed data, or
  `null` on any failure — **never throw**.
- Every provider call sets an explicit `next: { revalidate: <seconds> }`
  window, tuned per data's volatility (20s for gas price up to 600s for
  GitHub repo stats — see [DATABASE.md](../DATABASE.md#caching-strategy)).
- Default to free, publicly documented, unauthenticated APIs; a paid
  provider is only introduced when no free option exists (documented gaps:
  wallet balances, whale-transfer indexing — see
  [API.md](../API.md#future-provider-interfaces)).

## Alternatives Considered

- **A single generic HTTP client with per-call config** — rejected because
  each provider has a distinct response shape and failure mode; a thin,
  provider-specific module is easier to read and test in isolation than a
  generic client with branching logic.
- **Throwing and catching at the call site (services layer)** — rejected
  in favor of `null`-on-failure at the provider itself, so every call site
  in `aggregate.ts` has one uniform thing to check, rather than needing its
  own try/catch per provider.
- **A shared cache layer (e.g. Redis) from the start** — rejected as
  premature; Next.js's built-in `fetch` cache via `revalidate` was
  sufficient for a single-instance deployment and avoids adding
  infrastructure before it's needed (see
  [DATABASE.md](../DATABASE.md#future-redis-cache) for when this would be
  reconsidered).

## Pros

- Adding, removing, or swapping a provider never requires a widget change
  — only `aggregate.ts`'s call site changes.
- The `null`-on-failure contract makes every aggregator function's error
  handling identical and predictable.
- Free-API-first keeps the project's operating cost at zero and keeps the
  barrier to contribution low (no API keys required to run locally).

## Cons

- Free APIs come with unstated or loosely documented rate limits (GitHub
  being the one hard, documented exception at 60 req/hour unauthenticated
  — see [API.md](../API.md#github)) — Base Radar mitigates this with
  conservative cache windows rather than precise rate-limit tracking.
- No shared cache across server instances today — acceptable for a
  single-instance deployment, a real constraint once horizontally scaled.

## Future Implications

Milestone 5 (Provider Layer, per [ROADMAP.md](../ROADMAP.md)) extends this
same contract to enrich Project Registry entries, using the `providerIds`
already defined on every `Project`. Any new provider must follow the same
never-throw, explicit-cache-window contract established here.
