# Explorer — Screen Specifications (Part A: Desktop)

**Status**: Draft
**Source of truth**: [01-product-requirements.md](01-product-requirements.md) and
[02-information-architecture.md](02-information-architecture.md) — this
document does not override, expand, or contradict either. Every screen
element specified below is a concrete rendering of something those two
documents already scoped as MVP; nothing here introduces new capability.
**Scope of this document**: the Explorer Overview screen (per 02-IA
Section 3), desktop viewport, Discover Mode default state, at rest — a
non-empty result set with no search/filter active and no detail view open.
Detailed enough that a frontend engineer can build the desktop layout and
interactions without making a UX judgment call themselves.

**Out of scope for Part A** (explicitly deferred to Part B):

- Quick View's own internal design (its existence and trigger point are
  noted here; its layout is not)
- Mobile and tablet layouts
- Loading and skeleton states
- Error states
- Accessibility specification (beyond referencing what 02-IA already
  requires)
- Responsive breakpoint behavior

---

## 1. Screen Purpose

This is the screen a user lands on when they open Explorer from the
dashboard sidebar's existing "Projects" entry (per 02-IA Section 3) — the
Overview state, in Discover Mode, showing every project currently matching
whatever search/filter/sort is active (all of them, at rest). Its job is to
answer, at a glance, "what exists, and how much should I trust what I'm
seeing" — per 02-IA's "discover before analyze" and "confidence over
certainty" principles — before a user commits to inspecting any single
project further.

## 2. Desktop Layout

