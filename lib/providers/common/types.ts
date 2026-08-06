/**
 * Shared cross-provider types. This module has no dependencies on the rest
 * of the provider layer — every other common module (and every provider)
 * depends on this one, never the other way around.
 */

export const PROVIDER_NAMES = ["coingecko", "dexscreener", "defillama", "blockscout", "github", "base"] as const;
export type ProviderName = (typeof PROVIDER_NAMES)[number];

/**
 * Plain error info — deliberately NOT a `ProviderError` instance. A live
 * `Error` object crossing into a "use client" component via `use()` gets
 * its message redacted by React's Flight serializer in production builds
 * (see `toProviderResult` in `common/utilities.ts`), so this must always be
 * constructed as an object literal, never the class instance itself.
 */
export type ProviderErrorInfo = {
  code: string;
  message: string;
};

export type ProviderSuccess<T> = {
  ok: true;
  data: T;
  source: ProviderName;
  fetchedAt: string;
  /**
   * PR-075 — `true` when `data` is real, previously-fetched data served
   * from cache because the live call just failed (e.g. GitHub rate
   * limited), rather than a fresh response. `fetchedAt` above is always the
   * real, original fetch time in this case — never "now" — so combined
   * with this flag, a consumer can honestly show "Stale — updated 3h ago"
   * instead of either fabricating freshness or discarding real data.
   * `undefined`/omitted for a genuinely fresh success.
   */
  stale?: boolean;
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
