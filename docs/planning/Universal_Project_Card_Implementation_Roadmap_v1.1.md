# Universal Project Card — Implementation Roadmap

## Metadata

```
Status: Frozen
Version: v1.1
Last Updated: 2026-08-20

Depends On:
- Universal Project Card Product Standard v1.1

Governance:
The Product Standard governs product behavior, UX, accessibility,
performance constraints and evolution rules.

This Roadmap governs engineering execution only.

Implementation must not modify product behavior unless the Product
Standard itself is revised in a future major/minor version.
```

---

## Roadmap Status

| Phase | Status |
|---|---|
| Product Research | ✅ Complete |
| Product Audit | ✅ Complete |
| Universal Card Product Standard | 🔒 Frozen (v1.1) |
| Implementation Roadmap | 🔒 Frozen (v1.1) |
| Phase 1 – Foundation | ✅ Complete |
| Phase 2 – Universal Card | ✅ Complete |
| Phase 3 – Micro Variant | ✅ Complete |
| Phase 4 – Consumer Migrations | ✅ Complete |
| Phase 5 – Final QA | ✅ Complete |
| Dead Code Removal | 🚫 Out of Scope |
| Future Extensibility | 🚫 Deferred |

---

## Roadmap Metadata

**Goal:** Ship the frozen Universal Project Card Product Standard (v1.1) into production across every consumer surface in BaseRadar, replacing today's 4 incompatible project shapes and ~11 independently-built card locations with the one canonical implementation the Standard defines — without redesigning the Standard, without new product features, and without unrelated cleanup.

**Scope:** The 10 PRs (9 required + 1 optional) across Phases 1–5 below: data-layer additions, the Universal Card's `compact`/`detailed`/`micro` variants, and migrating every live consumer identified in the Standard's own audit (§4) onto that one implementation.

**Out of Scope:**
- Any change to the Product Standard document itself.
- Any §26 Future Extensibility item (Portfolio, Alerts, Compare, Premium, Community Reputation, AI Notes) — reserved, not built.
- Deletion of the dead `ProjectCard`/`ProjectRow`/`ExplorerGrid`/`ExplorerTable` chain (§4) — a separate decision, tracked but not part of this roadmap.
- Any new product feature, scoring change, or business-logic change not already described in the Standard.
- `FeaturedProjectTile` (landing page) migration is optional/deferred (PR-9) — not required for this roadmap to be considered complete.

**Success Criteria:**
- Every required PR (1, 2A, 2B, 3–8, 10) merged and passing its own acceptance criteria.
- §28 Definition of Done and §27 Design Review Checklist pass on every live consumer.
- Zero remaining live consumer renders a bespoke/legacy project card (except PR-9 if deferred).
- No regression in any existing feature (watchlists, search, Dashboard widgets), as measured by each PR's own verification step.

**Rollback Strategy:**
- Every PR is independently revertible without breaking the product, per the dependency graph — reverting any Phase-4 PR simply returns that one consumer to its pre-migration state.
- The PR-2A/PR-2B split exists specifically to make rollback surgical: a polish-only regression found after PR-2B ships can be reverted alone, without touching PR-2A's structural work. A structural problem found in PR-2A blocks 2B (and everything downstream) from starting, containing the blast radius to Phase 2 only.
- No Phase-4 PR depends on another Phase-4 PR, so any one can be reverted independently of the others.
- PR-10 is fix-only by charter — if a fix in it regresses something, the fix is reverted, never the migrations it was verifying.
- **Note:** PR-1 and PR-2A are foundational — once Phase 4 has merged and depends on their fields/structure, they are not symmetrically revertible; a bug discovered post-Phase-4 in PR-1/PR-2A requires a forward-fix, not a clean revert.

**Release Strategy:**
- One PR at a time, in the recommended order below, each fully verified and merged before the next begins — no batching multiple PRs into one release.
- Phase 1–3 ship with no user-visible change beyond the card-content upgrade on already-live surfaces (rails/directory/Related Projects) — no feature flag needed since nothing structurally breaks mid-phase.
- Phase 4 migrations each ship independently; PR-7 (ProjectSpotlight) gets its own release window with explicit sign-off per its risk profile, never bundled with another PR.
- Phase 5 (PR-10) ships last, after every required Phase-4 PR has been live long enough to surface any regression the QA pass should catch.

---

## Phase 1 — Foundation

