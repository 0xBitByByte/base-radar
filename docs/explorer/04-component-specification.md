# Explorer — Component Specification

**Status**: Draft
**Source of truth**: [01-product-requirements.md](01-product-requirements.md),
[02-information-architecture.md](02-information-architecture.md), and
[03-screen-specifications.md](03-screen-specifications.md) — this document
does not override, expand, or contradict any of them. Every component
below exists to render something those three documents already scoped;
nothing here introduces new product capability.
**Scope of this document**: component design and architecture only — names,
responsibilities, boundaries, and data flow. No implementation, no code,
no prop signatures, no file paths for new files.

**A naming convention this document follows throughout**: components
specific to the Explorer screen carry an `Explorer` prefix
(`ExplorerHeader`, `ExplorerToolbar`, …); components representing a single
project carry a `Project` prefix (`ProjectCard`, `ProjectRow`); fully
generic primitives meant to be reusable well beyond Explorer carry neither
(`Badge`, `Metric`, `Timestamp`). This resolves a few naming
inconsistencies in how these components were first listed (e.g. "FilterBar"
and "ExplorerFilterBar" refer to the same component throughout this
document).

---

## 1. Purpose

This document is where the prior three documents' decisions become a
concrete set of named, boundaried components — the shared vocabulary
multiple engineers can build against without independently re-deciding
what a "card" contains or which piece owns which state.

- The **Product Requirements** (01) define *what* Explorer must do and for
  whom.
- The **Information Architecture** (02) define *how a user moves through*
  Explorer — hierarchy, modes, search, filters.
- The **Screen Specifications** (03) define *what each screen looks like
  and how it behaves* — layout, interaction, responsive, motion, and state
  rules, desktop and beyond.
- This document defines *what pieces render those screens* — their
  responsibilities, their boundaries, and exactly how data reaches them.

Nothing here should be read as introducing a new requirement, screen, or
interaction. If a component listed below doesn't map to something already
specified in 01, 02, or 03, that's called out explicitly (see §19 Future
Components), not quietly implied as in-scope.

## 2. Component Design Principles

- **Single Responsibility** — each component does exactly one job. A
  component that both displays a score and fetches data, for example,
  is two responsibilities wearing one name.
- **Composition over complexity** — complex screens (a Grid full of cards,
  a Quick View full of sections) are built by composing small components,
  never by adding conditional branches to one large one.
- **Reusable** — a component's design should not assume it's only ever
  used in exactly one place on exactly one screen, where that assumption
  can be reasonably avoided.
- **Stateless whenever possible** — most components receive fully-resolved
  data and render it; only a small, explicitly identified set (§16) owns
  any state at all.
- **Accessible by default** — keyboard operability, focus visibility, and
  correct semantics are the component's responsibility to provide, not an
  afterthought added by whichever screen uses it.
- **Responsive by default** — a component adapts to the space it's given
  rather than assuming a specific viewport; screen-level responsive
  *rules* live in 03, but components must be built capable of following
  them.
