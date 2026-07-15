/**
 * Shared cross-provider types. This module has no dependencies on the rest
 * of the provider layer — every other common module (and every provider)
 * depends on this one, never the other way around.
 */

export const PROVIDER_NAMES = ["coingecko", "dexscreener", "defillama", "blockscout", "github", "base"] as const;
export type ProviderName = (typeof PROVIDER_NAMES)[number];

/** Plain, structurally-typed error info — a `ProviderError` instance satisfies this shape. */
export type ProviderErrorInfo = {
  code: string;
  message: string;
};

export type ProviderSuccess<T> = {
  ok: true;
  data: T;
  source: ProviderName;
  fetchedAt: string;
};

export type ProviderFailure = {
  ok: false;
  source: ProviderName;
  error: ProviderErrorInfo;
};

/**
 * The envelope every service.ts function resolves to. Distinct from
 * `lib/data/types.ts`'s `WithSource<T>` (which tags dashboard-facing data
 * as "live" | "mock") — this is the lower-level "did the provider call
 * itself succeed" result. A future aggregator is expected to consume this
 * and translate it into `WithSource<T>` for the UI.
 */
export type ProviderResult<T> = ProviderSuccess<T> | ProviderFailure;