**PR-1 — Data Foundation: `health`, `aiRating`, `riskLevel`, Category Rank utility**
- **Objective:** implement every net-new data capability the Standard requires in one cohesive change — §5.A's `health`/`aiRating`, §8's rolled-up `riskLevel`, §9's Category Rank utility. Zero UI.
- **Scope:** type additions + population logic + one new pure utility function, all in the data layer.
- **Files:** `lib/projects/types.ts`, `lib/projects/build.ts` (reuses already-running `computeHealth` from `lib/intelligence/scoring.ts`, the Health+Confidence blend in `lib/intelligence/scorecard.ts`, and the existing risk analysis in `lib/intelligence/engine.ts`), new `lib/projects/rank.ts`.
- **Dependencies:** none.
- **Risks:** Low — purely additive; nothing reads the new fields yet. Watch for any exhaustive-shape type assertion elsewhere that enumerates `LiveProject`'s fields.
- **Verification:** `tsc`/lint/build; assertions that `health`/`aiRating`/`riskLevel` populate correctly (and read `Unknown` per §19 when data is thin) for several known projects; unit tests for the rank utility.
- **Acceptance criteria:** all four capabilities exist, typed and tested; zero visual change anywhere in the app.

**Exit Criteria:**
- [ ] PR-1 merged
- [ ] All new fields/utilities verified against real project data
- [ ] `tsc`/lint/build clean
- [ ] Confirmed zero visual change
- [ ] Ready to begin Phase 2

---

## Phase 2 — Universal LiveProjectCard

