# Engineering Notes

Implementation-time discoveries and decisions for the Universal Project Card
effort. Per the Roadmap's Engineering Notes Governance section, these never
silently modify the Product Standard or the Roadmap — both stay frozen;
deviations and clarifications are recorded here instead.

---

## EN-001 — PR-2B: Loading skeleton vs. §28 Definition of Done

**Status:** Resolved — approved deviation.

**Context:** Product Standard §28 (Definition of Done) requires "Skeleton
loading state matches final layout dimensions exactly — no layout shift."
The Roadmap's own PR-2B scope description also lists "skeleton markup" as
an expected file-scope item.

**Problem:** No such skeleton exists, or has ever existed, for
`LiveProjectCard`. `app/dashboard/projects/loading.tsx` renders a fullscreen
`BrandLoader` spinner instead. That file's own doc comment states this is
deliberate: "Replaces the previous content-shaped `ProjectsPageSkeleton`
with the branded page loader shared by every dashboard route" (PR-065) — a
decision made before the Universal Project Card Standard existed.

**Options presented:**
- A — Accept the existing `BrandLoader` fallback as the sanctioned loading
  treatment; document the deviation here.
- B — Build a minimal content-shaped `LiveProjectCard` skeleton within
  PR-2B's scope.
- C — Defer a real skeleton to a dedicated follow-up outside the frozen PR
  sequence.

**Decision:** Option A. The existing fullscreen `BrandLoader` in
`app/dashboard/projects/loading.tsx` is the sanctioned loading treatment
for this route. §28's skeleton item is satisfied by this existing,
pre-dating architecture rather than by new per-card skeleton markup.

**Consequences:**
- No code change required for this item.
- §28's "skeleton matches final layout" checklist item is marked
  **Deviation — approved** for PR-2B, not fail, not literal pass.
- If a future page ever needs true incremental/streaming card rendering
  (where a content-shaped skeleton would prevent layout shift in a way the
  current fullscreen loader cannot), that is a new, separate proposal —
  subject to its own Evolution Rules (§24) check — not a reopening of this
  decision.

**Decided:** 2026-08-20.

---

## EN-002 — PR-10: `BaseTodayPanel`/`SpotlightCard` is not a Universal Project Card consumer

**Status:** Resolved — Intentional Exception.

**Context:** PR-10's audit swept every live `ProjectLogo` consumer in the codebase to confirm no bespoke project-rendering surface exists outside `LiveProjectCard`.

**Finding:** `components/projects/BaseTodayPanel.tsx`'s `SpotlightCard` (lines 44-69), live on `/dashboard/projects`'s "Base Today" hero section, hand-rolls a project tile (logo + an "eyebrow" label such as "HIGHEST TVL" + name + one metric) rather than rendering `LiveProjectCard`. It predates the Universal Project Card initiative and was not in the original §4 audit's location table.

**Decision:** Accepted as an intentional exception. `SpotlightCard` is a contextual hero-spotlight component — a labeled "highest X" leaderboard callout — serving a different purpose than the Universal Card's "browse/triage a project" role, and its "eyebrow" label has no equivalent in any canonical variant's frozen anatomy. No migration will be performed.

**Consequences:**
- `BaseTodayPanel`/`SpotlightCard` is explicitly out of scope for all future Universal Project Card consistency checks.
- If `SpotlightCard`'s needs ever grow closer to a general project-browsing card, that's a new proposal subject to its own §24 Evolution Rules check — not a reopening of this decision.

**Decided:** 2026-08-24 (Product Owner decision, PR-10 audit).

---

## EN-003 — PR-10: Category Rank (§9) has zero live callers

**Status:** Resolved — Future Enhancement, not implemented now.

**Context:** PR-10's audit checked every `LiveProjectCard` consumer for `categoryPeers` usage (the prop that powers §9 Category Rank).

**Finding:** A full-codebase grep found `categoryPeers` is never passed to `LiveProjectCard` by any live consumer — the only matches are the prop's own definition/consumption inside `LiveProjectCard.tsx`, and unrelated same-named local variables inside the Project Profile page's own, separate ranking computation. `getCategoryRank` (PR-1) is fully implemented and unit-tested but has never rendered for a real user on any live page — deferred at PR-1 itself ("wiring real callers is out of this PR's file scope") and never picked up since.

**Decision:** Accepted as future work, not implemented in PR-10. Wiring `categoryPeers` into a real consumer (e.g. `ProjectsDirectory.tsx`, which already has the complete filtered category list in memory) would introduce new, previously-never-shipped visible functionality — outside PR-10's own QA-only, no-feature-work charter, even though the underlying implementation already exists.

**Consequences:**
- Category Rank remains fully built but dormant. No card currently shows "#N of M in {Category}" anywhere in the live app.
- A future PR to wire `categoryPeers` into one or more consumers (most naturally `ProjectsDirectory.tsx`, zero new fetch required — the data is already loaded) is pre-approved in spirit by this note but still requires its own planning cycle before implementation.

**Decided:** 2026-08-24 (Product Owner decision, PR-10 audit).
