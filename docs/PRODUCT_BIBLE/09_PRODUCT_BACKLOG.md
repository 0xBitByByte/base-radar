# 09. Product Backlog

> **Status:** ✅ Complete
> **Part of:** [Base Radar Product Bible](00_INDEX.md)
> **Previous:** [← 08. Competitive Analysis](08_COMPETITIVE_ANALYSIS.md) · **Next:** [10. Release Plan →](10_RELEASE_PLAN.md)

---

## Purpose

The prioritized backlog of ideas that haven't yet been scheduled onto [`docs/ROADMAP.md`](../ROADMAP.md) — where new ideas are captured, how they're prioritized, and how they graduate onto a committed Release. Everything below is a candidate, not a commitment: an idea earns a place in [07. Engineering Roadmap](07_ENGINEERING_ROADMAP.md) only once it clears the **Graduation Criteria** at the bottom of this chapter.

## Backlog Structure & Prioritization Method

Every idea in this backlog is scored on the same five dimensions, so ideas from different areas can be compared on equal footing:

| Dimension | Scale | Meaning |
| --- | --- | --- |
| **Priority** | High / Medium / Low | How urgently this deserves consideration relative to everything else below. |
| **Impact** | High / Medium / Low | Expected effect on [01. Product Strategy](01_PRODUCT_STRATEGY.md#success-metrics)'s Success Metrics if delivered. |
| **Effort** | S / M / L / XL | Rough relative sizing — **S**: a few days of focused work; **M**: one to two weeks; **L**: three to six weeks; **XL**: Release-scale, spanning multiple areas. This is an independent estimate, not tied to [07. Engineering Roadmap](07_ENGINEERING_ROADMAP.md)'s structure, since that chapter is a strategic release sequence rather than a task-level breakdown. |
| **Status** | Idea / Now / Next / Later / Deferred / Blocked | Where the idea sits in the **Now / Next / Later Buckets** below. |
| **Suggested Release** | A named Release, "Post-Release N," or "Unscheduled" | Which of [07. Engineering Roadmap](07_ENGINEERING_ROADMAP.md)'s Releases this idea most plausibly attaches to, if any exist yet. |

Two further columns appear per item but aren't scored: **Dependencies** (what has to be true first) and **Suggested PR Breakdown** (a rough, non-binding estimate of how many PRs this would take — never a committed PR number; task-level breakdown happens once an idea is actually scheduled for implementation, not at the backlog stage). **Future Notes** carries any open question, risk, or tension worth flagging before the idea is scheduled.

## Now / Next / Later Buckets

`Idea` items are freshly captured and not yet reviewed. A reviewed idea moves to `Now` (a top candidate for the next unscheduled Release slot), `Next` (validated, queued behind the `Now` items), or `Later` (directionally right for Base Radar, but not soon). `Deferred` means an idea was considered and explicitly set aside, with a reason recorded in Future Notes rather than silently dropped. `Blocked` means the idea is sound but waits on a named dependency — most often one of [07](07_ENGINEERING_ROADMAP.md)'s Releases landing first.

## Backlog by Area

### Dashboard

| Idea | Priority | Impact | Effort | Dependencies | Suggested Release | Suggested PR Breakdown | Status | Future Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Customizable widget layout (reorder, show/hide per widget) | Medium | Medium | M | None | Unscheduled | 1 Feature, ~3–4 PRs | Next | Should reuse the same preference-persistence pattern Personalization already established. |
| Multi-dashboard views (e.g. a Trading view vs. a Builder view) | Low | Medium | L | Customizable widget layout above | Unscheduled | 1 Epic | Later | Risks diluting "one dashboard, one glance" — needs UX Strategy review before scheduling. |
| Dashboard snapshot export/share | Low | Low | S | None | Unscheduled | 1 PR | Idea | Low cost, low urgency; revisit once real user demand signals appear. |
| Per-widget refresh/pause controls | Medium | Low | S | None | Unscheduled | 1 PR | Next | Complements the existing live-polling widgets without changing their data source. |

### Search

| Idea | Priority | Impact | Effort | Dependencies | Suggested Release | Suggested PR Breakdown | Status | Future Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Saved searches | Medium | Medium | M | None | Unscheduled | 1 Feature, ~2–3 PRs | Next | Natural extension of the existing Recent Searches storage. |
| Search history insights (most-searched terms, personal recall) | Low | Low | S | Saved searches above | Unscheduled | 1 PR | Idea | Purely additive to data already collected locally. |
| Date-range filtering across Timeline/Notification results | Medium | Medium | M | None | Unscheduled | 1 Feature | Next | Should reuse Timeline's existing Today/Yesterday/Earlier grouping logic as its foundation. |
| Typo-tolerance / fuzzy matching improvements | Low | Medium | S | None | Unscheduled | 1 PR | Later | Needs a false-positive-rate check before shipping — noise is worse than a missed match. |

### Projects

| Idea | Priority | Impact | Effort | Dependencies | Suggested Release | Suggested PR Breakdown | Status | Future Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Side-by-side project comparison view | High | High | L | None | Unscheduled | 1 Epic, ~2 Features | Now | Directly serves the "Investors and analysts" user segment in [01. Product Strategy](01_PRODUCT_STRATEGY.md#target-users). |
| Community-submitted project suggestions (verification-gated intake) | Medium | High | L | None | Unscheduled | 1 Epic | Later | Must preserve "verification status is never for sale" — intake and verification have to stay separate steps. |
| Registry API access for third-party builders | Medium | High | XL | Release 1 (identity foundation, for access-key issuance) | Post-Release 1 | Multi-Epic | Blocked | Directly serves [01](01_PRODUCT_STRATEGY.md#future-expansion)'s "Third-party data access" expansion direction. |
| "Recently viewed" quick-access list | Low | Low | S | None | Unscheduled | 1 PR | Next | Distinct from Watchlists by design — no explicit save action required. |

### AI

| Idea | Priority | Impact | Effort | Dependencies | Suggested Release | Suggested PR Breakdown | Status | Future Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Natural-language Q&A over existing Intelligence output | Medium | High | XL | [05. Intelligence Framework](05_INTELLIGENCE_FRAMEWORK.md) honesty principles finalized | Unscheduled | Multi-Epic | Later | Must answer only from already-computed, real signals — never a freeform generative layer that could fabricate. |
| Per-user AI Insight tone/depth preference | Low | Low | S | None | Unscheduled | 1 PR | Idea | Small, safe personalization; no scoring/narrative logic changes. |
| Exposed narrative-classification thresholds for advanced users | Low | Medium | M | None | Unscheduled | 1 Feature | Deferred | Risks undermining the deterministic, unified narrative model most users rely on — hold pending demand evidence. |
| Dedicated AI/agent-ecosystem research tooling | Medium | Medium | L | None | Unscheduled | 1 Epic | Later | Maps to `docs/ROADMAP.md` Milestone 10 — this backlog item is its product-level seed. |

### Portfolio

| Idea | Priority | Impact | Effort | Dependencies | Suggested Release | Suggested PR Breakdown | Status | Future Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Real wallet-connect integration | High | High | XL | None | Unscheduled | Multi-Epic | Now | The most-requested gap between today's mock Portfolio widget and a real one; needs its own security review before scheduling. |
| Multi-wallet aggregation | Medium | Medium | L | Real wallet-connect integration above | Unscheduled | 1 Epic | Blocked | Depends entirely on the wallet-connect foundation landing first. |
| Historical portfolio performance charting | Medium | Medium | M | Real wallet-connect integration above | Unscheduled | 1 Feature | Blocked | Reuses the existing chart components already built for Token & Price. |
| Cross-chain portfolio view | Low | Medium | XL | Real wallet-connect integration above | Unscheduled | Multi-Epic | Deferred | Directly tensions with the "Base-native focus" competitive advantage in [01](01_PRODUCT_STRATEGY.md#product-positioning) — needs explicit strategy sign-off, not just an engineering go-ahead. |

### Governance

| Idea | Priority | Impact | Effort | Dependencies | Suggested Release | Suggested PR Breakdown | Status | Future Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Cross-project Governance dashboard (not just per-project) | Medium | Medium | M | None | Unscheduled | 1 Feature | Next | Aggregates data every source already provides — no new provider integration required. |
| Governance participation reminders | Low | Medium | S | Notification System (already shipped) | Unscheduled | 1 PR | Next | A natural fit for the existing Automation rule engine rather than a new subsystem. |
| Delegate / voting-power tracking | Low | Low | M | None | Unscheduled | 1 Feature | Later | Value depends on how many watched projects actually expose delegate data via Snapshot. |
| Proposal-outcome prediction | Low | Low | L | [05. Intelligence Framework](05_INTELLIGENCE_FRAMEWORK.md) confidence model | Unscheduled | 1 Epic | Deferred | High fabrication risk — outcome "prediction" must not imply certainty the data can't support; needs Intelligence Framework review before this is anything more than an idea. |

### Notifications

| Idea | Priority | Impact | Effort | Dependencies | Suggested Release | Suggested PR Breakdown | Status | Future Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Opt-in browser push notifications | Medium | Medium | M | None | Unscheduled | 1 Feature | Next | Must remain strictly opt-in — today's in-app-only design is a deliberate choice, not a gap. |
| Email digest option | Medium | Medium | L | Release 1 (identity, to have somewhere to send email) | Post-Release 1 | 1 Epic | Blocked | Needs an authenticated identity to attach an email address to. |
| Outbound webhook integrations (Slack/Discord) | Low | Medium | M | None | Unscheduled | 1 Feature | Later | Directly serves the "Builders and founders" segment who already run project Discords. |
| Configurable digest scheduling (real-time vs. daily rollup) | Low | Low | S | None | Unscheduled | 1 PR | Idea | Cheap to build; sequencing depends on which of the above ships first. |

### Watchlists

| Idea | Priority | Impact | Effort | Dependencies | Suggested Release | Suggested PR Breakdown | Status | Future Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Shared / collaborative watchlists (multi-user) | High | High | XL | Release 1 (identity and real sync) | Post-Release 1 | Multi-Epic | Blocked | Cannot exist honestly until data actually leaves the device — exactly what Release 1 (Platform Foundation) exists to enable. |
| Watchlist starter templates by narrative/category | Medium | Medium | S | None | Unscheduled | 1 PR | Now | Cheap, high-leverage onboarding improvement for the "Curious newcomers" segment. |
| Public read-only watchlist sharing links | Medium | Medium | M | Release 1 (identity, for link ownership) | Post-Release 1 | 1 Feature | Blocked | A lighter-weight step toward collaborative watchlists above, sequenced before it. |
| Per-watchlist alert threshold customization | Low | Medium | M | None | Unscheduled | 1 Feature | Later | Extends the existing per-project alert toggle rather than replacing it. |

### Performance

| Idea | Priority | Impact | Effort | Dependencies | Suggested Release | Suggested PR Breakdown | Status | Future Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Explorer-wide enrichment performance hardening | High | High | M | Release 3 (Project Intelligence) | Release 3 | Already scoped — see [07. Engineering Roadmap](07_ENGINEERING_ROADMAP.md)'s Release 3 (Project Intelligence) | Blocked | Not a new idea — tracked here only as a pointer; full detail lives in the Engineering Roadmap. |
| Core Web Vitals monitoring & budget enforcement | Medium | Medium | M | None | Unscheduled | 1 Feature | Now | Currently no automated regression signal for performance — closely related to the Infrastructure area's testing gap. |
| Provider response cache tiering improvements | Low | Medium | M | None | Unscheduled | 1 Feature | Later | Free-tier provider rate limits make this valuable but not urgent at current traffic. |
| Remaining blocking-fetch → streaming conversions | Medium | Medium | M | None | Unscheduled | 1 Feature | Next | Most of the Project Profile page already made this shift; a few widgets have not. |

### Accessibility

| Idea | Priority | Impact | Effort | Dependencies | Suggested Release | Suggested PR Breakdown | Status | Future Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Full WCAG 2.2 AA audit across the whole app | High | High | L | None | Unscheduled | 1 Epic | Now | Every feature has been spot-checked at ship time; no whole-app audit has happened yet. |
| Screen-reader narrative testing pass (manual) | Medium | High | M | None | Unscheduled | 1 Feature | Next | Automated checks catch structure, not experience — this closes that gap. |
| High-contrast theme variant | Low | Medium | M | None | Unscheduled | 1 Feature | Later | A third theme mode alongside today's light/dark, not a replacement for either. |
| Keyboard-shortcut discoverability (cheat-sheet / palette hint) | Low | Low | S | None | Unscheduled | 1 PR | Idea | Low effort, meaningfully helps power users who don't discover `⌘K` on their own. |

### Infrastructure

| Idea | Priority | Impact | Effort | Dependencies | Suggested Release | Suggested PR Breakdown | Status | Future Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Automated test suite | High | High | XL | None | Unscheduled | Multi-Epic | Now | A known, long-standing gap — validation to date has relied on `tsc`/lint/build plus manual browser QA rather than an automated test harness. |
| CI/CD pipeline formalization | High | Medium | L | Automated test suite above | Unscheduled | 1 Epic | Blocked | Has little value until there's an automated suite for it to run. |
| `MockConnector` wired into an automated pipeline | Medium | Medium | S | Automated test suite above | Unscheduled | 1 PR | Blocked | The Connector already exists specifically for this purpose; only the wiring into a real pipeline is missing. |
| Provider Layer rate-limit/backoff hardening | Medium | Medium | M | None | Unscheduled | 1 Feature | Next | Preemptive — no outage has occurred, but free-tier providers make this a when-not-if concern. |

### Developer Experience

| Idea | Priority | Impact | Effort | Dependencies | Suggested Release | Suggested PR Breakdown | Status | Future Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Contributor onboarding guide | Medium | Medium | S | None | Unscheduled | 1 PR | Now | Base Radar is open-source; this is currently one of the biggest gaps to outside contribution. |
| Design-system component catalog | Low | Medium | M | None | Unscheduled | 1 Feature | Later | Would formalize what `docs/DESIGN_SYSTEM.md` and Chapter 06 already describe in prose. |
| Local seed-data tooling for development | Low | Low | M | None | Unscheduled | 1 Feature | Idea | Would reduce reliance on live provider responses during local development. |
| Lightweight ADR process formalization | Low | Low | S | None | Unscheduled | 1 PR | Next | Builds on the existing `docs/DECISIONS/` directory rather than introducing a new practice. |

## Idea Intake Process

At Base Radar's current stage, intake is intentionally lightweight rather than a formal committee process: an idea is captured here as soon as it's identified — from user feedback, a competitive gap noticed in [08. Competitive Analysis](08_COMPETITIVE_ANALYSIS.md), or a limitation surfaced while shipping a Release — and starts life at `Idea` status. It only needs a name, an area, and a first-pass guess at Priority/Impact/Effort to be added; the full row above is filled in once someone reviews it. As the team and contributor base grow, this process is expected to formalize (e.g., a public issue template), but it should not gain process weight faster than the backlog itself grows.

## Graduation Criteria (Backlog → Roadmap)

An idea graduates from this backlog into a named Release in [07. Engineering Roadmap](07_ENGINEERING_ROADMAP.md) only once all of the following are true:

- It is at `Now` status, with every scoring dimension filled in (not left as an initial guess).
- Its Dependencies are either already satisfied or are themselves already-scheduled Release work.
- It answers [07](07_ENGINEERING_ROADMAP.md#roadmap-philosophy)'s three sequencing questions — what user problem it solves, why it's prioritized now, and what it unlocks next — clearly enough to attach to a named Release.
- It has been checked against [11. Architecture Guardrails](11_ARCHITECTURE_GUARDRAILS.md) and does not violate any non-negotiable rule.

An idea that fails this check is not discarded — it moves back to `Next` or `Later` with a note on what would need to change, rather than being silently dropped from the record.

## Related Documents

- [01. Product Strategy](01_PRODUCT_STRATEGY.md) — where backlog-worthy ideas originate ([Success Metrics](01_PRODUCT_STRATEGY.md#success-metrics), [Future Expansion](01_PRODUCT_STRATEGY.md#future-expansion))
- [`docs/ROADMAP.md`](../ROADMAP.md) — where a backlog item lands once scheduled
- [07. Engineering Roadmap](07_ENGINEERING_ROADMAP.md) — the strategic release sequence every graduated idea attaches to
- [08. Competitive Analysis](08_COMPETITIVE_ANALYSIS.md) — a common source of new backlog items
- [11. Architecture Guardrails](11_ARCHITECTURE_GUARDRAILS.md) — the non-negotiable rules every graduating idea is checked against

---

*This document is part of the [Base Radar Product Bible](00_INDEX.md).*