- **Theme aware** — every component works correctly in both dark and
  light themes using this product's existing token set (see
  [docs/DESIGN_SYSTEM.md](../DESIGN_SYSTEM.md#colors)), never new,
  independently-defined colors.
- **Data-driven** — a component's appearance follows from the data it's
  given; it does not hardcode example content or assume a specific
  project's shape.
- **No business logic inside UI** — scoring, confidence, freshness, and
  matching calculations live entirely in `lib/intelligence/`; no component
  recomputes, re-derives, or second-guesses a number the Intelligence
  Engine already produced.
- **No provider-specific knowledge** — no component ever sees a
  `CoinMarket`, `Pair`, `Protocol`, `RepoStats`, `NetworkStatus`, or
  `VerifiedContract` shape directly. They only ever see
  `ProjectIntelligence`'s already-normalized sections — this mirrors the
  guarantee `lib/intelligence/types.ts` already makes at the Intelligence
  Engine's own output boundary.
- **Components consume only the Project Intelligence Engine.** No Explorer
  component imports from `lib/providers/*` or the Project Registry
  directly — see §16 for the one sanctioned exception (the page-level
  container).

## 3. Explorer Component Tree

```
ExplorerPage                            container — owns state, calls the Intelligence Engine
├── ExplorerHeader                       (§5)
│   ├── ExplorerStatusBadge
│   ├── ExplorerProjectCount
│   ├── ExplorerLastUpdated
│   └── ExplorerDataCoverage
├── ExplorerSummary                      the Intelligence Summary cards (03 §4)
├── ExplorerSearch                       (§6)
│   ├── SearchInput
│   ├── SearchClearButton
│   └── SearchShortcutHint
├── ExplorerToolbar                      (§7)
│   ├── ViewToggle                        Grid/Table
│   ├── ModeSelector                      Discover/Research/Intelligence
│   ├── SortSelector
│   └── FilterButton
├── ExplorerFilterBar                    (§8)
│   ├── FilterChip                        × one per active filter
│   ├── FilterGroup                       × one per facet, shown when expanded
│   ├── ActiveFilterSummary
│   ├── ClearFiltersButton
│   └── FilterDrawer                      mobile presentation of the same filter state
├── ExplorerGrid                         rendered when View = Grid (§9)
│   └── ProjectCard                       × one per visible project
│       ├── ProjectCardHeader
│       ├── ProjectCardMetrics
│       ├── ProjectCardFooter
│       ├── VerificationBadge
│       ├── HealthBadge
│       └── ConfidenceBadge
├── ExplorerTable                        rendered when View = Table (§10)
│   ├── StickyHeader
│   │   ├── ColumnHeader                  × one per column
│   │   └── SortableHeader                 a ColumnHeader variant
│   └── ProjectRow                        × one per visible project
│       └── RowActions
├── QuickViewDrawer                      rendered when a project is selected (§11)
│   ├── QuickViewHeader
│   ├── QuickViewSummary
│   ├── QuickViewMetrics
│   ├── QuickViewSources
│   └── QuickViewActions
├── LoadingState                         replaces the tree above during the one real load (§12)
│   └── SkeletonCard                      × repeated, in Grid's arrangement
├── EmptyState / NoResultsState          replaces Grid/Table when zero results (§12)
├── ErrorBanner                          page-level failure only (§12)
└── Pagination                           (future — not rendered in MVP)
```

`FavoriteButton`, named in some early component lists, is **not** part of
this tree — see §19; favorites/watchlist don't exist until Milestone 9.

## 4. Layout Components

Structural, content-agnostic components that give every Explorer screen
its shape — none of them know what a "project" is.

| Component | Responsibility |
| --- | --- |
| **ExplorerContainer** | Establishes Explorer's content width and horizontal padding, matching the existing dashboard content area's max width (03 §13) — the outermost structural wrapper. |
| **ExplorerSection** | A single vertical region within the page (Header, Summary, Search, Toolbar, Filter Bar, Results) with the page's established spacing rhythm above/below it (03 §13) — used repeatedly rather than each region re-implementing its own spacing. |
| **ExplorerPanel** | A bordered, padded surface — the shared shell behind Intelligence Summary cards, and reusable anywhere a card-like surface is needed. |
| **ExplorerGridLayout** | The responsive column-count grid container `ExplorerGrid` places `ProjectCard`s into; owns nothing but column count and gutter spacing per viewport (03 §16/§21). |
| **ExplorerTableLayout** | The scrollable, sticky-header table shell `ExplorerTable` places `ProjectRow`s into. |
| **ExplorerSidebar** *(future)* | Not used in this specification — Explorer does not populate the dashboard's reserved Intelligence Rail region (03's Open Questions leaves this open, not decided). Named here only so a future decision has a place to attach to. |

## 5. Explorer Header Components

Renders 03 §3's Explorer Header exactly, in the priority order already
specified there.

