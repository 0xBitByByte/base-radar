/**
 * PR-054 — Task 6: the Search Index. The UI should only ever consume
 * `searchLiveProjects()`'s results — it never re-tokenizes a project or
 * inspects its raw fields to decide whether it matches a query.
 *
 * Indexed fields, all real and already on `LiveProject`: name, known
 * aliases, symbol, slug, CoinGecko id, DefiLlama slug, GitHub `owner/repo`,
 * website (both the full URL and its bare hostname — PR-056), and contract
 * addresses. Nothing here is fuzzy — a token either contains the
 * (lowercased) query as a substring or it doesn't; ranking is decided by
 * which field matched, not by string-distance heuristics.
 */

import type { LiveProject, ProjectSearchIndex, SearchIndexEntry, SearchResult } from "@/lib/projects/types";

/** Higher-weight fields rank a match higher — an exact name hit should always outrank a contract-address substring hit. */
const FIELD_WEIGHTS = {
  name: 100,
  alias: 80,
  symbol: 70,
  slug: 60,
  coingeckoId: 50,
  defillamaSlug: 50,
  github: 40,
  /** PR-056 — ranks above the raw `website` URL: a bare domain match ("aerodrome.finance") is a cleaner identifier hit than a substring match somewhere inside a full URL's path/query string. */
  websiteHostname: 35,
  website: 30,
  contract: 20,
} as const;

type FieldToken = { value: string; weight: number };

/**
 * PR-056 — deterministic hostname extraction, no `URL` API (which throws on
 * a protocol-less input like `"aerodrome.finance"`, a real shape this
 * codebase's `websiteUrl` values can take). Strips a leading protocol, cuts
 * at the first `/`/`?`/`#`, then strips a leading `www.` — the same
 * stripping rules `lib/discovery/normalize.ts`'s `normalizeWebsite()`
 * already applies, isolated down to just the host component. Pure string
 * manipulation, never a guess.
 */
function extractWebsiteHostname(url: string): string | null {
  const withoutProtocol = url.trim().replace(/^[a-z][a-z0-9+.-]*:\/\//i, "");
  const host = withoutProtocol.split(/[/?#]/)[0];
  const withoutWww = host.replace(/^www\./i, "");
  return withoutWww ? withoutWww.toLowerCase() : null;
}

function tokensForProject(project: LiveProject): FieldToken[] {
  const { identity, slug, searchIdentifiers } = project;
  const tokens: FieldToken[] = [{ value: identity.name, weight: FIELD_WEIGHTS.name }];

  for (const alias of searchIdentifiers.aliases) tokens.push({ value: alias, weight: FIELD_WEIGHTS.alias });
  if (searchIdentifiers.symbol) tokens.push({ value: searchIdentifiers.symbol, weight: FIELD_WEIGHTS.symbol });
  if (slug) tokens.push({ value: slug, weight: FIELD_WEIGHTS.slug });
  if (searchIdentifiers.coingeckoId) tokens.push({ value: searchIdentifiers.coingeckoId, weight: FIELD_WEIGHTS.coingeckoId });
  if (searchIdentifiers.defillamaSlug) tokens.push({ value: searchIdentifiers.defillamaSlug, weight: FIELD_WEIGHTS.defillamaSlug });
  if (searchIdentifiers.github) tokens.push({ value: searchIdentifiers.github, weight: FIELD_WEIGHTS.github });
  if (identity.websiteUrl) {
    tokens.push({ value: identity.websiteUrl, weight: FIELD_WEIGHTS.website });
    const hostname = extractWebsiteHostname(identity.websiteUrl);
    if (hostname) tokens.push({ value: hostname, weight: FIELD_WEIGHTS.websiteHostname });
  }
  for (const address of searchIdentifiers.contractAddresses) tokens.push({ value: address, weight: FIELD_WEIGHTS.contract });

  return tokens;
}

/** Builds the index once per `LiveProject[]` snapshot — reused across many searches against the same data. */
export function buildProjectSearchIndex(projects: LiveProject[]): ProjectSearchIndex {
  return projects.map(
    (project): SearchIndexEntry => ({
      id: project.id,
      tokens: tokensForProject(project).map((token) => token.value.toLowerCase()),
      project,
    })
  );
}

/**
 * Case-insensitive substring match against every indexed token, scored by
 * the highest-weight field that matched (never summed across fields, so a
 * project matching on both name and website doesn't outrank an exact-name
 * match on a different project purely by token count). Empty/whitespace
 * queries return no results rather than the whole index.
 */
export function searchLiveProjects(index: ProjectSearchIndex, query: string): SearchResult[] {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return [];

  const results: SearchResult[] = [];

  for (const entry of index) {
    // Cheap pre-filter against the flat token list before recomputing weights.
    if (!entry.tokens.some((token) => token.includes(normalizedQuery))) continue;

    let bestScore = 0;
    for (const field of tokensForProject(entry.project)) {
      if (field.value.toLowerCase().includes(normalizedQuery)) {
        bestScore = Math.max(bestScore, field.weight);
      }
    }
    if (bestScore > 0) results.push({ project: entry.project, score: bestScore });
  }

  return results.sort((a, b) => b.score - a.score || a.project.id.localeCompare(b.project.id));
}
