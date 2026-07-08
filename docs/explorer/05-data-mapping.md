# Explorer — Data Mapping

**Status**: Draft
**Source of truth**: [01-product-requirements.md](01-product-requirements.md),
[02-information-architecture.md](02-information-architecture.md),
[03-screen-specifications.md](03-screen-specifications.md), and
[04-component-specification.md](04-component-specification.md) — this
document does not override, expand, or contradict any of them. Every field
referenced below is verified against the actual current contents of
`lib/intelligence/types.ts` and its supporting modules as they exist in
this codebase today — nothing here is a planned or assumed field.
**Scope of this document**: the data contract between `lib/intelligence/`
(already built) and the Explorer components named in 04 (not yet built).
No implementation, no code, no new fields, no new APIs.

---

## 1. Purpose

Every prior document in this series described Explorer from the outside
in — what it's for (01), how it's navigated (02), what it looks like (03),
and what pieces render it (04). This document closes the loop from the
inside out: it is the frozen map of exactly which `ProjectIntelligence`
field feeds exactly which component, so that "where does this number come
from" never has to be answered by guessing.

```
Project Registry (data/projects/)
        │  static, version-controlled project metadata
        ▼
Provider Layer (lib/providers/)
        │  live data from six free-tier providers, never exposed raw
        ▼
Project Intelligence Engine (lib/intelligence/)
        │  one normalized ProjectIntelligence record per project
        ▼
Explorer Components (04's component tree)
        │  ExplorerPage is the only consumer of the Engine;
        │  everything else only ever receives already-resolved data
        ▼
Rendered UI
```

This document only concerns itself with the last arrow. The first three
are already fully specified in
[docs/ARCHITECTURE.md](../ARCHITECTURE.md#future-intelligence-engine) and
are not re-derived here.

## 2. Data Flow

```
lib/providers/*/service.ts             (six providers, called only by sources.ts)
        │
        ▼
lib/intelligence/sources.ts             gathers + matches → ProjectSources
        │
        ▼
lib/intelligence/{merge,confidence,freshness,scoring}.ts
        │                                → the 13 ProjectIntelligence sections
        ▼
lib/intelligence/engine.ts              getProjectIntelligence() / getAllProjectIntelligence()
        │
        ▼
ExplorerPage                            the ONLY Explorer component that calls the above
        │  passes ProjectIntelligence (or a named slice of it) as props
        ▼
Every other Explorer component          (04's Component Tree)
```

**Responsibilities at each stage:**

- `lib/providers/*` — fetches and normalizes one external API's data into
  a typed domain shape; never seen by Explorer.
- `lib/intelligence/sources.ts` — the only module that calls the Provider
  Layer; matches a project's configured identifiers against provider
  results.
- `lib/intelligence/{merge,confidence,freshness,scoring}.ts` — pure
  functions that turn matched sources into the 13 sections documented in
  §4. This is where every calculation in this document happens — never in
  a component.
- `lib/intelligence/engine.ts` — the sanctioned public entry point; the
  only file outside `lib/intelligence/` should ever import from.
- `ExplorerPage` — calls `engine.ts`, holds the result plus all Explorer UI
  state (04 §16), and passes data down as props.
- Every other component — receives data, renders it, owns no fetching
  responsibility whatsoever.

## 3. Data Ownership

| Question | Answer |
| --- | --- |
| Who owns data? | `lib/intelligence/` computes it; `ExplorerPage` holds the fetched result in memory for the session. |
| Who transforms data? | Only `lib/intelligence/merge.ts`, `confidence.ts`, `freshness.ts`, and `scoring.ts`. No Explorer component transforms, recomputes, or reshapes a value it receives. |
| Who only displays data? | Every component in 04's tree except `ExplorerPage` (see 04 §15's Presentation components). |
| Who never fetches data? | Every component except `ExplorerPage` — restated precisely in §18. |

One nuance worth stating explicitly here (expanded in §13): a small
amount of *aggregation* — counting how many of the currently-loaded
`ProjectIntelligence[]` are verified, healthy, or have live data — happens
in the Explorer layer itself (`ExplorerSummary`/`ExplorerDataCoverage`,
per 04 §5), not inside `lib/intelligence/`. This is simple counting/filtering
over values the Engine already computed per project — not new business
logic — and is treated as acceptable presentation-layer aggregation, not a
violation of §18's "no business logic in UI" rule. Recomputing a value the
Engine already computed (e.g. re-deriving a Health score) would violate it;
counting how many already-computed Health scores fall into "good" does
not.

