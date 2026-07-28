# PR-055 — Projects Page UX Architecture

**Scope: information architecture and UX design only.** No React was written, no
component was redesigned, no route was touched. Every recommendation below is
grounded in what the backend built in PR-054 (`lib/projects/`) actually
returns today — `LiveProject`, `LiveProjectCollections`, `SortField`,
`FilterOptions`, `ProjectSearchIndex`, `PaginatedResult<T>` — plus what
already exists in `components/explorer/` that a future implementation PR can
reuse rather than reinvent. Where this design needs something PR-054 doesn't
yet expose, that gap is named explicitly rather than silently assumed away —
consistent with this codebase's evidence-first, no-fabrication principle
(`docs/MASTER_ROADMAP.md`'s Engineering Principles).

No commit, no push. Wait for review.

---

## 1. Complete Information Architecture

### Design principles

1. **Evidence-first.** Every section on this page is a real, filtered/sorted
   slice of `LiveProject[]` — never a hand-picked or hardcoded list. A
   section with zero qualifying projects shows an honest, specific empty
   state (§1.4), never an invented placeholder card.
2. **Scale-invariant by construction.** Nothing here assumes today's ~20
   registry projects. Every rail is a *capped, sorted view* over the same
   underlying array PR-054 already produces — the same design renders
   correctly whether that array holds 20 items or 20,000 (see §9).
3. **One backend, many lenses.** `lib/projects/service.ts`'s
   `getLiveProjects()` is called exactly once per page request. Every
   section, rail, and the Full Directory below all read from that one array
   via `collections.ts`/`sort.ts`/`filter.ts`/`search.ts`/`pagination.ts` —
   never a second, independent data fetch. This mirrors the "no page
   manually merges registry and discovery results" rule PR-054 itself
   established.
4. **Progressive disclosure over pagination-by-default.** A curated rail
   answers a Primary User Question at a glance; a "View All" link on that
   rail deep-links into the Full Directory pre-filtered/pre-sorted to match
   — so a rail with 3 real matches today and 3,000 tomorrow needs no
   redesign, only its "View All" link becomes meaningful.

### Page hierarchy (top to bottom) and why

| # | Section | Why it exists here |
| --- | --- | --- |
| 1 | **Page Header** | Orients the user: page title, total tracked-project count, last-updated timestamp. Answers "how big and how fresh is this registry?" before anything else. |
| 2 | **Search Bar** | The fastest path when a user already knows what they want ("what should I research next" often starts as a name typed from memory). Placed above curated content because search intent should never require scrolling past rails first. |
| 3 | **Ecosystem Pulse (KPI strip)** | One-glance answer to "what's happening right now" — total tracked, verified count, new this run, trending count, categories tracked. Reuses the Dashboard's existing `KPIRow` pattern (`docs/ARCHITECTURE.md`'s Dashboard Architecture) rather than inventing a new stat-strip component. |
| 4 | **Category Rail** | Lets a user jump straight into a vertical they care about without knowing any project's name — directly serves "what categories are growing" (via counts) and is the fastest route into "what are the best DEXs/lending protocols/etc." |
| 5 | **Curated Discovery Rails** (Verified, New, Trending, Recently Discovered, Recently Updated, Upcoming/Announced) | Directly answer the "what's new / what's trending / what launched recently / what's verified" questions inline, before any filter/sort interaction. |
| 6 | **Leaderboard Rails** (Top TVL, Top Volume, Top Activity, Governance Active) | Answer "what are the best Base projects" from a ranked, numeric-evidence angle — distinct framing from the trust-signal rails above. |
| 7 | **Attention Rails** (High Confidence, Recently Verified, Needs Review) | Answer "what should I research next" and "which projects need attention" — the two Primary User Questions most tied to editorial/analyst judgment rather than raw ranking. |
| 8 | **Filter Bar + Sort Control + View Toggle** | The transition point from "show me the interesting slices" to "let me browse everything my way." Sits directly above the Full Directory it controls. |
| 9 | **Full Directory** (paginated grid/table) | The fallback for every question a curated rail doesn't answer — "show me everything," scoped by whatever filters/sort/search are active. This is where scale (§9) is handled explicitly via `pagination.ts`. |

### Visual priority

