# Base Radar — Engineering Execution Plan v1.0

> **Status:** ✅ Active — the primary execution document for engineering
> **Inputs:** [Product Bible v1.0](PRODUCT_BIBLE/00_INDEX.md) (frozen), [Repository Implementation Audit v1.1](REPOSITORY_AUDIT_V1.1.md) (frozen)
> **Scope:** How engineering executes what the Bible specifies and the Audit found — not a specification document itself.

---

This plan converts the Audit's findings into a sequenced, sprint-level delivery plan. It **does not restate** the Product Bible's product requirements or the Audit's findings — every claim below is a cross-reference to one of those two frozen documents. If a number, finding, or requirement below ever appears to disagree with the Bible or the Audit, the Bible and the Audit are authoritative and this document is wrong and should be corrected, never the reverse.

## Executive Summary

Base Radar's engineering organization inherits a codebase the Audit rates at a [64% Engineering Readiness Index](REPOSITORY_AUDIT_V1.1.md#engineering-readiness-index) and [68% Overall Product Bible Compliance](REPOSITORY_AUDIT_V1.1.md#final-report) — a mature, substantially-built product sitting on an engineering practice with one glaring gap. **Repository maturity** is genuinely high in the areas that matter most to users: the Intelligence Framework, Provider Layer, and core feature set (Dashboard, Explorer, Portfolio, Notifications, Alerts, Automation) are all real, working, and — per the Audit's Phase 5 — actively improving in discipline over time rather than accumulating debt. **Major risks**, per the Audit's [Repository Risk Register](REPOSITORY_AUDIT_V1.1.md#repository-risk-register), are concentrated in exactly three places: a live navigation defect, a live architectural ownership violation, and a complete absence of automated testing. **Major strengths** are provider abstraction, intelligence-framework discipline, and a clean, ownership-legible repository structure (all detailed in the Audit's [Strengths Summary](REPOSITORY_AUDIT_V1.1.md#strengths-summary)).

**Overall recommendation:** This plan sequences work to close the three Critical/High risks first — all of them are converge-and-clean-up work, not new architecture — before any new feature development or Release 1 work begins. This is not a new judgment; it is the same sequence the Audit itself already recommended, now broken into sprints, PRs, and quality gates engineering can actually execute against.

## Engineering Objectives

Version 1 of this execution plan exists to achieve five objectives, each traceable to a specific Bible principle and Audit finding:

1. **Increase trust** — close the navigation and ownership defects the Audit found live in production, in direct service of [01. Product Strategy](PRODUCT_BIBLE/01_PRODUCT_STRATEGY.md#success-metrics)'s Habitual Trust metric.
2. **Reduce technical debt** — resolve the Audit's [Phase 7 Technical Debt Audit](REPOSITORY_AUDIT_V1.1.md) findings in severity order (Critical before High before Medium), never let a new debt item form while an existing one is unresolved.
3. **Improve engineering quality** — stand up the automated testing foundation the Audit found completely absent, converting Testing from 0% toward a real, growing baseline.
4. **Protect architecture** — resolve the confirmed Ownership Principle violation (dual watchlist system) without a rewrite, per [11. Architecture Guardrails](PRODUCT_BIBLE/11_ARCHITECTURE_GUARDRAILS.md#architectural-integrity)'s Architectural Integrity principle: leave the system healthier, not merely different.
5. **Enable Release 1** — clear every blocker the Audit identified so that [07. Engineering Roadmap](PRODUCT_BIBLE/07_ENGINEERING_ROADMAP.md#releases)'s Release 1 (Platform Foundation) can begin on a codebase that can actually support it safely.

## Guiding Principles

These govern *how* every sprint and PR below is executed — they do not replace [07](PRODUCT_BIBLE/07_ENGINEERING_ROADMAP.md#roadmap-principles)'s Roadmap Principles or [10](PRODUCT_BIBLE/10_RELEASE_PLAN.md#release-principles)'s Release Principles, they are this plan's execution-level restatement of them:

- **Incremental delivery.** Every sprint below ships something real and mergeable; nothing is scheduled as an all-or-nothing rewrite.
- **No rewrites.** Per the Audit's own rules, working code (the Intelligence Framework, the Explorer, the Provider Layer) is never touched for stylistic reasons alone — see [11](PRODUCT_BIBLE/11_ARCHITECTURE_GUARDRAILS.md#architectural-integrity)'s Architectural Integrity principle, Example 1 (rejecting unjustified abstraction) and Example 4 (simplifying without changing user-visible behavior).
- **One source of truth.** The dual watchlist system is the clearest current violation of this in the repository; no sprint in this plan is permitted to introduce a second implementation of anything that already has one owner, per [11](PRODUCT_BIBLE/11_ARCHITECTURE_GUARDRAILS.md#ownership-principles)'s Ownership Principles.
- **Ship measurable value.** Every milestone below has explicit Exit Criteria (see below) — nothing is considered done because development stopped, per [10](PRODUCT_BIBLE/10_RELEASE_PLAN.md#release-integrity)'s Release Integrity.
- **Protect architecture.** Every sprint is checked against the Quality Gates below before merge; none are permitted to bypass [11](PRODUCT_BIBLE/11_ARCHITECTURE_GUARDRAILS.md#dependency-rules)'s Dependency Rules or Ownership Principles for convenience.
- **Tests before expansion.** Milestone B (Testing Foundation) is sequenced before Release 1 specifically so that Release 1's real identity and sync work — the platform's highest-stakes change to date — lands on a codebase that can verify itself.
- **Quality before velocity.** No milestone below is scheduled around a date; each is scheduled around its dependencies and its Exit Criteria being genuinely satisfiable, per [10](PRODUCT_BIBLE/10_RELEASE_PLAN.md#release-principles)'s "Quality Before Speed" principle.

## Milestone Roadmap

This roadmap has two parts: **Milestones A–C**, converting the Audit's own [Phase 9 Implementation Roadmap](REPOSITORY_AUDIT_V1.1.md) into execution, and **Milestones D onward**, mapping one-to-one onto [07. Engineering Roadmap](PRODUCT_BIBLE/07_ENGINEERING_ROADMAP.md#releases)'s nine already-sequenced Releases. No release is renamed, reordered, or redefined here — this section only assigns each one an execution-plan letter and states its dependency on the milestone before it.

| Milestone | Name | Source | Depends on |
| --- | --- | --- | --- |
| **A** | Navigation & Ownership Integrity | Audit Phase 9 | None |
| **B** | Testing Foundation | Audit Phase 9 | None (parallelizable with A) |
| **C** | Loading & Error Coverage | Audit Phase 9 | None (parallelizable with A/B) |
| **D** | Release 1 — Platform Foundation | [07, Release 1](PRODUCT_BIBLE/07_ENGINEERING_ROADMAP.md#releases) | A, B, C complete |
| **E** | Release 2 — Discovery & Search | [07, Release 2](PRODUCT_BIBLE/07_ENGINEERING_ROADMAP.md#releases) | D |
| **F** | Release 3 — Project Intelligence | [07, Release 3](PRODUCT_BIBLE/07_ENGINEERING_ROADMAP.md#releases) | None beyond D (07's own Dependency Model notes this release doesn't depend on Release 1's identity work, only on D having cleared the codebase's testing/ownership blockers) |
| **G** | Release 4 — Portfolio Intelligence | [07, Release 4](PRODUCT_BIBLE/07_ENGINEERING_ROADMAP.md#releases) | D |
| **H** | Release 5 — Narrative Intelligence | [07, Release 5](PRODUCT_BIBLE/07_ENGINEERING_ROADMAP.md#releases) | F |
| **I** | Release 6 — Governance Intelligence | [07, Release 6](PRODUCT_BIBLE/07_ENGINEERING_ROADMAP.md#releases) | D |
| **J** | Release 7 — Alerts & Personalization | [07, Release 7](PRODUCT_BIBLE/07_ENGINEERING_ROADMAP.md#releases) | D |
| **K** | Release 8 — Premium Experience | [07, Release 8](PRODUCT_BIBLE/07_ENGINEERING_ROADMAP.md#releases) | D |
| **L** | Release 9 — Developer Platform & Ecosystem | [07, Release 9](PRODUCT_BIBLE/07_ENGINEERING_ROADMAP.md#releases) | D |

Each Release's Vision, Major Capabilities, Success Criteria, Risks, and Exit Criteria are fully specified in [07. Engineering Roadmap](PRODUCT_BIBLE/07_ENGINEERING_ROADMAP.md#releases) and are not repeated here.

## Sprint Breakdown

Detailed, PR-ready sprint breakdowns are provided below for **Milestones A, B, C, and D** — the near-term, already well-evidenced work. Per [07](PRODUCT_BIBLE/07_ENGINEERING_ROADMAP.md#quality-rules)'s own Quality Rules, Releases 2 through 9 are deliberately specified at the strategic level only, with no sprint or PR-level breakdown — this plan respects that boundary and will produce Milestone E onward's sprint breakdown at the start of each Release's execution, once the Release immediately before it has shipped and validated its own approach.

### Milestone A — Navigation & Ownership Integrity

**Sprint A.1 — Dead Link Removal**
- **Objective:** Eliminate the six dead sidebar navigation links found in the Audit's Phase 1.
- **Deliverables:** `constants/dashboard.ts` updated to remove (or correctly point) the `wallet`, `categories`, `narratives`, `launches`, `ai-research`, and `signals` nav entries.
- **Dependencies:** None.
- **Acceptance Criteria:** Every remaining nav item resolves to a real route, verified by the same route-existence check the Audit used.
- **Definition of Done:** Merged, and a manual click-through of the full sidebar produces zero 404s.
- **Estimated PR count:** 1.

**Sprint A.2 — Watchlist Consolidation**
- **Objective:** Resolve the confirmed Ownership Principle violation between `/dashboard/watchlist` and `/dashboard/watchlists`.
- **Deliverables:** A single nav entry and single live route for Watchlists (the `components/watchlists` system, per the Audit's recommendation); the legacy route redirected or removed; any unique behavior in `WatchButton`/`WatchlistPageClient` preserved by folding it into the surviving system.
- **Dependencies:** None.
- **Acceptance Criteria:** Exactly one watchlist implementation remains, referenced by exactly one nav entry.
- **Definition of Done:** Merged, old route either 301-redirects or is removed, no dead links introduced by the removal.
- **Estimated PR count:** 1.

### Milestone B — Testing Foundation

**Sprint B.1 — Test Runner Installation**
- **Objective:** Install and configure a test runner; add a `test` script.
- **Deliverables:** Test runner dependency added; `package.json` `test` script; a trivial passing smoke test to prove the pipeline works end to end.
- **Dependencies:** None.
- **Acceptance Criteria:** `npm run test` (or equivalent) executes successfully locally and in CI.
- **Definition of Done:** Merged; CI runs the test script on every PR from this point forward.
- **Estimated PR count:** 1.

**Sprint B.2 — Intelligence Engine Coverage**
- **Objective:** Cover `lib/intelligence/scoring.ts` and `confidence.ts`, per the Audit's own identification of these as the platform's highest-trust-sensitive, currently-untested logic.
- **Deliverables:** Test suites for scoring and confidence computation.
- **Dependencies:** B.1.
- **Acceptance Criteria:** Both modules have real, passing coverage of their core logic paths.
- **Definition of Done:** Merged, coverage report shows non-trivial coverage of both files.
- **Estimated PR count:** 1–2.

**Sprint B.3 — Sync / Account Migration Coverage**
- **Objective:** Cover the Sync and Account migration runners — [07](PRODUCT_BIBLE/07_ENGINEERING_ROADMAP.md)'s own honestly-flagged highest-risk untested surface, per the original (pre-rewrite) Technical Debt Register and reaffirmed by the Audit's Phase 2.
- **Deliverables:** Test suites exercising a simulated schema version bump through both migration runners.
- **Dependencies:** B.1.
- **Acceptance Criteria:** A simulated migration runs and is verified correct by an automated test, not manual QA alone.
- **Definition of Done:** Merged; this is the first genuine migration test this codebase has ever had.
- **Estimated PR count:** 1–2.

### Milestone C — Loading & Error Coverage

**Sprint C.1 — Boundary Audit & Fill**
- **Objective:** Bring every route under `app/dashboard/` up to [02. UX Strategy](PRODUCT_BIBLE/02_UX_STRATEGY.md)'s Loading States / Error States standard.
- **Deliverables:** `loading.tsx`/`error.tsx` added to every route currently missing one, or a documented reason recorded in the PR description for any route that deliberately doesn't need one.
- **Dependencies:** None.
- **Acceptance Criteria:** Every route has an explicit loading and error boundary, or a documented exemption.
- **Definition of Done:** Merged; the Audit's Phase 1 finding ("only 5 boundary files across ~13 routes") is fully resolved.
- **Estimated PR count:** 1–2.

### Milestone D — Release 1: Platform Foundation

Sprints below map directly onto [07's Release 1 entry](PRODUCT_BIBLE/07_ENGINEERING_ROADMAP.md#releases) — its Major Capabilities are the source of truth for scope; this breakdown only sequences them into shippable increments.

**Sprint D.1 — Session & Identity Model**
- **Objective:** Real authentication and session lifecycle (Authenticated, Guest, Signed Out, Loading, Expired), per Release 1's Major Capabilities.
- **Dependencies:** Milestones A–C complete.
- **Acceptance Criteria / Definition of Done:** Matches Release 1's own Success Criteria and Exit Criteria in [07](PRODUCT_BIBLE/07_ENGINEERING_ROADMAP.md#releases).
- **Estimated PR count:** 3–5 (session states, Auth Service contract, restore/expiry — sized consistently with how this same scope was previously broken down before Chapter 07's rewrite to a strategic-only format).

**Sprint D.2 — First Real Backend Implementation**
- **Objective:** A concrete Backend satisfying the existing Account, Sync, Storage, and Health contracts.
- **Dependencies:** D.1.
- **Acceptance Criteria / Definition of Done:** Per [07](PRODUCT_BIBLE/07_ENGINEERING_ROADMAP.md#releases)'s Release 1 Exit Criteria.
- **Estimated PR count:** 2–3.

**Sprint D.3 — Cross-Device Sync**
- **Objective:** Genuine cross-device synchronization of Watchlists, Preferences, and Account data.
- **Dependencies:** D.1, D.2.
- **Acceptance Criteria / Definition of Done:** A signed-in user's Watchlists and preferences are identical on a second device without manual re-creation, per Release 1's own Success Criteria.
- **Estimated PR count:** 2–3.

**Sprint D.4 — Authentication UI & Conflict Resolution**
- **Objective:** User-facing sign-in/sign-out surfaces and automatic/manual conflict resolution.
- **Dependencies:** D.1–D.3.
- **Acceptance Criteria / Definition of Done:** Guest Mode behavior verified unchanged; full keyboard-only sign-in/sign-out pass has no regressions, per Release 1's Exit Criteria.
- **Estimated PR count:** 2–3.

## Pull Request Strategy

Every PR produced under this plan follows the same standard, regardless of which milestone it belongs to:

- **One purpose.** A PR does one of: fix a defect, add a test, add one capability increment. It never bundles unrelated changes, per [10](PRODUCT_BIBLE/10_RELEASE_PLAN.md#release-integrity)'s Release Principle 10 (Avoid Feature Dumping) applied at PR scope.
- **Independently reviewable.** A reviewer can evaluate the PR's stated purpose without needing to read a later, not-yet-merged PR first.
- **Tests included when applicable.** Any PR touching Intelligence scoring/confidence logic or Sync/Account migration logic (post-Milestone B) includes test coverage as part of the same PR, not a follow-up.
- **Documentation updated when required.** A PR that changes what a Product Bible chapter describes updates that chapter in the same PR or explicitly flags the follow-up, per the Documentation Steward practice already established for the Bible itself.
- **Remains mergeable.** No PR leaves the app in a half-finished state — this is the same standard [07](PRODUCT_BIBLE/07_ENGINEERING_ROADMAP.md)'s own (pre-rewrite) PR discipline held, restated here as this plan's PR bar.

## Quality Gates

Before every merge, the following are verified — this list operationalizes [11](PRODUCT_BIBLE/11_ARCHITECTURE_GUARDRAILS.md#architectural-review-checklist)'s Architectural Review Checklist and [07](PRODUCT_BIBLE/07_ENGINEERING_ROADMAP.md#release-acceptance-checklist)'s Release Acceptance Checklist at PR scope rather than restating either:

- **Architecture** — no new Dependency Rule or Ownership Principle violation is introduced ([11](PRODUCT_BIBLE/11_ARCHITECTURE_GUARDRAILS.md#dependency-rules)).
- **UX** — no new dead link, broken workflow, or increased cognitive load ([02. UX Strategy](PRODUCT_BIBLE/02_UX_STRATEGY.md#core-ux-principles)).
- **Design** — no new one-off UI pattern; Design Debt Prevention satisfied ([06. Design System](PRODUCT_BIBLE/06_DESIGN_SYSTEM.md#design-principles)).
- **Testing** — the PR's own scope is covered, per the Pull Request Strategy above.
- **Documentation** — affected Bible chapters and this plan remain accurate.
- **Performance** — no known regression is introduced without being explicitly called out and justified in the PR description.
- **Accessibility** — no new keyboard trap, missing focus state, or inaccessible interaction is introduced.
- **Release Integrity** — the change leaves the product in a better state, not merely a different one ([10](PRODUCT_BIBLE/10_RELEASE_PLAN.md#release-integrity)).
- **Architectural Integrity** — the change leaves the architecture easier to understand, extend, maintain, and trust ([11](PRODUCT_BIBLE/11_ARCHITECTURE_GUARDRAILS.md#architectural-integrity)).

## Risk Mitigation Plan

Every risk below is carried directly from the Audit's [Repository Risk Register](REPOSITORY_AUDIT_V1.1.md#repository-risk-register) — none are new.

| Audit Risk | Severity | Engineering Action |
| --- | --- | --- |
| Dead navigation | Critical | Sprint A.1 |
| Dual watchlists | High | Sprint A.2 |
| Missing automated testing | Critical | Sprints B.1–B.3 |
| Limited error boundaries | Medium | Sprint C.1 |
| Dependency rule enforcement | Medium | Tracked as a candidate for a future sprint (import-boundary lint rule); not yet scheduled into A–D, since it is additive tooling rather than a defect fix and does not block Release 1 |
| Performance verification | Unclassified (pending) | A profiling pass is recommended before Milestone D's Sprint D.3 (Cross-Device Sync) begins, given sync introduces new real-time behavior to measure |
| Accessibility verification | Unclassified (pending, already `Now` in [09](PRODUCT_BIBLE/09_PRODUCT_BACKLOG.md)) | Tracked as parallel, backlog-owned work; not sequenced into A–D since it is independent of the navigation/testing/Release 1 critical path |

## Success Metrics

- **Navigation defects:** zero dead links (target: 0, current per Audit: 6).
- **Test coverage:** non-zero and growing after Milestone B; Intelligence scoring/confidence and Sync/Account migration modules covered first.
- **Architecture violations:** zero confirmed Ownership Principle violations (target: 0, current per Audit: 1 — the dual watchlist system).
- **Performance:** no regression introduced by any PR without explicit sign-off, per the Quality Gates above.
- **Release readiness:** progression from the Audit's "Not Ready" assessment for Alpha/Closed Beta/Public Beta/Production toward "Ready," tracked milestone by milestone against the Audit's [Release Readiness Assessment](REPOSITORY_AUDIT_V1.1.md#release-readiness-assessment).
- **Developer velocity:** not compromised by this plan — Milestones A–C are deliberately small and parallelizable so they do not stall other work, per the Guiding Principles' "incremental delivery."

## Exit Criteria

**Milestone A** — Zero sidebar navigation items resolve to a nonexistent route; exactly one watchlist implementation remains, referenced by exactly one navigation entry. *(Carried directly from the Audit's [Success Criteria](REPOSITORY_AUDIT_V1.1.md#success-criteria).)*

**Milestone B** — A `test` script exists and runs in CI; the Intelligence scoring/confidence modules and the Sync/Account migration runners have real, passing test coverage. *(Carried directly from the Audit.)*

**Milestone C** — Every route under `app/dashboard/` has an explicit `loading.tsx` and `error.tsx`, or a documented, deliberate reason it doesn't need one. *(Carried directly from the Audit.)*

**Release 1** — Authentication functional across all five session states; a real Backend implementation satisfies all four Backend Service contracts; cross-device sync operational (a signed-in user's Watchlists and preferences are identical on a second device); Guest Mode behavior verified unchanged. *(Carried directly from the Audit and [07](PRODUCT_BIBLE/07_ENGINEERING_ROADMAP.md#releases)'s Release 1 entry.)*

**Release 2** — Per [07](PRODUCT_BIBLE/07_ENGINEERING_ROADMAP.md#releases)'s own Release 2 Success Criteria and Exit Criteria (Discovery & Search): saved and recent searches live and persisting across devices via Release 1's sync foundation, with ranking changes validated against exact-match regressions.

**Release 3** — Per [07](PRODUCT_BIBLE/07_ENGINEERING_ROADMAP.md#releases)'s own Release 3 Exit Criteria (Project Intelligence): Registry-wide enrichment live and performant across the full Explorer listing, with freshness and confidence labeling visible on every entry.

## Governance

This plan is governed by the following hierarchy, highest authority first:

1. **[Product Bible v1.0](PRODUCT_BIBLE/00_INDEX.md)** — the frozen product specification. No engineering decision in this plan may contradict it; if a conflict is ever found, the Bible wins and this plan is corrected.
2. **[Repository Audit v1.1](REPOSITORY_AUDIT_V1.1.md)** — the frozen record of current repository state. This plan's milestones and risk mitigations trace to it; if the Audit is ever refreshed (see Future Maintenance below), this plan is updated to match, not the reverse.
3. **This Execution Plan** — the only document in this hierarchy that changes on a sprint cadence. It sequences and operationalizes the two documents above; it never introduces a requirement neither of them contains.
4. **A Decision Log** (to be established alongside Sprint A.1, living at `docs/DECISIONS/`, which the repository already has a directory for) — records any execution-level decision made in the course of delivering this plan (e.g., which watchlist system to keep, exact test runner chosen) that isn't already dictated by the Bible or Audit. The Decision Log never overrides the Bible or Audit; it records choices made *within* the room they leave open.
5. **[`docs/ROADMAP.md`](ROADMAP.md)** — the implementation-level milestone tracker this plan's sprints ultimately populate, exactly as [07](PRODUCT_BIBLE/07_ENGINEERING_ROADMAP.md#related-documents) already describes that document's relationship to the Bible.
6. **[11. Architecture Guardrails](PRODUCT_BIBLE/11_ARCHITECTURE_GUARDRAILS.md)** — the non-negotiable invariants every sprint's Quality Gate is checked against; this plan can be flexible about sequencing, never about a Guardrail.

## Future Maintenance

This plan is a living execution document, distinct from the Bible and the Audit, both of which are frozen:

- **Sprint updates** — each sprint's status (not started / in progress / done) is updated as work lands; this is the one part of the document expected to change continuously.
- **Monthly reviews** — once a month, this plan's Milestone Roadmap and Risk Mitigation Plan are checked against actual progress; if a milestone has stalled, the review records why, rather than silently letting the plan drift out of sync with reality.
- **Retrospectives** — at the close of each Milestone (A, B, C, D, and each subsequent Release), a short retrospective records what the Sprint Breakdown got right or wrong about that milestone's actual scope, feeding into how the *next* milestone's sprint breakdown is written — particularly relevant for Milestone E onward, whose sprint-level detail is deliberately not yet written.
- **Audit refreshes** — the Repository Audit is expected to be re-run periodically (at minimum, after Milestone D / Release 1 ships, since that is the largest single change to the codebase this plan sequences). A refreshed audit produces a new version (v1.2, v2.0, etc.); this plan is updated to reference the new version and re-sequenced only if the refreshed audit's findings actually require it — not on a fixed schedule independent of real findings.
- **Versioning** — this plan is versioned independently of the Bible and Audit (currently v1.0). A new version is issued when the Milestone Roadmap itself changes (a milestone added, removed, or resequenced) — routine sprint-status updates do not require a version bump.

---

*This document is the primary engineering execution reference for Base Radar. It references, and does not duplicate, the [Product Bible v1.0](PRODUCT_BIBLE/00_INDEX.md) and the [Repository Implementation Audit v1.1](REPOSITORY_AUDIT_V1.1.md).*