## 4. Intelligence Engine Sections

Every section of `ProjectIntelligence`, exactly as defined in
`lib/intelligence/types.ts` today.

### Identity

| Field | Type | Notes |
| --- | --- | --- |
| `id` | `string` | Stable registry identifier. |
| `slug` | `string` | URL-facing slug. |
| `name` | `string` | Display name. |
| `shortDescription` | `string` | One-line summary. |
| `description` | `string` | Full description. |
| `logoUrl` | `string \| null` | |
| `websiteUrl` | `string` | |
| `categories` | `ProjectCategory[]` | |
| `tags` | `ProjectTag[]` | |
| `status` | `ProjectStatus` | Lifecycle status (`live`/`beta`/`development`/`deprecated`/`sunset`) — **not** verification status; see Community below. |

**Purpose**: the registry's own static metadata, always present, never
provider-dependent.

### Market

| Field | Type |
| --- | --- |
| `available` | `boolean` |
| `priceUsd` | `number \| null` |
| `marketCapUsd` | `number \| null` |
| `fullyDilutedValuationUsd` | `number \| null` |
| `changePct24h` | `number \| null` |
| `sparkline7d` | `number[]` |

**Purpose**: CoinGecko-sourced market data, matched by exact
`coingeckoId`.

### Trading

| Field | Type | Notes |
| --- | --- | --- |
| `available` | `boolean` | |
| `volume24hUsd` | `number \| null` | Summed across every matched pair. |
| `liquidityUsd` | `number \| null` | Summed across every matched pair. |
| `buys24h` | `number \| null` | Summed across every matched pair. |
| `sells24h` | `number \| null` | Summed across every matched pair. |
| `priceChangePct24h` | `number \| null` | Taken from the **first** matched pair only — not averaged or summed like the fields above. |
| `pairCount` | `number` | How many DexScreener pairs this data is built from. |

**Purpose**: DexScreener-sourced trading activity, matched by configured
pair addresses.

### TVL

| Field | Type |
| --- | --- |
| `available` | `boolean` |
| `tvlUsd` | `number \| null` |
| `changePct24h` | `number \| null` |
| `defillamaCategory` | `string \| null` |

**Purpose**: DefiLlama-sourced TVL, matched by a slugified-name heuristic
(a `"fuzzy"` match — see §12).

### Contracts

| Field | Type | Notes |
| --- | --- | --- |
| `count` | `number` | |
| `items` | `ContractInfo[]` | Each: `chain`, `address`, `type`, `label` (`string \| null`), `verified` (`boolean \| null`). |

**Purpose**: the registry's own listed contracts, cross-checked against
Blockscout's single most-recently-verified contract. In practice today,
`verified` resolves to `true` only in the rare case of an exact address
match, or `null` otherwise — **the current matching logic never produces
`false`**, even for a definite non-match (see §13/§14).

### GitHub

*(Field name on `ProjectIntelligence` is `github`; its type is `GithubIntel`.)*

| Field | Type |
| --- | --- |
| `available` | `boolean` |
| `fullName` | `string \| null` |
| `stars` | `number \| null` |
| `forks` | `number \| null` |
| `openIssues` | `number \| null` |
| `latestReleaseTag` | `string \| null` |
| `latestReleasePublishedAt` | `string \| null` |

**Purpose**: GitHub repo stats, only resolved when the registry lists a
specific `owner/repo` (an org-level-only reference does not resolve this
section — see §14).

### Chain

*(Field name on `ProjectIntelligence` is `chain`; its type is `ChainInfo`.)*

| Field | Type |
| --- | --- |
| `chains` | `Chain[]` |
| `primaryChain` | `Chain` |
| `network.available` | `boolean` |
| `network.gasGwei` | `number \| null` |
| `network.blockHeight` | `number \| null` |
| `network.estimatedTps` | `number \| null` |

**Purpose**: which chains the project is on (registry data) plus live Base
network status (only populated when `"base"` is among the project's
chains).

### Community

| Field | Type |
| --- | --- |
| `socials.twitter` | `string \| null` |
| `socials.discord` | `string \| null` |
| `socials.telegram` | `string \| null` |
| `socials.farcaster` | `string \| null` |
| `verificationStatus` | `VerificationStatus` |