| Component | Responsibility |
| --- | --- |
| **ExplorerHeader** | Composes the title, description, and the status-line components below it; owns no data of its own. |
| **ExplorerStatusBadge** | Displays the Intelligence status summary (03 §3, priority 4) — how many visible projects currently have live data. |
| **ExplorerProjectCount** | Displays the current visible project count (03 §3, priority 2). |
| **ExplorerLastUpdated** | Displays the relative "last updated" time for the current intelligence batch (03 §3, priority 5); built on the shared `Timestamp` primitive (§13). |
| **ExplorerDataCoverage** | A more detailed rendering of live-data coverage than `ExplorerStatusBadge` alone — the same underlying figure, presented with more explanation, for use in the Intelligence Summary row (03 §4's "Live Data Coverage" card) rather than the header line. |
| **ExplorerActions** *(future)* | Not specified — no header-level action (export, share, etc.) is named in any current requirement. Reserved only. |

`ExplorerStatusBadge` and `ExplorerDataCoverage` intentionally read the
same underlying figure at two levels of detail (a compact header badge vs.
a fuller summary card) — this is not duplicated responsibility, since only
one of them owns the calculation conceptually (neither actually computes
anything; both simply render a value already summarized from every visible
project's `Sources`).

## 6. Search Components

Renders 03 §5's Search Bar exactly — one persistent inline field, not a
second command-palette-style overlay.

| Component | Responsibility |
| --- | --- |
| **ExplorerSearch** | Owns the current query string and orchestrates the components below it; the only search-related component with any state. |
| **SearchInput** | The text field itself — placeholder, value, focus behavior. |
| **SearchSuggestions** | **Not applicable to this MVP.** 03 §5 specifies live, in-place filtering of the Results Area as the user types — not a dropdown of suggested queries or results. This component is named in some component lists but has no specified behavior here; see §20. |
| **SearchClearButton** | The trailing "×" control, visible only when the field is non-empty (03 §5). |
| **SearchShortcutHint** | The trailing "/" hint shown when the field is empty and unfocused (03 §5). |
| **SearchEmptyState** | Not a distinct component — a search query that matches nothing renders the same `NoResultsState` used for zero filter matches (03 §10/§18); "search emptiness" is not a separate visual state. |
| **Future search history / Future recent searches** | Not specified. No requirement in 01, 02, or 03 names this capability; reserved only if a future iteration adds it. |

## 7. Toolbar Components

Renders 03 §6 exactly.

| Component | Responsibility |
| --- | --- |
| **ViewToggle** | Two-option Grid/Table switch. |
| **ModeSelector** | Three-option Discover/Research/Intelligence switch on desktop and tablet landscape; reduces to a two-option Discover/Intelligence switch on mobile and tablet portrait, per 03 §15/§16 (the component adapts; it is not two different components). |
| **SortSelector** | Exposes every sortable field named in 02-IA §7 / 03 §7; stays in sync with `SortableHeader` when Table View is active (03 §9). |
| **FilterButton** | Expands/collapses `ExplorerFilterBar`; displays an active-filter count badge (03 §6). |
| **Future Density Selector** | Not present in Part A/B of 03; reserved toolbar space only. |
| **Future Refresh Button** | Not present; a manual refresh would require explicitly invalidating the Intelligence Engine's batch cache, a data-layer decision this specification does not make (03 §6). |

## 8. Filter Components

Renders 03 §7 exactly.

| Component | Responsibility |
| --- | --- |
| **ExplorerFilterBar** *(also referred to as "FilterBar")* | Owns the collapsed/expanded UI state and composes the components below it. The active filter *values* themselves are page-level state (§16), not owned by this component. |
| **FilterChip** | Displays one active filter with a remove control; stateless. |
| **FilterGroup** | One facet's full picker (e.g. all Category options) shown only while the Filter Bar is expanded — one instance per MVP facet named in 02-IA §6 (Categories, Tags, Verification, Status, Chain, Health, Confidence, Developer Activity, TVL, Market Cap, Risk). |
| **FilterDrawer** *(mobile)* | The bottom-sheet presentation of the same expanded filter content, per 03 §15 — not a second filter system, a responsive presentation of the same one. |
| **ClearFiltersButton** | Resets every active filter at once (03 §7); does not affect the Search query. |
| **ActiveFilterSummary** | A compact restatement of how many filters are active — feeds `FilterButton`'s badge and can appear alongside the chip row. |

## 9. Grid Components

Renders 03 §8 exactly.

| Component | Responsibility |
| --- | --- |
| **ExplorerGrid** | Lays out one `ProjectCard` per visible project inside `ExplorerGridLayout` (§4); owns no per-card state. |
| **ProjectCard** | Composes the sub-components below into the exact card hierarchy specified in 03 §8; the unit of "one project, glanceable." |
| **ProjectCardHeader** | Logo, name, primary category chip (03 §8, item 1). |
| **ProjectCardMetrics** | The headline live metric plus Health/Confidence badges (03 §8, items 2–3); built from `Metric`, `HealthBadge`, `ConfidenceBadge`. |
| **ProjectCardFooter** | Secondary tag chips and the Freshness indicator (03 §8, items 4–5); built from `Badge` and `Timestamp`. |
| **VerificationBadge** | Displays a project's `community.verificationStatus` (verified/community/unverified/flagged) — a `Badge` specialization, per 01-PRD's Glossary. |
| **HealthBadge** | Displays `ProjectIntelligence.health.score`/`.label` — a `ScoreIndicator` specialization (§13). |
| **ConfidenceBadge** | Displays `ProjectIntelligence.confidence.score`/`.level` — a `ScoreIndicator` specialization (§13). |
| **FavoriteButton** | **Not part of MVP.** Named in some component lists, but favoriting/watchlisting doesn't exist until Milestone 9 (Portfolio) — see §19. Not rendered anywhere in this specification. |

## 10. Table Components

Renders 03 §9 exactly.

| Component | Responsibility |
| --- | --- |
| **ExplorerTable** | Lays out one `ProjectRow` per visible project inside `ExplorerTableLayout` (§4). |
| **ProjectRow** | One project's data across the eight default columns (03 §9); the row-view equivalent of `ProjectCard`. |
| **ColumnHeader** | A single, non-sortable column label (used for columns without a defined sort, if any). |
| **SortableHeader** | A `ColumnHeader` variant that displays current sort direction and toggles it on click/activation (03 §9). |
| **RowActions** | In MVP, exposes exactly one explicit, focusable "View" control equivalent to clicking the row — necessary so keyboard and screen-reader users have a discoverable way to open Quick View without relying on "click anywhere on the row." No additional actions exist in MVP. |
| **StickyHeader** | Keeps the column header row fixed while rows scroll beneath it (03 §9). |
| **Future Column Manager** | Not specified — column show/hide and resizing are named future capabilities (03 §9) with no defined UI yet. |

## 11. Quick View Components

Renders 03 §14 exactly — the MVP's entire project-detail experience.

| Component | Responsibility |
| --- | --- |
| **QuickViewDrawer** | The slide-in panel shell itself — backdrop, focus trap, open/close mechanics (03 §14); composes everything below. |
| **QuickViewHeader** | Logo, name, category/tag chips, verification status, close control (03 §14, item 1). |
| **QuickViewSummary** | The headline metric plus Health/Confidence badges *with their visible `factors` breakdown* (03 §14, item 2) — distinct from `ProjectCardMetrics` in that it shows the "why," not just the score. |
| **QuickViewMetrics** | The full Market/Trading/TVL/GitHub/Chain/Contracts/Community detail (03 §14, items 3–7). |
| **QuickViewSources** | The per-provider Source Attribution breakdown (03 §14, item 8) — six entries, one per provider, each built from `ProviderIndicator` (§13). |
| **QuickViewActions** | Primary actions (visit website, open GitHub) and secondary actions (copy contract address, view on chain explorer) per 03 §14. |
| **Future Related Projects** | Not specified — no requirement names a "related projects" concept anywhere in 01, 02, or 03. |

## 12. State Components

Renders 03 §17 (Loading), §18 (Empty), and §19 (Error) exactly.

| Component | Responsibility |
| --- | --- |
| **LoadingState** | The full-page skeleton shown exactly once — during Explorer's initial intelligence batch build (03 §17). Never shown for search, filter, sort, or Quick View. |
| **SkeletonCard** | A single card-shaped placeholder, repeated in `ExplorerGridLayout`'s arrangement to compose `LoadingState`; built on the product's existing skeleton primitive (`components/ui/skeleton.tsx`). |
| **EmptyState** | The true "zero projects in the registry" state (03 §18) — reuses the product's existing `components/ui/EmptyState.tsx` anatomy directly rather than a new one. |
| **NoResultsState** | The "search/filter matched zero projects" state (03 §10/§18) — the same underlying component as `EmptyState`, configured with recovery actions ("Clear filters"/"Clear search") rather than a new component. |
| **OfflineBanner** *(future)* | Not specified — no offline capability exists anywhere in this product (03 §18). |
| **StaleDataBanner** *(future)* | Not specified in this milestone. Freshness is already shown per-project (03 §4/§14); a dedicated banner for site-wide staleness is not a named requirement. |
| **ErrorBanner** | The one genuine new state from 03 §19 — a full-page failure banner for the rare case where the initial intelligence batch fails outright, with a single "Try again" action. Per-project unavailability is *not* rendered through this component — see §16. |

## 13. Shared Components

Generic primitives with no Explorer-specific or project-specific
knowledge — reusable well beyond this feature, and in several cases
reusable *existing* product primitives rather than new ones.

| Component | Responsibility | Reuse note |
| --- | --- | --- |
| **Metric** | A label + value pair (e.g. "TVL" / "$4.2M") — the building block of `ProjectCardMetrics`, `QuickViewMetrics`, and table cells. | New — no direct existing equivalent. |
| **Badge** | The generic pill/chip primitive `VerificationBadge`, category chips, and tag chips all specialize. | Should extend the existing `GlowBadge` component's color vocabulary (`components/ui/GlowBadge.tsx`) rather than introduce a parallel badge system. |
| **SourceBadge** | A single, summarized live/unavailable indicator for a *project* as a whole (used on cards/rows) — coarser-grained than `ProviderIndicator`. | New; distinct responsibility from `ProviderIndicator` (see below) to avoid duplication. |
| **ScoreIndicator** | The generic 0–100-score-plus-label primitive `HealthBadge` and `ConfidenceBadge` both specialize. | New — no direct existing equivalent. |
| **ProviderIndicator** | A single *provider's* live/unavailable/not-configured status — the finer-grained unit `QuickViewSources` repeats six times, once per provider. | New; distinct from `SourceBadge` (project-level summary vs. provider-level detail) so the two never duplicate each other's job. |
| **SectionTitle** | A heading-plus-optional-description primitive for Quick View's internal sections ("Market," "GitHub Activity," …). | Should extend the existing `components/ui/SectionTitle.tsx` rather than introduce a new heading component. |
| **SectionDescription** | A supporting line beneath a `SectionTitle`. | Likely already covered by `SectionTitle`'s existing `subtitle` prop — evaluate before building a separate component (see §20). |
| **Timestamp** | Relative-time display with an exact-time reveal on hover (03 §12) — powers `ExplorerLastUpdated`, card/row Freshness, and Quick View's per-source Freshness. | New — no direct existing equivalent, though the product already has a relative-time formatting convention to build on. |
| **StatusDot** | The smallest possible live/online visual primitive — a colored dot, no text. | Should reuse the existing pulsing-dot pattern already used for live-status indicators elsewhere in the dashboard, rather than a new one. |
| **Divider** | A plain visual separator. | Trivial; likely doesn't need a dedicated component if a simple existing utility already covers it — flagged in §20. |

## 14. Component Responsibilities

The consolidated Purpose / Inputs / Outputs / Dependencies / Future
extension reference for every component named above. "Outputs" describes
user-facing events a component can trigger, not literal function
signatures.

### Layout

| Component | Purpose | Inputs | Outputs | Dependencies | Future extension |
| --- | --- | --- | --- | --- | --- |
| ExplorerContainer | Set page content width/padding | none (structural only) | none | — | none anticipated |
| ExplorerSection | Consistent vertical rhythm between page regions | none (structural only) | none | — | none anticipated |
| ExplorerPanel | Bordered/padded surface shell | none (structural only) | none | — | reused by any future card-like surface |
| ExplorerGridLayout | Responsive column grid | current viewport width | none | — | virtualization wrapper could wrap this later (03 §14) |
| ExplorerTableLayout | Scrollable, sticky-header table shell | current viewport width | none | — | virtualization wrapper could wrap this later |
| ExplorerSidebar *(future)* | Unspecified | — | — | — | tied to the open Intelligence Rail question (03) |

### Header

| Component | Purpose | Inputs | Outputs | Dependencies | Future extension |
| --- | --- | --- | --- | --- | --- |
| ExplorerHeader | Compose title/description/status line | title, description, current counts | none | ExplorerProjectCount, ExplorerStatusBadge, ExplorerLastUpdated | none anticipated |
| ExplorerStatusBadge | Show live-data coverage compactly | count of live vs. total visible projects | none | `Sources` per visible project | none anticipated |
| ExplorerProjectCount | Show current visible count | count | none | current filter/search result set | none anticipated |
| ExplorerLastUpdated | Show batch generation time | a `Metadata.generatedAt` value | none | Timestamp | none anticipated |
| ExplorerDataCoverage | Fuller live-data coverage summary | same as ExplorerStatusBadge | none | `Sources` per visible project | none anticipated |
| ExplorerActions *(future)* | Unspecified | — | — | — | unscoped |

### Search

| Component | Purpose | Inputs | Outputs | Dependencies | Future extension |
| --- | --- | --- | --- | --- | --- |
| ExplorerSearch | Own and orchestrate the query | none (owns its own state) | emits: query changed | SearchInput, SearchClearButton, SearchShortcutHint | future search history (unscoped) |
| SearchInput | Text entry | current query value, placeholder | emits: text changed | — | — |
| SearchClearButton | Reset query | visibility depends on query being non-empty | emits: query cleared | — | — |
| SearchShortcutHint | Communicate the `/` shortcut | none | none | — | — |

### Toolbar

| Component | Purpose | Inputs | Outputs | Dependencies | Future extension |
| --- | --- | --- | --- | --- | --- |
| ViewToggle | Switch Grid/Table | current view | emits: view changed | — | — |
| ModeSelector | Switch Discover/Research/Intelligence | current mode, current viewport class | emits: mode changed | ViewToggle (mode may set a view default, 03 §6) | — |
| SortSelector | Choose sort field/direction | current sort, available fields (02-IA §7) | emits: sort changed | stays in sync with SortableHeader | — |
| FilterButton | Expand/collapse filters | active filter count | emits: filter bar toggled | ExplorerFilterBar | — |

### Filter

| Component | Purpose | Inputs | Outputs | Dependencies | Future extension |
| --- | --- | --- | --- | --- | --- |
| ExplorerFilterBar | Own expand/collapse state, list active chips | active filter values (page-level state) | emits: filter changed, filter cleared | FilterChip, FilterGroup, ActiveFilterSummary, ClearFiltersButton | — |
| FilterChip | Show one active filter | one filter's label/value | emits: this filter removed | — | — |
| FilterGroup | One facet's full picker | facet name, available options, current selection | emits: facet selection changed | — | AI-specific facet (Milestone 10) slots in as an additional FilterGroup, no restructuring |
| FilterDrawer *(mobile)* | Mobile presentation of filter content | same as ExplorerFilterBar | same events | ExplorerFilterBar's content | — |
| ClearFiltersButton | Reset all filters | active filter count | emits: all filters cleared | — | — |
| ActiveFilterSummary | Compact active-filter count | active filter count | none | — | — |

### Grid

| Component | Purpose | Inputs | Outputs | Dependencies | Future extension |
| --- | --- | --- | --- | --- | --- |
| ExplorerGrid | Render visible projects as cards | list of `ProjectIntelligence` | none | ProjectCard | — |
| ProjectCard | One project, glanceable | one project's `Identity`/`Market`/`Tvl`/`Health`/`Confidence`/`Sources`/`Freshness` | emits: card activated (opens Quick View) | ProjectCardHeader/Metrics/Footer, VerificationBadge, HealthBadge, ConfidenceBadge | Signals badge (Milestone 8) adds one more footer badge, no restructuring |
| ProjectCardHeader | Identity row | `Identity`, primary category | none | — | — |
| ProjectCardMetrics | Headline metric + scores | `Market`/`Tvl`, `Health`, `Confidence` | none | Metric, HealthBadge, ConfidenceBadge | — |
| ProjectCardFooter | Tags + freshness | `tags`, `Freshness` | none | Badge, Timestamp | — |
| VerificationBadge | Show verification status | `community.verificationStatus` | none | Badge | — |
| HealthBadge | Show health score | `Health.score`/`.label` | none | ScoreIndicator | — |
| ConfidenceBadge | Show confidence score | `Confidence.score`/`.level` | none | ScoreIndicator | — |

### Table

| Component | Purpose | Inputs | Outputs | Dependencies | Future extension |
| --- | --- | --- | --- | --- | --- |
| ExplorerTable | Render visible projects as rows | list of `ProjectIntelligence` | none | ProjectRow, StickyHeader | — |
| ProjectRow | One project, dense | the eight default-column fields for one project | emits: row activated | RowActions | additional optional columns (Market Cap, Freshness, GitHub Stars) once column customization exists |
| ColumnHeader | Static column label | column name | none | — | — |
| SortableHeader | Sortable column label | column name, current sort state | emits: sort toggled | stays in sync with SortSelector | — |
| RowActions | Explicit "View" control | none | emits: row activated | — | additional actions once Milestone 9/10 exist |
| StickyHeader | Fixed header row | — | none | ColumnHeader, SortableHeader | — |

### Quick View

| Component | Purpose | Inputs | Outputs | Dependencies | Future extension |
| --- | --- | --- | --- | --- | --- |
| QuickViewDrawer | Own open/close mechanics | selected project's full `ProjectIntelligence`, open/closed state | emits: drawer closed | QuickViewHeader/Summary/Metrics/Sources/Actions | "View full details" action added once Milestone 10 ships |
| QuickViewHeader | Identity + close | `Identity`, `community.verificationStatus` | emits: drawer closed | close control | — |
| QuickViewSummary | Headline + score factors | `Health`/`Confidence` including `.factors` | none | ScoreIndicator | — |
| QuickViewMetrics | Full data breakdown | `Market`/`Trading`/`Tvl`/`GithubIntel`/`ChainInfo`/`Contracts`/`Community` | none | Metric, ContractInfo rendering | — |
| QuickViewSources | Per-provider attribution | `Sources` (all six providers) | none | ProviderIndicator × 6 | — |
| QuickViewActions | Primary/secondary actions | website/GitHub URLs, contract addresses | emits: action triggered (navigation/clipboard) | — | Watchlist/Compare actions once Milestone 9 exists |

### State

| Component | Purpose | Inputs | Outputs | Dependencies | Future extension |
| --- | --- | --- | --- | --- | --- |
| LoadingState | Full-page skeleton | none | none | SkeletonCard | — |
| SkeletonCard | One placeholder card | none | none | existing Skeleton primitive | — |
| EmptyState | Zero-registry state | none | emits: none (no recovery action) | existing EmptyState component | — |
| NoResultsState | Zero-results state | which of search/filter (or both) is narrowing | emits: clear search / clear filters | existing EmptyState component | — |
| ErrorBanner | Page-level failure | error detail (plain-language only) | emits: retry requested | — | — |

### Shared

| Component | Purpose | Inputs | Outputs | Dependencies | Future extension |
| --- | --- | --- | --- | --- | --- |
| Metric | Label + value | label, value | none | — | — |
| Badge | Generic chip | label, color/tone | none | extends GlowBadge | — |
| SourceBadge | Project-level live/unavailable summary | aggregated `Sources` status | none | Badge | — |
| ScoreIndicator | Generic 0–100 + label | score, label | none | — | — |
| ProviderIndicator | One provider's status | one `SourceAttribution` | none | StatusDot | — |
| SectionTitle | Section heading | title, optional description | none | existing SectionTitle component | — |
| SectionDescription | Supporting line | text | none | possibly folded into SectionTitle (see §20) | — |
| Timestamp | Relative + exact time | an ISO timestamp | none (hover reveals exact time) | — | — |
| StatusDot | Live/online dot | a boolean or status enum | none | — | — |
| Divider | Visual separator | none | none | — | — |

## 15. Component Boundaries

- **Container components** — own state and/or orchestrate data flow:
  `ExplorerPage` (the only one that calls the Intelligence Engine),
  `ExplorerSearch` (query state), `ExplorerToolbar` (mode/view/sort state),
  `ExplorerFilterBar` (expand/collapse state; filter *values* are lifted to
  `ExplorerPage`), `QuickViewDrawer` (open/closed + which project, lifted
  from `ExplorerPage`).
- **Presentation components** — receive data as input and render it, own
  no state beyond ephemeral UI concerns (hover, focus): `ProjectCard`,
  `ProjectRow`, every component in §13 (Shared), every sub-component of
  `ProjectCard`/`ProjectRow`/`QuickViewDrawer` not listed as a container
  above.
- **Shared UI components** — §13's primitives, several of which extend
  existing product components (`Badge`→`GlowBadge`, `SectionTitle`→the
  existing `SectionTitle`) rather than standing alone.
- **Future server components** — following this product's existing
  Server-Component-by-default convention
  ([docs/ARCHITECTURE.md](../ARCHITECTURE.md#ui-layer)), `ExplorerPage`
  itself is expected to be a Server Component (it performs the initial
  data fetch); most Shared and presentation components with no
  interactivity of their own (`Metric`, `Badge`, `Timestamp`, `StatusDot`)
  have no inherent need to be Client Components either.
- **Future client components** — anything with interactivity needs to
  cross that boundary explicitly: `ExplorerSearch`, `ExplorerToolbar`,
  `ExplorerFilterBar`, `QuickViewDrawer`, and anything handling
  hover/click/keyboard behavior on `ProjectCard`/`ProjectRow`. This mirrors
  the existing dashboard's own pattern of keeping client boundaries small
  and leaf-level rather than making a whole page a client component.

## 16. Data Ownership

- **`ExplorerPage` is the only component that calls into the Project
  Intelligence Engine** (`getAllProjectIntelligence()` /
  `getProjectIntelligence()`), exactly mirroring how `sources.ts` is the
  only module inside the Intelligence Engine that calls the Provider
  Layer — the same "one sanctioned entry point" pattern, one layer higher.
- **No Explorer component ever imports from `lib/providers/*`.** Not
  CoinGecko, not DefiLlama, not DexScreener, not GitHub, not Blockscout,
  not Base RPC — directly or indirectly. Every component below
  `ExplorerPage` only ever receives already-resolved `ProjectIntelligence`
  data (or a slice of it) as input.
- **No Explorer component imports from the Project Registry directly
  either** — `ExplorerPage` is the sole point of contact with
  `data/projects/`, via the Intelligence Engine's own consumption of it.
- **Components that own state**: `ExplorerPage` (the full Explorer State
  Model per 03 §24 — mode, view, sort, filters, search, drawer selection),
  `ExplorerSearch` (its own input value, before it's lifted/debounced into
  page state), `ExplorerFilterBar` (only its expand/collapse UI state).
- **Components that only ever receive props**: `ProjectCard`, `ProjectRow`,
  every component in §13, `QuickViewHeader`/`Summary`/`Metrics`/`Sources`/`Actions`,
  `FilterChip`, `ColumnHeader`/`SortableHeader`.
- **Components that never fetch data, under any circumstance**: every
  component except `ExplorerPage`.

## 17. Accessibility

Component-level guarantees implementing 03 §20 at the granularity this
document works at:

- **ARIA**: `ExplorerSearch`, `ExplorerToolbar`, `ExplorerFilterBar`, and
  `ExplorerGrid`/`ExplorerTable` each expose a distinguishable landmark
  role; `FilterButton` and `QuickViewDrawer` expose `aria-expanded`;
  `ExplorerProjectCount` sits inside a live region so its updates are
  announced (03 §20).
- **Keyboard**: every interactive component (`ViewToggle`, `ModeSelector`,
  `SortSelector`, `FilterButton`, `FilterChip`, `ProjectCard`, `ProjectRow`,
  `RowActions`, everything inside `QuickViewDrawer`) is reachable and
  operable via keyboard alone, per the map in 03 §23.
- **Focus**: `QuickViewDrawer` traps focus while open and restores it to
  the triggering `ProjectCard`/`ProjectRow` on close (03 §14/§20); no
  other component traps focus.
- **Reduced motion**: any component with its own transition
  (`QuickViewDrawer`'s slide, `ExplorerFilterBar`'s expand, counter
  components inside `ExplorerSummary`) respects `prefers-reduced-motion`
  via the same existing mechanism used everywhere else (03 §22) — no
  component invents its own motion-reduction handling.
- **Contrast**: every component uses this product's existing token set
  (§2) exclusively, inheriting its already-established contrast behavior.
- **Touch targets**: every interactive component meets a comfortable
  minimum touch-target size regardless of the input device (03 §20).
- **Table accessibility**: `ColumnHeader`/`SortableHeader` associate with
  their column's cells using proper table semantics; `SortableHeader`
  exposes its sort direction non-visually, not only via an icon (03 §20).
- **Drawer accessibility**: `QuickViewDrawer` follows the same accessible
  dialog pattern as this product's existing drawers (`MobileSidebar`, the
  command palette) — accessible name, focus trap, restored focus on close.

## 18. Performance

- **Memoization**: `ProjectCard`, `ProjectRow`, and every §13 Shared
  component are pure, presentational, and good memoization candidates —
  they re-render often (once per visible project) and should not
  re-render when unrelated Explorer state (e.g. Filter Bar expand/collapse)
  changes.
- **Lazy loading**: project logos within `ProjectCardHeader`/`QuickViewHeader`
  load lazily as they enter view (03 §14).
- **Virtualization readiness**: `ExplorerGridLayout` and `ExplorerTableLayout`
  (§4) are the two components that must keep a clean, isolated
  card/row-rendering boundary so a virtualization approach can wrap them
  later without restructuring anything above them — per 03 §14, this is
  not required for MVP at the registry's current size, only anticipated.
- **Avoid unnecessary renders**: components that only display data
  (everything in §13, `ProjectCard`, `ProjectRow`) should not re-render
  when state unrelated to their own data changes — e.g. typing in
  `ExplorerSearch` should not re-render every `ProjectCard` that a
  debounced filter hasn't yet excluded.
- **Stable props**: components receiving a project's data should receive
  a stable reference to that project's `ProjectIntelligence` (or a
  focused slice of it), not a freshly-recreated object on every parent
  render.

## 19. Future Components

Named here because they were raised in one form or another, and are
explicitly **not** part of this specification or this milestone:

- **Project Details** (Milestone 10) — the dedicated route Quick View's
  future "View full details" action leads to.
- **Signals** (Milestone 8) — expected to surface as an additional badge
  on `ProjectCard`/`ProjectRow` and an additional `FilterGroup`, not a new
  screen region.
- **Portfolio / Watchlist components**, including **FavoriteButton** and
  any "saved" affordance (Milestone 9) — not present anywhere in this
  specification's component tree.
- **AI Research** (Milestone 10) — a dedicated AI-specific `FilterGroup`
  and, eventually, AI Research–specific screens beyond Explorer.
- **Wallet Intelligence** *(illustrative only, not roadmapped)* — per
  02-IA §15, named only as a test of architectural extensibility.
- **Governance** *(illustrative only, not roadmapped)* — same status as
  Wallet Intelligence.
- **Saved Views / Pinned Views** (Milestone 9 territory) — persisted
  Sort/Filter/View combinations; depends on accounts existing.
- **Column Manager**, **Density Selector**, **Refresh Button** — named in
  §7/§10 as reserved-but-undesigned toolbar/table capabilities.

## 20. Open Questions

- Should `SectionDescription` be its own component, or is the existing
  `SectionTitle` component's `subtitle` prop already sufficient for every
  place this specification would use it (§13)?
- Should `SourceBadge` (project-level) and `ProviderIndicator`
  (provider-level) share more implementation, given they display
  conceptually similar live/unavailable states at two granularities — or
  is keeping them fully separate the right call for clarity?
- Is a dedicated `Divider` component justified, or does an existing
  utility already cover every place this specification calls for one?
- Does `ExplorerSidebar` (§4) ever get built, tied to whether Explorer
  populates the dashboard's reserved Intelligence Rail region — still open
  from 03's own Open Questions, not resolved here.
- Should `RowActions`' single "View" control be visually present at all
  times, or only on focus/hover, given the row itself is already fully
  clickable?
- Where exactly does `ExplorerDataCoverage` (Header) end and the
  Intelligence Summary's "Live Data Coverage" card (03 §4) begin — are
  they the same component rendered twice, or should one simply link to
  the other?

---

## Output Summary

This document defines components only — no code, no file paths, no prop
signatures. Every future capability named above (Signals, Portfolio, AI
Research, Wallet Intelligence, Governance) is described as an additive
slot into the existing component tree, never a reason to restructure it —
consistent with 02-IA §15's "without redesign" requirement carried all the
way through to the component level.
