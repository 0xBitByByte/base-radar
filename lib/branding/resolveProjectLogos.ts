import { getProjects } from "@/data/projects/helpers";
import { getOrSet } from "@/lib/providers/common/cache";
import * as coingecko from "@/lib/providers/coingecko/service";
import { collectRegistryCoingeckoIds } from "@/lib/intelligence/sources";
import { resolveLogoUrl } from "@/lib/projects/build";

export type ProjectLogoEntry = { logoUrl: string | null; logoUrlFallbacks: string[] };

const PROJECT_LOGO_MAP_CACHE_TTL_MS = 90_000; // matches coingecko/service.ts's own market-data TTL

/**
 * Project Logo System — the lightweight counterpart to `buildLiveProject`'s
 * full logo resolution (`lib/projects/build.ts`'s `resolveLogoUrl`, which
 * needs a whole `ProjectIntelligence` already built) for contexts that
 * legitimately don't run the full intelligence engine per project: Alerts,
 * Portfolio widgets, Dashboard Ecosystem widgets, Daily Brief — each renders
 * many small project rows and would be far too expensive to build full
 * intelligence for every one just to get a logo.
 *
 * Before this existed, those call sites read `getProject(id)?.logoUrl`
 * directly — the *raw* registry field only, with no CoinGecko/DefiLlama/
 * GitHub fallback. Confirmed live: zero of the registry's seed files set
 * that field, so every one of those call sites always fell to the generic
 * initials badge, for every project, unconditionally — not a rare edge
 * case. This resolves the same two highest-value tiers `resolveLogoUrl`
 * itself would (registry `logoUrl` → CoinGecko `imageUrl`) using data
 * that's already batch-fetched and cached elsewhere (`getMarketsByIds`,
 * shared with `fetchProviderBulkData`'s own bulk market fetch) — real,
 * live data, still exactly one priority-order function
 * (`resolveLogoUrl`), just called with a lighter, cheaper candidate set
 * than the full pipeline provides. DefiLlama/GitHub tiers are
 * deliberately omitted here for the same reason the dedicated Pools page
 * already accepts a lighter tier set for its own project-token logo: a
 * rarer marginal win not worth a second and third network fetch for
 * every project on every page load of these lightweight surfaces.
 */
export async function getProjectLogoMap(): Promise<Record<string, ProjectLogoEntry>> {
  return getOrSet("project-logo-map:v1", PROJECT_LOGO_MAP_CACHE_TTL_MS, async () => {
    const projects = getProjects();
    const marketsResult = await coingecko.getMarketsByIds(collectRegistryCoingeckoIds());
    const marketsById = new Map((marketsResult.ok ? marketsResult.data : []).map((m) => [m.id, m]));

    const map: Record<string, ProjectLogoEntry> = {};
    for (const project of projects) {
      const market = project.providerIds.coingeckoId ? marketsById.get(project.providerIds.coingeckoId) : undefined;
      map[project.id] = resolveLogoUrl([project.logoUrl ?? null, market?.imageUrl ?? null]);
    }
    return map;
  });
}
