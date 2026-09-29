import { unstable_cache } from "next/cache";

import { getProject } from "@/data/projects/helpers";
import { getRawWhaleEvents } from "@/lib/data/aggregate";
import { buildProjectIntelligence } from "@/lib/intelligence/engine";
import { getGovernanceProvider } from "@/lib/governance";
import { getLiveProjects } from "@/lib/projects/service";
import { resolveTradingDiscoveryStrategies } from "@/lib/trading/discoveryStrategy";
import { resolveTokenLogosForPools } from "@/lib/branding/resolveTokenLogo";
import { pairToTradingPool } from "@/lib/intelligence/merge";
import * as blockscout from "@/lib/providers/blockscout/service";
import * as coingecko from "@/lib/providers/coingecko/service";
import * as dexscreener from "@/lib/providers/dexscreener/service";
import type { GovernanceEvent } from "@/lib/governance";
import type { ProviderResult } from "@/lib/providers/common/types";

/**
 * Scoped ISR data cache for the six public `app/dashboard/projects/[slug]/*`
 * routes ONLY (main profile + ai/contracts/governance/pools/whale) —
 * confirmed root cause of a real Vercel Hobby-plan fair-use suspension
 * (Fluid Active CPU + Fast Origin Transfer both over limit, zero real
 * visitors, driven by `sitemap.xml`/`robots.ts` actively advertising these
 * pages to crawlers). Deliberately NOT a change to `fetchJson()`'s global
 * `cache: "no-store"` policy (`lib/providers/common/utilities.ts`) or to
 * `lib/providers/common/cache.ts`'s existing TTL cache — both stay exactly
 * as they are, for every other route in the app, including the main project
 * page (`[slug]/page.tsx`), which is intentionally NOT wrapped here (see
 * that file's own doc comment on `revalidate` for why: its deferred-
 * Suspense streaming architecture passes live, unresolved provider
 * promises straight into child components, which is fundamentally
 * incompatible with `unstable_cache`, whose return value must be a single
 * plain, already-resolved, JSON-serializable value).
 *
 * `unstable_cache` (not Next 16's newer `"use cache"` directive/Cache
 * Components) is used deliberately: Cache Components is an opt-in,
 * project-wide rendering mode (`cacheComponents` in `next.config`) this app
 * doesn't enable, and turning it on is exactly the kind of broad,
 * cross-cutting change this pass was told explicitly not to make.
 * `unstable_cache` is soft-deprecated in favor of it (Next's own docs) but
 * fully supported and, critically, narrowly scoped to exactly the call
 * sites wrapped here — nothing else in the app is affected.
 *
 * Why this actually stops the routes being classified fully dynamic: a
 * `fetch(..., { cache: "no-store" })` deep inside `fetchJson()`
 * (`lib/providers/common/utilities.ts`) is, on its own, a "this route is
 * dynamic" signal Next's renderer picks up wherever it's reached during a
 * page render — regardless of the page's own `export const revalidate`.
 * Calling the SAME provider function from inside an `unstable_cache(...)`
 * callback moves that fetch into Next's own persistent Cache Components
 * data cache instead: the wrapped function is invoked (and its `no-store`
 * fetch actually reaches the network) only on a real cache miss or
 * revalidation, and every other request within the `revalidate` window
 * reads the already-resolved, cached result straight out of Next's Data
 * Cache without the callback (or its inner fetch) ever executing again —
 * so the dynamic signal never fires during a cache hit, and Next classifies
 * the route as static/ISR rather than per-request dynamic.
 *
 * Every function below:
 * - Takes only plain, serializable arguments (slug/id/address strings), not
 *   live objects — so the cache key Next derives from the arguments is
 *   stable across requests for the same project.
 * - Returns only plain, JSON-serializable data (objects/arrays/strings/
 *   numbers/booleans/null) — confirmed for each wrapped provider call's
 *   actual return type before adding it here. No promises, functions, or
 *   class instances are ever returned.
 * - Fetches ONLY public, non-personalized project data — no cookies,
 *   headers, session, wallet, or admin state is read anywhere in this file,
 *   matching the same constraint already verified for the six page files
 *   themselves.
 * - Revalidates every 300s (5 minutes) — the same window applied to each
 *   page's own `export const revalidate`, so the page-level ISR window and
 *   the data-level cache window agree; there is no product requirement
 *   calling for tighter project-intelligence freshness than that.
 */
const REVALIDATE_SECONDS = 300;

/** Shared by `ai/page.tsx` and `whale/page.tsx` — both call this exact function today, uncached. */
export const getCachedRawWhaleEvents = unstable_cache(
  async () => getRawWhaleEvents(),
  ["project-subpage:raw-whale-events"],
  { revalidate: REVALIDATE_SECONDS, tags: ["project-subpages"] }
);