**PR-2A — Universal Card Foundation**
- **Objective:** implement the complete six-row card structure (§6) and its content — Trust Indicators (§10), Project Status (§7), Score Row (§11), Metric Row + Category Rank (§9), Risk Row (§8) — in `compact` + `detailed`. Structural and functional completeness only; **no visual polish work.**
- **Scope:** row layout, data wiring, badge/score rendering. **Before implementing Project Status specifically:** validate the registry's real status/lifecycle enum (`LiveProject.status`/`discoveryStatus`) against §18's required Card States list, and confirm `LifecycleBadge`'s existing prop contract accepts them without modification — document the confirmed value-to-state mapping in this PR. This is the resolution of §18's own "confirm before implementation" footnote. Excludes accessibility refinement, loading skeletons, full Card State handling, visual-hierarchy/typography/spacing tuning, Cognitive Load Budget enforcement, and Design Review/Definition of Done sign-off — all deferred to PR-2B.
- **Files:** `components/projects/LiveProjectCard.tsx`, small co-located sub-components (Trust Indicators cluster), reusing `ScoreBadge.tsx`, `VerificationBadge.tsx` (incl. `LifecycleBadge`), `MetricItem.tsx`, `GlowBadge.tsx`.
- **Dependencies:** PR-1.
- **Risks:** Medium — a large structural change to the most-trafficked component, but scoped narrowly to "does the right content render in the right rows." The Trust Indicators consolidation (replacing today's separate Verification+Confidence rendering) remains the one genuinely regression-risky sub-change.
- **Verification:** `tsc`/lint/build; functional QA confirming each of the six rows renders the correct field set per §6, across all 9 rails, the directory grid, and Related Projects. Accessibility/polish verification is explicitly not required here.
- **Acceptance criteria:** the registry status/lifecycle enum has been validated against §18 and the mapping is documented; every §6 row renders its correct content in both variants; no row is empty when data exists; §12's field-to-variant mapping is correct. §27/§28 are **not** the acceptance bar for this PR.

**PR-2B — Universal Card Polish**
- **Objective:** bring PR-2A's structurally-complete card to full Standard compliance — Accessibility Standard (§21), loading skeletons and Card States (§18), responsive behavior (§15/§16), Interaction Rules (§17), Visual Hierarchy (§13), typography/spacing, Cognitive Load Budget (§14), and full §27/§28 sign-off.
- **Scope:** refinement only — no new fields, no new rows, no structural change to what PR-2A shipped.
- **Files:** `components/projects/LiveProjectCard.tsx` (same file, refinement diffs — focus rings, skeleton markup, spacing/typography classes, ARIA labels, reduced-motion handling, keyboard/touch/new-tab wiring).
- **Dependencies:** PR-2A.
- **Risks:** Low-Medium — a narrower diff than 2A (no structural change), but must be verified across every Card State and every breakpoint/theme combination, which is a broad testing surface even with smaller code changes.
- **Verification:** full live QA matrix (desktop/tablet/mobile × light/dark) confirming §13's two-Rank-1-elements rule, §14's budget ceilings, §21's accessibility items (focus rings, contrast, screen-reader labels, 44×44 touch targets, reduced motion), §17's interaction rules (whole-card click, keyboard nav, Cmd/Ctrl-click open-in-new-tab), and §18's states (Loading/Success/Partial/Unknown/Discovery at minimum; Offline/Error/Deprecated/Delisted simulated).
- **Acceptance criteria:** full §28 Definition of Done and §27 Design Review Checklist pass for both variants; every existing consumer page still renders correctly, no dead links.

**Exit Criteria:**
- [ ] PR-2A and PR-2B both merged
- [ ] §28 Definition of Done passes (skeleton-markup item: approved deviation, see `ENGINEERING_NOTES.md` EN-001 — existing `BrandLoader` fallback is the sanctioned loading treatment)
- [ ] §27 Design Review Checklist passes
- [ ] Full breakpoint × theme QA matrix clean
- [ ] No regression on any of the 9 rails, directory grid, or Related Projects
- [ ] Ready to begin Phase 3

---

## Phase 3 — Micro Variant

**PR-3 — LiveProjectCard: `micro` density variant**
- **Objective:** implement §5.B's third tier as an isolated addition, verified via a demo/test harness — no consumers wired yet.
- **Scope:** the `micro` code path plus supporting primitives (e.g. a condensed single-line badge treatment).
- **Files:** `components/projects/LiveProjectCard.tsx`; a temporary demo route or component test rendering `micro` against real project data.
- **Dependencies:** PR-2B — built once against the now-complete, polished signal set.
- **Risks:** Low — no existing consumer touches this path, so nothing can regress. Mitigate under-designing by testing against 3–4 differently-shaped real projects in the harness.
- **Verification:** demo harness checked against §14's `micro` caps (1 row, 1 badge, 1 color, 1 number) and §15's one-line mobile-safe layout.
- **Acceptance criteria:** `micro` is complete and correct in isolation; zero other files change.

**Exit Criteria:**
- [ ] PR-3 merged
- [ ] `micro` verified in isolation against 3–4 real project shapes
- [ ] §14 `micro` caps confirmed
- [ ] Ready to begin Phase 4

---

## Phase 4 — Consumer Migrations

**PR-4 — Migrate Watchlists (workspace, editor, page rows)**
- **Objective:** replace Watchlists' zero-richness plain-text rows with `LiveProjectCard micro`, including the data-source swap from raw registry `Project` to `LiveProject`, as one cohesive change.
- **Files:** `components/watchlists/WatchlistsWorkspace.tsx`, `components/watchlists/WatchlistEditor.tsx`.
- **Dependencies:** PR-3.
- **Risks:** Moderate — a real data-source swap on a live feature, bounded by replacing a zero-richness baseline.
- **Verification:** live QA exercising add/remove/search-to-add before and after; confirm every project the old lookup found, the new lookup also finds.
- **Acceptance criteria:** all watchlist CRUD behaves identically; every row now shows logo/name/score/primary metric.

**PR-5 — Migrate `AIProjectsWidget` (Dashboard)**
- **Objective:** retire the legacy `AIProject` shape for this widget, onto `LiveProject` + `micro`.
- **Files:** `components/dashboard/AIProjectsWidget.tsx`.
- **Dependencies:** PR-3.
- **Risks:** Low-moderate — the simplest of the three Dashboard widgets today.
- **Verification:** live QA confirming the "New" launch badge and Activity signal either still surface or are consciously superseded by `micro`.
- **Acceptance criteria:** `AIProject`/`lib/data/types.ts` imports removed from this file.

**PR-6 — Migrate `WatchlistWidget` (Dashboard)**
- **Objective:** retire `ProjectIntelligence[]` for this widget, onto `LiveProject` + `micro`.
- **Files:** `components/dashboard/WatchlistWidget.tsx`.
- **Dependencies:** PR-3.
- **Risks:** Moderate — a visible, previously-tuned Dashboard surface.
- **Verification:** live QA confirming the "View full watchlist" link and per-row navigation still work; before/after visual comparison.
- **Acceptance criteria:** widget shows the same watched projects at equal-or-greater density; `ProjectIntelligence[]` import removed.

**PR-7 — Migrate `ProjectSpotlight` (Dashboard)**
- **Objective:** retire the legacy `ProjectSpotlightData` shape, onto `LiveProject` + `LiveProjectCard detailed`.
- **Files:** `components/dashboard/ProjectSpotlight.tsx`, its call site in `app/dashboard/page.tsx`.
- **Dependencies:** PR-2B (needs the fully-polished `detailed` card, not `micro`).
- **Risks:** **Highest in this roadmap.** The most visually different bespoke widget being replaced, on the most-visible Dashboard surface. Carries its own before/after screenshot pair and separate, deliberate sign-off before merge.
- **Verification:** full live QA (desktop/tablet/mobile, light/dark); explicit before/after comparison; confirm Quick View behavior is preserved or consciously superseded.
- **Acceptance criteria:** `ProjectSpotlightData` import fully removed; explicit user approval obtained given the visual-change scope.

**PR-8 — Migrate Search (⌘K project results)**
- **Objective:** add a project-aware row to the command palette's project-result branch at `micro` density, without coupling the generic `CommandItem` to project-specific logic.
- **Scope:** **Step 0 (required before any row-rendering work):** verify whether `SearchableItem`/the ⌘K search index already carries the `LiveProject` fields `SearchProjectRow` needs (logo, verification, confidence, health/aiRating, primary metric) — confirm its build path in `lib/search/`. If it already resolves from `getLiveProjects()`/`LiveProject` data, proceed to Step 1 unchanged. If it does not, this PR's scope grows to include enriching the search index at build/resolve time so results carry the needed fields — resolved as part of this PR, not deferred or assumed. In no case may `SearchProjectRow` trigger a new per-keystroke or per-render fetch (§22 Performance Budget). If enriching the search index is required, that enrichment must occur during search-index construction or resolution — not during user interaction. Under no circumstances may typing into the command palette introduce additional network requests or per-keystroke data fetching, in accordance with §22 Performance Budget. **Step 1:** build `SearchProjectRow` and wire it into the project-result branch.
- **Files:** new `components/command/SearchProjectRow.tsx`; `components/command/CommandResults.tsx`/`CommandItem.tsx`; **conditionally, if Step 0 finds the index insufficient:** the search-index build/resolve path in `lib/search/`.
- **Dependencies:** PR-3.
- **Risks:** Moderate — a global surface; must not regress the other 6 non-project result types. Additional risk if Step 0 finds the index needs enrichment: broader surface than originally scoped.
- **Verification:** Step 0's index-sufficiency finding documented before any component code is written; live QA confirming zero new network requests fire while typing in the search box; search a known project (richer row renders, still navigates) and a non-project term (unaffected).
- **Acceptance criteria:** Step 0's findings are documented; only project-type results get the new row; every other result type is byte-for-byte unchanged; no new fetch is introduced by typing or selecting a project result.

**PR-9 (optional) — Migrate `FeaturedProjectTile` (landing page)**
- **Objective:** migrate the marketing homepage's marquee onto `LiveProjectCard`.
- **Dependencies:** PR-2B.
- **Risks:** Lowest priority per the Standard itself — recommend deferring indefinitely.
- **Acceptance criteria:** N/A unless picked up later.

**Exit Criteria:**
- [ ] PR-4, PR-5, PR-6, PR-7, PR-8 merged (PR-9 does not block)
- [ ] Each migration's own acceptance criteria met
- [ ] No regression in watchlists, search, or Dashboard functionality
- [ ] Ready to begin Phase 5

---

## Phase 5 — Universal Card QA

**PR-10 — Final consistency pass**
- **Objective:** a QA-only milestone — no new functionality — confirming every project surface uses exactly one implementation, with no leftover duplication or inconsistency.
- **Scope:** audit + targeted fixes only, across every consumer, migrated or not.
- **Files:** whichever specific files the audit finds inconsistent — none expected a priori.
- **Dependencies:** PR-1 through PR-8 (PR-9 optional; audit adapts to whether it landed).
- **Risks:** Low by design — this phase's charter forbids feature work; the only real risk is scope creep back into it.
- **Verification:** re-check §28/§27 against every consumer; confirm zero remaining call sites use legacy shapes for card rendering (except deferred PR-9); confirm loading/accessibility/interaction/typography/spacing/skeleton consistency across all three variants.
- **Acceptance criteria:** every checklist item passes on every live consumer. The dead `ProjectCard`/`ExplorerTable` chain stays explicitly out of scope, per §4 — a separate deletion decision.

**Exit Criteria:**
- [ ] PR-10 merged
- [ ] §28/§27 pass on every live consumer
- [ ] Zero remaining legacy/bespoke card rendering (except deferred PR-9)
- [ ] Roadmap complete

---

## Milestone Dependency Graph

```
PR-1 (Foundation)
  └── PR-2A (Universal Card: Foundation)
        └── PR-2B (Universal Card: Polish)
              ├── PR-3 (micro variant)
              │     ├── PR-4 (Watchlists)
              │     ├── PR-5 (AIProjectsWidget)
              │     ├── PR-6 (WatchlistWidget)
              │     └── PR-8 (Search)
              ├── PR-7 (ProjectSpotlight) ── needs detailed, not micro
              └── PR-9 (optional: FeaturedProjectTile)

PR-4, PR-5, PR-6, PR-7, PR-8 (and PR-9 if taken)
  └── PR-10 (Final QA pass)
```

## Recommended Implementation Order

PR-1 → PR-2A → PR-2B → PR-3 → PR-4 (Watchlists) → PR-5 (AIProjectsWidget) → PR-6 (WatchlistWidget) → PR-7 (ProjectSpotlight) → PR-8 (Search) → PR-9 (optional) → PR-10

## Safe Stopping Points

- **After PR-1:** zero visible change, fully safe.
- **After PR-2A:** the card is structurally complete but unpolished — functional, not yet meeting §27/§28. A valid pause, but not the recommended one given incomplete a11y/interaction work.
- **After PR-2B:** every existing consumer shows the full, polished Standard at `compact`/`detailed` — zero migration risk taken. **The strongest place to pause and reassess.**
- **After PR-3:** `micro` exists and is verified, still zero migration risk.
- **After any Phase-4 PR:** each is independently shippable; the product is always fully working, just with fewer surfaces migrated.
- **PR-10:** the natural final stop.

## Review Size / Regression Risk

| PR | Review size | Regression risk |
|---|---|---|
| PR-1 — Data Foundation | Small | Low |
| PR-2A — Universal Card Foundation | Medium-Large | Medium |
| PR-2B — Universal Card Polish | Medium | Low-Medium |
| PR-3 — `micro` variant | Small–Medium | Low |
| PR-4 — Watchlists | Medium | Medium |
| PR-5 — AIProjectsWidget | Small | Low-Medium |
| PR-6 — WatchlistWidget | Small–Medium | Medium |
| PR-7 — ProjectSpotlight | Medium–Large | **High** |
| PR-8 — Search | Medium | Medium |
| PR-9 — FeaturedProjectTile (optional) | Small | Low |
| PR-10 — Final QA pass | Medium (many files, small diffs each) | Low |

---

# Implementation Progress Tracker

| PR | Status | Owner | Branch | Review | Merge |
|----|--------|-------|--------|--------|-------|
| PR-1 | ✅ Complete | — | — | — | — |
| PR-2A | ✅ Complete | — | — | — | — |
| PR-2B | ✅ Complete | — | — | — | — |
| PR-3 | ✅ Complete | — | — | — | — |
| PR-4 | ✅ Complete | — | — | — | — |
| PR-5 | ✅ Complete | — | — | — | — |
| PR-6 | ✅ Complete | — | — | — | — |
| PR-7 | ✅ Complete | — | — | — | — |
| PR-8 | ✅ Complete | — | — | — | — |
| PR-9 | Deferred | — | — | — | — |
| PR-10 | ✅ Complete | — | — | — | — |

This table is a living execution tracker.

Updating progress does **not** constitute a modification to the frozen Roadmap.

---

# Engineering Documentation

Recommended project documentation structure:

```
docs/
├── planning/
│   ├── Universal_Project_Card_Product_Standard_v1.1.md
│   ├── Universal_Project_Card_Implementation_Roadmap_v1.1.md
│   ├── ENGINEERING_NOTES.md
│   ├── CHANGELOG.md
│   └── ADR/
```

---

# Engineering Notes Governance

Implementation discoveries must never silently modify either the
Product Standard or the Roadmap.

Instead, record them as:

- Engineering Notes
- ADRs (Architecture Decision Records)

Only a future Product Standard v2.x planning effort may introduce
behavioral or architectural changes.