**Purpose**: the registry's social links, and **the one and only field
that carries verification status** (`verified`/`community`/`unverified`/`flagged`)
— this is easy to look for on `Identity` by mistake; it lives here instead.

### Health

| Field | Type |
| --- | --- |
| `score` | `number` (0–100) |
| `label` | `HealthLabel` (`excellent`/`good`/`fair`/`poor`/`unknown`) |
| `factors` | `string[]` |

**Purpose**: a transparent, computed heuristic — never a third-party
metric. Computed in `lib/intelligence/scoring.ts`.

### Confidence

| Field | Type |
| --- | --- |
| `score` | `number` (0–100) |
| `level` | `ConfidenceLevel` (`high`/`medium`/`low`) |
| `factors` | `string[]` |

**Purpose**: how much the Engine trusts the record it assembled. Computed
in `lib/intelligence/confidence.ts`.

### Freshness

| Field | Type |
| --- | --- |
| `newestSourceAt` | `string \| null` (ISO timestamp) |
| `oldestSourceAt` | `string \| null` (ISO timestamp) |
| `overall` | `FreshnessLevel` (`fresh`/`mixed`/`stale`/`unknown`) |
| `ageMsBySource` | `Partial<Record<ProviderName, number>>` |

**Purpose**: how current the live data behind this record is. Computed in
`lib/intelligence/freshness.ts`.

### Sources

| Shape | Notes |
| --- | --- |
| `Record<ProviderName, SourceAttribution>` | One entry per provider — `coingecko`, `dexscreener`, `defillama`, `blockscout`, `github`, `base` — always all six, regardless of relevance to this project. |
| `SourceAttribution` | `{ provider, status: "live" \| "unavailable" \| "not_configured", fetchedAt: string \| null, detail: string \| null }` |

**Purpose**: full per-provider attribution — the mechanism that makes
"never hide provider origin" (§12) possible.

### Metadata

| Field | Type |
| --- | --- |
| `engineVersion` | `string` |
| `generatedAt` | `string` (ISO timestamp) |

**Purpose**: which version of the Engine produced this record, and when.

## 5. Component Mapping

Field-level detail for every component in 04's tree — a companion to 04
§14, but specific to *which exact field* rather than *which section*.

### Header

