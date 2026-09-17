# Information Hierarchy — Product Standard

**Status:** 🔒 Frozen v1.0 — UX foundation for PR-085 onward.

This document answers one question, for every screen in Base Radar:

> **What information should users see first, second, and third?**

It governs *order and density*, not visual style —
[DESIGN_SYSTEM.md](DESIGN_SYSTEM.md) already documents the actual tokens,
typography, spacing, and components in use; this Standard never repeats
that, it says where and in what sequence those existing pieces belong. It
is also independent of, and complementary to, the two Trust/Quality
standards already frozen: [TRUSTED_PROJECT_FRAMEWORK.md](TRUSTED_PROJECT_FRAMEWORK.md)
("should this be listed") and [GOOD_PROJECT_EVALUATION_FRAMEWORK.md](GOOD_PROJECT_EVALUATION_FRAMEWORK.md)
("how good is it") — this document answers a third, different question:
**in what order should whatever those two frameworks produce actually be shown?**

A fourth, sibling Standard,
[NAVIGATION_CLICKABILITY_STANDARD.md](NAVIGATION_CLICKABILITY_STANDARD.md),
answers a related but distinct question — once an entity is shown, in its
right order, what happens when a user tries to interact with it.

---

## Executive Summary

Base Radar already has real, working information-hierarchy discipline in
one place: the Universal Project Card component itself (§13 Visual
Hierarchy Rules, §14 Cognitive Load Budget — see `docs/planning/`), which
already enforces a Rank-1/2/3 sizing discipline and hard numeric ceilings
per density tier. The Alerts page independently arrived at the same
"executive content first" instinct — its `ExecutiveSummary` renders
immediately, before any filter or list.