Explorer renders as a page inside the existing dashboard shell — the same
sidebar, topbar, and live status bar every other dashboard page already
uses (per [docs/ARCHITECTURE.md](../ARCHITECTURE.md#dashboard-architecture)).
It does not introduce a new shell, and it does not populate the dashboard's
reserved Intelligence Rail region (see Open Questions).

Top to bottom, within the existing content area:

```
┌─────────────────────────────────────────────────────────┐
│ Explorer Header                                           │
├─────────────────────────────────────────────────────────┤
│ Intelligence Summary  (row of summary cards)               │
├─────────────────────────────────────────────────────────┤
│ Search Bar                                                 │
├─────────────────────────────────────────────────────────┤
│ Toolbar               (view toggle · sort · filter · mode) │
├─────────────────────────────────────────────────────────┤
│ Filter Bar            (collapsed by default — see §7)      │
├─────────────────────────────────────────────────────────┤
│                                                             │
│ Results Area           (Grid View or Table View)            │
│                                                             │
└─────────────────────────────────────────────────────────┘
```

There is no page-level footer beyond whatever footer, if any, the
dashboard shell itself already provides on every page — Explorer does not
add its own.

**Region relationships:**

- Explorer Header, Intelligence Summary, Search Bar, and Toolbar are
  always visible and always precede the Results Area — none of them are
  hidden by scrolling within the page (the page itself scrolls; these
  regions are not independently pinned in Part A).
- The Filter Bar sits between the Toolbar and the Results Area. Expanding
  it pushes the Results Area down — it is part of the page's normal flow,
  not an overlay, so it never covers results.
- The Results Area is the only region that changes shape based on view
  mode (Grid vs. Table, per §8/§9) — every region above it is identical
  regardless of which view mode is active.
- The Results Area spans the full available content width; nothing sits
  beside it.

Vertical rhythm between major regions follows the page-level spacing
rhythm already used elsewhere in the dashboard (see §13).

## 3. Explorer Header

Contains, in priority order (highest priority first):

1. **Page title** — "Explorer." The single most prominent element on the
   screen; establishes where the user is.
2. **Project count** — the number of projects currently visible in the
   Results Area (i.e., reflecting any active search/filter, not
   necessarily the full registry count). Second-highest priority because
   it's the fastest way to sense whether a filter combination is too
   narrow, without looking at the Filter Bar.
3. **Description** — a single line explaining what Explorer is (e.g. "Browse,
   filter, and research every project in the Base ecosystem."). Present for
   first-time orientation (serves Alex, the Newcomer persona), but lower
   priority than title/count since a returning user doesn't need to re-read
   it every visit.
4. **Intelligence status** — a compact indicator of how much of the
   currently visible set has live data right now (e.g. "N of M projects
   have live data"), aggregated from each visible project's `Sources`
   attribution. Lower priority than count because it answers a
   second-order question ("how much of what I'm counting is live"), not
   the first-order "what am I looking at."
5. **Last updated** — a relative timestamp for when the current batch of
   intelligence was generated (the Intelligence Engine's `Metadata.generatedAt`
   for this batch), phrased the same way the dashboard already phrases
   relative time elsewhere. Lowest priority — supplementary context, not
   something a user scans for first.

Title and Description sit together as the header's identity; Project
count, Intelligence status, and Last updated sit together as a lighter-weight
status line beneath or beside the title — the two groups are visually
distinct so the identity block never competes with the status block for
attention.

## 4. Intelligence Summary

A row of summary cards immediately below the Explorer Header, each a
single number plus a short label. Every card here is backed by data that
already exists in the Project Registry or `ProjectIntelligence` model —
two of the task's originally suggested cards ("Trending" and "New This
Week") are addressed explicitly below rather than included, because
neither has real backing data today (see Open Questions).

| Card | Value | Purpose |
| --- | --- | --- |
| **Total Projects** | Count of all projects in the Project Registry | Establishes the scale of what Explorer covers, independent of any active filter. |
| **Verified Projects** | Count where `community.verificationStatus === "verified"` | Surfaces how much of the registry carries the registry's highest editorial trust signal, at a glance. |
| **Healthy Projects** | Count where `ProjectIntelligence.health.label` is `"excellent"` or `"good"` | Gives a quick pulse on how many projects currently look active/alive, per the Intelligence Engine's Health score. |
| **Needs Review** | Count where `community.verificationStatus` is `"unverified"` or `"flagged"` | The honest counterpart to Verified Projects — makes low-trust entries visible rather than only celebrating high-trust ones, per "confidence over certainty." |
| **Live Data Coverage** | Count (or %) of visible projects with at least one `"live"` entry in their `Sources` attribution | Sets expectations up front about how much of what's shown is enriched vs. registry-only — directly serves the "sparse data coverage" risk named in the PRD. |

These five cards are always visible together as one row; none is
individually dismissable in Part A.

## 5. Search Bar

A single, persistent, always-visible input directly below the Intelligence
Summary — distinct from, but behaviorally consistent with, the existing
global ⌘K command palette (`components/dashboard/SearchBar.tsx`). Per
02-IA, Explorer does not introduce a second, parallel *matching* mechanism;
it does, however, have its own persistent inline field so search is visible
without inv­oking an overlay, which is what this section specifies.

- **Placeholder**: "Search projects by name, category, or tag" — states
  exactly what's supported, not more.
- **Supported searches** (matches 02-IA Section 5's MVP scope exactly):
  project name, category, tag, and keywords within the short description.
  Narratives, contracts, wallets, and protocol IDs are not supported here —
  consistent with 02-IA marking all four as future.
- **Clear button**: appears only once the field has a non-empty value; a
  small "×" at the trailing edge of the field. Clears the query and
  restores the full (filter-respecting) result set.
- **Keyboard shortcut display**: a small "/" hint shown at the field's
  trailing edge when the field is empty and unfocused, indicating that
  pressing `/` anywhere on the Explorer screen focuses this field. This is
  a page-scoped shortcut, distinct from the global ⌘K shortcut, which
  continues to open the existing command palette unchanged.
- **Search behavior**: filters the Results Area in place as the user
  types, debounced against keystrokes (no navigation, no page reload).
  Search and any active filters combine — search narrows within whatever
  the Filter Bar has already selected, not instead of it. An empty query
  shows every project the active filters allow.

## 6. Toolbar

A single row directly below the Search Bar, containing:

- **Grid/Table toggle** — a two-option switch between Grid View (§8) and
  Table View (§9). Always visible.
- **Sort dropdown** — one control offering every sortable field from
  02-IA Section 7 (Name, TVL, Market Cap, Health score, Confidence score,
  GitHub stars, Verification status). Always visible. Shows the currently
  active sort field and direction.
- **Filter button** — opens/collapses the Filter Bar (§7). Always visible.
  Displays a small count badge when one or more filters are active; shows
  no badge when none are active.
- **Mode selector** — a three-option control for Discover / Research /
  Intelligence Mode (per 02-IA Section 4). Always visible. Switching to
  Discover sets the view to Grid if it isn't already; switching to
  Research sets it to Table if it isn't already. Switching to Intelligence
  does not change Grid/Table — it only changes which fields (Confidence,
  Freshness, Sources) are visually promoted in whichever view is active.
  Manually toggling Grid/Table afterward does not change the selected
  Mode.
- **Density selector** *(future)* — not present in Part A. Reserved
  toolbar space for a future comfortable/compact density control; no
  behavior specified now.
- **Refresh button** *(future)* — not present in Part A. A manual refresh
  would need to explicitly bypass the Intelligence Engine's batch caching,
  which is a data-layer decision this document doesn't make; reserved for
  a future iteration.

**Visibility rules**: Grid/Table toggle, Sort dropdown, Filter button, and
Mode selector are always rendered and always enabled, regardless of result
count (including zero results — see §10). Density selector and Refresh
button are not rendered at all in Part A, not merely disabled.

## 7. Filter Bar

Sits directly below the Toolbar, above the Results Area.

- **Layout**: a horizontal row. When collapsed and no filters are active,
  the row doesn't render at all (zero height) — the Toolbar sits directly
  above the Results Area. When one or more filters are active, a chip row
  renders even while the full filter panel is collapsed.
- **Filter chip behavior**: each active filter (e.g. "Category: Lending")
  renders as a single removable chip with a trailing "×"; clicking the
  "×" removes just that filter and immediately updates the Results Area.
- **Active filters**: multiple filters combine with AND logic across
  facets (e.g. Category = Lending AND Verification = Verified) and OR
  logic within a multi-select facet (e.g. Category = Lending OR Yield).
- **Clear all**: a text-style action appears at the end of the chip row
  whenever at least one filter is active, resetting every active filter
  and search-independent facet at once. It does not clear the Search Bar's
  query — search and filters are cleared independently.
- **Collapsed vs. expanded**: collapsed shows only the chip row (or
  nothing, if no filters are active). Expanded — triggered by the
  Toolbar's Filter button — reveals the full facet picker: Categories,
  Tags, Verification, Status, Chain, Health, Confidence, Developer
  Activity, TVL, Market Cap, and Risk (per 02-IA Section 6's MVP row set;
  Launch Date, Trending, Narratives, and AI-specific filters are excluded,
  per 02-IA marking them future). Expanded state pushes the Results Area
  down further; it does not overlay it.

## 8. Grid View

The default Results Area presentation (Discover Mode default).

**Card hierarchy**, top to bottom within a single card:

1. Logo, project name, and primary category chip (identity row)
2. One headline live metric — price if `Market.available`, else TVL if
   `Tvl.available`, else omitted with its slot left visibly empty rather
   than collapsed (see §13, "card consistency")
3. Health badge and Confidence badge, side by side
4. A row of secondary tag chips (up to a small fixed number; additional
   tags are not shown on the card)
5. Freshness indicator (relative time, smallest text on the card)

**Card spacing**: cards sit in a grid with consistent gutters matching the
existing dashboard widget grid's spacing rhythm (see §13); internal card
padding matches the existing card padding convention used throughout the
dashboard.

**Primary information**: name, headline metric, Health badge — the
"glance" tier (see §11).

**Secondary information**: category/tag chips, Confidence badge,
Freshness — the "trust" tier (see §11).

**Actions**: clicking anywhere on a card's primary identity area opens
that project's detail view. (What that detail view looks like is Part B's
Quick View specification — only the trigger is defined here.)

**Hover behavior**: the card elevates slightly and its border shifts to
the accent treatment already used for hoverable cards elsewhere in the
dashboard (see §13); no new information appears on hover in Part A beyond
what's already on the card.

**Selection behavior**: there is no multi-select or batch-selection
behavior in Part A (comparison tooling is explicitly future, per the PRD).
"Selection" here means only keyboard focus — a focused card shows the same
visible focus treatment used elsewhere in the product.

## 9. Table View

The default Results Area presentation for Research Mode — a dense,
sortable comparison table.

**Purpose**: side-by-side comparison across many projects at once, for
users who already know roughly what they're looking for (Dana, Priya
personas).

**Default columns**: Name, Category, Verification, Price, 24h Change,
TVL, Health, Confidence — eight columns visible by default, chosen to be
dense without requiring horizontal scrolling to see the most
decision-relevant fields.

**Optional / future columns**: Market Cap, Freshness, and GitHub Stars are
specified (per 02-IA Section 9) but not shown by default in Part A;
showing/hiding them is part of the future per-user column customization
named in 02-IA (Milestone 9 territory), not decided here.

**Sticky header**: the column header row stays fixed at the top of the
Results Area while the table's rows scroll beneath it.

**Sorting**: clicking a column header sorts the table by that column;
clicking the same header again reverses direction. Only one column can be
the active sort at a time. This uses the same sortable-field set as the
Toolbar's Sort dropdown (§6) — the two controls stay in sync.

**Column resizing** *(future)*: named here as an anticipated capability,
not specified or available in Part A.

**Column visibility** *(future)*: named here as an anticipated capability
(show/hide the optional columns above), not specified or available in
Part A.

## 10. Empty Screen Layout

Applies when the current search/filter combination matches zero projects
(not a loading state, and not a system error — a legitimate, expected
outcome of narrow filtering).

The Results Area renders a single centered message in place of the
grid/table, following the same anatomy as the product's existing empty-state
pattern (`components/ui/EmptyState.tsx`): an icon, a short title (e.g. "No
projects match your filters"), a one-line explanation, and a single
recovery action ("Clear filters" if filters are active, "Clear search" if
only the search query is narrowing results, or both if both are active).
Every region above the Results Area (Header, Intelligence Summary, Search
Bar, Toolbar, Filter Bar) remains fully visible and interactive — only the
Results Area itself changes.

## 11. Information Hierarchy

- **Primary** — Name/identity, one headline live metric, Health badge.
  This is the "glance" tier: what a user needs in under a second to decide
  whether to keep looking at a given project at all. Serves "discover
  before analyze."
- **Secondary** — Category/tag chips, Confidence badge, Freshness
  indicator. This is the "trust" tier: what a user needs before treating
  the primary tier's numbers as meaningful, serving "confidence over
  certainty" and "source transparency."
- **Tertiary** — GitHub activity detail, chain/network detail, and any
  additional Market/Trading breakdown beyond the headline metric. This is
  the "go deeper" tier: available without leaving the list (on hover, or
  inside the Grid card if room allows) but never required reading, serving
  "progressive disclosure" and "information density without clutter."

This three-tier split is why the Grid card's structure in §8 and the
Table's default-vs-optional columns in §9 both draw their line in the same
place: primary and secondary tiers are always visible; tertiary detail is
available but never mandatory.

## 12. Desktop Interaction Rules

- **Hover**: cards and table rows show a visible elevation/border or
  background shift (see §13) to confirm they're interactive. A relative
  Freshness timestamp reveals its exact, absolute timestamp on hover.
- **Click**: on a card's or row's primary identity area, opens that
  project's detail view (Part B). On a filter chip, removes that filter.
  On a column header, sorts the table. On the Filter button, expands or
  collapses the Filter Bar.
- **Double click**: no distinct behavior is specified for double-clicking
  a card or row in Part A — it does not open, close, or trigger anything
  beyond ordinary browser default behavior. This is stated explicitly so
  it isn't left ambiguous for implementation.
- **Keyboard focus**: Tab moves focus in reading order — Search Bar,
  Toolbar controls, Filter Bar (chips, then Filter button), then into the
  Results Area. Within the Results Area, arrow keys move focus between
  cards (Grid) or rows (Table) in visual order. Enter or Space activates
  whatever is focused (opens a project's detail view, toggles a chip,
  triggers a sort).
- **Context menu** *(future)*: right-click on a card or row is reserved
  for a future quick-actions menu (e.g. copy link, add to watchlist once
  Milestone 9 exists); no behavior is specified for it in Part A.

## 13. Design Constraints

- **Maximum content width**: matches the existing dashboard content
  area's max width (1600px), per `DashboardLayout` — Explorer does not
  introduce its own wider or narrower container.
- **Spacing rhythm**: major regions (Header, Intelligence Summary, Search
  Bar, Toolbar, Filter Bar, Results Area) follow the same page-level
  vertical rhythm already used between stacked blocks elsewhere in the
  dashboard; cards within the Results Area grid follow the same gutter
  spacing already used by the dashboard's existing widget grid; card
  internal padding matches the existing card padding convention.
- **Card consistency**: every Grid card renders the same structural
  anatomy regardless of how much live data that project has — an
  unavailable metric occupies its slot with an explicit "unavailable"
  treatment rather than causing the card to reflow or shrink. Cards must
  remain visually predictable to scan as a set.
- **Visual density**: Grid View (Discover Mode default) is comfortable and
  spacious; Table View (Research Mode default) is dense. Density is fixed
  per view in Part A — it is not independently user-adjustable (see
  Density selector, §6).
- **Typography hierarchy**: reuses the existing type scale rather than
  introducing new sizes — project names at the same weight/size already
  used for card titles elsewhere in the dashboard; secondary chips and
  badges at the existing small/meta text size; Freshness and other
  timestamp text at the existing smallest meta size used for timestamps
  throughout the product.

---

## Open Questions

- **Does Explorer ever populate the dashboard's reserved Intelligence
  Rail region?** Part A does not use it — the Results Area spans full
  width. Whether a future iteration surfaces Signals badges there (per
  02-IA's Future Expansion) is left open, not decided, by this document.
- **Exact wording for "Live Data Coverage" and "Needs Review"** (§4) is a
  first pass — these two cards replace the task's originally-suggested
  "Trending" and "New This Week," which have no backing data today (see
  Design Decisions). Final copy is not locked by this document.
- **Whether the page-scoped `/` search shortcut could conflict** with any
  future page-scoped shortcut introduced elsewhere in the dashboard is not
  evaluated here — flagged for whoever specifies keyboard shortcuts
  product-wide.

---

# Part B: Extended Specification

**Scope**: everything Part A explicitly deferred — Quick View, mobile,
tablet, loading, empty, and error states, the full accessibility spec,
consolidated responsive behavior, motion, keyboard workflow, persistent
state, and open product questions. Part A is unchanged above this divider;
nothing below duplicates it — later sections cross-reference Part A rather
than repeating it.

Part B maintains the same principles Part A established (§2 of Part A)
and holds itself to the same feel: **fast, calm, professional,
trustworthy, predictable, data-first, keyboard-friendly, and accessible.**
Concretely, that shows up as: no loading state where none is architecturally
necessary (fast, calm); every provider failure already absorbed into an
existing, honest data state rather than a scary error screen (trustworthy,
predictable); nothing here introduces a feature outside
[docs/ROADMAP.md](../ROADMAP.md) or expands the PRD's MVP scope; Quick View
remains the one and only detail surface; Project Details remains
Milestone 10 territory, referenced but never designed.

## 14. Quick View Drawer

**Purpose**: the MVP's entire "project detail" experience, per the PRD's
Non-Goals and 02-IA §10 — a panel that shows everything Base Radar knows
about one project without leaving Explorer's current list, filter, sort,
or scroll position.

**Opening behavior**: triggered by the action already defined in Part A
§8/§9/§12 — activating a card's or row's primary identity area. The
drawer slides in from the right edge of the viewport, as an overlay above
a dimmed backdrop covering the rest of the screen. The Explorer page
underneath (list, active filters, scroll position) is untouched and
visible (dimmed) behind it — closing the drawer returns to exactly where
the user left off.

**Closing behavior**: three equivalent ways to close — clicking the
backdrop, clicking an explicit close control inside the drawer, or
pressing Escape. All three are equivalent; none is "more correct." Closing
returns keyboard focus to the card/row that opened the drawer (see §20).

**Keyboard support**: while open, Tab cycles only through focusable
elements inside the drawer (a focus trap — the Explorer page behind it is
not reachable by keyboard until the drawer closes). Escape closes it from
anywhere inside. See §23 for the full keyboard map.

**Drawer width**: fixed, not fluid, and not dependent on how much live
data the project has (consistent with Part A §13's "card consistency"
principle applied to the drawer). Wide enough for comfortable single-column
reading of every section below without internal horizontal scrolling;
narrow enough that the dimmed Explorer list stays visibly present behind
it — the drawer is a panel, never a full-screen takeover, at desktop
widths.

**Content hierarchy** (top to bottom):

1. **Header** — logo, name, category/tag chips, verification status, and
   the close control.
2. **Primary metrics** — the same headline metric and Health/Confidence
   badges shown on the card, now with their contributing `factors` visibly
   listed (per "no hidden calculations" — this is where a Health or
   Confidence score's reasoning becomes visible, not just its number).
3. **Market, Trading, and TVL detail** — the full breakdown behind
   whichever headline metric the card showed a summary of.
4. **GitHub activity** — stars, forks, open issues, latest release.
5. **Chain / network context** — chains the project is deployed on, and
   live network status where available.
6. **Contracts** — every contract the registry lists for this project,
   each with its chain, address, type, and verified status. The
   Intelligence Engine's `contracts.items[].verified` field is
   `boolean | null`, but the current matching logic only ever resolves to
   `true` or `null` — a definite address mismatch still resolves to
   `null`, never `false` — so this renders as `true` / unknown only, per
   [05 §14](05-data-mapping.md#14-missing-data-strategy).
7. **Community** — social links the registry has on file.
8. **Source Attribution** — a per-provider breakdown of which of the six
   providers contributed live data, which didn't, and why (the same
   `detail` explanations `sources.ts` already generates), plus each live
   source's Freshness.

Every section renders for every project — an unavailable section is shown
as unavailable, not omitted (same rule as the card, applied at full
detail).

**Primary actions**: visit the project's website; open its GitHub
repository. Both are outbound links against fields the registry already
stores — no new capability.

**Secondary actions**: copy a listed contract address to the clipboard;
open a listed contract on a chain explorer (a link out, not a new API
call). Both operate only on data already present in the Contracts section
above.

**Future actions** *(not present in Part A or B — named for continuity
only)*: "Add to Watchlist" (Milestone 9), "View full details" (Milestone 10,
the seam where a future Project Details route takes over), and a future
"Compare" action. None of these exist yet.

**Loading behavior**: none. Because Explorer must build intelligence for
every visible project via the Intelligence Engine's batch entry point
(per the PRD's data-efficiency requirement), every project's full
`ProjectIntelligence` is already resolved in memory before a user can
click anything. Opening the drawer never triggers a new fetch and never
shows a loading or skeleton state — the content in §14's hierarchy above
is available instantly.

**Empty behavior**: there is no "empty drawer" state. A drawer is only ever
opened for a project that exists in the registry, so Identity (at minimum)
is always present. A project with little or no live data still renders
every section in §14's hierarchy — most of them explicitly marked
unavailable — which is a normal, expected outcome (see §19), not a
distinct empty state to design for.

**Future expansion**: this is the architectural seam named in 02-IA §10 —
a future "View full details" action extends Quick View into a dedicated
Project Details route (Milestone 10) without requiring the drawer itself
to be redesigned.

## 15. Mobile Explorer

**Navigation**: reached via the same dashboard nav entry as desktop,
through the existing mobile navigation drawer (`MobileSidebar`) — Explorer
introduces no new navigation mechanism.

**Search**: the persistent Search Bar (Part A §5) remains present and
full-width. The `/` keyboard shortcut is a desktop-only convenience (no
reliable physical keyboard on mobile) — tapping the field is the mobile
entry point instead.

**Filters**: the Filter Bar's expanded state (Part A §7) is presented as a
bottom sheet rather than an inline expansion, per 02-IA §12. The chip row
for already-active filters still renders inline above the Results Area,
exactly as on desktop.

**Cards**: Grid View only — Table View is not available on mobile (per
02-IA §12; also see §16). Cards render in a single column at the smallest
widths.

**Bottom sheet**: the same sheet mechanism serves two purposes — the
expanded Filter Bar, and Quick View itself (which becomes a full-screen
sheet on mobile, per 02-IA §12, rather than a right-side drawer). Only one
sheet is ever open at a time.

**Touch interactions**: tap replaces desktop click for opening Quick View
and toggling filters/sort; swipe-down or tapping the backdrop dismisses an
open sheet, in addition to its explicit close control. Hover-only
affordances from desktop (e.g. revealing a Freshness timestamp's exact
value on hover, per Part A §12) have no touch equivalent — that same exact
timestamp is always visible inside Quick View regardless of device, so no
information is lost, only the hover shortcut to it.

**Toolbar**: because Table View doesn't exist on mobile, the Grid/Table
toggle is not shown at all (there is nothing to toggle to). The Mode
selector reduces to a two-way Discover/Intelligence choice — Research
Mode's entire distinguishing feature is Table View, so offering it on a
screen where Table View can't render would be a control that does
nothing. Sort and Filter controls remain present.

**Scrolling behavior**: a single vertical scroll for the whole page —
Header, Intelligence Summary, and results all scroll together in normal
document flow. There is no independent inner-scrolling results container.

**Sticky elements**: once the user scrolls past the Header and
Intelligence Summary, the Search Bar and Toolbar collapse into a single
condensed bar that stays pinned to the top of the viewport, so search,
sort, and filter access never require scrolling back up.

**Mobile information hierarchy**: the same primary/secondary/tertiary
split as Part A §11, but tertiary information never appears on the card
itself at mobile widths (no room) — it's reachable only via Quick View.
Secondary information (tag chips) may show fewer chips than desktop to fit
the available width.

## 16. Tablet Explorer

Tablet is not a distinct device-detection branch — it's the same
continuously responsive layout as desktop and mobile, scaling by available
viewport width rather than by checking device type, consistent with how
the rest of this product's breakpoints already work (e.g. the existing
sidebar's `lg`-breakpoint switch between desktop sidebar and mobile drawer).

- **Landscape**: at typical tablet-landscape widths, Explorer behaves like
  a narrower desktop — Table View is available, the Filter Bar expands
  inline (not a bottom sheet), and the Grid/Table toggle and full
  three-way Mode selector are both present.
- **Portrait**: behaves like Mobile Explorer (§15) — Table View
  unavailable, Filter Bar as a bottom sheet, Mode selector reduced to
  Discover/Intelligence.
- **Adaptive layout**: the same components adapt continuously as viewport
  width crosses the same breakpoint thresholds already used elsewhere in
  this product, rather than Explorer defining its own new breakpoints.
- **Filter behavior**: inline expansion above the same width threshold
  Table View itself requires; bottom sheet below it — the two capabilities
  (Table View, inline filters) appear and disappear together, not
  independently, since both are "enough width" signals.
- **Grid changes**: column count scales with available width (fewer
  columns in portrait, more in landscape), matching the scaling pattern
  the existing dashboard widget grid already uses.
- **Table availability**: available in landscape, not available in
  portrait — the same rule as Mobile Explorer, since portrait tablet
  widths don't reliably exceed mobile widths by much.

## 17. Loading States

- **Page loading**: the one genuine asynchronous wait in this architecture
  — the initial batch build of intelligence for every registry project.
  Rendered as a full skeleton in the shape of the eventual real layout
  (skeleton cards where cards will be, in Grid View's arrangement),
  reusing the product's existing skeleton primitive
  (`components/ui/skeleton.tsx`) rather than a spinner — consistent with
  "data-first" and "predictable."
- **Search loading**: none. Search filters data that has already been
  fetched, entirely client-side — there's nothing to wait for.
- **Filter loading**: none, for the same reason.
- **Quick View loading**: none — see §14. The data a project's drawer
  shows was already resolved before the page finished its one initial
  load.
- **Partial loading**: not applicable, and deliberately not designed,
  because it doesn't match how the Intelligence Engine actually works
  today. `getAllProjectIntelligence()` resolves its whole batch together
  (per `lib/intelligence/engine.ts`) — there is no architectural path
  today for some cards to "arrive" before others. This document does not
  invent a progressive/streaming loading UX the current engine can't
  produce.
- **Live refresh**: not applicable — the PRD's Non-Goals explicitly
  exclude real-time/push updates. There is no refresh-in-place state to
  design.
- **Skeleton philosophy**: a skeleton mimics the real shape of what it's
  replacing (a card-shaped skeleton where a card will be) so nothing shifts
  or reflows when real content arrives.
- **When skeletons should and should not be used**: should be used exactly
  once — the initial full-page load described above. Should not be used
  for search, filtering, sorting, or opening Quick View, since none of
  those involve any wait at all given this architecture.

## 18. Empty States

- **No projects** (the registry itself has zero entries): distinct from
  "no results due to filtering" (already specified in Part A §10). Uses
  the same empty-state anatomy (`components/ui/EmptyState.tsx`) with
  messaging that there are no projects in the registry at all, and no
  recovery action (there is nothing to clear). Practically unlikely — the
  registry is never empty today — but specified for completeness.
- **No search results** / **No filters match**: both already fully
  specified in Part A §10 as the single "zero results" state — search and
  filters are simply two different causes of the same designed-for
  outcome, not two different screens.
- **No favorites** / **No watchlist**: not designed. Favorites/watchlist
  don't exist in any form in this milestone — they're Milestone 9
  (Portfolio/Personalization) territory per the PRD's Non-Goals — so there
  is no state to specify yet, not even a placeholder.
- **Offline mode**: not designed. No offline capability exists anywhere in
  this product today, and none is named in any roadmap milestone — this is
  a genuine non-scope item, not an oversight.
- **Future wallet state**: not designed — wallet-connect is an explicit
  PRD Non-Goal.
- **Required messaging**: every empty state that is specified must explain
  *why* it's empty, not just show absence — consistent with the existing
  `EmptyState` component's title-plus-description anatomy.
- **Available actions**: "Clear filters" / "Clear search" for the zero-results
  case (Part A §10); no action for the true empty-registry case; not
  applicable for every state named above that's out of scope.

## 19. Error States

The most important thing this section specifies is that **most of what
this section's title suggests are "errors" are not error states at all —
they're already-specified, expected data states**, because the Provider
Layer never throws (every failure resolves to structured
`{ ok: false, error }` data, per `lib/providers/common/errors.ts`) and the
Intelligence Engine converts every one of those into an ordinary,
already-designed `"unavailable"` value (per Part A §4/§10 and §14 above) —
never an exception reaching the UI.

- **API unavailable / Provider timeout / Network issue**: all three map to
  the same real, existing taxonomy
  (`ProviderErrorCode`: `http_error`, `timeout`, `rate_limited`,
  `parse_error`, `network_error`) already defined in the Provider Layer.
  None of them produce a distinct screen — they all surface as a source's
  `status: "unavailable"`, already fully specified in the Intelligence
  Summary (Part A §4) and Quick View's Source Attribution (§14). This
  section does not introduce three new error screens for what is already
  one designed data state.
- **Partial data**: not an error — a project with some sections available
  and others not is the expected norm at this registry's current data
  coverage (per the PRD's own named risk), already handled by "card
  consistency" (Part A §13) and Quick View's per-section rendering (§14).
- **Low confidence**: not an error — Confidence is already an always-visible,
  first-class signal (Part A §4/§14). A low score changes a badge's value,
  not the screen's structure.
- **Missing metadata**: not an error — optional registry fields
  (`logoUrl`, `github`, `contracts`) being absent is handled the same way
  as any other unavailable slot (Part A §13).
- **Recovery actions**: the one case that *is* a genuine, page-level
  failure — the Explorer's initial batch intelligence build failing
  outright, rather than individual sources being unavailable — is
  specified as a full-page state (not per-card), using the same
  empty-state-style anatomy as §18, with a single "Try again" action.
  This is the only new state this section defines; everything else above
  is a cross-reference to data states Part A and §14 already specify.
- **User messaging**: never surface a raw provider error message (e.g. an
  HTTP status code or a provider's own wording) to a user. Per-source
  unavailability uses the plain-language `detail` strings the Intelligence
  Engine's `sources.ts` already generates (e.g. "No coingeckoId configured
  on this project"); the rare page-level failure uses one generic,
  plain-language message — never a stack trace or raw error string.

## 20. Accessibility

- **Keyboard navigation**: every control specified in Part A and Part B is
  reachable and operable via keyboard alone — see the consolidated map in
  §23.
- **Screen readers**: a card or row announces concisely — name, headline
  metric, Health, Confidence — rather than reading every visual element
  in DOM order; Quick View's opening is announced as a dialog with an
  accessible name derived from the project's name.
- **ARIA**: the Search Bar, Toolbar, Filter Bar, and Results Area are
  exposed as distinguishable landmarks, consistent with the existing
  product's pattern of named `nav`/region landmarks
  (`aria-label="Primary"`, `aria-label="Main"`, etc., per
  [docs/DESIGN_SYSTEM.md](../DESIGN_SYSTEM.md#accessibility)); the Filter
  Bar's expand/collapse and Quick View's open/closed state are exposed via
  `aria-expanded`; a live region announces result-count changes when
  filters or search change (per Part A §3's Project Count) so a screen
  reader user hears the new count without needing to re-scan the page.
- **Focus order**: Search Bar → Toolbar → Filter Bar (chips, then Filter
  button) → Results Area, matching Part A §12 exactly; within Quick View,
  focus order follows §14's content hierarchy top to bottom.
- **Reduced motion**: every transition specified in §22 (card hover lift,
  drawer slide, filter panel expand, counter animation) respects
  `prefers-reduced-motion`, using the same `MotionConfig
  reducedMotion="user"` wrapper and `motion-reduce:` utility pattern
  already established product-wide
  (per [docs/DESIGN_SYSTEM.md](../DESIGN_SYSTEM.md#reduced-motion)) — no
  new reduced-motion mechanism is introduced.
- **Touch targets**: every interactive element on a card, row, chip, or
  toolbar control meets a comfortable minimum touch-target size on any
  touch-capable input, not only at mobile breakpoints.
- **Contrast**: Explorer uses the existing `radar-*` and shadcn-derived
  token set exactly as documented in
  [docs/DESIGN_SYSTEM.md](../DESIGN_SYSTEM.md#colors) — it inherits that
  system's existing contrast behavior in both themes rather than
  introducing new colors that would need independent verification.
- **Table accessibility**: Table View uses proper table semantics with
  each cell associated with its column header, so a screen reader
  announces column context per cell; a sortable header exposes its
  current sort state (ascending/descending/none) so that state is
  perceivable non-visually, not just via a visual arrow icon.
- **Drawer accessibility**: Quick View follows the same accessible dialog
  pattern already used by this product's existing drawers and modals
  (`MobileSidebar`, the command palette) — a focus trap while open, an
  accessible title, and focus restored to the triggering card/row on
  close, per §14's closing behavior.

## 21. Responsive Behaviour

A consolidated view of what Part A (Desktop) and §15–16 (Mobile, Tablet)
already specify — nothing new, just cross-referenced in one place:

| Element | Desktop | Tablet (landscape / portrait) | Mobile |
| --- | --- | --- | --- |
| Grid | Multi-column, comfortable density | More columns / fewer columns | Single column |
| Card | Full anatomy per Part A §8 | Same as desktop | Same anatomy, tertiary info dropped |
| Toolbar | All controls shown | Full / reduced Mode selector | Reduced Mode selector, no Grid/Table toggle |
| Filter | Inline expand (Part A §7) | Inline / bottom sheet | Bottom sheet |
| Search | Persistent inline field, `/` shortcut | Same as desktop | Persistent inline field, tap to focus |
| Quick View | Right-side drawer (§14) | Right-side drawer / full-screen sheet | Full-screen sheet |

Each cell above is specified in full at its cited section — this table is
a navigation aid, not a new specification.

## 22. Motion & Interaction Rules

- **Page transitions**: none specified — Explorer uses standard navigation
  into and out of the page with no bespoke page-transition animation.
- **Hover animation**: cards and rows lift/highlight on hover, reusing the
  exact hover treatment already established for cards elsewhere in the
  dashboard (subtle upward shift plus border/shadow emphasis) — no new
  hover effect is introduced for Explorer specifically.
- **Drawer animation**: Quick View slides in from the right (desktop/tablet
  landscape) or up from the bottom (mobile/tablet portrait), with a
  backdrop fade, reusing the exact mechanism and timing already
  established by this product's existing slide-in drawer
  (`MobileSidebar`) rather than inventing a new one.
- **Selection animation**: none — there is no multi-select in this
  milestone (Part A §8), so there's nothing beyond the standard focus-ring
  treatment to animate.
- **Live updates**: none — no real-time/push updates exist in this
  milestone (PRD Non-Goals), so there's no live-update animation to
  define.
- **Counter animation**: the Intelligence Summary's numeric cards (Part A
  §4) count up on load, reusing the product's existing animated-counter
  pattern (`AnimatedNumber`) — including its existing reduced-motion
  behavior of skipping straight to the final value.
- **Motion duration**: follows the product's existing convention of short,
  physical durations (roughly 150–300ms for most transitions), per
  [docs/DESIGN_SYSTEM.md](../DESIGN_SYSTEM.md#animations) — no new
  duration scale is introduced.
- **Reduced-motion behavior**: every animation named above is wrapped by
  the same existing `MotionConfig reducedMotion="user"` mechanism, and
  degrades the same way already established elsewhere (instant
  show/hide instead of sliding, final value instead of counting up).
- **Animation philosophy**: inherited directly from
  [docs/DESIGN_SYSTEM.md](../DESIGN_SYSTEM.md#animation-principles) —
  motion confirms state changes, it doesn't decorate; nothing here
  introduces a new philosophy for Explorer specifically.

## 23. Keyboard Workflow

| Key | Action |
| --- | --- |
| `/` | Focus Explorer's inline Search Bar (Part A §5) |
| `Esc` | Closes the topmost open overlay: Quick View first if it's open, otherwise the expanded Filter Bar if that's open, otherwise no effect |
| Arrow keys | Move focus between result cards (Grid) or rows (Table) in visual order |
| `Enter` | Open Quick View for the currently focused card/row |
| `Shift+Enter` | Reserved binding for opening the future Project Details view (Milestone 10) — documented now, not functional until that milestone ships |
| `Tab` / `Shift+Tab` | Move focus forward/backward through Search Bar → Toolbar → Filter Bar → Results Area, per Part A §12 |
| *(future shortcuts)* | Not defined — e.g. a direct Grid/Table toggle shortcut, or a future Watchlist action, are left for a later iteration |

## 24. Explorer State Model

Every piece of UI state Explorer holds while a user is on the page:

- **Mode** (Discover / Research / Intelligence)
- **View** (Grid / Table)
- **Sort** (active field + direction)
- **Filters** (every active facet value, per Part A §7)
- **Search** (current query string)
- **Drawer state** (closed, or open for a specific project)
- **Pinned columns** *(future)* — not applicable until column customization exists
- **Saved views** *(future)* — not applicable until Personalization (Milestone 9) exists

**Within a session** (no full page reload), all of the above behaves as
ordinary in-page state — closing Quick View and opening a different
project leaves Mode/View/Sort/Filters/Search exactly as they were; nothing
resets itself unexpectedly.

**Between sessions** (a page reload, or returning later): per the PRD's
Constraints, there is no database and no user accounts in this milestone.
This document specifies that, absent any other decision, every new session
starts from the same defaults (Discover Mode, Grid View, no filters, no
search, drawer closed) — nothing is assumed to persist across a reload
unless a future decision says otherwise (see Open Questions).

## 25. Open Questions

- Should any Explorer UI state (Mode, View, Sort, Filters, Search) persist
  across a page reload via client-side storage, or should every session
  reliably start from defaults? §24 specifies the latter as the default
  assumption, but this hasn't been decided as a product requirement either
  way.
- Should tablet's landscape/portrait threshold (§16) align exactly with
  the existing sidebar's `lg` breakpoint, or does Table View need a wider
  threshold of its own?
- Should the page-level failure state (§19) attempt an automatic retry, or
  always require an explicit user action?
- Should Quick View's future actions (§14) — "Add to Watchlist," "View
  full details" — appear now in a visibly-disabled, "coming soon" state, or
  stay entirely absent from the drawer until their respective milestones
  ship?
- Is an offline/no-connectivity state ever in scope for this product, given
  no PWA or offline capability is named anywhere in the current roadmap?
- What should the exact wording be for the reserved `Shift+Enter` binding's
  eventual destination, once Project Details (Milestone 10) exists?
