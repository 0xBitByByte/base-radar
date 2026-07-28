# PR-056 — Live Projects Service Enhancements

Backend-only follow-up to PR-054 (Live Projects Service) resolving the
concrete backend gaps PR-055's UX architecture review identified. No React
component, route, or UI was touched — every change is inside `lib/projects/`.
No commit, no push. Wait for review.

## Summary

PR-055's Filter UX (§5) and Sorting UX (§6) sections audited
`lib/projects/filter.ts`/`sort.ts` against the approved Projects Page UX
design and found five concrete, real gaps rather than hypothetical ones:
`FilterOptions`' `category`/`status`/`discoveryStatus`/`verificationStatus`
only accepted a single value (blocking the UX design's required
multi-select), there was no composed `verified` facet and no `hasVolume`
facet, and `SortField` had no way to rank by GitHub star count or by
verification recency. This PR closes all five, plus reviews and strengthens
the Search Index per Task 4's own explicit checklist (aliases, identifiers,
GitHub, CoinGecko, DefiLlama, contract addresses, website hostname) — adding
one real gap fix there too (a project's website is now also indexed by its
bare hostname, not just its full URL). Every change is additive,
backward-compatible, and deterministic — no fuzzy matching, no heuristics,
no new provider data invented.

## Task 1 — Multi-select Filters

`FilterOptions.category` / `.status` / `.discoveryStatus` /
`.verificationStatus` (`lib/projects/types.ts`) now accept either a single
value or an array of values. `filter.ts`'s new `toArray()` helper normalizes
a bare value to a one-element array so **every existing call site keeps
working unchanged** — backward compatible, not a breaking change. A new
`matchesAny()` helper implements the actual rule: an `undefined` or empty
selection imposes no constraint; otherwise a project must match at least one
selected value (OR within the facet). Every facet in `FilterOptions` still
combines with every other facet as AND, unchanged from PR-054 — e.g.
`{category: ["dex", "lending"], verified: true}` matches a DEX-or-Lending
project that is *also* verified, exactly the brief's own worked example.

## Task 2 — New Filters

- **`verified?: boolean`** — reuses `collections.ts`'s own `isVerified()`
  rule (`verification.status === "verified" || discoveryStatus ===
  "verified"`), now exported from `collections.ts` specifically so
  `filter.ts` imports it rather than redefining "verified" a second time.
  One definition, two consumers.
- **`hasVolume?: boolean`** — mirrors the existing `hasTvl` exactly:
  `market.volume24hUsd !== null`. No new provider data — `volume24hUsd` was
  already a real field on `LiveProject.market`, just never exposed as its
  own filter facet.

## Task 3 — Sorting

