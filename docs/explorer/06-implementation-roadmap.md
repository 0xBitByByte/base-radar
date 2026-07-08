# Explorer — Implementation Roadmap

**Status**: Draft
**Source of truth**: [01-product-requirements.md](01-product-requirements.md),
[02-information-architecture.md](02-information-architecture.md),
[03-screen-specifications.md](03-screen-specifications.md),
[04-component-specification.md](04-component-specification.md), and
[05-data-mapping.md](05-data-mapping.md) — this document sequences their
implementation; it does not add, remove, or reinterpret anything they
already specified.
**Scope of this document**: how to build what 01–05 already fully
specified, in a series of small, independently mergeable pull requests.
No code, no new components, no new fields — only sequencing, acceptance
criteria, and process.

---

## 1. Purpose

Everything Explorer needs has now been specified in full — product
requirements, navigation, screen behavior, components, and the exact data
contract. What hasn't been decided is *how to build it without one
enormous, unreviewable pull request*. This document is that decision.

Splitting implementation into small PRs isn't a process formality — it's
what makes the rest of this series actually usable by more than one
person at a time. A single engineer can hold the whole design in their
head from one long PR; a team can't review one 4,000-line PR
meaningfully, can't ship value incrementally, and can't isolate which
change caused a regression. Small PRs mean:

- **Faster, more honest review** — a reviewer can actually hold PR3
  (Filters) in their head and check it against §5's data mapping, instead
  of skimming a PR that also touches Search, Grid, and Table.
- **Shippable value sooner** — PR1 alone gets a working, if minimal,
  Explorer in front of real usage before Quick View even exists.
- **Isolated regressions** — if something breaks after PR6, the search
  space for "what changed" is one PR, not the whole feature.
- **Parallel work** — once PR1 merges, Search (PR2), Filters (PR3), and
  Grid (PR4) have few enough overlapping concerns that more than one
  engineer can work on this series at once.

## 2. Implementation Philosophy

- **Small PRs** — if a PR's diff can't be reasonably reviewed in one
  sitting, it's too big and should be split further, even beyond this
  document's 10-PR suggestion.
- **One responsibility per PR** — a PR that adds Filters should not also
  touch Table columns; if a change genuinely requires touching two areas,
  that's a signal the two areas weren't as separable as assumed, not a
  license to combine PRs.
- **No mixed concerns** — visual polish, accessibility hardening, and new
  functionality are different kinds of change and are reviewed
  differently; don't fold a drive-by a11y fix into a feature PR (flag it
  separately instead, per this repository's existing
  [CLAUDE_RULES.md](../CLAUDE_RULES.md#scope-discipline) convention).
- **Ship working software** — every PR, including PR1, leaves Explorer in
  a genuinely usable (if incomplete) state — never a broken intermediate
  state merged to `main`.
- **Continuous validation** — §6's checklist runs on every PR, not just
  the ones that "feel like" they need it.
- **Backward compatibility** — every PR in this roadmap is strictly
  additive. Nothing about the existing landing page, dashboard, or any
  current widget changes as a side effect of building Explorer.
- **MVP first** — every PR in §4 builds only what 01's MVP Scope already
  authorized; §10 exists specifically to hold everything else at arm's
  length.

## 3. Dependency Graph

```
PR1  Explorer Shell
       │  (page, data pipeline, Header, Summary, minimal results list)
       ▼
PR2  Explorer Search ──────┐
       │                    │  (both depend only on PR1's data pipeline;
       ▼                    │   can proceed in parallel once PR1 merges)
PR3  Filters ───────────────┘
       │
       ▼
PR4  Grid View (full card design)
       │
       ▼
PR5  Table View  (introduces the View/Mode toggle, now that two views exist)
       │
       ▼
PR6  Quick View Drawer  (wires the click/Enter interaction PR4 and PR5 each left unfinished)
       │
       ▼
PR7  Responsive Behaviour  (adapts everything above across breakpoints)
       │
       ▼
PR8  Accessibility  (hardening/audit pass across everything above)
       │
       ▼
PR9  Performance  (hardening/audit pass across everything above)
       │
       ▼
PR10 Final Polish
```

**Dependency notes**:

- PR2 and PR3 both depend only on PR1's data pipeline (the fetched
  `ProjectIntelligence[]` and the minimal results list) — they touch
  different components (`ExplorerSearch` vs. `ExplorerFilterBar`) and can
  be built in either order, or in parallel by two engineers, once PR1
  merges.
