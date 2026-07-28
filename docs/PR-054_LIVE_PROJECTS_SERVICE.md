# PR-054 — Live Projects Service

Combines the Project Registry (`data/projects/`), Provider Resolution (`lib/providers/common/resolution.ts`, PR-052), Project Intelligence (`lib/intelligence/`), and the Live Discovery Engine (`lib/discovery/`, PR-053) into one reusable `lib/projects/` service. Backend/data layer only — no UI was built or redesigned. No commit, no push, per the standing instruction on this whole PR sequence.

## 1. Architecture Changes

New module: `lib/projects/`. Nothing outside it changed except a real, pre-existing performance bug fixed in the provider layer (see §8's Performance section).

Pipeline:

```
Registry (data/projects/) ────────────────────────────┐
                                                        ├─▶ getAllProjectIntelligence()  ─┐
Discovery Sources (lib/discovery/providers/*) ─▶       │    (Provider Resolution +        │
  Registry Match ─▶ Classification ─▶ Confidence ──────┘     Project Intelligence)        ├─▶ merge ─▶ LiveProject[] ─▶ Collections / Sort / Filter / Search / Pagination
  (runDiscoveryPipelineAgainstRegistry())                                                  │
                                                        Discovery-only projects ───────────┘
```

`service.ts`'s `getLiveProjects()` (wrapped in React `cache()`) is the single entry point. It runs `getAllProjectIntelligence()` (PR-052's engine, unchanged) and `runDiscoveryPipelineAgainstRegistry()` (PR-053's pipeline, unchanged) **concurrently** via `Promise.all` — neither module was modified to make this possible; concurrency was already safe because both are pure functions over the same registry snapshot.

**Merge rule** (why a `LiveProject` is either registry-derived or discovery-only, never a guess): for each `DiscoveryProject` this run produced, its `evidence.registryMatch.type` decides its fate —

- `"duplicate" | "updated" | "renamed"` — `registryMatch.project` is guaranteed non-null for these three types (by `lib/discovery/registryMatch.ts`'s own construction). This discovery evidence is folded into that registry project's `LiveProject` via `buildLiveProjectFromIntelligence(project, intelligence, matchedDiscovery)`.
- `"new" | "alias" | "needs-review"` — either genuinely new or too weakly matched to trust automatically (an `"alias"`/`"needs-review"` match is explicitly unconfirmed by PR-053's own design). Becomes a standalone `LiveProject` via `buildLiveProjectFromDiscovery(discoveryProject)`, never silently attached to a possibly-wrong registry entry.

`getAllProjectIntelligence()`'s batch array is index-aligned with `getProjects()` (confirmed by reading `lib/intelligence/engine.ts`), so the registry side zips by array index rather than an id-based `.find()` per project.

## 2. Live Project Model

`lib/projects/types.ts`'s `LiveProject` — one shape for both a registry-tracked and a discovery-only project, built by the two adapters in `lib/projects/build.ts`. No UI-specific field exists on it.

```ts
type LiveProject = {
  id: string;                              // Project.id, or DiscoveryProject.id for discovery-only
  slug: string | null;                     // null for discovery-only — no registry route yet
  source: "registry" | "discovery";
  identity: { name, shortDescription, description, logoUrl, websiteUrl };  // desc fields null for discovery-only
  category: ProjectCategory;
  subcategories: ProjectTag[];             // reuses the existing tag vocabulary, no new concept
  chains: Chain[];
  status: ProjectStatus | null;            // null for discovery-only — a registry-only concept
  discoveryStatus: DiscoveryStatus | null; // null when Discovery didn't (re)surface this project this run
  verification: { status, level, verifiedAt };
  confidence: { score, level, source: "intelligence" | "discovery" };
  providerAttribution: Sources | null;     // null for discovery-only — no ProjectIntelligence record exists
  discoveryEvidence: DiscoveryEvidence | null;
  searchIdentifiers: { symbol, aliases, coingeckoId, defillamaSlug, github, contractAddresses };
  market: { available, priceUsd, changePct24h, marketCapUsd, fdvUsd, volume24hUsd, liquidityUsd, tvlUsd };
  community: { verificationStatus, socialLinkCount, socialLinkTotal, governanceConfigured };
  engineering: { available, stars, forks, commitsLast7d, commitTrendPct, hasRecentActivity };
  governance: { configured, activeProposalCount, totalProposalCount };
  contracts: { count, verifiedCount };     // verifiedCount null when not tracked (discovery-only)
  lastUpdated: string;                     // ISO — intelligence.metadata.generatedAt or discoveredAt
  discoveryMetadata: { sources, discoveredAt, registryMatchType } | null;
};
```

Every field a discovery-only project has no real evidence for is `null`/`false`/`0` — never guessed. `verification.verifiedAt` (`Project.verification.verifiedAt`) was added to the registry side specifically to make the "Recently Verified" collection computable from real data rather than always empty.

## 3. Collections (`lib/projects/collections.ts`)

`buildCollections(projects)` returns all ten in one pass:

| Collection | Rule | Honest limitation |
|---|---|---|
| `verified` | `verification.status === "verified"` OR `discoveryStatus === "verified"` | — |
| `new` | `discoveryStatus === "new"` | — |
| `recentlyUpdated` | `discoveryStatus === "recently-updated"` | No `lifecycle.updatedAt` recency check — that field isn't threaded onto `LiveProject` yet |
| `recentlyDiscovered` | has `discoveryMetadata` from this run | No discovery-run history is persisted anywhere in this codebase; collapses to "surfaced this run," matching PR-053's own documented gap for an equivalent case |
| `recentlyVerified` | `verification.verifiedAt` within 30 days | Real field, but likely empty today since most seed projects don't set it — not fabricated |
| `trending` | multi-source discovery agreement (>1 source) OR `\|changePct24h\| >= 10%` | — |
| `upcoming` | `discoveryStatus` is `"upcoming"` or `"announced"` | Inert today per PR-053 — no live discovery source currently produces these statuses |
| `highConfidence` | `confidence.level === "high"` | — |
| `needsReview` | `discoveryStatus === "needs-review"` OR `confidence.level === "low"` | — |
| `byCategory` | grouped by `category`, every `ProjectCategory` present (empty array, not omitted, for categories with no projects) | — |

## 4. Search Design (`lib/projects/search.ts`)

`buildProjectSearchIndex(projects)` tokenizes every project once; `searchLiveProjects(index, query)` does a case-insensitive substring match against every token, scored by the **highest-weight field that matched** (never summed — a project matching two low-value fields never outranks a different project's single high-value match).

Indexed fields and weights: `name` (100) → `aliases` (80) → `symbol` (70) → `slug` (60) → `coingeckoId`/`defillamaSlug` (50) → `github` "owner/repo" (40) → `websiteUrl` (30) → `contractAddresses` (20). `aliases` is real evidence only — populated when a matched `DiscoveryProject`'s `displayName` differs from the registry project's name (a rename/alias signal), never a guessed variant. Empty/whitespace queries return no results. The UI is expected to consume `SearchResult[]` as-is — never re-tokenize or re-rank.

**PR-056 update**: a project's `websiteUrl` is now also indexed by its bare, normalized hostname (weight 35, between `github` and the raw `website` URL) alongside the full URL — see `docs/PR-056_PROJECTS_SERVICE_ENHANCEMENTS.md` §4 for the full detail. The rest of this section is unchanged.

## 5. Sorting Rules (`lib/projects/sort.ts`)

`sortLiveProjects(projects, field, order = "desc")`. Fields: `confidence`, `marketCap`, `tvl`, `volume`, `activity` (→ `engineering.commitsLast7d`), `alphabetical` (case-insensitive), `discoveryDate`, `updatedDate`, **`stars`** (→ `engineering.stars`, PR-056), **`verifiedDate`** (→ `verification.verifiedAt`, PR-056). Two rules hold for every field: a `null` value always sorts last **regardless of direction** (a `null` isn't "smallest," it's "no data"), and ties break on `id` ascending so output is stable across repeated calls. Never mutates its input.

## 6. Filtering Rules (`lib/projects/filter.ts`)

`filterLiveProjects(projects, options)`. Every `FilterOptions` field is optional and independent; present options AND together. Options: `category`, `status`, `discoveryStatus`, `verificationStatus` (each now accepting a single value **or an array for multi-select, OR-within-facet — PR-056**), `hasMarket`, `hasTvl`, **`hasVolume`** (PR-056), `hasGithub`, `hasGovernance`, `hasContracts`, `minConfidence`, **`verified`** (PR-056 — the composed `verification.status === "verified" || discoveryStatus === "verified"` rule, reusing `collections.ts`'s own `isVerified`). No UI logic — a page passes the options a user picked and gets the matching subset back. See `docs/PR-056_PROJECTS_SERVICE_ENHANCEMENTS.md` for the full rationale and test coverage.

## 7. Files Modified

New (`lib/projects/`): `types.ts`, `build.ts`, `service.ts`, `collections.ts`, `sort.ts`, `filter.ts`, `search.ts`, `pagination.ts`, `index.ts`.

New tests (`tests/lib/projects/`): `fixtures.ts`, `build.test.ts`, `collections.test.ts`, `sort.test.ts`, `filter.test.ts`, `search.test.ts`, `pagination.test.ts` — 60 tests, mirroring `tests/lib/discovery/`'s fixture-based Vitest pattern.

Modified (performance fix, see §8): `lib/providers/coingecko/service.ts` (added `BASE_ECOSYSTEM_MARKETS_PAGE_SIZE` constant), `lib/discovery/providers/coingecko.ts`, `lib/intelligence/sources.ts` (both now reference the shared constant instead of two different literal page sizes).

## 8. Validation Results

- `npx tsc --noEmit` — clean, zero errors.
- `npm run lint` — clean, zero warnings/errors.
- `npm run test` (full suite) — **154 passed** across 20 files, including the 60 new `lib/projects` tests.
- `npm run build` — clean production build, 23 routes generated, no new warnings introduced.

**Performance (Task 8) — real bug found and fixed, not hypothetical:** `lib/discovery/providers/coingecko.ts` called `getBaseEcosystemMarkets()` with no argument (defaulting to `perPage=20`), while `lib/intelligence/sources.ts`'s bulk fetch calls the same function with `perPage=250` for what is conceptually the same "Base ecosystem market listing." Since the provider cache (`getOrSet`) keys on the exact call string including `perPage` (`` `${PROVIDER}:markets:${perPage}` ``), these two call sites never shared a cache entry — running Discovery and Intelligence concurrently (as `getLiveProjects()` now does) would have fired two independent network calls instead of one deduplicated call, directly undermining this PR's own "avoid duplicate provider calls" requirement. Fixed by exporting `BASE_ECOSYSTEM_MARKETS_PAGE_SIZE = 250` as a single source of truth from `lib/providers/coingecko/service.ts` and updating both call sites to reference it. The equivalent DefiLlama call (`getBaseProtocols()`) was checked and found to have no such mismatch — both callers already use zero arguments.

**Deterministic-behavior validation:** covered by the test suite itself rather than a separate manual pass — `collections.test.ts`, `sort.test.ts`, and `search.test.ts` each include an explicit "is deterministic" test asserting identical output across repeated calls on the same input; `sort.test.ts` and `filter.test.ts` each assert the input array is never mutated.

## 9. Remaining Work Before UI

- **No Projects page, Dashboard widget, or API route consumes this service yet** — this PR is backend/data-layer only, per its own brief. The next PR wires a real page to `getLiveProjects()` + `buildCollections()`/`sortLiveProjects()`/`filterLiveProjects()`/`buildProjectSearchIndex()`/`paginateLiveProjects()`.
- `recentlyUpdated` would be more complete with a real `lifecycle.updatedAt` recency check — requires threading `Project.lifecycle` onto `LiveProject`, deliberately left out of this PR's model since Task 2 asked for the model to stay lean and no current caller needs it yet.
- `recentlyDiscovered` is honestly "surfaced by this run" rather than a true historical recency window, since no discovery-run history is persisted anywhere in this codebase (matches an equivalent, already-documented limitation from PR-053).
- `upcoming`/`announced` (both in `discoveryStatus` and the `upcoming` collection) are real, evidence-gated rules that cannot currently fire — no live discovery source (`coingecko`/`defillama`/`blockscout`) surfaces a pre-launch project yet; the `community`/`base-ecosystem` sources that could are still placeholders returning zero candidates (a PR-053 limitation, unchanged here).
- Search currently does substring matching only, no fuzzy/typo tolerance — acceptable for a backend service whose consumers haven't been built yet, but worth revisiting once a real search UI is wired up and real query patterns are observed.
