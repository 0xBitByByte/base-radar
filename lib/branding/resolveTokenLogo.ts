import { getOrSet, getStale } from "@/lib/providers/common/cache";
import * as coingecko from "@/lib/providers/coingecko/service";
import { KNOWN_TOKEN_LOGOS } from "@/lib/branding/tokenRegistry";

export type TokenLogoQuery = {
  /** On-chain contract address — the most collision-safe identifier, tried first. */
  address?: string | null;
  /** A CoinGecko coin id already known for this token (e.g. a registry project's `providerIds.coingeckoId`). */
  coingeckoId?: string | null;
  /** The token's canonical identity key when known — see this file's own doc comment on why symbol, not address, is the cache key. */
  symbol?: string | null;
};

// Token Logo System — a *successful* resolution is checked via `getStale()`
// below before ever re-fetching (see `resolveTokenLogo`), so it's
// effectively cached indefinitely — a real logo never changes, and nothing
// in this process ever overwrites that entry once set. This TTL only
// governs how long a *miss* (nothing resolved) is trusted before retrying:
// deliberately short, because a miss can be a transient failure (e.g. the
// upstream rate-limiting this exact process, confirmed live — a real,
// observed failure mode, not a hypothetical one) rather than a genuine,
// permanent "this token has no logo anywhere." Caching a miss for as long
// as a hit would let one bad moment lock a token out of its real logo for
// the rest of that TTL, on every page, which is the opposite of this
// system's whole purpose. Matches the app's own outbound rate-limit window
// (`RATE_LIMIT.windowMs` in `coingecko/service.ts`) — a retry sooner than
// that window resets is guaranteed to fail again for the same reason.
const CANONICAL_LOGO_MISS_RETRY_TTL_MS = 60 * 1000; // 60s

/**
 * Token Logo System — resolves a token's one real logo, in priority order:
 * known symbol (static, verified, zero-network — see `tokenRegistry.ts`'s
 * doc comment on why this runs first) > contract address (works for any
 * token CoinGecko tracks, not just the curated list — the mechanism that
 * keeps this system general-purpose for tokens outside it) > known
 * provider id > (handled by the caller, not here) generic initials.
 *
 * Reliability: the address and provider-id tiers depend on a live
 * CoinGecko call, and that call has been directly observed failing under
 * this app's own outbound rate-limit pressure (confirmed via `curl`
 * returning 429 mid-session) — a real, recurring failure mode, not a
 * hypothetical one. Checking the static known-symbol map first means the
 * common tokens most pools actually pair against (WETH, USDC, AAVE, etc.)
 * never depend on that live call succeeding at all; only tokens genuinely
 * outside the curated list fall through to the network-dependent tiers.
 *
 * Canonicalization: different resolution paths can legitimately point at
 * different real CoinGecko listings for what a viewer reads as "the same
 * token" — e.g. WETH's Base-specific contract listing vs. its general
 * "weth" coin listing carry two different, both-real image URLs. Resolving
 * per-query (address this call, symbol that call) let the *same* token show
 * two different official logos on different pages, which is exactly the
 * inconsistency this system exists to remove. Fix: once any tier resolves a
 * real URL for a given symbol, that URL is cached under the symbol itself
 * (not the address, not the query shape) and reused as the canonical answer
 * for every future lookup of that symbol, from any page, regardless of
 * which specific address or tier that later lookup would have hit on its
 * own. A token with no symbol (can't be canonicalized against anything
 * else) still resolves correctly, just without this cross-page convergence
 * — there's nothing to converge with.
 */