That discipline is not consistent page-to-page. The clearest, most
concrete finding from this audit: **the Project Profile page's own zone
order contradicts the Universal Project Card Standard's own frozen
question order.** §1 of that Standard ranks "Is it real" (Trust) as
question 2 of 5, ahead of "How big is it" (the primary metric). The
Profile page's real, current zone order is `Intelligence → Overview →
Market → Trust → Governance → Activity → Sources → Related` — Trust
doesn't appear until the fourth zone, and the Intelligence zone itself
stacks four separately-named components (`ProfileSummary`,
`ProfileExecutiveIntelligence`, `ProfileWhyItMatters`, `ProfileIntelligence`)
that each independently restate a version of "what does the AI think of
this project" before a first-time visitor reaches the page's own raw
price/token data.

This Standard defines a single Executive Information Order that applies
everywhere, a measurable Five-Second Rule, explicit Progressive Disclosure
tiers, per-surface density guidance, and a Cross-Page Consistency audit —
grounded in the real page structures read this session and in researched
principles from Bloomberg Terminal, Stripe, Linear, Vercel, and the
published cognitive-science basis for the "five-second rule" itself.

---

## Current UX Audit

*(Full per-page findings — Information Overload, Missing Information,
Duplicate Information, Weak Prioritization — are in this Standard's
accompanying chat response, per this initiative's established
"findings-only, no file duplication" convention. Summarized here for
permanent reference.)*

| Page | Real structure (read from source) | Primary finding |
| --- | --- | --- |
| Dashboard | 15 widgets across 3 tiers: "Your Intelligence" (personalized) → "Market Signals" (ecosystem-wide) → "Ecosystem Overview" (supplementary) | Tier ordering is a genuinely good, already-correct executive-first precedent. |
| Project Profile | 8 zones: Intelligence (7 stacked components) → Overview → Market → Trust → Governance → Activity → Sources → Related | Trust ranks 4th of 8, contradicting this project's own frozen §1 question order; 4 components in the Intelligence zone independently restate overlapping AI-verdict content. |
| Alerts | Header → **Executive Summary** (immediate) → Filters → List | A correct, existing precedent for "executive content first" — worth generalizing, not correcting. |
| Watchlists, Search (⌘K), Projects Directory | Single-purpose, already narrow in scope | No material hierarchy issue found. |

---

## Industry Research Findings

- **Bloomberg Terminal** — deliberately maximizes information density for
  an expert, keyboard-driven professional audience; its own documented
  tradeoff (a dense screen makes "clarifying the information hierarchy
  challenging," in the platform's own acknowledged words) is cited here as
  a caution, not a model — Base Radar's audience is not a career trader
  with a decade of muscle memory, so this Standard does not adopt
  Bloomberg-level density anywhere.
- **Stripe, Linear, Vercel** — the strongest, most directly adoptable
  precedent found. Stripe's own top-level dashboard shows exactly the
  three numbers "a CFO cares about"; Linear's default view is a clean list
  with analytics one click away under a separate "Insights" area; Vercel
  shows a deployment summary up top with logs and build detail one click
  deep. All three share one discipline: **the default view answers one
  question completely, everything else is one click away, never
  competing on the same screen.**
- **The Five-Second Rule** — a real, named, published UX concept: a
  dashboard should let a user identify its main message within five
  seconds. Grounded in working-memory research (humans reliably hold only
  3-5 items in working memory at once); most researched dashboard guidance
  converges on displaying 5-9 key metrics per screen as the practical
  ceiling before comprehension degrades.
- **F-pattern / Z-pattern scanning** — real, observed reading behavior:
  users scan top-left → right → down (F-pattern, text-heavy layouts) or
  top-left → top-right → bottom-left → bottom-right (Z-pattern,
  visual-heavy layouts). The most important content belongs top-left in
  either pattern.
- **Progressive Disclosure** — formalized by Jakob Nielsen in 1995;
  research cited in this Standard's search found progressively-disclosed
  interfaces complete a user's first task 30-50% faster than a
  full-exposure alternative. Three recognized forms: step-by-step
  (sequential stages), conditional (hidden until requested), contextual
  (revealed based on the user's current situation) — all three already
  have real analogs in this codebase (Quick View modals, "View all"
  links, the Universal Card's own `compact`/`detailed`/`micro` tiers).
- **Data-to-ink ratio** — a real, quotable design discipline: "if a pixel
  isn't displaying new information, it should be removed." Matches this
  codebase's own established Cognitive Load Budget (§14, Universal Project
  Card Standard) in spirit exactly.

## Current vs. Best-Practice Comparison

| | Base Radar today | Best practice researched |
| --- | --- | --- |
| Default-view question count | Dashboard: 15 widgets at once (multiple questions) | Stripe: exactly 3 top-level numbers |
| Executive content placement | Alerts: correct (immediate); Profile: incorrect (4th of 8 zones) | Stripe/Linear/Vercel: always first, unconditionally |
| Progressive disclosure | Present in some places (Quick View, "View all," Universal Card density tiers) | Present in Stripe/Linear/Vercel *everywhere*, not selectively |
| Density discipline | Strong at the component level (§14 Cognitive Load Budget) | Not yet consistently applied at the *page*-composition level |
| Duplicate-content prevention | Not audited before this Standard; a real instance found on Profile | Linear explicitly separates "what's active" from "analytics" so they never compete on one screen |

---

## 1. Purpose

Information order determines how fast a user reaches a real decision. The
same facts, shown in a different order, produce a measurably different
outcome — a user scanning top-to-bottom stops reading the moment they've
found what they came for; whatever comes after that point is effectively
invisible on a first pass, however important it actually is. This Standard
exists so that "what comes first" is a deliberate, testable decision on
every screen, not an accident of build order.

## 2. Core UX Principles

- **Executive-first** — the single most decision-relevant fact on any
  screen renders first, unconditionally, regardless of what else that
  screen also needs to show (Stripe's "3 numbers a CFO cares about"
  precedent).
- **Scan before read** — assume every user scans before they read; the
  scannable layer (headline numbers, badges, one-line summaries) must be
  complete on its own, never requiring the fuller text to make sense.
- **Progressive disclosure** — show the minimum needed for the next
  decision; deeper detail is always available, never forced.
- **One primary action** — every screen has exactly one obvious "what do I
  do next" — never zero (a dead-end screen), never competing multiples.
- **High signal / low noise** — every element earns its place by changing
  a user's decision; matches the Universal Project Card Standard's own §3
  "Data before decoration" principle exactly, generalized to page level.
- **Honest uncertainty** — matches this codebase's own established, proven
  convention throughout: an unknown value is stated as unknown, never
  hidden and never guessed.
- **Consistent placement** — the same *kind* of information (identity,
  trust, primary metric, risk) occupies structurally the same position
  across every surface that shows it, so a user's learned scanning pattern
  from one page transfers to the next.
- **Predictable layout** — a returning user should never need to
  re-orient; structural position is stable across sessions and across
  data states (loading/empty/error look like variations of the same
  layout, not a different one).

## 3. Executive Information Order

The universal priority order, applying to any screen presenting
information about a project, portfolio, or the ecosystem as a whole:

1. **Identity** — what is this?
2. **Trust** — can I believe what I'm about to see?
3. **Health** — is it in good condition right now?
4. **Recommendation** — what does Base Radar's own analysis conclude?
5. **Primary Metric** — the one number that answers "how big/significant
   is this?"
6. **Status** — is anything urgent right now?
7. **Risk** — what could go wrong?
8. **Activity** — what changed recently?
9. **Supporting Metrics** — everything else quantifiable, but secondary.
10. **Metadata** — sourcing, timestamps, technical detail — always last,
    never competing with anything above it for attention.

**Why this order exists:** it is the Universal Project Card Standard's own
already-frozen §1 five-question order (What is it → Is it real → Is it
healthy → How big → Is anything urgent), extended with two positions this
Standard adds explicitly — **Recommendation** (position 4, since a user
deciding whether to look closer benefits from the conclusion before the
raw evidence that produced it) and **Activity** (position 8, since "what
changed" is inherently a follow-up question, not a first-glance one). This
is not a new hierarchy invented for this document — it is the same order
already proven correct at the component level, now stated as the rule
every *page* composition must also follow, closing the exact gap this
Standard's own audit found on the Project Profile page.

## 4. Five-Second Rule

Every primary screen (Dashboard, Project Profile, Watchlists, Alerts) must
let a first-time user answer, within five seconds of the screen finishing
its initial render:

- What is this? (Identity)
- Is it healthy / is anything urgent? (Health + Status, combined — the
  two questions a five-second scan realistically resolves together)

**Measurable success criteria:**
- The answer to both questions must be visible **without scrolling**, at
  the default viewport size the page is primarily used at (desktop for
  Dashboard/Profile, mobile-first for Watchlists per the Universal Card's
  own established mobile-first principle).
- No more than **9 distinct pieces of information** compete for attention
  in that above-the-fold view (the working-memory-grounded ceiling this
  Standard's research confirmed).
- The single most important fact on the screen is describable in one
  sentence by someone who has never used Base Radar before, after a real,
  five-second, unaided look — not a guided tour.

A screen that requires scrolling, clicking, or a legend to answer either
question fails the Five-Second Rule for that screen, regardless of how
good the content is once reached.

## 5. Executive Summary Standards

Every Executive-Summary-shaped surface (the Alerts page's own
`ExecutiveSummary`, and any future equivalent) is structured as:

1. **Headline** — one sentence, the single most important fact.
2. **Key insight** — the "why" behind the headline, one sentence.
3. **Recommendation** — what Base Radar's own analysis concludes, stated
   plainly (reusing the existing `RECOMMENDATION_FOR_RISK`-style phrase
   vocabulary already established — see Good Project Evaluation
   Framework's own findings on this exact mechanism).
4. **Supporting evidence** — the specific real numbers/facts backing the
   headline, never more than the Five-Second Rule's 9-item ceiling.
5. **Next action** — the one thing this summary suggests the user do next,
   if anything real applies (never a fabricated call-to-action when
   nothing changed).

This order is itself an application of Executive Information Order §3 —
conclusion before evidence, per Core UX Principle "executive-first."

## 6. Progressive Disclosure

| Tier | What belongs here | Why |
| --- | --- | --- |
| **Immediately visible** | Identity, Trust, Health, Recommendation, Primary Metric, Status — the top 6 of Executive Information Order §3. | These are the Five-Second Rule's own content — must never require an interaction to reach. |
| **One click away** | Risk detail/contributors, Activity/recent changes, secondary metrics, Quick View-style summaries. | Real, wanted detail — but the *existence* of a risk or activity signal belongs in the immediate view (a badge, a count); the *detail behind it* is one click deep, matching Vercel's "summary up top, logs one click deep" precedent. |
| **Deep drill-down** | Full historical timelines, complete governance/whale/contract explorers, full audit trails. | Real analytical work, not a scanning task — appropriately gated behind explicit navigation (already this codebase's own convention for the Governance/Whale/Pools/AI Explorer routes). |
| **Advanced analysis** | Cross-project comparison, full source/provenance detail, raw provider data. | The smallest, most expert-oriented audience — correctly the last tier reached, matching Bloomberg's own audience-appropriate density tradeoff, deliberately *not* applied any earlier in the funnel. |

## 7. Information Density Guidelines

| Surface | Density guidance |
| --- | --- |
| **Dashboard** | Tiered, not flat — group by relevance (personalized → ecosystem-wide → supplementary), matching the existing, correct 3-tier precedent; never present all widgets as equally important. |
| **Cards** (Universal Project Card) | Governed entirely by the existing, frozen §14 Cognitive Load Budget — this Standard adds nothing here, only confirms it as the model every other surface should match in spirit. |
| **Widgets** | One question per widget (mirrors the Universal Card's own §6 "One Question Per Row" principle, applied at widget scope) — a widget trying to answer two unrelated questions is a signal it should split into two widgets. |
| **Tables** | Not currently used anywhere in this codebase (`DESIGN_SYSTEM.md` confirms `@tanstack/react-table` is an unused dependency) — when eventually adopted, rows follow the same Executive Information Order as any other surface, left-to-right. |
| **Lists** | Same content-per-row discipline as `micro`-density cards — identity, one trust/status signal, one metric, nothing more per row. |
| **Dialogs** (Quick View, etc.) | One click deeper than the surface that opened them — content already visible on the trigger should not be silently repeated verbatim inside the dialog (a real, generalizable version of this Standard's Project Profile duplicate-content finding). |
| **Detail pages** (Project Profile) | Follow Executive Information Order §3 top-to-bottom as real *zone* order, not just component-internal order — this Standard's central, concrete recommendation for this page specifically. |
| **Search (⌘K)** | `micro`-density only, per the Universal Project Card Standard's own frozen scope for this surface — this Standard adds nothing new here. |
| **Mobile** | The Universal Card's own `compact` tier is already the mobile-first baseline (§3, "Mobile first... every new field is designed to work at `compact` size before it's allowed to expand into `detailed`") — this Standard extends the same discipline to page-level composition: the Five-Second Rule's above-the-fold content must fit without scrolling on a real mobile viewport, not just desktop. |
| **Desktop** | Additional density is earned by real available space, never by cramming — the same tiered/progressive-disclosure structure as mobile, just with more of each tier visible without an extra click. |

## 8. Information Priority Matrix

| Priority | What belongs here | Why |
| --- | --- | --- |
| **Critical** | Identity, Trust, Health, Status (is anything urgent) | Never absent from any surface showing a project, at any density — mirrors the Universal Card's own Critical tier (§12) exactly, generalized. |
| **High** | Recommendation, Primary Metric, Risk (top-level severity only) | Present at default density everywhere; compresses to icon/badge form under space pressure before disappearing entirely. |
| **Medium** | Activity/recent changes, supporting metrics, category/classification context | One click away by default (§6); present inline only when a surface has genuine room (a detail page's own dedicated zone, not a compact widget). |
| **Low** | Metadata, sourcing detail, timestamps beyond "how fresh is this" | Always available, never competing for first-glance attention — the same treatment §12 of the Universal Card Standard already gives "freshness timestamp," generalized to every surface. |

**Rationale:** this is the same four-tier shape the Universal Project Card
Standard already uses for one component (§12), promoted to govern every
page's zone-level composition — not a new taxonomy invented for this
document, a reused one, per Core UX Principle "consistent placement."

## 9. Cognitive Load Principles

Restating the Universal Project Card Standard's own §14 Cognitive Load
Budget as the model, extended to page-level composition (this Standard
does not redefine the component-level numbers themselves):

- **Number of metrics** visible in an above-the-fold Five-Second-Rule view:
  ≤ 9 (this Standard's own working-memory-grounded ceiling, §4).
- **Number of badges** simultaneously visible in one screen region: no
  hard universal number is prescribed here — deferred to each surface's
  own existing density tier (§14 already governs the card; a page zone
  composed of multiple cards inherits their combined count as a real
  constraint worth checking, not a new number to invent).
- **Number of simultaneous colors**: reserved for meaning, never
  decoration — restates the Universal Card Standard's own §13 rule at
  page scope; a page with more simultaneously-color-coded signals than a
  user can hold in working memory at once has the same failure mode this
  Standard's Five-Second Rule exists to prevent.
- **Number of simultaneous actions**: one primary action per screen (Core
  UX Principle, §2) — secondary actions are permitted but must be visually
  and structurally subordinate, never competing in size or placement.
- **Visual emphasis**: at most two Rank-1-weight elements compete for the
  first glance on any one screen — the Universal Card's own §13 rule,
  restated at whole-page scope.
- **Avoiding overload**: the concrete, actionable test from this
  Standard's research — "if a pixel isn't displaying new information, it
  should be removed" — applied at the page-composition level to catch
  duplicate content (this Standard's own Project Profile finding) as a
  form of overload, not just visual clutter.

## 10. Cross-Page Consistency

| Information | Dashboard | Directory | Profile | Watchlists | Search | Alerts | Timeline | Portfolio | Notifications |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Identity (logo/name) | ✅ (Universal Card) | ✅ (Universal Card) | ✅ (`ProfileHeader`) | ✅ (Universal Card, `micro`) | ✅ (`SearchProjectRow`) | Per-alert, project-tagged | Per-event, project-tagged | Per-holding, project-tagged | Per-notification |
| Trust signal | ✅ | ✅ | ⚠️ present, but ranked 4th of 8 zones | ✅ | ✅ | Not surfaced | Not surfaced | Not surfaced | Not surfaced |
| Primary metric | ✅ | ✅ | ✅ (multiple zones) | ✅ | ✅ | Not applicable (event-shaped, not project-shaped) | Not applicable | ✅ | Not applicable |
| Recommendation | Via widgets | — | ✅ (multiple, overlapping — see audit) | — | — | ✅ (`ExecutiveSummary`, correctly first) | — | ✅ (`RecommendationCard`) | — |

**Unified philosophy recommended (not implemented):** every surface that
represents "a project" reuses the Universal Project Card's own field
vocabulary and ordering (already this codebase's own stated Universal
Project Card Standard principle — "one source of truth," §3) — this
Standard's contribution is extending that same discipline to *event-
shaped* surfaces (Alerts, Timeline, Notifications), which don't render a
project card at all today but still reference specific projects, and
would benefit from the same Identity-then-Trust-then-Recommendation
ordering wherever they show that project's own signals rather than the
event's.

## 11. Accessibility & Readability

Restates [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md)'s already-documented current
behavior as the accessibility floor for this Standard's own hierarchy
recommendations — no new token, no new rule invented here:

- **Typography hierarchy** — font weight (not size alone) establishes
  hierarchy, per `DESIGN_SYSTEM.md`'s own documented convention; this
  Standard's Executive Information Order should be visually legible
  through weight/size *before* a reader processes content, not only after.
- **Spacing** — the existing card-padding/section-rhythm conventions
  (`DESIGN_SYSTEM.md`) already create real, if implicit, grouping; a page
  reordered per this Standard should use the same existing spacing
  conventions to reinforce the new zone order, not introduce new spacing
  values.
- **Contrast** — governed by the Universal Project Card Standard's own
  §21 Accessibility Standard (WCAG AA, 4.5:1/3:1) — this Standard adds no
  new contrast rule, only requires that reordering content never
  regresses an already-passing contrast relationship.
- **Touch targets** — same 44×44px minimum already established (§21) —
  reordering must preserve, never shrink, an existing compliant target.
- **Keyboard navigation** — reordering visual position must be matched by
  reordering DOM/tab order identically — a screen that looks reordered but
  tabs in the old order is a real, measurable regression this Standard
  explicitly forbids.
- **Screen-reader friendliness** — Executive Information Order should read
  correctly in document order for assistive technology, not rely on CSS
  order alone to convey priority — matching this codebase's own established
  discipline (e.g. the Universal Card's `aria-label` accessible-name
  convention).
- **Information grouping** — each Executive Information Order position
  (§3) should correspond to one real, `aria`-labeled section/region where
  the surface is complex enough to need one (matching Project Profile's
  own existing `ZoneHeading` convention) — reused, not reinvented.

## 12. Future Enhancements

Real UX opportunities identified during this research — recorded only, no
implementation proposed:

1. **Project Profile zone reordering** — this Standard's most concrete,
   evidence-backed finding: move Trust ahead of Overview/Market to match
   Executive Information Order §3, and consolidate the four overlapping
   Intelligence-zone components (`ProfileSummary`, `ProfileExecutiveIntelligence`,
   `ProfileWhyItMatters`, `ProfileIntelligence`) into a single, non-duplicated
   presentation. A real, scoped candidate for a future PR — not attempted
   here.
2. **A page-level Cognitive Load audit tool**, mirroring the Universal
   Project Card's own component-level §14 budget, that could mechanically
   count visible metrics/badges/colors per above-the-fold view — today
   this Standard's Five-Second Rule is checked manually, per page.
3. **Generalizing `ExecutiveSummary`'s pattern** (Alerts page) to other
   event-shaped surfaces (Timeline, Notifications, Portfolio) that don't
   currently lead with a conclusion-first summary.
4. **A formal Dashboard widget count ceiling** — 15 widgets across 3 tiers
   works today because the tiering itself is disciplined, but no explicit
   maximum is documented; a future Standard revision could name one,
   grounded in real usage data rather than this session's judgment alone.
5. **Table component adoption review** — `@tanstack/react-table` is an
   unused dependency; if tabular data is ever adopted, this Standard's §7
   guidance (Executive Information Order, left-to-right) should govern its
   column order from the first implementation, not be retrofitted later.

---

## Provenance

Every codebase claim in this document is drawn from a direct,
current-session reading of `app/dashboard/page.tsx`,
`app/dashboard/projects/[slug]/page.tsx`, `components/alerts/AlertsPageClient.tsx`,
`components/alerts/ExecutiveSummary.tsx`, `docs/DESIGN_SYSTEM.md`, the
Universal Project Card Standard (`docs/planning/`), and both
already-frozen Trust/Quality Standards in this `docs/` folder. Every
industry-practice claim is drawn from research conducted for this Standard
(Bloomberg Terminal, Stripe, Linear, Vercel, and published cognitive-
science/UX-pattern research on the five-second rule, F/Z-pattern scanning,
and progressive disclosure) — see the corresponding chat response this
document was delivered alongside for full source citations. Neither
category is asserted from unverified memory.