- PR4 depends on PR1 (a results list already exists to upgrade) and
  benefits from PR2/PR3 existing first, since the full card needs to
  render correctly *while* filtered/searched.
- PR6 depends on both PR4 and PR5, because both `ProjectCard` and
  `ProjectRow` need to trigger it.
- PR7, PR8, and PR9 are **hardening passes**, not the first time
  responsiveness, accessibility, or performance are considered — 04 §2
  already requires every component to be "accessible by default" and
  "responsive by default" from the PR that introduces it. PR7–PR9 are
  where the whole, now-complete picture is systematically audited and
  anything missed along the way is fixed — see §9's Risk Register for why
  this distinction matters.

## 4. Pull Request Plan

### PR1 — Explorer Shell

- **Purpose**: stand up the page itself — the data pipeline and the
  always-visible header regions — as a genuinely shippable, if minimal,
  starting point. Renders every project in the registry as a bare
  identity-only list (name, logo, verification status) — a walking
  skeleton proving `ExplorerPage → getAllProjectIntelligence() → rendered
  UI` end to end, not yet the full Grid View design (that's PR4).
- **Files likely affected**: a new page reusing the dashboard's existing
  reserved nav entry (`/dashboard/projects`, per
  [02-IA §3](02-information-architecture.md#3-navigation-hierarchy)); a
  new component directory for Explorer components, following this
  project's existing `components/dashboard/`-style organization
  ([CLAUDE_RULES.md](../CLAUDE_RULES.md#naming-conventions)). No changes
  to `lib/intelligence/`, `lib/providers/`, `data/projects/`, or any
  existing route/page/component.
- **Dependencies**: none — the first PR.
- **Acceptance criteria**:
  - The page calls `getAllProjectIntelligence()` exactly once and renders
    every returned project.
  - `ExplorerHeader` shows title, description, project count, last
    updated, and Intelligence status, per
    [03 §3](03-screen-specifications.md#3-explorer-header).
  - `ExplorerSummary`'s five cards render with real, correct counts, per
    [03 §4](03-screen-specifications.md#4-intelligence-summary).
  - `LoadingState` renders during the fetch; the true empty-registry
    `EmptyState` renders if the registry is ever empty.
  - `ExplorerToolbar` is present with only its Sort control functional
    (sorting the minimal list by Name/TVL/Health/Confidence/GitHub
    stars); Filter, View, and Mode controls are visibly absent, not
    disabled placeholders — they're added by the PRs that give them
    something to control.
  - No component outside `ExplorerPage` imports from `lib/providers/*` or
    `lib/intelligence/*` — verified by review, per
    [05 §18](05-data-mapping.md#18-anti-patterns).
- **Out of scope**: Search, Filters, the full Grid card design, Table
  View, Quick View, responsive/mobile layout, and any animation beyond
  what's structurally necessary.

### PR2 — Explorer Search

- **Purpose**: add the persistent inline Search Bar and wire live,
  in-place filtering.
- **Files likely affected**: `ExplorerSearch`, `SearchInput`,
  `SearchClearButton`, `SearchShortcutHint`, `NoResultsState`. No changes
  to the data pipeline established in PR1.
- **Dependencies**: PR1.
- **Acceptance criteria**:
  - Matches against `identity.name`, `identity.description`/`shortDescription`,
    `identity.tags`, `identity.categories`, per
    [05 §9](05-data-mapping.md#9-search-mapping) — no other field.
  - Debounced, client-side, no network call.
  - The `/` shortcut focuses the field when nothing else has focus; the
    clear button appears only when the field is non-empty.
  - An empty result set renders `NoResultsState` with a "Clear search"
    action; every other Explorer region remains visible and interactive.
- **Out of scope**: Filters, ranking beyond the priority order in
  [02-IA §5](02-information-architecture.md#5-global-search), search
  history/suggestions (both explicitly not applicable per
  [04 §6](04-component-specification.md#6-search-components)).

### PR3 — Filters

- **Purpose**: add the Filter Bar and every MVP filter facet.
- **Files likely affected**: `ExplorerFilterBar`, `FilterChip`,
  `FilterGroup`, `ActiveFilterSummary`, `ClearFiltersButton`,
  `FilterDrawer` (built now, activated for real in PR7); the `FilterButton`
  added to `ExplorerToolbar`.
- **Dependencies**: PR1 (PR2 not required, but expected to already exist
  in practice per §3).
- **Acceptance criteria**:
  - Every MVP filter in [05 §10](05-data-mapping.md#10-filter-mapping)
    is present: Category, Tags, Verification, Status, Chain, Health,
    Confidence, Developer Activity, TVL, Market Cap, Source Availability,
    and Risk (as a derived lens, not a new field).
  - Filters combine with search (narrowing within it, not replacing it),
    per [03 §5](03-screen-specifications.md#5-search-bar).
  - Multiple filters combine with AND across facets, OR within a
    multi-select facet, per
    [03 §7](03-screen-specifications.md#7-filter-bar).
  - `ClearFiltersButton` resets every filter without touching the search
    query.
  - Zero matching projects renders `NoResultsState` with a "Clear
    filters" action (or both actions, if search is also active).
- **Out of scope**: Launch Date, Trending, Narratives, and AI-specific
  filters — all explicitly future, per
  [05 §10](05-data-mapping.md#10-filter-mapping).

### PR4 — Grid View

- **Purpose**: replace PR1's minimal placeholder list with the full
  `ProjectCard` design.
- **Files likely affected**: `ExplorerGrid`, `ExplorerGridLayout`,
  `ProjectCard`, `ProjectCardHeader`, `ProjectCardMetrics`,
  `ProjectCardFooter`, `VerificationBadge`, `HealthBadge`,
  `ConfidenceBadge`, and the shared `Metric`/`Badge`/`ScoreIndicator`/`Timestamp`
  primitives (extending `GlowBadge`/`SectionTitle` per
  [04 §13](04-component-specification.md#13-shared-components)).
- **Dependencies**: PR1 (PR2/PR3 expected to already exist).
- **Acceptance criteria**:
  - Card hierarchy matches
    [03 §8](03-screen-specifications.md#8-grid-view) and
    [05 §6](05-data-mapping.md#6-grid-view-mapping) exactly, field for
    field.
  - Every unavailable metric renders its explicit "unavailable" treatment
    — no card reflows or omits a slot based on data availability
    ("card consistency," [03 §13](03-screen-specifications.md#13-design-constraints)).
  - Hover elevates the card per the existing product-wide card hover
    treatment; keyboard focus is visible and cards are reachable via
    Tab/Arrow keys.
  - Clicking or activating a card is wired to a callback (e.g. "card
    activated") — but **no drawer opens yet**; that wiring completes in
    PR6.
- **Out of scope**: Quick View itself, Table View, any responsive
  breakpoint behavior beyond what already works from PR1.

### PR5 — Table View

- **Purpose**: add the dense Table View and the View/Mode toggles that
  only make sense once a second view exists.
- **Files likely affected**: `ExplorerTable`, `ExplorerTableLayout`,
  `ProjectRow`, `ColumnHeader`, `SortableHeader`, `StickyHeader`,
  `RowActions`; `ViewToggle` and `ModeSelector` added to `ExplorerToolbar`.
- **Dependencies**: PR1 and PR4 (reuses `VerificationBadge`/`HealthBadge`/`ConfidenceBadge`
  built there).
- **Acceptance criteria**:
  - The 8 default columns match
    [05 §7](05-data-mapping.md#7-table-view-mapping) exactly; Market Cap,
    Freshness, and GitHub Stars are not shown (optional/future columns).
  - `SortableHeader` stays in sync with the Toolbar's `SortSelector`
    (same active field/direction).
  - `StickyHeader` keeps the column row fixed while rows scroll.
  - `ViewToggle` switches Grid/Table without losing active
    search/filter/sort state; `ModeSelector` switches Discover/Research/
    Intelligence, setting a sensible view default without preventing a
    manual override, per
    [03 §6](03-screen-specifications.md#6-toolbar).
  - `RowActions` exposes one explicit, focusable "View" control per row.
- **Out of scope**: Quick View itself (RowActions' "View" control is
  wired to the same not-yet-connected callback as PR4's cards), column
  resizing/visibility (future).

### PR6 — Quick View Drawer

- **Purpose**: build the drawer and complete the interaction PR4 and PR5
  each deliberately left unfinished.
- **Files likely affected**: `QuickViewDrawer`, `QuickViewHeader`,
  `QuickViewSummary`, `QuickViewMetrics`, `QuickViewSources`,
  `QuickViewActions`; the "card/row activated" callbacks from PR4/PR5 now
  open this drawer.
- **Dependencies**: PR4 and PR5.
- **Acceptance criteria**:
  - Opens with data already in memory — no fetch, no loading state, per
    [03 §14](03-screen-specifications.md#14-quick-view-drawer).
  - Content hierarchy and field mapping match
    [05 §8](05-data-mapping.md#8-quick-view-mapping) exactly, including
    the full `Sources` breakdown (all six providers, always) and visible
    `Health`/`Confidence` `.factors`.
  - Opens via click/tap or `Enter` on a focused card/row; closes via
    backdrop click, an explicit close control, or `Esc`; focus returns to
    the triggering card/row on close.
  - Focus is trapped inside the drawer while open.
  - A project with little or no live data still renders every section,
    explicitly marked unavailable where applicable — never a distinct
    "empty drawer" state.
- **Out of scope**: mobile's full-screen sheet presentation (PR7), "View
  full details" and every other future action named in
  [04 §11](04-component-specification.md#11-quick-view-components).

### PR7 — Responsive Behaviour

- **Purpose**: adapt everything built in PR1–PR6 across tablet and mobile
  viewports.
- **Files likely affected**: responsive variants/behavior across every
  component built so far; no new components beyond what 04 already names
  (`FilterDrawer` becomes functionally active; `QuickViewDrawer` gains its
  mobile full-screen presentation).
- **Dependencies**: PR1–PR6.
- **Acceptance criteria**: matches
  [03 §15/§16](03-screen-specifications.md#15-mobile-explorer) and
  [04's Responsive Behaviour table](03-screen-specifications.md#21-responsive-behaviour)
  exactly:
  - Table View is unavailable below the tablet-landscape threshold; Grid
    falls back to single/double column.
  - Filter Bar and Quick View present as bottom sheets / full-screen
    sheets on mobile and tablet portrait.
  - `ModeSelector` reduces to Discover/Intelligence where Table View is
    unavailable.
  - Search and Toolbar collapse into a sticky condensed bar once scrolled
    past the Header/Summary, on mobile.
  - Touch targets meet the minimum comfortable size on every interactive
    element.
- **Out of scope**: any new capability — this PR only adapts existing
  behavior to smaller viewports, it does not add functionality absent on
  desktop.

### PR8 — Accessibility

- **Purpose**: a systematic accessibility audit and hardening pass across
  everything shipped so far — not the first time accessibility is
  considered (every prior PR's acceptance criteria already required
  baseline keyboard/focus/ARIA support), but the pass that verifies it
  holistically and catches what individual PRs missed.
- **Files likely affected**: incremental fixes across existing
  components; no new components.
- **Dependencies**: PR1–PR7.
- **Acceptance criteria**: matches
  [03 §20](03-screen-specifications.md#20-accessibility) and
  [04 §17](04-component-specification.md#17-accessibility) in full —
  full keyboard walkthrough (§8 below), screen-reader pass on every
  region and the drawer, `aria-sort` on table headers, live-region
  announcement of result-count changes, verified focus order, verified
  reduced-motion behavior on every transition, verified touch targets.
- **Out of scope**: any new visual design — fixes here are about
  correctness (labels, order, semantics), not appearance, unless a visual
  change is required to meet a contrast or target-size requirement.

### PR9 — Performance

- **Purpose**: a systematic performance audit — same relationship to
  "performance" as PR8 has to "accessibility."
- **Files likely affected**: memoization and render-optimization
  adjustments across existing components; no new components, no
  virtualization (explicitly future, per
  [01-PRD](01-product-requirements.md#8-mvp-scope) and
  [03 §14](03-screen-specifications.md#14-performance-strategy)).
- **Dependencies**: PR1–PR8.
- **Acceptance criteria**: matches §7's goals below — confirms
  `ExplorerGridLayout`/`ExplorerTableLayout` have a clean enough rendering
  boundary to be virtualization-ready without being virtualized yet;
  confirms typing in Search or toggling a filter doesn't re-render every
  `ProjectCard` unnecessarily; confirms bundle impact via `npm run
  build`'s output.
- **Out of scope**: building virtualization itself, any new caching layer
  beyond what the Intelligence Engine already provides.

### PR10 — Final Polish

- **Purpose**: the remaining visual, motion, and copy refinement that
  doesn't belong in any feature PR above.
- **Files likely affected**: styling/animation/copy adjustments across
  existing components only.
- **Dependencies**: PR1–PR9.
- **Acceptance criteria**: matches
  [03 §22](03-screen-specifications.md#22-motion--interaction-rules) in
  full (hover/drawer/counter animation, reduced-motion parity); correct in
  both dark and light themes; final copy review against every string
  named in 01–05 (e.g. the Intelligence Summary card labels flagged as
  "first pass" in
  [03's Open Questions](03-screen-specifications.md#open-questions)).
- **Out of scope**: any new functionality — if something functional is
  still missing at this point, it belongs in an earlier PR, reopened.

## 5. Testing Strategy

This repository has no automated test runner today
([CONTRIBUTING.md](../../CONTRIBUTING.md#testing-requirements)) — this
section is honest about what that means for Explorer rather than assuming
tooling that doesn't exist.

- **Unit testing**: Explorer's own unit-test surface is intentionally
  thin, by design — every component is presentation-only (§18's Anti-Patterns,
  inherited from 05), so there's little business logic in Explorer itself
  to unit test. The higher-value unit-test target is `lib/intelligence/`'s
  pure functions (`merge`, `confidence`, `freshness`, `scoring`), already
  flagged as a testing gap when that layer was built — introducing a test
  runner to cover those is a recommendation (§14), not a requirement of
  this roadmap.
- **Integration testing**: verifying `ExplorerPage` correctly wires
  search + filters + sort + data together is the most valuable
  integration-level check here — recommended once a test runner exists,
  not required to ship any PR in §4 today.
- **Manual testing**: the actual bar every PR must clear today — a
  deliberate walkthrough of that PR's acceptance criteria in a running
  browser, per §6.
- **Regression testing**: manual — re-checking each *prior* PR's
  acceptance criteria still holds after a new PR merges, since no
  automated suite exists to catch this automatically yet.
- **Visual verification**: manual screenshot comparison across dark/light
  themes and the three breakpoint classes (03 §21), for any PR that
  touches layout or visual design.
- **Cross-browser testing**: manual spot-check in at least Chrome,
  Firefox, and Safari — no automated cross-browser infrastructure exists
  in this repository.

## 6. Validation

Every PR in §4, without exception, must pass:

```bash
npx tsc --noEmit
npm run lint
npm run build
```

And be manually verified against:

- [ ] Desktop layout matches 03's specification for whatever that PR
  adds.
- [ ] Tablet layout (once PR7 lands; before that, tablet is expected to
  render as a narrower desktop, not broken).
- [ ] Mobile layout (once PR7 lands; before that, mobile is expected to
  be usable, if not yet optimized).
- [ ] Dark theme.
- [ ] Light theme.
- [ ] Keyboard navigation for everything that PR adds.
- [ ] Accessibility basics for everything that PR adds (full audit is
  PR8, but a PR should not *regress* accessibility that already existed).
- [ ] No console errors.
- [ ] No hydration warnings.

## 7. Performance Goals

Targets, not yet-measured guarantees — set now so PR9's audit has
something concrete to check against:

- **Initial render**: Explorer's first paint should not be meaningfully
  slower than the existing dashboard page's own first paint — a relative
  target against something already shipped, not a fabricated absolute
  number.
- **Search latency**: perceived as instant. Debounce in the same
  150–300ms range this product's other transitions already use
  ([docs/DESIGN_SYSTEM.md](../DESIGN_SYSTEM.md#animations)), since search
  filters already-fetched, in-memory data with no network round-trip.
- **Filter latency**: same target as search, for the same reason.
- **Drawer opening**: instant data availability (no fetch, per
  [03 §14](03-screen-specifications.md#14-quick-view-drawer)); the open/close
  *animation* matches this product's existing drawer transition duration
  (300ms, per `MobileSidebar`'s real, already-shipped implementation).
- **Keyboard responsiveness**: no perceptible delay between a keypress
  and its visual effect (focus move, selection, toggle).
- **Bundle impact**: measured via `npm run build`'s route-level output on
  every PR; flagged for discussion if any single PR meaningfully grows
  the shared bundle. No fixed KB budget is set here, since no baseline has
  been measured yet — this is a process goal, not a fabricated number.
- **Future virtualization**: explicitly not a PR9 target — revisit only
  if the registry grows well beyond its current ~20 projects, per
  [01-PRD](01-product-requirements.md#8-mvp-scope).

## 8. Accessibility Goals

Restated as roadmap-level goals from 03 §20 / 04 §17, not re-derived:

- **Keyboard-first**: every interactive element reachable and operable
  without a mouse.
- **Screen readers**: every region announced with a clear landmark or
  label; the drawer announced as a dialog with an accessible name.
- **Focus management**: never lost on any state transition (opening/closing
  the drawer, expanding/collapsing filters, switching view/mode).
- **Reduced motion**: every animated transition has a reduced-motion
  equivalent, using this product's existing mechanism.
- **Touch targets**: comfortable minimum size on every interactive
  element, on any input device.
- **ARIA**: correct roles/states/labels on every custom control (toggle,
  selector, sortable header, expandable panel).

## 9. Risk Register

| Risk | Mitigation |
| --- | --- |
| **Large PRs** | Strict per-PR acceptance criteria and explicit "Out of Scope" lists (§4); a PR that starts growing beyond its stated scope should be split further, not expanded. |
| **Component duplication** | 04's component tree is the single source of truth for what exists; a reviewer checks any new component against it before approving. |
| **Data ownership drift** | 05's Anti-Patterns (§18) and Validation Rules (§17) are enforced per PR — no component may fetch, transform, or recompute Engine data. |
| **Performance regressions** | Baseline bundle-size awareness on every PR (§7), plus PR9's dedicated audit. |
| **State complexity** | 03 §24 / 05 §15's State Mapping is the single source of truth for what UI state exists and who owns it; no PR introduces untracked or duplicated state. |
| **Scope creep** | Every PR's "Out of Scope" list, plus this whole series' repeated grounding in 01's Non-Goals — anything not already specified in 01–05 does not belong in any PR in §4. |

## 10. Future PRs

Explicitly not part of this roadmap's 10 PRs — named here only so future
work has a place to attach to, exactly as 02–05 already scoped them:

- **Signals** (Milestone 8, roadmapped)
- **Portfolio**, including **Saved Views** / **Pinned Views** (Milestone 9,
  roadmapped)
- **AI Research** (Milestone 10, roadmapped)
- **Project Details** (Milestone 10, roadmapped)
- **Wallet Intelligence** *(illustrative only, not roadmapped)*
- **Governance** *(illustrative only, not roadmapped)*

## 11. Milestone Completion Criteria

Explorer's MVP is complete when:

- PR1 through PR10 (§4) have all merged.
- Every Functional Requirement in
  [01-PRD §10](01-product-requirements.md#10-functional-requirements) is
  demonstrably true in the running product.
- Every Non-Functional Requirement in
  [01-PRD §11](01-product-requirements.md#11-non-functional-requirements)
  is demonstrably true.
- Working search, working filters, Grid View, Table View, and Quick View
  all function per 03's specification.
- The responsive, accessibility, and performance passes (PR7–PR9) are
  complete, not merely started.
- No known P0/P1 defect is open against any PR's acceptance criteria.
- Documents 01–06 still accurately describe the shipped product — if
  implementation revealed a genuine necessary correction to any of them,
  that correction has been made in its own follow-up documentation PR
  (not silently left to diverge).

## 12. Definition of Done

Every PR in §4 must satisfy all of the following before merge:

- **Code quality**: passes §6's validation; follows 04's component
  principles (single responsibility, no business logic in UI, no
  provider-specific knowledge).
- **Documentation**: no contradiction introduced against 01–05; if one is
  found, it's resolved via a correction to the relevant document, not by
  quietly building something different from what's written.
- **Testing**: satisfies §5's honest bar (manual verification against
  that PR's acceptance criteria; regression check against prior PRs).
- **Accessibility**: meets the baseline expected of every PR per §6;
  full audit is PR8's job, not a reason for earlier PRs to skip basics.
- **Performance**: no obviously wasteful pattern introduced (e.g.
  re-rendering the whole list on every keystroke); full audit is PR9's
  job.
- **Architecture**: satisfies every rule in
  [05 §18](05-data-mapping.md#18-anti-patterns) — no direct provider
  calls, no component-level fetching, no duplicated transformations, no
  duplicated state, no multiple sources of truth.
- **Design consistency**: uses this product's existing design tokens and
  component precedents (04 §13's reuse notes), not new, parallel ones.

## 13. Open Questions

- Should a test runner be introduced as a precursor step before this
  roadmap begins, given every document in this series has independently
  noted the same gap — or should that remain a separate initiative,
  tracked outside Explorer's own roadmap?
- Is PR1's minimal, unstyled results list acceptable to merge to `main`
  and be reachable in production before PR4 lands, or should it sit
  behind some form of gating until the full Grid View exists?
- Should accessibility and responsive behavior be woven into each
  feature PR's own acceptance criteria more strictly, rather than treating
  PR7/PR8 as dedicated hardening passes at the end — this roadmap chose
  the latter model (§3), but it's not the only defensible one.
- How is bundle-size regression actually tracked across PRs without
  existing CI tooling for it — manually reading `npm run build` output is
  specified here (§7), but whether that's sufficient at team scale isn't
  resolved.
- What is the actual folder/naming convention for new Explorer components
  — this document assumes a `components/dashboard/`-style organization
  (§4, PR1) but doesn't mandate an exact path.

## 14. Future Recommendations

Recommendations only — none of these expand this roadmap's scope, and
none introduce anything beyond what 01–05 already anticipated:

- Introduce a test runner as low-risk tooling work (not a product
  feature) early enough to cover `lib/intelligence/`'s pure functions
  before or alongside Explorer's own build-out — the highest-value
  testing target identified in §5.
- Track bundle size per PR in whatever form is lightest-weight given this
  repository's current tooling (even a manually-recorded number in each
  PR's description would beat no tracking at all).
- Once PR10 lands, consider a short "implementation delta" note appended
  to this document (or a new `07-`) recording anywhere the shipped
  Explorer ended up differing from 01–05's specification, and why — so
  the design series stays a reliable historical record rather than
  quietly going stale.
- Revisit virtualization (§7) only when the Project Registry's size makes
  it a real, measured problem — not preemptively.
- **GitHub enrichment strategy at scale.** Today, `getAllProjectIntelligence()`
  fetches GitHub repo stats once per project, concurrently, on every call —
  appropriate for the registry's current size (~20 projects) and within
  free-tier rate limits. If the registry grows substantially (hundreds or
  thousands of projects), GitHub enrichment should evolve toward a
  cached/background-refresh strategy rather than synchronous per-project
  requests on every page load. This is a Provider Layer/Intelligence Engine
  concern, not an Explorer one — the Explorer must continue consuming only
  `getAllProjectIntelligence()` and must never communicate with GitHub (or
  any provider) directly, per [05 §18](05-data-mapping.md#18-anti-patterns).
  Noted here as a future scalability consideration only — no roadmap
  milestone or MVP scope change implied.
