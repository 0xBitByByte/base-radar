# Explorer — Implementation Checklist

**Status**: Draft
**Source of truth**: [01-product-requirements.md](01-product-requirements.md)
through [06-implementation-roadmap.md](06-implementation-roadmap.md) — this
document adds no new requirement, screen, component, field, or PR. It is
purely a verification instrument for what those six documents already
specify.
**Scope of this document**: a practical, checkbox-level quality gate to run
against every Explorer PR named in 06 §4, before merge. No code, no new
scope.

**How to use this document**: copy the relevant sections into a PR
description (or a linked checklist) and check items off as they're
verified. An item that can't honestly be checked is a reason to fix
something or split the PR — never a reason to reword the checklist.

---

## 1. Purpose

06 (the Implementation Roadmap) answers "in what order, and what does each
PR contain." This document answers "how do we know a given PR is actually
done, correctly, before it merges." They're complementary, not
overlapping: 06 is per-PR *scope*; this document is per-PR *quality gate*,
reusable identically across all ten PRs and beyond.

Every item below is written to satisfy this task's own Quality
Principles — objective, measurable, repeatable, simple to verify, and
useful in the two minutes a reviewer actually has to check a PR — rather
than restating design intent already covered in 01–06.

## 2. Pull Request Checklist

- [ ] The PR's scope matches exactly one PR entry in
  [06 §4](06-implementation-roadmap.md#4-pull-request-plan) — not a
  subset combined with a piece of another.
- [ ] The PR has a single responsibility — everything in the diff serves
  that one PR's stated purpose.
- [ ] No unrelated changes are present (formatting-only edits to unrelated
  files, unrelated dependency bumps, drive-by refactors — none of these
  belong in the same PR).
- [ ] Documentation is updated if this PR revealed a genuine correction
  needed to 01–06 (per 06 §11's completion criteria) — and *only* via an
  explicit, called-out documentation change, never a silent divergence.
- [ ] The layered architecture (Registry → Provider Layer → Intelligence
  Engine → `ExplorerPage` → components) is unchanged by this PR.

## 3. Functional Checklist

- [ ] Explorer loads and renders every project currently in the registry.
- [ ] Search filters results per
  [05 §9](05-data-mapping.md#9-search-mapping) — name, description, tags,
  categories only.
- [ ] Every MVP filter in
  [05 §10](05-data-mapping.md#10-filter-mapping) narrows results
  correctly, individually and in combination.
- [ ] Every sortable field in
  [05 §11](05-data-mapping.md#11-sorting-mapping) sorts correctly, both
  directions.
- [ ] Grid View renders the full card hierarchy per
  [03 §8](03-screen-specifications.md#8-grid-view) (once PR4 has landed).
- [ ] Table View renders the 8 default columns per
  [03 §9](03-screen-specifications.md#9-table-view) (once PR5 has
  landed).
- [ ] Quick View opens instantly (no fetch) and shows the full content
  hierarchy per [03 §14](03-screen-specifications.md#14-quick-view-drawer)
  (once PR6 has landed).
- [ ] Explorer's in-session state (mode, view, sort, filters, search,
  drawer) persists correctly while navigating within the page, and resets
  to defaults on a fresh page load, per
  [03 §24](03-screen-specifications.md#24-explorer-state-model) — no
  undocumented persistence behavior.
- [ ] Every acceptance criterion of every *previously merged* PR still
  passes (no regressions) — see §12.

## 4. User Experience Checklist

- [ ] Spacing matches this product's existing rhythm
  ([docs/DESIGN_SYSTEM.md](../DESIGN_SYSTEM.md#spacing)) — no new,
  one-off spacing values.
- [ ] Typography matches the existing scale
  ([docs/DESIGN_SYSTEM.md](../DESIGN_SYSTEM.md#typography)) — no new font
  sizes/weights invented for Explorer.
- [ ] New components reuse existing primitives where 04 §13 says to
  (`GlowBadge`, `SectionTitle`, `EmptyState`, `Skeleton`) rather than
  duplicating them.
- [ ] Hover behavior matches the existing card/row hover treatment
  product-wide — no new hover pattern invented.
- [ ] Focus behavior is visible on every interactive element, using the
  existing `focus-visible` treatment.
- [ ] Every empty state (zero registry, zero search/filter results) uses
  the existing `EmptyState` anatomy with required messaging + a single
  recovery action, per [03 §18](03-screen-specifications.md#18-empty-states).
- [ ] The one legitimate loading state (initial page load) uses a
  skeleton shaped like real content — and no loading state appears
  anywhere search, filter, sort, or Quick View is used, per
  [03 §17](03-screen-specifications.md#17-loading-states).
- [ ] Error states are limited to what 03 §19 actually specifies (a
  page-level failure banner) — no invented per-metric "error" UI where an
  "unavailable" data state already covers it.
- [ ] Responsive layout matches 03 §15/§16/§21 for whatever breakpoints
  this PR touches.
- [ ] Correct in dark theme.
- [ ] Correct in light theme.

## 5. Accessibility Checklist

- [ ] Every interactive element (search, toolbar controls, filter chips,
  cards, rows, drawer) is reachable and operable via keyboard alone.
- [ ] Focus order matches
  [03 §12](03-screen-specifications.md#12-desktop-interaction-rules):
  Search → Toolbar → Filter Bar → Results Area.
- [ ] Every focusable element shows a visible focus ring.
- [ ] Screen readers announce cards/rows concisely (name, headline
  metric, Health, Confidence), not every DOM node in visual order.
- [ ] ARIA landmarks/roles/states are present per
  [03 §20](03-screen-specifications.md#20-accessibility) — region
  landmarks, `aria-expanded` on Filter Bar and Quick View,
  `aria-sort` on sortable table headers, a live region for result-count
  changes.
- [ ] Contrast meets this product's existing (already-compliant) token
  set — no new colors introduced.
- [ ] Every animation respects `prefers-reduced-motion` via the existing
  `MotionConfig`/`motion-reduce:` mechanism.
- [ ] Every interactive element meets a comfortable minimum touch-target
  size, on any input device.
- [ ] Table markup uses real semantic table elements with header/cell
  association — not a styled `div` grid impersonating a table.

## 6. Performance Checklist

- [ ] No component re-renders when unrelated Explorer state changes
  (e.g. typing in Search does not re-render every `ProjectCard` that a
  debounced filter hasn't yet excluded).
- [ ] Presentational components likely to re-render often (`ProjectCard`,
  `ProjectRow`, every §13 Shared component in 04) are memoized.
- [ ] Project logos load lazily as they enter view.
- [ ] No component recomputes a value `lib/intelligence/` already
  computed (Health, Confidence, Freshness, or any merged field).
- [ ] No component holds a duplicate copy of state already owned
  elsewhere, per
  [05 §15](05-data-mapping.md#15-state-mapping).
- [ ] Components receive stable references to their data, not freshly
  recreated objects/arrays on every parent render.
- [ ] `npm run build`'s route-level bundle size output has been reviewed
  for this PR and any meaningful increase is called out in the PR
  description.

## 7. Architecture Checklist

- [ ] No Explorer component imports from `lib/providers/*`, directly or
  indirectly.
- [ ] No Explorer component imports from `data/projects/*` directly —
  `ExplorerPage` is the only consumer of `lib/intelligence/engine.ts`.
- [ ] No business logic (scoring, matching, freshness calculation) exists
  anywhere in `components/` — it stays entirely inside `lib/intelligence/`.
- [ ] No component reimplements a transformation `lib/intelligence/merge.ts`
  (or its siblings) already performs.
- [ ] `ProjectIntelligence`, delivered via `ExplorerPage`, is the only
  data source in play — nothing reads two different sources for the same
  fact.
- [ ] Component boundaries match 04's tree — no component takes on a
  responsibility 04 assigned to a different one (e.g. a card computing its
  own Health score instead of displaying the one it was given).

## 8. Code Quality Checklist

- [ ] `npx tsc --noEmit` passes with zero errors.
- [ ] `npm run lint` passes with zero warnings.
- [ ] `npm run build` succeeds.
- [ ] Zero console errors in the browser during manual verification.
- [ ] Zero hydration warnings during manual verification.
- [ ] Component names are meaningful and match 04's naming convention
  (`Explorer`-prefixed, `Project`-prefixed, or fully generic — per
  [04's opening note](04-component-specification.md)).
- [ ] File organization is clear and consistent with this PR's
  established location (per 06 §4's "files likely affected" for that PR).

## 9. Responsive Checklist

- [ ] Desktop layout matches 03 Part A.
- [ ] Tablet landscape behaves like a narrower desktop (Table View
  available, inline filter expansion).
- [ ] Tablet portrait behaves like mobile (Table View unavailable, Filter
  Bar as a bottom sheet).
- [ ] Mobile layout matches
  [03 §15](03-screen-specifications.md#15-mobile-explorer).
- [ ] Landscape and portrait orientation changes on the same device don't
  break layout or lose state.
- [ ] Filter behavior correctly switches between inline expansion and
  bottom sheet at the documented threshold.
- [ ] Quick View correctly switches between a right-side drawer and a
  full-screen sheet at the documented threshold.

## 10. Visual QA Checklist

- [ ] Cards align to a consistent grid with no uneven gutters.
- [ ] Table columns align consistently across every row, with no jitter
  on sort.
- [ ] Badges (`VerificationBadge`, `HealthBadge`, `ConfidenceBadge`) are
  visually consistent with each other and with `GlowBadge`'s existing
  color vocabulary.
- [ ] Spacing rhythm matches Part A's Design Constraints
  ([03 §13](03-screen-specifications.md#13-design-constraints)) with no
  visual drift introduced by later PRs.
- [ ] Animations match the durations and easing already specified in
  [03 §22](03-screen-specifications.md#22-motion--interaction-rules) —
  no new, inconsistent timing.
- [ ] Icons are consistent in weight/size with the icon set already used
  elsewhere in the product.
- [ ] Theme consistency holds across every new element in both dark and
  light mode — no element that only looks correct in one theme.

## 11. Manual Testing Checklist

Suggested scenarios to walk through by hand before approving a PR:

- [ ] **Search**: type a partial name, a tag, a category; clear the
  query; confirm results update correctly each time.
- [ ] **Filter combinations**: apply two or more filters together; remove
  one via its chip; use "Clear all"; confirm results match expectations
  at each step.
- [ ] **Sorting**: sort by every available field, both directions;
  confirm a project with a `null` value for the active sort field sorts
  to the end rather than erroring.
- [ ] **Quick View**: open from a card, open from a table row, close via
  backdrop/close-control/Escape; confirm focus returns correctly each
  time.
- [ ] **Keyboard-only navigation**: unplug the mouse (figuratively) and
  complete a full search → filter → sort → open Quick View → close flow
  using only the keyboard map in
  [03 §23](03-screen-specifications.md#23-keyboard-workflow).
- [ ] **Theme switching**: toggle dark/light mid-session; confirm nothing
  breaks or flashes incorrectly.
- [ ] **Window resizing**: drag the browser window slowly across the
  desktop/tablet/mobile breakpoints; confirm no layout break at any
  intermediate width.
- [ ] **Network interruption**: simulate a provider being unreachable
  (e.g. via browser dev tools' network throttling/blocking) and confirm
  the affected section renders as "unavailable," never as a broken UI or
  an uncaught error.
- [ ] **Partial provider data**: verify a project with only some
  providers configured (e.g. no `defillamaSlug`, no `github`) renders
  every section correctly — available sections populated, unavailable
  ones explicitly marked, per
  [05 §14](05-data-mapping.md#14-missing-data-strategy).

## 12. Regression Checklist

- [ ] The dashboard (`app/dashboard/page.tsx` and its existing widgets)
  is unchanged — confirmed via `git diff` showing no modifications
  outside Explorer's own new files.
- [ ] The landing page is unchanged.
- [ ] Existing navigation (sidebar, topbar, mobile drawer) is unchanged,
  aside from the pre-existing "Projects" entry now pointing at a real
  page instead of a placeholder.
- [ ] `lib/providers/*` is unchanged.
- [ ] `lib/intelligence/*` is unchanged.
- [ ] `data/projects/*` is unchanged.

## 13. Release Checklist

Before merge, confirm:

- [ ] TypeScript (`npx tsc --noEmit`) passes.
- [ ] Lint (`npm run lint`) passes.
- [ ] Build (`npm run build`) succeeds.
- [ ] Manual verification (§3–§11 as applicable to this PR) is complete.
- [ ] Documentation is current (§2's documentation-update item).
- [ ] Review approval has been given by at least one other engineer.

## 14. Definition of Done

An Explorer PR is complete only when **all** of the following hold
simultaneously:

- [ ] Its acceptance criteria, as stated in
  [06 §4](06-implementation-roadmap.md#4-pull-request-plan), are met.
- [ ] Every applicable checklist section above has been completed, not
  skipped.
- [ ] Architecture is preserved (§7).
- [ ] Accessibility is verified (§5) for whatever this PR adds, per
  06 §3's "accessible by default, hardened in PR8" model.
- [ ] Performance is acceptable (§6) for whatever this PR adds, per
  06 §3's "performant by default, hardened in PR9" model.
- [ ] Code has been reviewed and approved.

## 15. Common Failure Patterns

Mistakes to actively watch for in review — each one directly violates a
rule already established in 01–06:

- **Fetching inside UI** — a component calling a provider or the
  Intelligence Engine directly instead of receiving data via
  `ExplorerPage`.
- **Recomputing scores** — a component re-deriving Health, Confidence, or
  Freshness instead of displaying the value it was given.
- **Duplicating state** — the same piece of state (e.g. the active
  filters) tracked in two places that can drift out of sync.
- **Hardcoded values** — example/mock data baked into a component instead
  of driven entirely by its `ProjectIntelligence` input.
- **Ignoring empty states** — treating "zero results" or "zero live data"
  as an edge case instead of the first-class, expected state 01–03
  establish it to be.
- **Skipping accessibility** — deferring basic keyboard/focus/ARIA
  support to "the accessibility PR" (PR8) instead of building it in from
  the start, per 04 §2.
- **Large PRs** — a diff that grew beyond one PR's stated responsibility
  instead of being split, per 06 §2.

## 16. Explorer MVP Completion Checklist

The final gate — every item below must be true before Explorer's MVP is
considered complete, mirroring
[06 §11](06-implementation-roadmap.md#11-milestone-completion-criteria):

- [ ] Explorer Shell (PR1) shipped and stable.
- [ ] Search (PR2) shipped and stable.
- [ ] Filters (PR3) shipped and stable.
- [ ] Grid View (PR4) shipped and stable.
- [ ] Table View (PR5) shipped and stable.
- [ ] Quick View (PR6) shipped and stable.
- [ ] Responsive behavior (PR7) complete across desktop/tablet/mobile.
- [ ] Accessibility (PR8) audited and complete.
- [ ] Performance (PR9) audited and complete.
- [ ] Final polish (PR10) complete.
- [ ] Documentation (01–07) still accurately describes the shipped
  product, with any necessary corrections made explicitly.

## 17. Open Questions

- Should this checklist be enforced via a PR template (a literal
  checkbox list a PR description must include) or left as a reference
  document reviewers consult manually? Not decided here.
- Should any item in §6 (Performance) or §7 (Architecture) be enforced by
  an automated lint rule once tooling allows it, rather than relying on
  manual review indefinitely? Not decided.
- How should "Documentation updated (if required)" (§2) be verified
  objectively — is a reviewer expected to re-read 01–06 against every PR,
  or only when the PR author flags a possible divergence? Not decided.
- Does §12's Regression Checklist need to be re-run in full for every PR,
  or only for PRs touching areas plausibly close to existing app code
  (e.g. the shared navigation entry)? Not decided.

## 18. Future Checklist Items

Reserved placeholders — not part of Explorer's MVP checklist, and not to
be checked against until their respective milestone begins:

- **Signals** (Milestone 8, roadmapped)
- **Portfolio** (Milestone 9, roadmapped)
- **AI Research** (Milestone 10, roadmapped)
- **Project Details** (Milestone 10, roadmapped)
- **Saved Views** / **Pinned Views** (Milestone 9 territory, roadmapped)
- **Wallet Intelligence** *(illustrative only, not roadmapped)*
- **Governance** *(illustrative only, not roadmapped)*