| Component | Consumes | Displays | Never owns |
| --- | --- | --- | --- |
| ExplorerHeader | (composes below) | title, description | any field directly |
| ExplorerStatusBadge | `sources[*].status` across all visible projects | aggregate live-data coverage | per-project detail |
| ExplorerProjectCount | length of the current filtered/searched result set | a count | filter/search logic itself |
| ExplorerLastUpdated | `metadata.generatedAt` (any one visible project's, since all share one batch) | relative + exact time | the batch fetch |
| ExplorerDataCoverage | same as ExplorerStatusBadge | fuller coverage summary | — |

### Grid

| Component | Consumes | Displays | Never owns |
| --- | --- | --- | --- |
| ProjectCard | `identity`, `market`/`tvl` (whichever available), `health`, `confidence`, `freshness.overall` | see §6 | any calculation |
| ProjectCardHeader | `identity.logoUrl`, `identity.name`, `identity.categories[0]` | identity row | — |
| ProjectCardMetrics | `market.priceUsd` or `tvl.tvlUsd`, `health.score`/`.label`, `confidence.score`/`.level` | headline metric + scores | scoring math |
| ProjectCardFooter | `identity.tags`, `freshness.overall` | tag chips + freshness | — |
| VerificationBadge | `community.verificationStatus` | verification label | — |
| HealthBadge | `health.score`, `health.label` | health badge | — |
| ConfidenceBadge | `confidence.score`, `confidence.level` | confidence badge | — |

### Table

| Component | Consumes | Displays | Never owns |
| --- | --- | --- | --- |
| ProjectRow | the 8 default columns, per §7 | one dense row | — |
| SortableHeader | current sort field/direction (page state, not Engine data) | column label + sort indicator | the sort computation itself (a presentation-layer array sort over already-available fields, not Engine logic) |

### Quick View

| Component | Consumes | Displays | Never owns |
| --- | --- | --- | --- |
| QuickViewHeader | `identity`, `community.verificationStatus` | header row | — |
| QuickViewSummary | `market`/`tvl` headline, `health` (incl. `.factors`), `confidence` (incl. `.factors`) | scores + their reasoning | — |
| QuickViewMetrics | `market`, `trading`, `tvl`, `github`, `chain`, `contracts` | full detail | — |
| QuickViewSources | `sources` (all six entries), `freshness.ageMsBySource` | per-provider attribution | — |
| QuickViewActions | `identity.websiteUrl`, `github.fullName`, `contracts.items[].address` | outbound links, copy actions | — |

### Shared

| Component | Consumes | Displays | Never owns |
| --- | --- | --- | --- |
| Metric | one label + one already-resolved value | — | any formatting logic beyond display |
| ScoreIndicator | a score + label (Health or Confidence) | — | scoring math |
| ProviderIndicator | one `SourceAttribution` | — | — |
| Timestamp | one ISO string | relative + exact time | — |

## 6. Grid View Mapping

Every `ProjectCard` field named in this task, mapped to its exact source —
and, where 03 didn't reserve a guaranteed card slot for it, said so
explicitly rather than implying otherwise.

| Field | Exact source | Card-level status |
| --- | --- | --- |
| Logo | `identity.logoUrl` | Primary (03 §8, item 1) |
| Project Name | `identity.name` | Primary |
| Category | `identity.categories[0]` (primary category) | Primary |
| Verification | `community.verificationStatus` | Primary — note this is **not** on `Identity` |
| Health | `health.score` / `health.label` | Primary (03 §8, item 3) |
| Confidence | `confidence.score` / `confidence.level` | Primary |
| Price | `market.priceUsd` | The headline metric, only if `market.available`; otherwise TVL takes its place (03 §8, item 2) |
| TVL | `tvl.tvlUsd` | The headline metric if Price is unavailable; otherwise not separately shown on the card |
| Volume | `trading.volume24hUsd` | **Not a guaranteed card field** — 03 §8's card hierarchy names only Price/TVL as the headline metric; Volume is tertiary information (03 §11), available but not required reading on the card |
| Developer Activity | `github.stars` (primary figure), `github.forks`/`.openIssues`/`.latestReleaseTag` (deeper detail) | **Not in 03 §8's card hierarchy at all** — tertiary, Quick-View-primary information (03 §11) |
| Last Updated | `freshness.overall` (badge), `freshness.newestSourceAt` (exact time on hover, 03 §12) | Primary (03 §8, item 5) |
| Sources | `sources` (full record) | **Not shown in full on the card** — the card only reflects derived `.available` flags; full per-provider attribution is Quick-View-only (03 §14, item 8) |

## 7. Table View Mapping

| Column | Exact source | Status |
| --- | --- | --- |
| Name | `identity.name` | MVP (default column) |
| Category | `identity.categories[0]` | MVP (default column) |
| Verification | `community.verificationStatus` | MVP (default column) |
| Price | `market.priceUsd` | MVP (default column) |
| 24h Change | `market.changePct24h` | MVP (default column) |
| TVL | `tvl.tvlUsd` | MVP (default column) |
| Health | `health.score` / `.label` | MVP (default column) |
| Confidence | `confidence.score` / `.level` | MVP (default column) |
| Market Cap | `market.marketCapUsd` | Optional/future column (03 §9) |
| Freshness | `freshness.overall` | Optional/future column |
| GitHub Stars | `github.stars` | Optional/future column |

## 8. Quick View Mapping

| Section (03 §14) | Exact source |
| --- | --- |
| Header | `identity.logoUrl`, `identity.name`, `identity.categories`, `identity.tags`, `community.verificationStatus` |
| Summary (scores + reasoning) | `health.score`/`.label`/`.factors`, `confidence.score`/`.level`/`.factors` |
| Metrics — Market/Trading/TVL | `market.*`, `trading.*`, `tvl.*` (every field in §4's tables) |
| Metrics — GitHub | `github.*` |
| Metrics — Chain | `chain.chains`, `chain.primaryChain`, `chain.network.*` |
| Contracts | `contracts.count`, `contracts.items[]` (each field, including `verified`) |
| Community | `community.socials.*` |
| Sources | `sources` (all six `SourceAttribution` entries), `freshness.ageMsBySource` |
| Future Related Projects | No corresponding field anywhere in `ProjectIntelligence` — not mapped, not buildable today. |

## 9. Search Mapping

- **Current (MVP)**: matches against `identity.name`, `identity.description`
  (and `shortDescription`), `identity.tags`, `identity.categories` — the
  same fields the registry's own `searchProjects()` helper already
  matches against. Since `mergeIdentity()` passes these fields through
  unchanged, search can run directly against each loaded project's
  `identity` section rather than requiring a separate registry call.
- **Future**: Narratives (no such field exists anywhere), Contracts
  (`contracts.items[].address` exists but isn't a specified search field
  per the PRD's Functional Requirement 3), Wallets (no data exists at
  all).
- **Future — Protocol IDs, with a caveat**: the registry's
  `providerIds` (e.g. `coingeckoId`, `defillamaSlug`) are consumed
  internally by `sources.ts` for matching but are **not exposed anywhere
  in `ProjectIntelligence`'s output**. Searching by Protocol ID would
  require either a new Intelligence Engine field (an Engine change, out of
  scope here) or reading the registry directly (which would violate "no
  UI reads the registry directly" — see §18). This is flagged, not
  resolved, in §19.
- **Ranking inputs**: exact name match, name-prefix match, exact tag/category
  match, then substring match within `description` — all evaluated
  against `identity` fields only, per 02-IA §5's ranking priority.
- **Never search provider responses directly**: search only ever reads
  `identity` — never `market`, `trading`, `tvl`, `github`, or `chain`,
  and never a raw provider type.

## 10. Filter Mapping

| Filter | Exact source | Status |
| --- | --- | --- |
| Category | `identity.categories` | MVP |
| Tags | `identity.tags` | MVP |
| Verification | `community.verificationStatus` | MVP |
| Status (lifecycle) | `identity.status` | MVP |
| Chain | `chain.chains` | MVP |
| Health | `health.score` / `health.label` | MVP |
| Confidence | `confidence.score` / `confidence.level` | MVP |
| Developer Activity | `github.stars` (and/or `.forks`, `.openIssues`) | MVP |
| TVL | `tvl.tvlUsd` | MVP |
| Market Cap | `market.marketCapUsd` | MVP |
| Source Availability | any/all of `sources[*].status === "live"`, or the per-section `.available` flags | MVP — a reasonable, data-backed addition in the same spirit as the Intelligence Summary's "Live Data Coverage" card (03 §4); exact aggregation rule left to §19 |
| Risk | derived lens over `confidence.score` + `community.verificationStatus` — not a new field | MVP, as a derived lens only |
| Launch Date | **no field exists anywhere** in `Identity` or any section | Future — requires a Project Registry schema addition |
| Trending | **no field or computation exists** | Future — requires a new Intelligence Engine capability |
| Narratives | **no field exists** | Future — `identity.tags` is today's closest real proxy |
| Future AI filters | `identity.categories` (`"ai"`) / `identity.tags` (`"ai-agents"`) are today's real proxy | Future for anything more specific — no dedicated AI score exists |

## 11. Sorting Mapping

| Sortable field | Exact source | Status |
| --- | --- | --- |
| Name | `identity.name` | MVP |
| TVL | `tvl.tvlUsd` | MVP |
| Market Cap | `market.marketCapUsd` | MVP |
| Health score | `health.score` | MVP |
| Confidence score | `confidence.score` | MVP |
| GitHub stars | `github.stars` | MVP |
| Verification (grouping) | `community.verificationStatus` | MVP |
| Launch date | no field exists | Future |
| Trending | no computation exists | Future |

## 12. Source Attribution

Every provider-originated section maps to exactly one entry in `sources`,
via the same fixed mapping the Engine itself uses internally
(`SOURCE_TO_PROVIDER` in `lib/intelligence/sources.ts`):

| Section | Provider (`sources` key) |
| --- | --- |
| `market` | `coingecko` |
| `trading` | `dexscreener` |
| `tvl` | `defillama` |
| `chain.network` | `base` |
| `contracts[].verified` | `blockscout` |
| `github` | `github` |

Each entry exposes `status` (`live`/`unavailable`/`not_configured`),
`fetchedAt`, and `detail` — the plain-language reason behind the status.
**Confidence is not itself a per-metric attribution** — it's a single
composite score computed *from* this attribution (§4), not a seventh
entry in `sources`.

**Never hide provider origin**: `QuickViewSources` is the one place all
six entries are always shown together, regardless of relevance to a given
project. Cards and table rows show a metric's *value* without necessarily
naming its provider inline — but the full attribution for that value is
always exactly one Quick View away, never omitted from the product
entirely.

## 13. Derived Values

- **Raw values** (pass through the registry unchanged, no provider
  involvement): every `identity.*` field, `community.socials.*`,
  `chain.chains`, `chain.primaryChain`, and `contracts.items[].chain` /
  `.address` / `.type` / `.label`.
- **Derived values** (reshaped or aggregated from provider data, but not a
  scoring/composite calculation): `market.*` (renamed 1:1 from CoinGecko),
  `tvl.*` (renamed 1:1 from DefiLlama), `github.*` (renamed 1:1 from
  GitHub), `chain.network.*` (renamed 1:1 from Base RPC), `trading.*`
  (summed across matched DexScreener pairs — a real aggregation, computed
  in `merge.ts`), and `contracts.items[].verified` (boolean-or-null derived
  by address comparison in `merge.ts` — see §14 for its exact behavior).
- **Calculated values** (genuine composite logic): `health.*` (computed in
  `scoring.ts`), `confidence.*` (computed in `confidence.ts`),
  `freshness.*` (computed in `freshness.ts`). This document intentionally
  does not reproduce those formulas — they're documented once, in the
  Engine's own source, to avoid this document becoming a second,
  drift-prone copy of them (see §18, "Duplicate Transformations").
- **Explorer-layer aggregations** (computed outside `lib/intelligence/`
  entirely, over an array of already-resolved `ProjectIntelligence[]`):
  the Intelligence Summary's "Total Projects," "Verified Projects,"
  "Healthy Projects," "Needs Review," and "Live Data Coverage" cards
  (03 §4) are simple counts/filters over values the Engine already
  produced per project — this is presentation-layer aggregation, not a
  calculation this document attributes to the Engine.

## 14. Missing Data Strategy

The Engine's real vocabulary for "data isn't there" has exactly three
states (`SourceStatus`), plus ordinary field-level `null`:

| Task's term | Maps to |
| --- | --- |
| Not Configured | `SourceStatus: "not_configured"` — the registry never claimed this project has this data (e.g. no `coingeckoId` set). |
| Unavailable | `SourceStatus: "unavailable"` — the data should be resolvable but the live call didn't find/return a match. |
| Null | An individual field is `null` even though its section is otherwise `available` (e.g. `fullyDilutedValuationUsd` can be `null` within an otherwise-live `Market`). |
| Not Applicable | A registry-optional field simply isn't set for this project (e.g. `identity.logoUrl === null`, `contracts.items[].label === null`) — no provider was ever involved. |
| Future Data | The field doesn't exist in `ProjectIntelligence` at all yet (Launch Date, Trending, Narratives, Wallets, Protocol IDs) — not a data *state*, a data *gap*, and named explicitly as such throughout this document rather than silently treated the same as "unavailable." |

**Never fabricate values. Never substitute a placeholder that implies
certainty.** The clearest concrete case: `contracts.items[].verified` is
`boolean | null`, but the current matching logic (§4/§13) only ever
produces `true` or `null` — a definite non-match still resolves to `null`,
not `false`. Displaying `null` as "Not Verified" would fabricate a
certainty the Engine doesn't actually have; it must render as "unknown."

## 15. State Mapping

| State | Owned by | Notes |
| --- | --- | --- |
| Selected Project (drawer) | `ExplorerPage` | A reference to one loaded `ProjectIntelligence`, not a re-fetch. |
| Search Query | `ExplorerSearch` (raw input), `ExplorerPage` (applied/debounced value) | |
| Filters | `ExplorerPage` | Active facet values (04 §16). |
| Sort | `ExplorerToolbar` / `ExplorerPage` | Field + direction. |
| View Mode (Grid/Table) | `ExplorerToolbar` / `ExplorerPage` | |
| Explorer Mode (Discover/Research/Intelligence) | `ExplorerToolbar` / `ExplorerPage` | |
| Drawer State (open/closed) | `ExplorerPage` | Lifted, per 04 §15. |

None of the above are `ProjectIntelligence` fields — they are Explorer's
own UI state, layered on top of Engine data, per 03 §24.

## 16. Future Data Mapping

No corresponding field exists in `ProjectIntelligence` for any of the
following today. If any of them are ever built, they would require a new
Intelligence Engine section — an Engine change, explicitly out of scope
for the Explorer work this series specifies:

- **Signals** (Milestone 8, roadmapped)
- **Portfolio** (Milestone 9, roadmapped)
- **AI Research** (Milestone 10, roadmapped)
- **Project Details** (Milestone 10, roadmapped) — would primarily reuse
  existing sections more fully, not necessarily require new ones
- **Wallet Intelligence** *(illustrative only, not roadmapped)*
- **Governance** *(illustrative only, not roadmapped)*

## 17. Validation Rules

Before any field is wired into an Explorer component, it must satisfy all
of the following:

- [ ] **Has a documented source** — appears in §4–§13 of this document,
  citing its exact `ProjectIntelligence` path.
- [ ] **Has ownership** — it's clear from §3/§15 whether it's Engine data
  or Explorer UI state, and which component holds it.
- [ ] **Has an update strategy** — its freshness/staleness story is
  covered by `Freshness` (for Engine data) or is understood to be
  session-only UI state (for Explorer state).
- [ ] **Has fallback behavior** — its missing-data case is covered by §14,
  not invented ad hoc by whichever component renders it.
- [ ] **Has an accessibility label** — covered by 04 §17 / 03 §20.
- [ ] **Has provider attribution** — if it originates from a provider,
  it's traceable to a `sources` entry per §12.

## 18. Anti-Patterns

Explicitly prohibited, without exception:

- **Direct Provider Calls** — no Explorer component imports from
  `lib/providers/*`, ever, for any reason.
- **Component Data Fetching** — only `ExplorerPage` calls
  `lib/intelligence/engine.ts`; no other component fetches anything.
- **Business Logic in UI** — scoring, matching, and freshness
  calculations live only in `lib/intelligence/`; simple counting/filtering
  over already-computed values (§13) is the one narrow exception, not a
  license to reimplement Engine logic in a component.
- **Provider-specific Components** — no component is named after or
  contains conditional logic specific to CoinGecko, DexScreener,
  DefiLlama, Blockscout, GitHub, or Base RPC.
- **Duplicate Transformations** — a value computed once in
  `lib/intelligence/` is never recomputed, re-derived, or "corrected" in a
  component.
- **Multiple Sources of Truth** — `ProjectIntelligence` (via
  `ExplorerPage`) is the only data source for every Explorer component;
  nothing reads `data/projects/` or `lib/providers/` in parallel.
- **Hardcoded Values** — no component contains baked-in example/mock data;
  every rendered value traces to a real `ProjectIntelligence` instance,
  including in empty/loading states, which use structural placeholders
  (skeletons), never fake data dressed up as real.

## 19. Open Questions

- Should the "Source Availability" filter (§10) mean "at least one
  provider is live" or "a specific chosen provider is live"? Not decided
  here.
- If Protocol ID search (§9) is ever prioritized, should `providerIds` be
  exposed through a new `ProjectIntelligence` field, or should that
  capability be scoped out entirely? Not decided.
- Should Explorer-layer aggregations (§13 — Verified/Healthy/Coverage
  counts) be recomputed on every render, or memoized against the loaded
  `ProjectIntelligence[]`? Not decided.
- Does Volume (`trading.volume24hUsd`) ever get promoted to a card-level
  headline metric alongside Price/TVL, or does it remain Quick-View-only?
  Not decided.
- Does Developer Activity (`github.stars`) ever get a dedicated Grid card
  slot, given 03 §8 didn't originally reserve one for it? Not decided.

## 20. Future Recommendations

Grounded only in gaps already documented elsewhere in this codebase —
nothing new is proposed here:

- If Protocol ID search is ever prioritized, the Intelligence Engine
  would benefit from exposing an identifiers-style section (surfacing
  `providerIds` in its output) — this would be a Provider/Engine-layer
  recommendation for a future PR, not something this document decides.
- Blockscout's public API only exposes the single most-recently-verified
  contract chain-wide (already noted in `lib/intelligence/sources.ts`'s
  own comments) — a future `getContractByAddress`-style provider
  enhancement would make `contracts.items[].verified` meaningfully
  non-null far more often. Recommended there, not solvable in Explorer.
- DefiLlama TVL matching is a documented best-effort, fuzzy, name-based
  match (§12/§13) — worth revisiting if TVL-based filtering/sorting
  accuracy becomes a reported problem in practice.
- Consider a lightweight, generated companion reference (e.g. from
  `lib/intelligence/types.ts` directly) alongside this hand-written
  document, so future field changes in the Engine can be checked against
  drift in this mapping over time.