export async function resolveTokenLogo(query: TokenLogoQuery): Promise<string | null> {
  if (!query.symbol) {
    return resolveFirstRealCandidate(query);
  }
  const cacheKey = `token-logo-canonical:${query.symbol.toUpperCase()}`;

  // A prior real result is checked first and, if present, returned
  // immediately — `getStale()` never expires an entry on its own, so once
  // this symbol has ever resolved to a real URL in this process, every
  // later call (any page, any query shape) converges on that exact value
  // with zero further network calls. Only a miss (no entry yet, or the
  // entry itself is `null`) falls through to a fresh, short-TTL-cached
  // attempt below.
  const existing = getStale<string | null>(cacheKey);
  if (existing?.value) return existing.value;

  return getOrSet(cacheKey, CANONICAL_LOGO_MISS_RETRY_TTL_MS, () => resolveFirstRealCandidate(query));
}

async function resolveFirstRealCandidate(query: TokenLogoQuery): Promise<string | null> {
  // Tier 0 — static, verified, zero-network. Checked first: see this
  // file's own doc comment above for why a live call is the wrong
  // dependency for the common-token case specifically.
  const known = query.symbol ? KNOWN_TOKEN_LOGOS[query.symbol.toUpperCase()] : undefined;
  if (known) return known.logoUrl;

  if (query.address) {
    const byAddress = await coingecko.getTokenLogoByAddress(query.address);
    if (byAddress) return byAddress;
  }

  if (query.coingeckoId) {
    const result = await coingecko.getMarketsByIds([query.coingeckoId]);
    const url = result.ok ? (result.data[0]?.imageUrl ?? null) : null;
    if (url) return url;
  }

  return null;
}

export type PoolTokenIdentity = {
  symbol: string | null;
  address: string | null;
};

/** A pool's base/quote token pair, shaped just enough to build `PoolTokenIdentity` queries from — kept minimal and structural (not imported from `lib/intelligence/types.ts`) so this module has no dependency on the Intelligence Engine's own types. */
export type PoolTokenPair = {
  baseTokenSymbol: string | null;
  baseTokenAddress: string | null;
  quoteTokenSymbol: string | null;
  quoteTokenAddress: string | null;
};

/**
 * PR-104 — the exact query shape `resolveTokenLogosForPools` needs, factored
 * out of `app/dashboard/projects/[slug]/page.tsx` so it can be called
 * identically from two sites (a speculative prewarm and the definitive
 * resolution) and unit-tested directly. No behavior change from the inline
 * `flatMap` this replaces — same fields, same order.
 */
export function poolTokenIdentities(pools: PoolTokenPair[]): PoolTokenIdentity[] {
  return pools.flatMap((pool) => [
    { symbol: pool.baseTokenSymbol, address: pool.baseTokenAddress },
    { symbol: pool.quoteTokenSymbol, address: pool.quoteTokenAddress },
  ]);
}

/**
 * Token Logo System — the batched shape a page with many pools (many base +
 * quote tokens) should call instead of `resolveTokenLogo` once per token.
 * Resolves each *unique* token identity once (deduped by symbol when known,
 * else by address) via the same canonical resolver above, in parallel.
 * Returns a map keyed by both symbol and (lowercased) address so a caller
 * can look up whichever identifier it has for a given token — both keys
 * for the same real token always point at the same cached canonical URL.
 */
export async function resolveTokenLogosForPools(tokens: PoolTokenIdentity[]): Promise<Record<string, string>> {
  const uniqueByKey = new Map<string, PoolTokenIdentity>();
  for (const token of tokens) {
    const key = token.symbol ? `symbol:${token.symbol.toUpperCase()}` : token.address ? `address:${token.address.toLowerCase()}` : null;
    if (key && !uniqueByKey.has(key)) uniqueByKey.set(key, token);
  }

  const resolved = await Promise.all(
    [...uniqueByKey.values()].map(async (token) => [token, await resolveTokenLogo(token)] as const)
  );

  const result: Record<string, string> = {};
  for (const [token, url] of resolved) {
    if (!url) continue;
    if (token.address) result[token.address.toLowerCase()] = url;
    if (token.symbol) result[token.symbol.toUpperCase()] = url;
  }
  return result;
}
