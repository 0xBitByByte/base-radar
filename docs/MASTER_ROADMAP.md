# Base Radar Master Roadmap

This is the canonical engineering roadmap for Base Radar: the single place
that documents every completed milestone, what's actively being built, what's
planned next, what's been intentionally deferred, and where the product is
headed long-term. It supersedes the informal roadmap sections previously
scattered across [README.md](../README.md), [ROADMAP.md](ROADMAP.md), and
[PRODUCT_VISION.md](PRODUCT_VISION.md#long-term-roadmap) — those documents now
point here (see each file's own roadmap section for a short redirect note).
Future PRs should update **this** document, not recreate a roadmap section
elsewhere.

**A numbering note, read this first**: for **completed work**, this document
treats real **GitHub Pull Request numbers** (`git log --merges`) as the
historical source of truth — every entry in Completed Milestones below cites
the actual, real PR number it was merged under (`PR-001` = GitHub PR #1,
`PR-004` = GitHub PR #4, and so on through `PR-043`). GitHub PR **#12** was
opened but never merged (superseded); it is skipped below rather than
assigned a placeholder.

Some older documentation in this repository — a few isolated references in
[TESTING.md](TESTING.md) (`PR-004`), [CI.md](CI.md) (`PR-007`), and the
Registry/Discovery/AI-Intelligence-v2 docs
([PROJECT_REGISTRY.md](PROJECT_REGISTRY.md), [DISCOVERY_ENGINE.md](DISCOVERY_ENGINE.md),
[AI_INTELLIGENCE_ENGINE.md](AI_INTELLIGENCE_ENGINE.md),
[DAILY_BRIEF_GENERATOR.md](DAILY_BRIEF_GENERATOR.md),
[DASHBOARD_INTELLIGENCE_INTEGRATION.md](DASHBOARD_INTELLIGENCE_INTEGRATION.md),
[PROJECT_INTELLIGENCE_INTEGRATION.md](PROJECT_INTELLIGENCE_INTEGRATION.md)) —
uses its own informal "PR-XXX" milestone numbering that **predates this
roadmap** and was assigned per-feature at the time, independent of GitHub's
own PR numbering. Those references are left exactly as they are in their
original documents; this roadmap does not rewrite, renumber, or attempt to
reconcile them. Where an older doc's informal number happens to coincide
with the real GitHub PR number (as is the case for the Registry/Discovery/
AI-Intelligence-v2 series, `PR-037`–`PR-043`), that's a genuine coincidence
worth noting, not a rule this document relies on.

**For planned, not-yet-built work** (`PR-044` onward, see Planned Milestones
below), no GitHub PR exists yet — those are sequential **roadmap
identifiers** assigned by this document to track and reference future work
before it has a real PR number. Once a planned item is actually opened as a
GitHub PR, its real PR number should be recorded alongside (or in place of)
its roadmap identifier here.

A second, separate planning track exists alongside this one:
[ENGINEERING_EXECUTION_PLAN_V1.md](ENGINEERING_EXECUTION_PLAN_V1.md) (status:
Active), built from [REPOSITORY_AUDIT_V1.1.md](REPOSITORY_AUDIT_V1.1.md)'s
findings and the [Product Bible](PRODUCT_BIBLE/00_INDEX.md)'s
[Release 1–9 plan](PRODUCT_BIBLE/07_ENGINEERING_ROADMAP.md#releases). That
plan is scoped to **engineering-quality and platform work** (test coverage,
loading/error boundary coverage, real authentication, a real backend) rather
than the **feature and visual-polish** work this roadmap tracks. The two are
complementary, not conflicting: Milestone B (Testing Foundation) of that plan
has already shipped (`tests/`, `PR-004` per `TESTING.md`); Milestone A
(Navigation & Ownership Integrity) is **not** finished — `/dashboard/watchlist`
and `/dashboard/watchlists` still both exist, the exact dual-implementation
issue that plan's Sprint A.2 calls out. See
[Repository Standards](#repository-standards) and
[Risks](#next-recommended-pr) below for how the two tracks relate.

---

## Product Vision

Base Radar's long-term vision is to become the default intelligence layer
for the Base ecosystem — the first place anyone opens to answer "what's
happening on Base right now," and the canonical, verified registry other
builders point to for trustworthy project data. It exists to solve four
concrete problems: fragmentation (ecosystem information scattered across
explorers, DEX aggregators, Discords, and X threads), unverified information
(most project directories are self-reported and unmoderated), noise over
signal (most dashboards weight everything equally), and the lack of any
canonical source of truth for "what exists" on Base. See
[PRODUCT_VISION.md](PRODUCT_VISION.md) for the full mission, target users,
and competitive positioning — this section only summarizes it for roadmap
context.

---

## Engineering Principles

Principles already established and enforced throughout the project (see
[CLAUDE_RULES.md](CLAUDE_RULES.md) for the full enforcement detail):

- **Evidence-first.** Every claim in this roadmap, and every feature in the
  product, is traceable to real, verifiable data — real commits, real
  provider responses, real registry entries — never an assumption presented
  as fact.
- **Deterministic intelligence.** Every scoring, narrative, and summary
  engine in the codebase (`lib/intelligence/`, `lib/alerts/intelligence/`,
  `lib/ai-intelligence/`) is rule-based and reproducible — same input,
  same output, always. No external LLM/AI API is called anywhere in the
  product today.
- **Registry-driven architecture.** `data/projects/` is the static, inert
  source of truth every live layer eventually joins against — the Provider
  Layer, Discovery Engine, and AI Intelligence Engine all read it; none of
  them write to it.
- **No fabricated data.** A missing metric is shown as an honest "Not
  Currently Available" (with a real reason) or hidden entirely — never
  invented, never a silent placeholder presented as real.
- **Reuse existing components.** New surfaces are built from
  `WidgetCard`/`ProfileSectionCard`/`GlowBadge`/`EmptyState`/etc., not
  parallel one-off implementations. Design system audits in this roadmap
  actively watch for and correct drift from this rule.
- **Small, focused PRs.** One purpose per PR — a fix, a feature increment,
  or a polish pass, never bundled.
- **Architecture before features.** New capability is added by extending
  the existing layered pipeline (Provider → Registry → Discovery → AI
  Intelligence → Dashboard/Project surfaces), never by bypassing it.
- **Design consistency over redesign.** Visual work audits against the
  system's own established conventions and fixes genuine drift; it does not
  invent new patterns or redesign working surfaces without an explicit
  mandate to do so.
- **Progressive enhancement.** Every live-data feature degrades gracefully
  to a typed mock baseline or an honest empty state — a slow or failing
  provider never breaks a page.

---

## Completed Milestones

Each entry cites its real GitHub PR number (`git log --merges`), grouped by
theme rather than strict chronological order. See the numbering note above.

### Foundation

| PR | Summary |
| --- | --- |
| PR-001 | Landing page: animated hero, live network stat cards, trust indicators, CTA into the dashboard. |
| PR-002 | Documentation foundation — README, Architecture, Product Vision, and the original Roadmap established. |
| PR-003 | Foundation polish pass across the landing page and initial dashboard shell. |
| PR-004 | Provider Layer: CoinGecko, DexScreener, DefiLlama, Blockscout, Base RPC, and GitHub integrated behind a typed mock-fallback aggregator. |

### Explorer

| PR | Summary |
| --- | --- |
| PR-006 | Project Explorer page shell — a browsable view over the Project Registry. |
| PR-007 | Explorer search. |
| PR-008 | Explorer category/tag/chain filters. |
| PR-009 | Explorer grid/card view. |
| PR-010 | Explorer table view polish. |
| PR-011 | Explorer table scroll-behavior fix. |
| PR-013 | Quick View micro-interaction polish. |
| PR-014 | Final Explorer/Quick View polish pass. |
| PR-015 | Design system conformance pass — removed one-off `Button`/`Skeleton` primitives that duplicated the shared system. |
| PR-016 | Production-readiness cleanup ahead of the v1.0.0 release. |
| PR-017 | v1.0.0 release — Explorer and Project Profile hardening milestone. |

### AI Intelligence

| PR | Summary |
| --- | --- |
| PR-022 | Alert Engine — real, provider-backed alerts (GitHub, Snapshot, CoinGecko, DefiLlama, Blockscout) for Watchlist projects. |
| PR-023 | Watchlist ↔ Alert Engine integration — per-project alert enable/disable. |
| PR-024 | Live provider-backed alert data wired through all five Alert Engine sources. |
| PR-025 | AI Intelligence layer — deterministic scoring/narrative/summary engine over Alert Engine output. |
| PR-026 | AI Daily Intelligence Brief — market-wide executive summary built entirely on the AI Intelligence Engine's output. |
| PR-027 | Portfolio Intelligence — a Watchlist-scoped executive summary one level above the Daily Brief. |
| PR-028 | Intelligence Timeline — chronological merge of Alerts, Daily Brief, and Portfolio Intelligence into one feed. |
| PR-029 | Notification System — unified bell/drawer/page reshaping the Intelligence Timeline. |
| PR-030 | Automation System — rule engine evaluating Notifications into automation results. |

### Platform, Search & Personalization

| PR | Summary |
| --- | --- |
| PR-031 | Global Search & Command Palette — ⌘K search spanning a static command registry and every existing data source. |
| PR-032 | Personalization & Advanced Watchlists — multiple named, user-organized project collections with an active-watchlist scoping model. |
| PR-033 | Account Layer & Sync Foundation — local-only profile, offline-first sync queue, Connector and Backend Service abstraction layers. |

### Release Hardening

| PR | Summary |
| --- | --- |
| PR-034 | v1 finalization — engineering milestone hardening pass. |
| PR-035 | Landing page cleanup. |
| PR-036 | Landing page messaging refresh. |

### Registry

| PR | Summary |
| --- | --- |
| PR-037 | Project Registry foundation model — `lifecycle`, `verificationLevel`, and `qualityScore` fields added, additive and non-breaking. |
| PR-038 | Project Registry integration pass — Explorer reads the registry model directly. |
| PR-039 | Discovery Engine — candidate-project discovery pipeline sitting beside the Registry, feeding a human-review queue; never writes to the Registry itself. |

### Dashboard Intelligence

| PR | Summary |
| --- | --- |
| PR-040 | AI Intelligence Engine v2 — a reusable `AIIntelligenceBrief` model (architecture only at this stage; no generation logic yet). |
| PR-041 | Daily Brief Generation Pipeline — deterministic, rule-based generator producing ranked `AIIntelligenceBrief`s from real Registry/Discovery/Alert input. No LLM, no external API call. |
| PR-042 | Dashboard Intelligence Integration — wired the Daily Brief Generation Pipeline into the Dashboard's existing Intelligence Brief widget. |

### Project Intelligence

| PR | Summary |
| --- | --- |
| PR-005 | Project Intelligence Engine (`lib/intelligence/`) — the original per-project Health/Risk/Confidence scoring engine behind the Project Profile. |
| PR-018 | Live intelligence data wired into the Project Profile. |
| PR-019 | Premium Project Profile redesign, final pass. |
| PR-020 | Live intelligence refinements on the Project Profile. |
| PR-021 | Project Profile intelligence overhaul — Health Scorecard, Executive Intelligence panel, and Activity Timeline. |
| PR-043 | Project Intelligence Integration — surfaced the AI Intelligence Engine / Daily Brief Pipeline per-project on the Project Profile page. |

---

## Current Milestone

**Phase 6 — Design System Foundation**

With PR-043 shipped, every planned intelligence pipeline (Alert Engine →
Daily Brief → Portfolio → Timeline → Notifications → Automation, and
separately Discovery → AI Intelligence Engine v2 → Daily Brief Generator →
Dashboard/Project Intelligence) is live. Phase 6 turns attention to the
UI layer those pipelines render through: a visual-consistency audit and
polish pass across the entire dashboard experience — spacing, typography,
cards, widget headers, badges, buttons, tables, empty states, loading
states, and responsive behavior — bringing the product closer to
Linear/Raycast/Coinbase/Vercel-level polish while preserving Base Radar's
existing identity.

**Objectives:**

- Standardize the 8px spacing rhythm and remove inconsistent padding across
  widgets and pages.
- Standardize typography hierarchy (page/section/widget titles,
  descriptions, metadata, timestamps, badges) with no new fonts introduced.
- Audit card, widget-header, badge, button, table, empty-state, and
  loading-state conventions for genuine drift, fixing only unambiguous
  outliers — never forcing uniformity onto deliberate contextual variation.
- Verify no layout regression at Desktop, Tablet, and 375px Mobile.
- Explicitly **not** a redesign: no routing, business logic, provider,
  AI Intelligence Engine, or Registry changes; no new components, no
  component moves/renames, no animation beyond subtle hover/focus.

PR-044 (below) is this milestone's first concrete pass — audited and
fixed, currently uncommitted and awaiting review.

---

## Planned Milestones

### PR-044 — Design System Foundation v2

**Goals:** Audit and standardize spacing, typography, cards, widget
headers, badges, buttons, tables, empty states, and loading states across
the full dashboard experience.

**Deliverables:** A file-and-line-referenced audit distinguishing genuine
drift from deliberate contextual variation; surgical, zero-logic-risk
className fixes only for confirmed outliers (no redesign, no component
moves/renames); a full validation pass (`tsc`, lint, build) and live
browser QA at Desktop/Tablet/375px.

**Dependencies:** None — pure visual audit of already-shipped surfaces
(PR-001–PR-043).

---

### PR-045 — Dashboard Layout Polish

**Goals:** Apply PR-044's confirmed spacing/rhythm conventions to the
Dashboard page's own layout — widget grid gaps, KPI row alignment, and
section-to-section vertical rhythm.

**Deliverables:** Consistent widget-grid spacing; aligned KPI row; no
widget content or data-fetching changes.

**Dependencies:** PR-044.

---

### PR-046 — Widget Refinement

**Goals:** Bring every Dashboard widget's internal layout (icon chip,
title/subtitle, action menu, footer timestamp) into full conformance with
`WidgetCard`'s established anatomy, per PR-044's audit findings.

**Deliverables:** Any remaining per-widget internal spacing/typography
outliers resolved; no widget behavior or data change.

**Dependencies:** PR-044, PR-045.

---

### PR-047 — Explorer UX Polish

**Goals:** Apply the same spacing/typography/card standards to the
Project Explorer (grid view, table view, filters, search) established in
PR-044.

**Deliverables:** Consistent Explorer card/row/filter styling; no filtering
or search logic change.

**Dependencies:** PR-044.

---

### PR-048 — Project Profile Visual Refresh

**Goals:** Apply the design system standards to the Project Profile page's
remaining surfaces (Header, Scorecard, Token & Price, Network, Contracts,
Governance, Timeline) beyond what PR-044 already covered.

**Deliverables:** Full Project Profile visual conformance; no change to
`lib/intelligence/` or the AI Intelligence integration built in PR-043.

**Dependencies:** PR-044.

---

### PR-049 — Motion & Micro-interactions

**Goals:** Standardize hover/focus transition timing and easing across
buttons, cards, and interactive rows, per the Animation Principles already
documented in [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md#animations) — subtle
confirmation motion only, nothing decorative, full `prefers-reduced-motion`
support preserved.

**Deliverables:** A single, consistent hover/focus transition timing scale
applied across the dashboard; no new animation library.

**Dependencies:** PR-044–PR-048.

---

### PR-050 — Timeline Integration

**Goals:** Extend the Intelligence Timeline (PR-028) and the newer
Discovery/AI-Intelligence-v2 pipeline (PR-039–PR-043) so Timeline events can
originate from either source in one consistent feed, rather than only the
older Alert-Engine-derived events.

**Deliverables:** Timeline event model extended (additively) to accept a
second source; existing event types and sorting untouched.

**Dependencies:** PR-043.

---

### PR-051 — Notification Center v2

**Goals:** Extend the Notification System (PR-029) to reflect PR-050's
broadened Timeline sourcing, and revisit notification-density/grouping UX
in light of the Design System Foundation's typography and spacing
standards.

**Deliverables:** Notification Center visually conformant with PR-044's
system; notification model extended only if PR-050 requires it.

**Dependencies:** PR-044, PR-050.

---

### PR-052 — Watchlist Intelligence

**Goals:** Surface AI Intelligence Engine v2 / Daily Brief signals (PR-040–PR-043)
directly inside the Watchlists experience (PR-032), closing the gap between
the newer per-project intelligence pipeline and the personalization layer.

**Deliverables:** Watchlist detail view gains an intelligence summary per
project, reusing existing `getProjectAIIntelligence()` output — no new
scoring logic.

**Dependencies:** PR-043, PR-032.

---

### PR-053 — Portfolio Intelligence Dashboard

**Goals:** Extend Portfolio Intelligence (PR-027) to incorporate the same
newer AI Intelligence Engine v2 signals, and apply the Design System
Foundation's visual standards to the Portfolio page.

**Deliverables:** Portfolio Intelligence sections reuse PR-040–PR-043's
output where it adds real signal; page visually conformant with PR-044's
system; no new scoring or narrative logic.

**Dependencies:** PR-044, PR-052.

---

## Future Milestones

Directional ideas, intentionally **not scheduled** into a numbered PR yet:

- **AI Research Assistant** — dedicated research tooling for the AI-agent
  segment of the Base ecosystem (see [PRODUCT_VISION.md](PRODUCT_VISION.md#product-pillars)'s
  Research Tools pillar).
- **Narrative Detection** — automated, evidence-based narrative
  classification superseding today's curated narrative content.
- **Explain Why Engine** — a general-purpose "why is this scored this way"
  explanation layer generalizing the per-field explanations already present
  in the Project Profile's AI Intelligence section.
- **Registry Automation** — converting an accepted Discovery Engine
  (PR-039) candidate into a live Registry entry; today this conversion step
  is manual and unbuilt.
- **Scheduled Discovery** — running the Discovery Engine's providers on a
  schedule rather than on demand.
- **Semantic Search** — replacing Global Search's (PR-031) weighted
  keyword/substring scoring with embedding-based matching.
- **Email Digest** — a scheduled email rendering of the Daily Brief
  Generation Pipeline's (PR-041) output.
- **Mobile Optimization** — a dedicated pass beyond today's responsive
  breakpoints, for genuinely mobile-first interaction patterns.
- **PWA** — installable, offline-capable app shell.
- **Public API** — external, authenticated access to the Project Registry
  and AI Intelligence Engine output (see [API.md](API.md#future-api-endpoints)).

---

## Deferred Ideas

Backlog items intentionally postponed — not rejected, not scheduled:

- **AI chat assistant** — a conversational interface over the Registry and
  Intelligence layers; deferred until a deterministic, non-conversational
  Explain Why Engine (above) is proven out first.
- **Team workspaces** — multi-user shared Watchlists/Personalization;
  deferred until real authentication exists (see
  [ENGINEERING_EXECUTION_PLAN_V1.md](ENGINEERING_EXECUTION_PLAN_V1.md#milestone-d--release-1-platform-foundation)'s
  Session & Identity Model work).
- **Portfolio sharing** — publishing a read-only Portfolio Intelligence
  view; deferred for the same reason.
- **Plugin ecosystem** — third-party extensions to the Registry or
  Intelligence Engine; deferred until the Public API (above) exists.
- **Cross-chain intelligence** — extending beyond Base; deliberately
  deferred indefinitely per [PRODUCT_VISION.md](PRODUCT_VISION.md#what-base-radar-will-not-become)'s
  "not a general multi-chain tracker" principle — this is a standing
  product boundary, not a scheduling gap.

---

## Design System Evolution

The Design System Foundation (Phase 6, PR-044 onward) exists to make four
things true at once, in priority order:

1. **Consistency** — one spacing rhythm, one typography hierarchy, one card
   vocabulary (`WidgetCard`/`ProfileSectionCard`/`GlowBadge`/`EmptyState`),
   applied by convention rather than reinvented per feature. Genuine,
   deliberate contextual variation (a dense table row's lighter hover vs. an
   isolated card's stronger one; a hero `<h1>`'s larger scale vs. a
   secondary page title's) is preserved, not flattened — consistency means
   *no accidental drift*, not *no variation*.
2. **Accessibility** — every interactive element keeps its
   `focus-visible:ring-2` treatment, every icon-only control keeps its
   `aria-label`, and reduced-motion is honored throughout (see
   [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md#accessibility)) — polish work never
   trades this away for visual effect.
3. **Information density** — the dashboard is a professional intelligence
   tool, not a marketing page; density and scannability are weighed against
   "premium feel" deliberately, favoring the former where they conflict.
4. **Premium feel** — the Linear/Raycast/Coinbase/Vercel reference point
   named for Phase 6 describes restraint (tighter, more consistent spacing;
   quieter borders and shadows; subtler hover states) rather than added
   ornamentation.

**Maintainability** underlies all four: every fix in this evolution reuses
an existing primitive rather than introducing a new one, per the Reuse
Existing Components principle above, so the system gets more consistent
over time rather than accumulating a second parallel vocabulary.

This section — not a new one per PR — should guide all future UI work;
individual PRs should reference it rather than restate design philosophy.

---

## Architecture Evolution

```
Provider Layer
      │
      ▼
   Registry
      │
      ▼
  Discovery
      │
      ▼
AI Intelligence Engine
      │
      ▼
  Daily Brief
      │
      ▼
  Dashboard
      │
      ▼
Project Intelligence
      │
      ▼
  Timeline
      │
      ▼
Notifications
      │
      ▼
  Portfolio
```

This is the conceptual dependency order the product's intelligence
capability was built in, and the order later capability naturally builds
on. In practice today, two related pipelines share this shape rather than
one single linear one — see [ARCHITECTURE.md](ARCHITECTURE.md) for the full
detail:

- **Alert Engine track** (PR-022–PR-030): Alert Engine → AI Intelligence
  (`lib/alerts/intelligence/`) → Daily Brief (`lib/brief/`) → Portfolio
  Intelligence (`lib/portfolio/`) → Intelligence Timeline (`lib/timeline/`)
  → Notifications (`lib/notifications/`) → Automation (`lib/automation/`).
- **Discovery / AI Intelligence v2 track** (PR-039–PR-043): Discovery
  Engine (`lib/discovery/`) → AI Intelligence Engine v2
  (`lib/ai-intelligence/`) → Daily Brief Generation Pipeline
  (`lib/ai-intelligence/generator/`) → Dashboard Intelligence Integration →
  Project Intelligence Integration.

Both sit downstream of the same Provider Layer and Project Registry, and
neither replaces the other — see each track's own architecture doc for why
they coexist rather than merge (`AI_INTELLIGENCE_ENGINE.md`'s "naming note"
section explains the deliberate type-name separation in detail).

---

## Repository Standards

- **Branch naming**: `feature/<pr-slug>` or `feat/<pr-slug>` (e.g.
  `feature/pr23-platform-foundation`, `feat/discovery-engine`) — matches
  every branch merged to date (`git log --merges`).
- **Commit naming**: Conventional-commit-style prefixes (`feat(scope):`,
  `fix:`) with an imperative, present-tense summary — e.g. `feat(project):
  integrate AI project intelligence`, `fix: align landing page with current
  product capabilities`. AI-assisted commits carry a `Co-Authored-By:`
  trailer.
- **PR naming**: Matches the branch's own feature name/slug; the PR
  description states purpose, files changed, and validation results — see
  the Pull Request Strategy in
  [ENGINEERING_EXECUTION_PLAN_V1.md](ENGINEERING_EXECUTION_PLAN_V1.md#pull-request-strategy)
  for the fuller standard (one purpose per PR, independently reviewable,
  remains mergeable).
- **Validation**: `npx tsc --noEmit`, `npm run lint`, `npm run build` must
  all pass clean before any PR is considered done — enforced identically by
  CI (`.github/workflows/ci.yml`, see [CI.md](CI.md)) and by every PR in
  this project's history.
- **Testing**: Vitest + React Testing Library, colocated under `tests/`
  mirroring `lib/`/`components/` structure — see [TESTING.md](TESTING.md).
  A foundation, not a coverage target; coverage grows PR by PR rather than
  being back-filled in bulk.
- **Documentation requirements**: A PR that changes what an existing doc
  describes updates that doc in the same PR (or explicitly flags the
  follow-up) — never left silently stale. Structural/architectural changes
  update [ARCHITECTURE.md](ARCHITECTURE.md) and [API.md](API.md); roadmap
  changes update this document.
- **Review checklist**: No new Dependency Rule or Ownership Principle
  violation; no new dead link or broken workflow; no new one-off UI pattern
  (Design Debt Prevention); the PR's own scope is test-covered where
  applicable; affected docs updated; no unexplained performance regression;
  no new accessibility regression (keyboard trap, missing focus state).
  Live browser QA (Desktop/Tablet/375px, no console errors, no hydration
  warnings) for any visual change. See
  [ENGINEERING_EXECUTION_PLAN_V1.md](ENGINEERING_EXECUTION_PLAN_V1.md#quality-gates)
  for the fuller Quality Gates list this distills.

---

## Release Progress

Realistic, current-state estimates — not a commitment to a date:

| Area | Progress |
| --- | --- |
| Foundation | 100% |
| Explorer | 95% |
| Registry | 100% |
| AI Intelligence | 100% |
| Dashboard | 100% |
| Project Pages | 90% |
| Notifications | 90% |
| Portfolio | 85% |
| Design System | 10% |
| Testing & Platform Hardening | 35% |
| Mobile | 45% |
| **Overall Progress** | **80%** |

Notes on the two lowest figures: **Design System** reflects that PR-044 (the
first real audit/fix pass) is complete but uncommitted, and PR-045–PR-049
haven't started. **Testing & Platform Hardening** reflects
[ENGINEERING_EXECUTION_PLAN_V1.md](ENGINEERING_EXECUTION_PLAN_V1.md)'s own
Milestone status: Testing Foundation (B) shipped, but Navigation & Ownership
Integrity (A) — specifically the dual `/dashboard/watchlist` /
`/dashboard/watchlists` routes — and Loading & Error Coverage (C) are not
finished, and Release 1's real authentication/backend work (D) hasn't
started.

---

## Next Recommended PR

**PR-045 — Dashboard Layout Polish**

PR-044 (Design System Foundation v2) has already been audited and fixed
locally — spacing, typography, card, and empty-state conventions across the
dashboard are validated (clean `tsc`/lint/build, live browser QA at three
breakpoints) and awaiting review. The natural next step is applying those
now-confirmed conventions to the Dashboard page's own layout (widget grid
spacing, KPI row alignment), the highest-traffic surface in the product and
the one PR-044's audit touched least directly. It has no dependency beyond
PR-044 landing, keeps the same low-risk "visual polish only" scope, and
sequences naturally before the wider Explorer/Project Profile passes
(PR-047, PR-048) reuse the same conventions.

Separately, and outside this visual-polish track: the still-open Milestone
A item in
[ENGINEERING_EXECUTION_PLAN_V1.md](ENGINEERING_EXECUTION_PLAN_V1.md#milestone-a--navigation--ownership-integrity)
(consolidating `/dashboard/watchlist` and `/dashboard/watchlists` into one
implementation) is a real, already-documented Ownership Principle violation
independent of design work, and should not be indefinitely displaced by the
visual-polish sequence above — it's flagged here so it isn't lost between
the two roadmaps.
