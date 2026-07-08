# Explorer — Information Architecture

**Status**: Draft
**Source of truth**: [01-product-requirements.md](01-product-requirements.md) — this
document does not override, expand, or contradict that PRD. Every section
below is a navigation/structure translation of an already-approved
requirement, not a new one.
**Scope of this document**: Information architecture only — navigation,
modes, search, filtering, sorting, view structure, and how it all extends
over time. No visual design, no component design, no code. Where a
capability requested here isn't backed by data that exists today, this
document says so explicitly rather than implying it's buildable now.

---

## 1. Purpose

This document defines how a user moves through the Explorer: what's
reachable from where, how discovery narrows into research, and how a
single project goes from "one card in a list" to "everything Base Radar
knows about it" — without a page reload, and without inventing capability
the Project Registry, Provider Layer, and Project Intelligence Engine don't
already provide (per the PRD's Constraints).

The structure below is informed by the design **philosophy** of Linear,
Raycast, Vercel, Coinbase, Arkham, and Bloomberg Terminal — not their visual
language. Concretely, that means:

- **Linear's** bias toward speed and minimal chrome over decoration.
- **Raycast's** command-first interaction model — search/action before
  navigation.
- **Vercel's** clean information hierarchy and comfort with information-dense,
  dark-mode-first interfaces.
- **Coinbase's** compliance-grade clarity — never implying certainty that
  isn't there.
- **Arkham's** entity/attribution transparency — every figure traceable to
  where it came from.
- **Bloomberg Terminal's** extreme information density for the power-user
  path, without sacrificing a simpler path for newcomers.

No screen, component, or interaction pattern from any of these products is
referenced or copied — only the underlying values.

## 2. Explorer Principles

These principles govern every decision in this document and should govern
every later Explorer design/implementation document.

- **Discover before analyze.** The default experience is built for someone
  who doesn't yet know what they're looking for (Alex, the Newcomer,
  per the PRD's personas), not just for someone who already knows a
  project's name. Analysis-depth features are reachable, never default.
- **Progressive disclosure.** A project reveals more of itself the further
  a user leans in: card → Quick View → (future) full detail. No screen
  front-loads more than its mode needs.
- **Source transparency.** Every non-registry data point is attributable to
  a provider via the Intelligence Engine's `Sources` attribution — never
  presented as if it simply "is true."
- **Confidence over certainty.** Scores are ranges of trust
  (`Confidence`, `Health`), not verdicts. The IA never lets a heuristic
  read as a rating.
- **Keyboard-first workflow.** Every primary action (search, filter, sort,
  open Quick View, move between results) must be reachable without a
  mouse — in the spirit of Linear/Raycast, and consistent with this
  product's existing ⌘K command palette.
- **Mobile-first responsiveness.** The architecture is designed from the
  smallest viewport up; density is something larger screens earn, not
  something small screens lose.
- **Information density without clutter.** Bloomberg-Terminal-level density
  is available (Table View, Research Mode) but is opt-in, not the default
  a newcomer lands on.
- **Every metric is traceable.** If a number is shown, its origin
  (registry vs. provider, which provider, how recently) must be reachable
  from that same view — never a dead-end figure.
- **No hidden calculations.** `Health` and `Confidence` always expose their
  contributing factors (per the Intelligence Engine's `factors` field) —
  the IA never presents a score without a path to "why."

## 3. Navigation Hierarchy

Explorer already has a reserved entry point in the existing dashboard
navigation: `constants/dashboard.ts`'s `DASHBOARD_NAV_GROUPS` already
lists a **"Projects"** item (`/dashboard/projects`, under the "Discover"
group) as a placeholder. This document treats that as Explorer's real,
already-planned home — not a new route to invent.

```
Explorer  (existing "Projects" nav entry, /dashboard/projects)
├── Overview            [MVP]  Default landing state — Discover Mode, Grid View
├── Search               [MVP]  Global search — extends the existing ⌘K command palette
├── Categories           [MVP]  Browse by category facet
├── Filters              [MVP]  Full filter panel (see Section 6)
├── Trending            [Future]  Requires narrative/trend classification not yet computed
├── Watchlist           [Future — Milestone 9]  Requires accounts/personalization
├── Quick View           [MVP]  In-page detail panel — not a route (see Section 10)
└── Project Details     [Future — Milestone 10]  Dedicated route, per the PRD's Non-Goals
```

Only **Overview, Search, Categories, Filters, and Quick View** are MVP.
Everything marked `[Future]` is named here so the hierarchy has a place for
it later — none of it is scoped, designed in detail, or authorized for
implementation by this document.

## 4. Explorer Modes

Three modes are three **lenses over the same MVP data** — not three
feature sets. No mode requires data or computation beyond what Sections 5–9
describe as MVP.

- **Discover Mode** — the default. Grid View, broad browsing, minimal
  filters visible, optimized for "I don't know what I'm looking for yet."
  This is where Alex (Newcomer) and first-time sessions land.
- **Research Mode** — Table View, full filter panel, dense sorting.
  Optimized for "I know roughly what I want and need to compare many
  projects fast." This is where Dana (Researcher) and Priya (Analyst) work.
  Reachable via a single, persistent mode toggle — not a separate page.
- **Intelligence Mode** — not a separate view, but a display emphasis
  available in either Grid or Table: Confidence, Freshness, and Source
  Attribution are promoted to primary visual weight instead of secondary
  detail. This is the mode for someone deciding *how much to trust* what
  they're seeing, rather than what to look at next — directly serving the
  PRD's "Confidence over certainty" and "Source transparency" requirements.

A user can move between modes at any time without losing their current
filter/search/sort state — mode is a presentation setting, not a
navigation event.

## 5. Global Search

Search extends the existing ⌘K command palette
(`components/dashboard/SearchBar.tsx`) rather than introducing a second,
parallel search surface — consistent with "keyboard-first workflow" and
with not inventing new UI paradigms beyond what's already established.

**Supported today (MVP — backed by the registry's existing `searchProjects`
matching):**

- Project names
- Categories
- Tags
- Keywords appearing in a project's description

**Named as future, explicitly not MVP:**

- **Narratives** — no narrative classification exists yet (the dashboard's
  own narrative widgets are curated mock data today, per
  [docs/ARCHITECTURE.md](../ARCHITECTURE.md#future-intelligence-engine)).
  Tags are today's closest real substitute.
- **Contracts** — searching by on-chain contract address. Registry entries
  do store contract addresses (`Project.contracts[].address`), but this
  isn't part of the search matching described in the PRD's Functional
  Requirement 3 — a future extension, not assumed here.
- **Wallets** — no wallet-level data exists anywhere in this product yet.
- **Protocol IDs** — searching by a provider identifier (e.g. a CoinGecko
  or DefiLlama slug already stored in `Project.providerIds`). Plausible
  future extension of the same matching, not committed today.

**Ranking priority** (a presentation-layer concern for whatever
implementation eventually consumes `searchProjects()`'s results — today's
helper returns unranked, registry-order matches):

1. Exact name match
2. Name starts with query
3. Exact tag or category match
4. Substring match within the short description

This ordering is a design requirement for a future implementation to apply
on top of existing search results — it does not require any change to the
Project Registry's `searchProjects()` helper itself.

## 6. Filter Taxonomy

| Filter | Backed by (today) | Status |
| --- | --- | --- |
| Categories | `Project.categories` / `getProjectsByCategory` | MVP |
| Tags | `Project.tags` / `getProjectsByTag` | MVP |
| Verification | `community.verificationStatus` | MVP |
| Status (lifecycle) | `Project.status` (`live`/`beta`/`development`/`deprecated`/`sunset`) | MVP |
| Chain | `Project.chains` | MVP (client-side filter over an existing field; no dedicated registry helper exists yet) |
| Health | `ProjectIntelligence.health` | MVP |
| Confidence | `ProjectIntelligence.confidence` | MVP |
| Developer Activity | `ProjectIntelligence.github` (stars/forks/latest release) | MVP |
| TVL | `ProjectIntelligence.tvl` | MVP |
| Market Cap | `ProjectIntelligence.market` | MVP |
| Risk | Derived view over existing `Confidence` + `community.verificationStatus` (e.g. flagged or low-confidence) | MVP, as a derived lens — not a new computed field |
| Launch Date | **No such field exists on `Project` today.** Would require a Project Registry schema addition, which is explicitly out of scope for the Explorer (see PRD Non-Goals/Constraints). | Future |
| Trending | **Not computed anywhere today** — the dashboard's own "trending narrative" data is curated mock data, not a live signal. | Future |
| Narratives | Not computed; Tags are the closest real proxy available today. | Future |
| Future AI filters | The `ai` category and `ai-agents` tag already exist as a real, filterable proxy today; a dedicated AI-specific score is Milestone 10 (AI Research) territory. | Future |

Every "Future" row above is future because the underlying data doesn't
exist yet, not because of a UI limitation — consistent with "do not invent
features outside the roadmap."

## 7. Sorting

| Sortable field | Backed by | Status |
| --- | --- | --- |
| Name (A–Z / Z–A) | `Project.name` | MVP |
| TVL | `ProjectIntelligence.tvl.tvlUsd` | MVP |
| Market Cap | `ProjectIntelligence.market.marketCapUsd` | MVP |
| Health score | `ProjectIntelligence.health.score` | MVP |
| Confidence score | `ProjectIntelligence.confidence.score` | MVP |
| GitHub stars | `ProjectIntelligence.github.stars` | MVP |
| Verification status (grouping) | `community.verificationStatus` | MVP |
| Launch date | No underlying field today | Future |
| Trending | No underlying signal today | Future |

A project with an unavailable value for the active sort field sorts to the
end of the list, never disappears from it — consistent with "the
experience degrades gracefully" (PRD, Functional Requirement 10).

## 8. Grid View

**Purpose**: the default surface for Discover Mode — optimized for
scanning many unfamiliar projects quickly.

**Information hierarchy** (top to bottom, most-identifying to
most-supplementary):

1. Logo, name, and primary category chip
2. One headline live metric (price or TVL — whichever is available;
   neither shown as a false zero if unavailable)
3. Health and Confidence badges
4. Freshness indicator (e.g. relative "as of" phrasing, matching the
   dashboard's existing relative-time convention)

**Card content**: identity fields always present (per PRD Functional
Requirement 5); live sections shown when available and explicitly marked
"unavailable" when not (per Functional Requirement 6) — never silently
omitted.

**Interactions**: click or tap opens Quick View for that project; keyboard
arrow keys move focus between cards in reading order; Enter opens Quick
View for the focused card — consistent with "keyboard-first workflow."

## 9. Table View

**Purpose**: the default surface for Research Mode — optimized for
comparing many projects side by side, in the spirit of a terminal-style
dense table.

**Default columns**: Name, Category, Verification, Price, 24h Change, TVL,
Health, Confidence — eight columns visible by default, each a direct
presentation of a `ProjectIntelligence` field already defined; no column
represents data that doesn't exist.

**Optional / future columns**: Market Cap, Freshness, and GitHub Stars are
specified fields but not shown by default (see
[03 §9](03-screen-specifications.md#9-table-view)); showing/hiding them is
part of the future per-user column customization named below.

**Sorting**: clicking a column header sorts by that field, per Section 7's
table; a second click reverses direction.

**Pinning**: the Name column stays visible while scrolling horizontally —
a presentational behavior only, requiring no new data.

**Resizing**: named here as a capability the architecture should
accommodate, but not required for MVP — a nice-to-have refinement, not a
functional requirement in the PRD.

**Future customization**: per-user column show/hide and saved table
layouts belong to the Personalization future scope (Milestone 9,
Portfolio) once accounts exist — not assumed here.

## 10. Quick View Panel

**Purpose**: this is the MVP's entire answer to "show me more about this
one project," deliberately in place of a dedicated route — directly
satisfying the PRD's Non-Goal that "the Explorer's unit of detail is a
project card/row, not a dedicated route." It opens in place (panel or
sheet), never navigates away from the current filtered/sorted list.

**Displayed information**: the full `ProjectIntelligence` record for the
selected project — Identity, Market, Trading, TVL, Contracts, GitHub,
Chain, Community, Health, Sources, Confidence, and Freshness — the same
completeness described in the PRD's MVP Scope, just presented at a larger
size than the card affords.

**Available actions**: visit the project's website, open its GitHub
repository, copy a listed contract address, dismiss/close. All are
outbound links or clipboard actions against data the registry already
stores — no new capability.

**Future expansion**: Quick View is the architectural seam where a future
dedicated "Project Details" route (Milestone 10) would take over for
users who want to go deeper than a panel — Quick View does not need to be
redesigned when that happens, only extended with a "view full details"
action.

## 11. Navigation Flow

```
Landing
   │
   ▼
Dashboard  (existing shell — sidebar, topbar, live status bar)
   │
   ▼
Explorer   (Overview → Search / Categories / Filters, per Section 3)
   │
   ▼
Quick View (in-page panel — MVP terminus)
   │
   ▼ (future — Milestone 10, not part of this milestone)
Project Details
```

The path from Landing through Explorer to Quick View is the complete MVP
flow. The final step to a dedicated Project Details route is explicitly
future and drawn as such — nothing in this document assumes it exists yet.

## 12. Mobile Information Architecture

- **Table View is not available on small viewports.** Dense tabular
  comparison doesn't translate to mobile widths; Research Mode on mobile
  falls back to Grid View, consistent with the existing precedent of
  Sidebar being desktop-only (`hidden lg:flex`) with a separate mobile
  drawer taking over below that breakpoint.
- **Filters collapse into a bottom sheet/drawer**, following the same
  pattern already established by `MobileSidebar` for navigation — a
  full-screen overlay rather than a persistent side panel.
- **Search remains a top-level, always-reachable action**, matching the
  existing command palette's behavior across breakpoints today.
- **Quick View becomes a full-screen sheet** rather than a side panel,
  since there's no room for a project list and a side panel
  simultaneously on a small screen.
- **Grid View is single-column** at the smallest breakpoints, widening to
  multi-column as space allows — mobile-first, not a shrunk-down desktop
  layout.

## 13. Accessibility

Applies the same conventions already established in
[docs/DESIGN_SYSTEM.md](../DESIGN_SYSTEM.md#accessibility) to Explorer's
new controls, rather than introducing new patterns:

- **Keyboard navigation**: every filter chip, sort control, mode toggle,
  view toggle, and card/row is reachable and operable via keyboard, per
  "keyboard-first workflow."
- **ARIA**: icon-only controls (view toggle, mode toggle, Quick View
  close) carry `aria-label`; the filter panel and Quick View panel expose
  `aria-expanded`/`aria-hidden` state, matching the mobile nav's existing
  pattern; decorative icons next to text carry `aria-hidden="true"`.
- **Reduced motion**: any Quick View open/close transition or filter panel
  slide-in respects `prefers-reduced-motion`, via the same
  `MotionConfig reducedMotion="user"` / `motion-reduce:` approach already
  used across the dashboard.
- **Focus**: opening Quick View moves focus into it; closing it returns
  focus to the card/row that opened it — no focus loss on navigation
  within Explorer.
- **Touch targets**: interactive zones on cards and table rows meet a
  minimum comfortable touch-target size on mobile, not just desktop
  pointer precision.

## 14. Performance Strategy

- **Caching**: Explorer must build intelligence for every visible project
  via the Intelligence Engine's batch entry point — one shared round of
  Provider Layer calls per session — never a separate full fetch per
  project, per the PRD's Non-Functional Requirement on data efficiency.
- **Lazy loading**: project logos load lazily as cards enter view; this is
  appropriate at any registry size and doesn't depend on scale.
- **Search responsiveness**: search and filtering run client-side against
  already-fetched data, debounced against keystrokes — no server round
  trip, appropriate given the registry's current size fits comfortably in
  memory.
- **Virtualization**: **not required for MVP**, per the PRD's explicit
  Non-Goal ("pagination/infinite-scroll infrastructure... unnecessary at
  the registry's current size of ~20 projects"). What this document
  requires instead is that Grid and Table views have a clean, isolated
  card/row rendering boundary — so that a virtualization approach can be
  introduced later, purely as an internal rendering optimization, without
  changing the navigation hierarchy, modes, filters, or Quick View
  described above. This is how the architecture supports "hundreds or
  thousands of projects without redesign": by making today's small-scale
  simplicity swappable later, not by pre-building infrastructure the
  current registry doesn't need.

## 15. Future Expansion

Two different kinds of "future" appear below, and they are not the same
thing. **Signals, Portfolio, and AI Research are real, committed
milestones** in [docs/ROADMAP.md](../ROADMAP.md). **Wallet Intelligence and
Governance are not currently on the roadmap at all** — they're included
here only because they were asked for as illustrative tests of the
architecture's extensibility, not as commitments this document is making.

- **Signals** *(Milestone 8, roadmapped)* — plugs in as a new filter/sort
  facet and/or a badge on cards and table rows, consuming data shaped like
  the `ProjectIntelligence` model Explorer already renders. No change to
  navigation hierarchy required.
- **Portfolio** *(Milestone 9, roadmapped)* — plugs in via the "Watchlist"
  slot already reserved in Section 3's hierarchy, and a "save" action added
  to cards and Quick View once accounts exist. No structural change to
  Grid, Table, or Quick View required.
- **AI Research** *(Milestone 10, roadmapped)* — plugs in as the "Project
  Details" destination already anticipated in Section 11's navigation flow,
  and as a new filter facet once AI-specific scoring exists. Quick View's
  role doesn't change — it gains one more outbound action.
- **Wallet Intelligence** *(illustrative only, not roadmapped)* — if ever
  pursued, would slot into Global Search's already-reserved "Wallets"
  future category (Section 5) and into Quick View as an additional
  section, following the same Source Attribution pattern every other
  section already uses.
- **Governance** *(illustrative only, not roadmapped)* — if ever pursued,
  would slot into Quick View as an additional data section, sourced,
  confidence-scored, and freshness-tracked the same way Market, Trading,
  and TVL already are.

In every case, the extension point is the same: a new **filter facet**, a
new **Quick View section**, or a new **card/row badge** — never a change to
the core navigation hierarchy, the three modes, or the Grid/Table/Quick
View structure themselves. That reuse is what "without redesign" means in
practice.