- Rails 5–7 use **horizontal scroll with card-peeking** (a partial next card visible at the row's right edge, Netflix-row convention) rather than full-width wrapping grids — this lets 9 curated sections fit in far less vertical space than 9 stacked grids would, so a user reaches the Full Directory (or leaves happy) without an exhausting scroll.
- The three rail *zones* (Discovery / Leaderboards / Attention) get a distinct but subtle visual treatment reusing existing tokens — Discovery rails lean on the existing verified/trust accent color already used by `VerificationBadge`, Leaderboards use a neutral numbered-rank treatment (a small `#1`/`#2`/`#3` badge on card corners, new but trivial), Attention rails use the existing amber/warning accent already established for risk/needs-review states elsewhere in the app (`ScoreBadge`, `riskColor.ts`). This is a color-and-label distinction only — all three zones reuse the same underlying card component (§7).
- The Full Directory gets the page's largest vertical footprint by design — it is the "everything" view, so it is the one place a full grid (not a horizontal rail) makes sense.

### Navigation

A **sticky jump-nav** pinned under the Page Header (once the user scrolls past it), listing anchors for: Search · Categories · Verified · Trending · New · Top TVL · Governance · All Projects. This directly reuses the mental model already established by `ProfileSectionNav.tsx` on the Project Profile page — same "quick anchor list for a long page" pattern, applied to a different page rather than inventing a second navigation idiom.

### Grouping

Three visually distinct rail zones, in this order, each internally ordered by which Primary User Question it answers most directly:

- **Curated Discovery** — Verified, New, Trending, Recently Discovered, Recently Updated, Upcoming/Announced.
- **Leaderboards** — Top TVL, Top Volume, Top Activity, Governance Active.
- **Attention** — High Confidence, Recently Verified, Needs Review.

### Progressive disclosure

Every rail caps at a fixed card count (§3 table) and ends in a **"View All →"** link. That link never routes to a new page or a new query — it routes to the Full Directory with that rail's exact filter+sort combination pre-applied (e.g. "View All" on the Trending rail opens the Full Directory with the same trending criteria active as a filter, sorted the same way). This is the single mechanism that lets every rail stay small and fast regardless of how many real matches exist behind it.

### Empty, loading, and error states (page-level)

Beyond each section's own specific empty copy (§3's table), three page-level states need honest handling:

- **Provider degradation** — if `getAllProjectIntelligence()` or the Discovery pipeline partially fails, `LiveProject`s still render with whatever real data resolved (PR-054's `ProjectIntelligence`/`DiscoveryProject` never throw past their own boundary) — no page-level error state is needed for *partial* failure, only for a *total* failure to construct any `LiveProject[]` at all, which should reuse the existing `ExplorerErrorState` pattern already wired into `app/dashboard/projects/page.tsx` today.
- **Still indexing** — the very first request after a cold start (before any provider cache is warm) may show thinner data than a subsequent one; this isn't a distinct UI state, since `LiveProject`'s fields are already designed to degrade honestly field-by-field (a `null` `market.priceUsd` renders as "Not yet tracked," not as a loading spinner that never resolves).
- **Zero projects total** (a genuinely empty registry, e.g. a fresh environment) — the one true page-level empty state: header + KPI strip render with all-zero counts, every rail shows its own empty copy, Full Directory shows a "The registry is empty" message distinct from a filtered "no results" message (§8 in the original task list, folded into §3's per-section table plus this page-level case).

### Loading states

The page is a Server Component fetching `getLiveProjects()` once (React `cache()`-wrapped per PR-054), so at today's scale the whole page resolves before first paint — reuse the existing `app/dashboard/projects/loading.tsx` skeleton, extended with rail-shaped skeleton rows (a horizontal row of card-shaped placeholders, same shimmer treatment already used elsewhere) above the existing grid skeleton. At the 10,000+ scale discussed in §9, this page-level "fetch everything, then render" model becomes the actual bottleneck, not the UI — flagged there, not solved here.

### Responsive behavior

Summarized here; full detail in §8 (Mobile Strategy). In short: rails become native swipeable scroll-snap rows, the category rail stays horizontally scrollable (it already reads that way on desktop), the Filter Bar collapses into a sheet, and Table view is desktop/tablet-only.

---

## 2. Page Wireframe (text)

```
┌──────────────────────────────────────────────────────────────────────┐
│  PROJECTS                                                              │
│  Browse the Base ecosystem · 1,842 projects tracked · Updated 2m ago   │
├──────────────────────────────────────────────────────────────────────┤
│  [ 🔍  Search projects, symbols, contracts...                      ]  │
├──────────────────────────────────────────────────────────────────────┤
│  Jump to:  Categories · Verified · Trending · New · Top TVL ·          │
│            Governance · All Projects                    (sticky)      │
├──────────────────────────────────────────────────────────────────────┤
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐          │
│  │ Tracked │ │Verified │ │  New    │ │Trending │ │Categories│         │
│  │  1,842  │ │   340   │ │   18    │ │   12    │ │   22     │         │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘          │
├──────────────────────────────────────────────────────────────────────┤
│  CATEGORIES                                                            │
│  ( DeFi 512 )( DEX 210 )( Lending 88 )( Bridge 41 )( Infra 96 )( AI 34)⟩│
├──────────────────────────────────────────────────────────────────────┤
│  ✓ VERIFIED PROJECTS                                    View All →    │
│  [Card] [Card] [Card] [Card] [Card] [Card▷ peeking]                    │
├──────────────────────────────────────────────────────────────────────┤
│  🆕 NEW PROJECTS                                         View All →    │
│  [Card] [Card] [Card] [Card] [Card▷ peeking]                           │
├──────────────────────────────────────────────────────────────────────┤
│  🔥 TRENDING                                             View All →    │
│  [Card] [Card] [Card] [Card] [Card▷ peeking]                           │
├──────────────────────────────────────────────────────────────────────┤
│  🕓 RECENTLY DISCOVERED   ·   ↻ RECENTLY UPDATED                       │
│  [Card] [Card] [Card▷]        [Card] [Card] [Card▷]                   │
├──────────────────────────────────────────────────────────────────────┤
│  🚀 UPCOMING / ANNOUNCED                                 View All →    │
│  [Card] [Card▷]  (or: honest empty state, see §3)                     │
├──────────────────────────────────────────────────────────────────────┤
│  ── LEADERBOARDS ──                                                    │
│  💰 TOP TVL          📊 TOP VOLUME        🛠 MOST ACTIVE DEVELOPMENT   │
│  1.[Card] 2.[Card]   1.[Card] 2.[Card]    1.[Card] 2.[Card]            │
│  🗳 GOVERNANCE ACTIVE                                    View All →    │
│  [Card] [Card] [Card▷]                                                 │
├──────────────────────────────────────────────────────────────────────┤
│  ── NEEDS YOUR ATTENTION ──                                            │
│  ⭐ HIGH CONFIDENCE     ✅ RECENTLY VERIFIED    ⚠ NEEDS REVIEW          │
│  [Card] [Card▷]         [Card] [Card▷]          [Card] [Card▷]         │
├──────────────────────────────────────────────────────────────────────┤
│  ALL PROJECTS                                                          │
│  [Filters ▾]  [Sort: Confidence ▾]  [Grid ▦ | Table ☰]  1,842 results  │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │ [Card] [Card] [Card] [Card]                                      │  │
│  │ [Card] [Card] [Card] [Card]              (full paginated grid)  │  │
│  │ [Card] [Card] [Card] [Card]                                      │  │
│  └─────────────────────────────────────────────────────────────────┘  │
│                  ◀  1  2  3  ...  77  ▶                                │
└──────────────────────────────────────────────────────────────────────┘
```

Mobile collapses this to one column throughout — see §8 for the exact transformation of each region.

---

## 3. Section Definitions

**Rule that keeps this scalable:** each curated rail has **one fixed,
non-configurable internal sort** appropriate to its own purpose. Only the
Full Directory (§9 row) exposes the interactive Sort control from §6. This
means a rail can order itself by any real `LiveProject` field it needs
(e.g. `verification.verifiedAt`) even when that field isn't one of
`sort.ts`'s eight user-facing `SortField` values — those two lists are
allowed to diverge, and where they should eventually converge is called out
per-row below.

Every rail's "Max Cards" is a **render cap**, not a data cap — the
underlying collection can hold any number of matches; the rail only ever
renders the top N after its fixed sort, plus the "View All" link.

| Section | Purpose | Data Source (PR-054) | Fixed Sort | Max Cards | Expansion | Empty State |
| --- | --- | --- | --- | --- | --- | --- |
| **Verified Projects** | Answers "what's verified" | `collections.verified` | `confidence` desc | 12 | View All → Full Directory, `verificationStatus`-equivalent filter + confidence sort | "No verified projects yet — verification happens through manual registry review; check back as the registry grows." |
| **New Projects** | Answers "what's new" | `collections.new` | `discoveryDate` desc | 12 | View All → Full Directory, `discoveryStatus: "new"` | "Nothing new since the last discovery run." |
| **Trending** | Answers "what's trending" | `collections.trending` | `\|market.changePct24h\|` desc (fallback: source-count desc) | 10 | View All → Full Directory | "Nothing is trending right now — trending needs either a ≥10% 24h price move or agreement from more than one discovery source." |
| **Recently Discovered** | Answers "what launched recently" (discovery angle) | `collections.recentlyDiscovered` | `discoveryDate` desc | 10 | View All → Full Directory | "No projects were surfaced by the last discovery run." Note: PR-054 documents this collection as "surfaced this run," not a true historical window — copy should say so, not imply a longer lookback than is real. |
| **Recently Updated** | Answers "what launched recently" (registry angle) | `collections.recentlyUpdated` | `updatedDate` desc | 10 | View All → Full Directory, `discoveryStatus: "recently-updated"` | "No tracked projects have new discovery evidence since their last registry update." |
| **Upcoming / Announced** | Answers "what's upcoming" | `collections.upcoming` | alphabetical (no ranking signal exists pre-launch) | 10 | View All → Full Directory | **Honest, PR-053-grounded copy**: "No upcoming projects to show — none of today's live discovery sources (CoinGecko, DefiLlama, Blockscout) can surface a pre-launch project yet. This section activates automatically once a community-submission or ecosystem-directory source goes live." |
| **Top TVL** | Answers "best Base projects" (capital angle) | `filter({hasTvl: true})` | `tvl` desc | 10 | View All → Full Directory, `hasTvl: true` + tvl sort | "No projects with tracked TVL yet." |
| **Top Volume** | Answers "best Base projects" (trading angle) | `filter({hasMarket: true})` | `volume` desc | 10 | View All → Full Directory | "No projects with tracked trading volume yet." |
| **Most Active Development** ("Top GitHub") | Answers "best Base projects" (engineering angle) | `filter({hasGithub: true})` | `activity` desc | 10 | View All → Full Directory | "No projects with recent GitHub activity yet." **Naming note**: framed as "Most Active Development" (commits/7d, `sort.ts`'s `activity` field) rather than "Top GitHub by stars" — the two are now both real, independent sort options (PR-056 added `stars`), so an implementation could add a second, separate "Most Starred" rail using `stars` desc if that distinct ranking is wanted; this rail itself stays activity-based. |
| **Governance Active** | Answers "best Base projects" (governance angle) | `filter({hasGovernance: true})` | `governance.activeProposalCount` desc (rail-only; not a `SortField` — see §6) | 10 | View All → Full Directory, `hasGovernance: true` | "No projects have active governance proposals right now." |
| **High Confidence** | Answers "what should I research next" | `collections.highConfidence` | `confidence` desc | 12 | View All → Full Directory, confidence sort | "No high-confidence projects yet." (Only possible on a near-empty registry.) |
| **Recently Verified** | Answers "what's verified," recency angle | `collections.recentlyVerified` | `verification.verifiedAt` desc (rail-only; not a `SortField` — see §6) | 8 | View All → Full Directory | "No projects have been verified in the last 30 days — likely because `verifiedAt` isn't populated on most current registry entries yet, not because nothing was verified." Honest about the real, documented PR-054 limitation. |
| **Needs Review** | Answers "which projects need attention" | `collections.needsReview` | `confidence` asc (worst-evidenced first — the point of this rail is triage) | 10 | View All → Full Directory, `discoveryStatus: "needs-review"` | "Nothing needs review right now." |
| **Recently Funded** | *(requested in the brief, "if data exists")* | **No real data source.** No funding-round field exists anywhere in `Project`, `ProjectIntelligence`, or `DiscoveryProject` — no integrated provider (CoinGecko, DefiLlama, Blockscout, GitHub, Snapshot) exposes raise/funding data. | — | — | — | **Not built.** Per this codebase's no-fabricated-data principle, this section is deferred until a real funding-data source is integrated — never shipped as an empty or fabricated placeholder. |

### Category Browsing (Task 3)

A single horizontal chip rail, one chip per real `ProjectCategory` enum
value (`data/projects/enums.ts` — 22 values today: dex, lending,
derivatives, yield, stablecoin, bridge, infrastructure, oracle, wallet,
identity, nft, gaming, social, ai, rwa, dao, launchpad, analytics, security,
meme, payments, other), each showing `collections.byCategory[category].length`
as a real count.

- **Display order**: a fixed, curated order grouped into four meta-clusters
  (DeFi: dex/lending/derivatives/yield/stablecoin/bridge · Infrastructure:
  infrastructure/oracle/security/analytics · Consumer:
  wallet/identity/social/gaming/nft/meme · Ecosystem:
  ai/rwa/dao/launchpad/payments/other), not alphabetical and not
  count-sorted — alphabetical would separate obviously-related categories
  (bridge/lending), and count-sorted would reorder the whole rail every time
  discovery runs, which is disorienting for a returning user.
- **A category with zero matches is still shown**, visually de-emphasized
  (reduced opacity, disabled tap target) rather than hidden — the category
  taxonomy is a fixed, small enum that doesn't grow with data volume (§9),
  so hiding empty categories buys nothing at scale and costs a user's
  mental model of "these are the 22 verticals this product tracks."
- **Naming note on the brief's own example list**: "DeFi," "Developer
  Tools," "Consumer Apps," and "Unknown" in the brief's Task 3 examples are
  **not real `ProjectCategory` enum values**. "DeFi" above is a *display
  cluster label*, not a filterable value, applied purely for chip grouping.
  "Developer Tools" maps to the real `ProjectTag` `"developer-tooling"`
  (a tag-level facet, not a category) — surfaced instead as a filter
  refinement once a category is selected, not as its own top-level chip.
  "Consumer Apps" has no real equivalent in either enum and is not
  represented. "Unknown" maps to the real category `"other"`. This
  distinction matters so implementation never invents a category value the
  registry itself doesn't recognize.
- **Icons**: no per-category icon map exists in the codebase yet (confirmed
  — only per-provider and per-chain branding maps exist,
  `lib/branding/chains.ts` and similar). A `CATEGORY_ICON`-style lookup (one
  lucide icon per `ProjectCategory`, following the exact convention already
  established for `CHAIN_BRANDING`/`SOCIAL_BRANDING`) is new UX asset work
  needed during implementation — not a new component pattern, just a new
  lookup table.
- **Selecting a category** doesn't navigate anywhere — it applies
  `FilterOptions.category` and scrolls to the Full Directory, exactly like a
  rail's "View All" link (§1's progressive-disclosure rule, applied here
  too).

---

## 4. Search UX

**Backend**: `lib/projects/search.ts`'s `buildProjectSearchIndex()` +
`searchLiveProjects()`, built and tested in PR-054. Already indexes every
field the brief asks for — name, aliases, symbol, slug, CoinGecko id,
DefiLlama slug, GitHub `owner/repo`, website, contract addresses — and
already scores by field weight (name > alias > symbol > slug > provider ids
> github > website > contract), not raw match count.

- **Behavior**: debounced-as-you-type (≈200ms), case-insensitive substring
  match (already how `searchLiveProjects` works — no fuzzy/typo tolerance
  today, documented as a known limitation in PR-054's own deliverables doc).
  Results render as a dropdown/overlay beneath the search bar, not a full
  page navigation, so search stays fast and non-disruptive.
- **Ranking**: use `searchLiveProjects`'s score-descending order as-is. On
  top of it, apply one UI-layer tie-break not present in the backend today:
  when two results share an identical score, a registry-tracked project
  (`source: "registry"`) should list above a discovery-only one
  (`source: "discovery"`) — mirroring the exact "prioritize, never reorder
  past real data" precedent Explorer's own `sortProjects()` already
  established for watchlist ties. This is pure UI composition over the
  existing sorted array, not a backend change.
- **Recent Searches**: reuse the existing versioned-`localStorage` pattern
  already established by `lib/search/storage.ts` (Global Search's Recent
  Searches), but under its own key (e.g.
  `base-radar:projects-search-recent`) rather than sharing Command Palette's
  history — the two searches serve different intents (site-wide navigation
  vs. project lookup) and conflating their histories would make neither
  list useful. Same behavior: newest first, case-insensitive de-dupe, capped
  list, query strings only (never cached results).
- **Empty search (no query typed)**: show Recent Searches if any exist,
  otherwise a lightweight prompt ("Search 1,842 projects by name, symbol,
  contract, or website") — never an empty dropdown with no guidance.
- **No results for a real query**: "No projects match \"xyz\"" plus one
  concrete next step — a link back to the Full Directory with any active
  filters cleared, since a common false-negative cause is an active filter
  silently excluding an otherwise-real match. Never silently fall back to
  showing unrelated results.
- **What search does NOT do**: it never searches provider-attribution
  detail, evidence factor strings, or narrative/summary prose — only the
  structured identifier fields above, matching the backend's own explicit
  index scope.

---

## 5. Filtering

**Backend**: `lib/projects/filter.ts`'s `filterLiveProjects(projects,
options)` and its `FilterOptions` type. Most of the brief's requested facets
map directly. **Update (PR-056): every gap this section originally flagged
has now been resolved in the backend** — `category`/`status`/
`discoveryStatus`/`verificationStatus` accept arrays, and `verified`/
`hasVolume` exist — see `docs/PR-056_PROJECTS_SERVICE_ENHANCEMENTS.md` for
the implementation. The table below is left in its original,
gap-identifying form for the historical record of what this UX-architecture
pass found; the "Notes" column has been annotated with each resolution.

### Facet mapping

| Brief's facet | PR-054 support today | Notes |
| --- | --- | --- |
| Category | `category?: ProjectCategory \| ProjectCategory[]` | **Resolved in PR-056** — widened to accept an array, OR-within-facet. |
| Discovery Status | `discoveryStatus?: DiscoveryStatus \| DiscoveryStatus[]` | **Resolved in PR-056**, same as Category. |
| Verification Status | `verificationStatus?: VerificationStatus \| VerificationStatus[]` | **Resolved in PR-056**, same as Category. |
| Confidence | `minConfidence?: number` | Supported as-is — render as a slider/stepped control (High ≥70 / Medium ≥40 / Low ≥0, matching `DiscoveryConfidenceLevel`'s own thresholds), not free-text. |
| Governance | `hasGovernance?: boolean` | Supported as-is. |
| Contracts | `hasContracts?: boolean` | Supported as-is. |
| GitHub | `hasGithub?: boolean` | Supported as-is. |
| Has Token | `hasMarket?: boolean` | Supported — "Has Token" is the user-facing label for `market.available`. |
| Has TVL | `hasTvl?: boolean` | Supported as-is. |
| Has Volume | `hasVolume?: boolean` | **Resolved in PR-056** — mirrors `hasTvl` exactly (`market.volume24hUsd !== null`). |
| Verified | `verified?: boolean` | **Resolved in PR-056** — `verification.status === "verified" \|\| discoveryStatus === "verified"`, reusing `collections.ts`'s own `isVerified` rule rather than a second definition. |
| Provider Coverage | **Not represented** | Still deferred — `LiveProject.providerAttribution` exists but no facet shape for "which/how many providers resolved" has been designed. Recommend deferring until there's a concrete UX need rather than guessing the right facet now. |
| Recently Updated | Achievable via `discoveryStatus: ["recently-updated"]` | Now usable with the multi-select array form. |
| Recently Discovered | **Not a distinct facet** | Still a minor gap — `discoveryMetadata !== null` has no dedicated boolean today. Left for a future PR since no current UX depends on it yet. |
| Multi-select | **Supported for category/status/discoveryStatus/verificationStatus** | **Resolved in PR-056.** |
| Clear All | Pure UI state reset (`options = {}`) | No backend involvement needed. |
| Saved Filters | **Explicitly "(future)" in the brief** | Not designed for v1 beyond noting the shape: would need a `localStorage`-backed store mirroring `lib/personalization/`'s or `lib/search/preferences.ts`'s existing pattern — a real future PR, not attempted here. |

### The multi-select gap — resolved in PR-056

Explorer's own `ExplorerFilters` (`components/explorer/filters.ts`) already
supported multi-select (`categories: ProjectCategory[]`, OR-within-facet /
AND-across-facets) — the Projects page's filtering UX should behave
identically for consistency with the product's own established convention.
PR-054's `FilterOptions` was originally built with single values for
`category`/`status`/`discoveryStatus`/`verificationStatus`; **PR-056 widened
all four to accept a single value or an array**, with a bare value
normalized internally to a one-element array so every existing call site
kept working unchanged (backward compatible) while new callers can pass
arrays for real multi-select — the same OR-within-facet semantics Explorer
already uses.

### Behavior

- **Multi-select** within a facet (OR: a project matches Category if it has
  *any* selected category), **AND across facets** — identical semantics to
  Explorer's own `filterProjects()`, so a user who already knows Explorer's
  filter behavior needs to learn nothing new.
- **Active filter chips** render above the Full Directory grid (reusing
  `FilterChip`/`ClearFiltersButton`, already built for Explorer), so the
  current filter state is always visible without opening the filter panel.
- **Filter counts**: each option inside an open filter group shows how many
  currently-visible projects it would match (Explorer's `FilterGroup`
  already computes "available" values this way) — never an option that
  would produce zero results silently offered as if it were live.
- **Clear All** resets every facet to empty in one action, visible whenever
  at least one filter is active.

---

## 6. Sorting

**Backend**: `lib/projects/sort.ts`'s `sortLiveProjects(projects, field,
order)` — deterministic, nulls always sort last regardless of direction,
stable id tie-break. This control only appears on the **Full Directory**;
curated rails use their own fixed internal sort (§3).

| Brief's option | `SortField` support | Notes |
| --- | --- | --- |
| Alphabetical | `"alphabetical"` | ✓ |
| Confidence | `"confidence"` | ✓ |
| Market Cap | `"marketCap"` | ✓ |
| TVL | `"tvl"` | ✓ |
| Volume | `"volume"` | ✓ |
| Activity | `"activity"` | ✓ (`engineering.commitsLast7d`) |
| GitHub | `"stars"` (`engineering.stars`) | **Resolved in PR-056** — added as its own distinct field from `"activity"`, since a star count and a commit-activity count are different signals. The Full Directory can now offer both "Most Active Development" (`activity`) and a literal "Top GitHub" by stars (`stars`) as separate sort options. |
| Recently Updated | `"updatedDate"` | ✓ |
| Discovery Date | `"discoveryDate"` | ✓ |
| Recently Verified | `"verifiedDate"` (`verification.verifiedAt`) | **Resolved in PR-056** — the Recently Verified *rail* (§3) still uses its own fixed internal sort, but this is now also available as an interactive Full Directory sort option. |

### Default sort

**Recommendation: Confidence, descending** — a change from today's MVP
default (TVL descending, `components/explorer/sort.ts`'s current
`DEFAULT_SORT`). Reasoning: TVL-first made sense when the registry was
entirely DeFi-heavy verified projects with real TVL. The future registry
(per this PR's own mandate) includes NFT/social/gaming/AI/discovery-only
projects with **no TVL by category, not by data gap** — defaulting to TVL
would bury an excellent, high-confidence non-DeFi project at the bottom of
the list by construction, every time. `confidence` is the one field every
`LiveProject` always has a real, computed value for regardless of category
or how much market data resolved, making it the only default that's fair
across the whole future taxonomy. Nulls-last (§sort rule) handles every
other field gracefully once a user picks it explicitly.

---

## 7. Project Card Specification

Two variants of one shared card shell, distinguished by `LiveProject.source`
— not two unrelated components. This is the one genuinely new card pattern
this PR's design introduces, because PR-054 is the first place a
"project" can legitimately have no registry slug at all.

### Registry card (`source: "registry"`) — the richer, default variant

Directly extends the existing `ProjectCard.tsx` composition
(`ProjectCardHeader` → `ProjectCardDescription` → `ChainBadgeGroup` →
`ProjectCategoryChips` → `ProjectMetricsGrid` → `ProjectCardFooter`), fed
from `LiveProject` fields instead of raw `ProjectIntelligence`:

- **Primary metrics** (the two most prominent tiles): Market data when
  `market.available` (price + `changePct24h`, or `marketCapUsd` if a market
  cap exists), falling back to `tvlUsd` when no market exists, falling back
  to an honest "Not yet tracked" tile only when *both* are absent — never
  two empty dashes side by side.
- **Secondary metrics**: `volume24hUsd`, `engineering.commitsLast7d`
  ("GitHub Activity"), `contracts.count`. Same "unavailable, honestly
  labeled" treatment `MetricItem` already implements.
- **Badges**: primary `category` (chip), up to 2 `subcategories` (tags,
  overflow as "+N", reusing `ProjectCategoryChips`' existing pattern),
  `chains` (via `ChainBadgeGroup`, Base-first, same 1-badge-plus-overflow
  rule the current card already uses).
- **Confidence**: `confidence.score`/`level` via the existing `ScoreBadge`.
- **Verification**: `verification.status`/`level` via the existing
  `VerificationBadge`/`VerificationLevelBadge`.
- **Provider attribution**: a compact reuse of the existing
  `ProviderIndicator` component, driven by `providerAttribution` (`Sources`)
  — shows which real providers backed the numbers on this card, not a new
  attribution UI.
- **Freshness**: `lastUpdated`, via the existing `ProjectCardFooter`/
  `Timestamp` "Updated Xm ago" treatment.
- **Discovery status**: when `discoveryMetadata` is non-null (this project
  was also corroborated by this run's Discovery pipeline), a small
  secondary badge — "Also seen via CoinGecko, DefiLlama" — reusing
  `discoveryMetadata.sources`. Absent when `discoveryMetadata` is `null`
  (the common case), never a placeholder badge.
- **Quick actions**: click/tap anywhere on the card → Project Profile
  (`/dashboard/projects/{slug}`, unchanged navigation); the existing
  `WatchButton` (top-right corner, stops propagation); a small external-link
  icon for `identity.websiteUrl` when present.
- **Hover** (desktop): the existing `y: -3` lift + border/shadow treatment,
  unchanged.
- **Mobile**: full-width single column; the metrics grid may collapse from
  2×2 to a single row showing only the two Primary Metrics, with the rest
  reachable by tapping into the Profile page rather than the card growing
  taller.

### Discovery-only card (`source: "discovery"`) — the new, thinner variant

A deliberately lighter card for a project with `slug: null` — there is no
Project Profile page to link to yet, and no `ProjectIntelligence` record
backing it.

- **Visual distinction**: a dashed border (vs. the registry card's solid
  border) and a leading "Discovered" ribbon/badge — so a user never
  mistakes an unreviewed discovery candidate for a vetted registry entry.
  This is a trust signal, not a lesser-effort treatment.
- **Content**: `identity.name`, `category`, `confidence` (via the same
  `ScoreBadge`, `confidence.source: "discovery"` styled identically),
  `chains` (derived from candidate contracts, may be empty), and whichever
  of `market`/`engineering` fields the enrichment evidence actually
  populated — same honest-unavailable treatment as the registry card, just
  starting from a thinner baseline (no `providerAttribution`, no
  `verification`, both structurally `null` for this source per PR-054's own
  model).
- **Discovery evidence**: `discoveryMetadata.sources` and
  `discoveryEvidence.registryMatch.reason` (already a real, human-readable
  string produced by PR-053's `registryMatch.ts`) surfaced as an expandable
  "Why is this here?" disclosure — the actual mechanism for "quick actions"
  on this variant, since there's no Profile page to deep-link to.
- **Click behavior — open design question flagged for the implementation
  PR**: recommend the card **expands in place** (an inline accordion
  showing the evidence above) rather than navigating anywhere, since no
  `/dashboard/discovery/[id]` route exists and building one is out of this
  PR's scope. Do not route a discovery-only card to a 404 or a generic
  Project Profile with fabricated fields.
- **No WatchButton** — watching requires a stable registry project id;
  offering it here would imply a commitment the data model doesn't support
  yet.

---

## 8. Mobile Strategy

| Desktop region | Mobile transformation |
| --- | --- |
| Page Header | Unchanged content, tighter vertical padding. |
| Search Bar | Full-width, becomes sticky at the top on scroll-down (so search is always one tap away without scrolling back up). |
| KPI Strip | Horizontal scroll-snap row of compact stat chips (2.5 visible at once, swipe for the rest) instead of a fixed-column grid. |
| Category Rail | Already horizontally scrollable on desktop — unchanged behavior, just full device width. |
| Curated Rails | Native horizontal scroll-snap, tuned to show ~1.15 cards per viewport (the partial next card signals "swipe" without an explicit affordance element). |
| Filter Bar + Sort | Collapse into a single "Filters" button that opens a bottom sheet containing both the filter facets and the sort control — no permanently-docked filter bar competing for width at 375px. |
| View Toggle (Grid/Table) | **Table view is hidden below the `md` breakpoint** — an information-dense table is not legible at phone width; Grid is the only option, matching the constraint already implicit in Explorer's existing responsive behavior. |
| Full Directory Grid | Single column, full-width cards. |
| Pagination | Simplified to Previous/Next plus a page indicator ("Page 3 of 77") rather than a full numbered page-picker, which doesn't fit at 375px. |

General rules: every tap target ≥44×44px (WatchButton, expand disclosures,
filter chips); horizontal rail scrolling never fights the page's own
vertical scroll (standard CSS scroll-snap-x, no custom gesture handling);
`prefers-reduced-motion` disables the card hover-lift's mobile equivalent
(a press-state scale) exactly as the Design System's Animation Principles
already require site-wide (`docs/MASTER_ROADMAP.md`'s Design System
Evolution, point 2).

---

## 9. Future Scalability Notes

Nothing in this design assumes today's registry size. Explicitly checked
against three scales:

### 100+ projects

Already fully handled by this design as specified — no changes needed.
Rails stay capped at their fixed max-card counts; the Full Directory's
`paginateLiveProjects()` (already built, tested for exactly this) handles
the rest.

### 1,000+ projects

- Rails remain fast: filtering/sorting a few thousand `LiveProject` objects
  in memory is sub-millisecond work, well within a single request.
- The Full Directory's pagination becomes load-bearing UX, not a nicety —
  recommend a default `pageSize` of 24–48 (not the `pagination.ts` module's
  bare minimum) to balance scroll fatigue against page-count fatigue.
- Category chip counts start meaningfully differentiating verticals (e.g.
  "DEX 210" vs. "RWA 4") — worth surfacing the literal count prominently at
  this scale rather than treating chips as pure navigation.
- `buildProjectSearchIndex()` is rebuilt once per request today (via
  `getLiveProjects()`'s `cache()` wrapper) — still fine at this scale; no
  change needed.

### 10,000+ projects

The real constraint at this scale isn't the UX design in this document —
it's PR-054's own `getLiveProjects()` computing everything **in-memory, on
every request** (bounded only by React's per-request `cache()`, not
persisted across requests). Flagged honestly as the next real backend
scaling question, not solved here:

- Discovery's provider fan-out (`enrichCandidate`'s bounded GitHub calls)
  would need real scheduling/rate-limit budgeting beyond today's ad-hoc
  per-request execution.
- Collections and the search index (`collections.ts`, `search.ts`) are
  currently O(n) array scans recomputed per request — at 10,000+ items this
  likely wants to move to a periodically-refreshed, pre-computed cache
  rather than recomputation on every page load.
- `pagination.ts`'s existing `MAX_PAGE_SIZE = 500` cap already anticipates
  this and should **not** be raised — it's a deliberate ceiling.
- KPI-strip and category counts likely want a lightweight aggregate read
  rather than materializing the full `LiveProject[]` array just to count it.

None of this requires revisiting the information architecture designed
here — every section is already expressed as "a capped, sorted slice of a
potentially-huge array," never "all N projects rendered." It's a statement
that PR-054's current single-request, in-memory model is itself the next
real scaling milestone, worth its own future PR once real discovery volume
approaches four digits.

---

## 10. Recommended Implementation Order

1. ~~**Prerequisite backend gap-fixes**~~ — **done, PR-056.** `FilterOptions.category`/`.status`/`.discoveryStatus`/`.verificationStatus` now accept arrays for real multi-select; `FilterOptions.hasVolume` and the composed `FilterOptions.verified` now exist; `SortField` gained `stars` and `verifiedDate`. See `docs/PR-056_PROJECTS_SERVICE_ENHANCEMENTS.md`. UI implementation can now start directly at step 2.
2. **Page shell**: Header + KPI strip + Full Directory only (grid/table,
   adapting the existing `ExplorerGrid`/`ExplorerTable` patterns to
   `LiveProject`). Ships a working, if plain, page first and de-risks the
   `LiveProject` → card mapping before any curated-rail complexity.
3. **Filter Bar + Sort control + Search bar**, wired to
   `lib/projects/filter.ts` / `sort.ts` / `search.ts`. The Full Directory
   becomes fully interactive.
4. **Category Rail** — cheap once Full Directory filtering exists, since a
   category chip is just a shortcut that pre-sets the category filter.
5. **Curated rails**, in Primary-User-Question priority order: Verified →
   Trending → New → Recently Discovered/Updated → High Confidence → Top
   TVL/Volume/Most Active Development → Governance Active → Upcoming/
   Announced → Needs Review.
6. **Discovery-only card variant** + inline evidence expansion — the one
   genuinely new interaction pattern this PR's design introduces, since no
   existing Explorer component handles a project with no slug.
7. **Mobile pass** (rails → scroll-snap, filters → sheet, table hidden) —
   deliberately last, once desktop interaction is settled, matching this
   codebase's own established sequencing (visual/responsive polish passes
   follow logic, per `docs/MASTER_ROADMAP.md`'s PR-044→PR-049 sequencing).
8. **Empty/loading/error state pass** across every section — last, once
   every section's real data shape is known end-to-end, so copy can cite
   specific, real reasons (as this document does throughout) rather than
   generic placeholders.

No commit, no push. Wait for review.