`SortField` gained `"stars"` (→ `engineering.stars`) and `"verifiedDate"`
(→ `verification.verifiedAt`, parsed the same way every other date field
already is via `sort.ts`'s existing `toEpochMs()`). Neither needed any
change to `sortLiveProjects()`'s comparison logic — both are ordinary
`SortValue`s (`number | string | null`) and fall through the exact same
nulls-last, id-tie-break machinery every other field already uses. This was
a deliberate design choice worth calling out: **no special-casing was
needed for either new field**, which is itself evidence that PR-054's
original sort architecture was built generically enough to extend safely.
`"stars"` is intentionally distinct from the existing `"activity"` field
(`commitsLast7d`) — a star count and a commit-activity count are different
signals, and PR-055's own "Top GitHub" naming discussion had conflated them;
they're now independently sortable.

## Task 4 — Search Improvements

Reviewed `lib/projects/search.ts`'s `tokensForProject()` against the task's
own checklist:

| Requirement | Status |
| --- | --- |
| Aliases | Already indexed (weight 80) — unchanged. |
| Identifiers (symbol, slug) | Already indexed (70, 60) — unchanged. |
| GitHub | Already indexed as `owner/repo` (weight 40) — unchanged. |
| CoinGecko | Already indexed (`coingeckoId`, weight 50) — unchanged. |
| DefiLlama | Already indexed (`defillamaSlug`, weight 50) — unchanged. |
| Contract addresses | Already indexed (weight 20) — unchanged. |
| Website hostname | **Gap found and fixed** — see below. |

**The one real gap**: `websiteUrl` was indexed only as its full raw string
(`"https://www.aerodrome.finance/swap?x=1"`), which still substring-matched
a bare domain query in the common case but produced two real problems: (1)
a query like `"www.aerodrome.finance"` wouldn't match a stored URL that
didn't happen to have a `www.` prefix, and (2) a path/query-string-heavy URL
could produce a false-positive-feeling match on an unrelated substring
buried in the path, ranked no differently than a clean domain hit. Fixed by
adding `extractWebsiteHostname()` — a small, pure, deterministic string
function (protocol strip → cut at first `/`/`?`/`#` → strip a leading
`www.` → lowercase; the same stripping discipline
`lib/discovery/normalize.ts`'s `normalizeWebsite()` already established,
applied specifically to isolate just the host component) — and indexing the
result as its own token at weight 35 (between `github` at 40 and the raw
`website` URL at 30, since a clean hostname match is a stronger identifier
signal than an incidental path/query substring hit, but weaker than a real
`owner/repo` GitHub match). The full URL is still indexed alongside it
(unchanged) so an exact-URL paste still matches too. No `URL` API is used —
it throws on the protocol-less website values this codebase's `websiteUrl`
field can legitimately hold, so this is hand-rolled, deterministic string
splitting instead, consistent with the "no fuzzy matching, no heuristics"
constraint.

## Task 5 — Tests

35 new tests added across the existing PR-054 test files (no new test
files — extending, not restructuring):

- **`tests/lib/projects/filter.test.ts`** (+18 tests, 3 new `describe`
  blocks): multi-select backward compatibility (bare value still works),
  OR-within-facet on an array, empty-array-means-no-constraint, AND-across-
  facets combined with an OR'd facet (the brief's own "DEX OR Lending AND
  Verified" example, tested literally), multi-select on `discoveryStatus`/
  `status`/`verificationStatus` (including a project with a `null`
  `verification.status` correctly excluded), the `verified` facet against
  both a registry-verified and a discovery-verified project (and its
  inverse, `verified: false`), and the `hasVolume` facet including a
  zero-volume-is-not-null edge case.
- **`tests/lib/projects/sort.test.ts`** (+11 tests, 2 new `describe`
  blocks): `stars` ascending/descending, nulls-last in both directions, a
  test proving `stars` and `activity` genuinely rank differently for the
  same two projects (confirming they're independent signals, not aliases of
  each other), and id tie-breaking; `verifiedDate` ascending/descending,
  nulls-last, and every-null-project-groups-at-the-end-tie-broken-by-id.
- **`tests/lib/projects/search.test.ts`** (+13 tests, 2 new `describe`
  blocks): hostname matching through a protocol, a `www.` prefix, a
  path/query string, and a protocol-less URL; a hostname match correctly
  outranking an unrelated path-substring match on a different project; a
  name match still outranking a hostname match; no throw on a `null`
  `websiteUrl`; plus edge cases — no results for a genuinely absent query,
  no fuzzy/typo tolerance (a deliberate negative test), a real Discovery
  alias match, an empty project list, and score-tied results breaking on id.

## Files Changed

- `lib/projects/types.ts` — `FilterOptions` widened (multi-select fields,
  `verified`, `hasVolume`); `SORT_FIELDS` gained `stars`/`verifiedDate`.
- `lib/projects/collections.ts` — `isVerified()` exported (previously
  module-private) for reuse by `filter.ts`.
- `lib/projects/filter.ts` — `toArray()`/`matchesAny()` helpers; `matches()`
  extended for multi-select, `verified`, `hasVolume`.
- `lib/projects/sort.ts` — two new `valueForField()` cases.
- `lib/projects/search.ts` — `extractWebsiteHostname()` + hostname indexing.
- `tests/lib/projects/{filter,sort,search}.test.ts` — expanded, no new files.
- `docs/PR-054_LIVE_PROJECTS_SERVICE.md` — §4/§5/§6 updated to reflect the
  new capabilities rather than going stale.
- `docs/PR-055_PROJECTS_PAGE_UX_ARCHITECTURE.md` — §5/§6/§10's gap
  call-outs annotated as resolved, pointing at this document.
- `docs/PR-056_PROJECTS_SERVICE_ENHANCEMENTS.md` — this document.

## Validation Results

- `npx tsc --noEmit` — clean, zero errors.
- `npm run lint` — clean, zero warnings/errors.
- `npm test` (full suite) — **189 passed** across 20 files (up from 154 at
  the end of PR-054; +35 new tests, 0 regressions).
- `npm run build` — clean production build, 23 routes generated, no new
  warnings introduced.

## Implementation Notes

- **Backward compatibility was verified, not just claimed**: the first test
  in the new multi-select `describe` block passes a bare single value
  (`{category: "dex"}`) through the widened type and asserts identical
  behavior to PR-054 — a real regression check, not just a type-level
  assumption.
- **`isVerified` now has exactly one definition.** It would have been easy
  to re-derive the "verified" rule inline inside `filter.ts`'s `matches()`
  function; exporting `collections.ts`'s existing implementation instead
  means the `verified` collection and the `verified` filter can never
  silently drift apart from each other.
- **No `URL` API in the hostname extractor** was a deliberate correctness
  fix, not a style preference — `new URL("aerodrome.finance")` throws
  (`Invalid URL`) because the string has no protocol, and this codebase's
  `websiteUrl` values are real free-text registry/discovery data that isn't
  guaranteed to always include one. A test (`"matches a protocol-less
  website value"`) exists specifically because this was caught during
  implementation, not assumed safe.
- **Nothing needed to change in `sortLiveProjects()`'s comparison
  function** to add two new sortable fields — confirms PR-054's original
  `SortValue`/`compareValues` design was generic enough that "add a field"
  really is a one-line change, as that PR's own architecture intended.
- **Scope discipline**: two facets PR-055 flagged as gaps (`Provider
  Coverage`, a dedicated `Recently Discovered` boolean) were deliberately
  **not** added here — PR-055 itself only recommended `verified` and
  `hasVolume` as concrete, well-specified additions; the other two still
  lack a clear enough facet shape to implement without guessing, and are
  left for a future PR once a real UX need pins down the exact shape.

No commit, no push. Wait for review.