/** Shared by the main page (NOT wrapped, see file doc comment) and `ai/page.tsx` (wrapped here) — same call, same extended:false shape. */
export const getCachedProjectIntelligence = unstable_cache(
  async (slug: string) => {
    const project = getProject(slug);
    if (!project) return null;
    return buildProjectIntelligence(project, undefined, { extended: false });
  },
  ["project-subpage:intelligence"],
  { revalidate: REVALIDATE_SECONDS, tags: ["project-subpages"] }
);

/** Used by `ai/page.tsx`'s category-TVL-leadership comparison. */
export const getCachedLiveProjects = unstable_cache(
  async () => getLiveProjects(),
  ["project-subpage:live-projects"],
  { revalidate: REVALIDATE_SECONDS, tags: ["project-subpages"] }
);

/** `contracts/page.tsx` — same candidate-address resolution + per-address Blockscout lookup, keyed by the exact address set. */
export const getCachedContractDetails = unstable_cache(
  async (addresses: string[]) => {
    const detailsResults = await Promise.all(
      addresses.map((address) => blockscout.getContractDetail(address).then((result) => ({ address, result })))
    );
    return blockscout.contractDetailsByAddress(detailsResults);
  },
  ["project-subpage:contract-details"],
  { revalidate: REVALIDATE_SECONDS, tags: ["project-subpages"] }
);

/** `governance/page.tsx` — same single-project Snapshot fetch. */
export const getCachedGovernanceEvents = unstable_cache(
  async (projectId: string, projectName: string, snapshotSpace: string): Promise<GovernanceEvent[]> =>
    getGovernanceProvider().fetchEvents({ projects: [{ projectId, projectName, snapshotSpace }] }),
  ["project-subpage:governance-events"],
  { revalidate: REVALIDATE_SECONDS, tags: ["project-subpages"] }
);

/**
 * `pools/page.tsx` — the full pipeline (trading-discovery-strategy pair
 * search, then, only when real pools were found, the parallel
 * CoinGecko-market + token-logo resolution) wrapped as ONE cached function,
 * deliberately, not two — the page's own original control flow only makes
 * the second pair of calls once it already knows the first found pools, so
 * splitting this into two `unstable_cache` entries would either duplicate
 * that branching outside the cache (re-introducing an uncached path) or
 * change the page's behavior. Returns exactly the plain data the page
 * itself derives at each step, unchanged.
 */
export const getCachedPoolsPageData = unstable_cache(
  async (slug: string) => {
    const project = getProject(slug);
    if (!project) return null;

    const strategies = resolveTradingDiscoveryStrategies(project);
    let richerPairsResult: Awaited<ReturnType<typeof dexscreener.getPairsForToken>> | null = null;
    for (const strategy of strategies) {
      if (strategy.kind === "token") {
        richerPairsResult = await dexscreener.getPairsForToken(strategy.tokenAddress);
      } else if (strategy.kind === "dex") {
        richerPairsResult = await dexscreener.getPairsByDexId(strategy.dexIds);
      } else {
        continue;
      }
      if (richerPairsResult.ok && richerPairsResult.data.length > 0) break;
    }

    if (!richerPairsResult || !richerPairsResult.ok || richerPairsResult.data.length === 0) {
      return {
        strategies,
        richerPairsResult,
        pools: [] as ReturnType<typeof pairToTradingPool>[],
        primaryMarketResult: null as ProviderResult<{ imageUrl: string | null }[]> | null,
        tokenLogos: {} as Record<string, string>,
      };
    }

    // Same `pairToTradingPool` normalization the page itself applies before
    // deriving base/quote token identities for the logo resolver — matches
    // `pools/page.tsx`'s own `pools.flatMap(...)` exactly, just computed
    // here (inside the cache, and returned directly) instead of after this
    // call returns, so the page never has to redo it.
    const pools = richerPairsResult.data.map(pairToTradingPool);
    const coingeckoId = project.providerIds?.coingeckoId ?? null;
    const [primaryMarketResult, tokenLogos] = await Promise.all([
      coingeckoId ? coingecko.getMarketsByIds([coingeckoId]) : Promise.resolve({ ok: true as const, data: [] }),
      resolveTokenLogosForPools(
        pools.flatMap((pool) => [
          { symbol: pool.baseTokenSymbol, address: pool.baseTokenAddress },
          { symbol: pool.quoteTokenSymbol, address: pool.quoteTokenAddress },
        ])
      ),
    ]);

    return { strategies, richerPairsResult, pools, primaryMarketResult, tokenLogos };
  },
  ["project-subpage:pools"],
  { revalidate: REVALIDATE_SECONDS, tags: ["project-subpages"] }
);
