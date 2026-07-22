# 04. Feature Specifications

> **Status:** ✅ Complete
> **Part of:** [Base Radar Product Bible](00_INDEX.md)
> **Previous:** [← 03. Information Architecture](03_INFORMATION_ARCHITECTURE.md) · **Next:** [05. Intelligence Framework →](05_INTELLIGENCE_FRAMEWORK.md)

---

## Executive Summary

This chapter defines **what** every user-facing capability in Base Radar does. It does not define why the product exists (that is [01. Product Strategy](01_PRODUCT_STRATEGY.md)'s job), how a screen should feel to use (that is [02. UX Strategy](02_UX_STRATEGY.md)'s job), or where a piece of information structurally lives and who owns it (that is [03. Information Architecture](03_INFORMATION_ARCHITECTURE.md)'s job). This chapter is where those three answers converge into a concrete list of capabilities — every capability described below is centered on one or more of [03](03_INFORMATION_ARCHITECTURE.md#canonical-entity-types)'s Canonical Entity Types, follows [02](02_UX_STRATEGY.md)'s UX principles, and serves [01](01_PRODUCT_STRATEGY.md)'s mission. Every future PR should be traceable to at least one section below; a change that isn't is a change without a specified purpose.

## Feature Design Principles

- **Every feature solves a real problem** named in [01. Product Strategy](01_PRODUCT_STRATEGY.md#problem-statement) — not a hypothetical one.
- **Every feature supports Product Strategy.** A feature that doesn't advance the mission or a Success Metric in [01](01_PRODUCT_STRATEGY.md) does not belong here yet.
- **Every feature follows UX Strategy.** No feature is specified in a way that would violate a principle in [02](02_UX_STRATEGY.md#core-ux-principles).
- **Every feature fits within the Information Architecture.** A feature that cannot be assigned a [Canonical Entity Type](03_INFORMATION_ARCHITECTURE.md#canonical-entity-types) and exactly one owner per [03](03_INFORMATION_ARCHITECTURE.md#information-ownership) is not ready to be specified.
- **Features should reduce cognitive load**, never add to it — a feature that requires more thought to use than the problem it solves is a net loss.
- **Features should create actionable intelligence**, not just more data — every feature's output should be usable, not merely informative.
- **Features must be explainable.** A user should be able to ask "why am I seeing this" and get a real answer, per [03](03_INFORMATION_ARCHITECTURE.md#intelligence-hierarchy)'s traceability guarantee.
- **Features must earn trust.** Nothing here claims more certainty than its evidence supports, per [02](02_UX_STRATEGY.md#ux-philosophy)'s confidence-as-a-first-class-concept principle.

## Dashboard

**Purpose:** The Platform's front door — a live, aggregated snapshot of everything the current Workspace cares about. See [02](02_UX_STRATEGY.md#dashboard-ux-philosophy) for the full experience philosophy and [03](03_INFORMATION_ARCHITECTURE.md#primary-navigation-structure) for why it owns none of what it displays.

**User Value:** Answers "is today a normal day" in the time it takes to glance at one screen, without requiring a separate visit to every other section.

**Primary Questions:** What changed? Why does it matter? What deserves my attention today?

**Core Capabilities:**
- An AI-generated summary of the day's most notable signals across TVL, gas, whale activity, launches, and momentum.
- A live status strip of headline network facts (block height, gas price, major asset prices, transaction volume).
- A row of headline KPIs (TVL, active projects, DEX volume, AI-project count).
- A set of widgets, each surfacing a different owned information type (Portfolio, Market Overview, Trending Narratives, Whale Activity, Signals, Narrative Heatmap, Project Spotlight, Activity Feed, Watchlist) without any widget becoming that information's canonical home.

**Success Criteria:** A user can state, within 60 seconds of opening it, whether today is a normal day or not (per [02](02_UX_STRATEGY.md#dashboard-ux-philosophy)'s 60-second standard).

**Non-Goals:** Single-project depth, transaction-level portfolio history, raw search results, or configuration of any kind — the Dashboard tells the user something, it never asks them to set something up.

**Related Chapters:** [02](02_UX_STRATEGY.md#dashboard-ux-philosophy), [03](03_INFORMATION_ARCHITECTURE.md#primary-navigation-structure).

## Search

**Purpose:** A cross-cutting lens over every owned information type on the Platform — discovery, not retrieval, per [02](02_UX_STRATEGY.md#search-ux-philosophy).

**Universal Search:** One entry point searches everything at once — Projects, the Intelligence Timeline, Notifications, Automation results, Portfolio, and the Daily Brief — never a search scoped to a single source by default.

**Natural Language Search:** A query works whether typed as a ticker, a project name, or a plain question about what's happening.

**Discovery:** An empty or exploratory query still surfaces something useful (trending, recent, suggested) rather than a blank invitation.

**Command Search:** The same entry point launches actions (navigate, toggle a setting), not just results.

**Filters:** Results can be scoped by which source produced them (Projects, Timeline, Notifications, Automation, Portfolio, Brief), without ever requiring a filter to get a useful result in the first place.

**Saved Searches:** A query a user expects to run again is stored and reusable without being retyped.

**Recent Searches:** The most recently run queries are available at the entry point itself, before a new query is typed.

**Search Intelligence:** Results are ranked by what the user is most likely trying to accomplish across every source simultaneously — the best match wins the top position regardless of which owned information type it came from.

**Success Criteria:** A search ends in the user finding what they needed, not abandoning the query (per [02](02_UX_STRATEGY.md#success-metrics)'s Search Success metric).

**Non-Goals:** Search does not become the canonical home for anything it returns — it indexes owned information, it never owns any of it (per [03](03_INFORMATION_ARCHITECTURE.md#primary-navigation-structure)).

## Projects

**Purpose:** The canonical registry of what exists on Base — identity, not yet an opinion about that identity (per [03](03_INFORMATION_ARCHITECTURE.md#product-hierarchy)'s Project/Intelligence separation).

**Project Profile capabilities:**
- **Overview** — identity: name, branding, chains, contracts, category and narrative membership.
- **Health** — the AI Intelligence-owned Health Score and Risk classification, displayed here by reference, never recomputed or duplicated (per [03](03_INFORMATION_ARCHITECTURE.md#cross-page-principles)).
- **Activity** — developer, market, and on-chain activity for this project specifically.
- **Narratives** — which classification(s) AI Intelligence currently assigns this project.
- **Timeline** — this project's own chronological history of notable events.
- **Related Projects** — other projects sharing a Category with this one.
- **Sources** — which real providers this project's Evidence traces back to, per [03](03_INFORMATION_ARCHITECTURE.md#product-hierarchy)'s Evidence/Sources levels.
- **Verification** — this project's Registry verification tier, drawn from [03](03_INFORMATION_ARCHITECTURE.md#taxonomy)'s finite Verification Levels vocabulary.

**Success Criteria:** A user reaches "is this project healthy right now" as the Project Page's one answered question (per [02](02_UX_STRATEGY.md#project-page-ux-philosophy)'s reading order), regardless of which of the eight capabilities above they read first.

**Related Chapters:** [02](02_UX_STRATEGY.md#project-page-ux-philosophy), [03](03_INFORMATION_ARCHITECTURE.md#primary-navigation-structure), [05. Intelligence Framework](05_INTELLIGENCE_FRAMEWORK.md).

## AI Intelligence

**Purpose:** The scored, evidence-backed read on the ecosystem. This section defines what capabilities exist; the methodology that computes them belongs entirely to [05. Intelligence Framework](05_INTELLIGENCE_FRAMEWORK.md), and their on-screen treatment belongs to [02](02_UX_STRATEGY.md#ai-experience).

- **Daily Brief** — a searchable, filterable executive summary: a headline, a market summary, top opportunities, and security/governance/development/TVL highlights, emerging narratives, and recommendations.
- **Project Brief** — the per-project equivalent: one front-loaded paragraph summarizing why this specific project's current state matters.
- **Narratives** — the finite set of classifications (Growth, Decline, Security Risk, Accumulation, Development, Governance, Stable) any tracked project or event can be assigned.
- **Market Intelligence** — ecosystem-wide signal (trending narratives, momentum, whale activity) synthesized rather than listed raw.
- **Recommendations** — a Narrative or Insight framed as something worth a user's attention, always phrased as a consideration, never an instruction (per [02](02_UX_STRATEGY.md#ai-experience)).
- **Risk Detection** — the classification and severity of anything that deserves caution.
- **Confidence** — never omitted, appearing everywhere a score, classification, or recommendation does.
- **Evidence** — the specific signals behind any given piece of Intelligence, one interaction away.
- **Source Attribution** — which real systems produced the Evidence behind a given claim.

**Success Criteria:** Every Recommendation is traceable backward through Insight → Signal → Evidence → Source, per [03](03_INFORMATION_ARCHITECTURE.md#ia-principles)'s traceability guarantee — no exceptions.

**Related Chapters:** [02](02_UX_STRATEGY.md#ai-experience), [03](03_INFORMATION_ARCHITECTURE.md#intelligence-hierarchy), [05. Intelligence Framework](05_INTELLIGENCE_FRAMEWORK.md).

## Portfolio

**Purpose:** A user's own on-chain footprint, read against the Projects registry for context — a second opinion on a user's holdings, not a mirror of the Dashboard (per [02](02_UX_STRATEGY.md#portfolio-ux)).

- **Holdings** — what a user actually holds, read against Project identity for context.
- **Health** — one synthesized read on overall portfolio condition, not an unweighted list of individual metrics.
- **Diversification** — how concentrated a portfolio is, described honestly, never prescribed as right or wrong.
- **Risk** — concentrated exposure surfaced plainly, never smoothed over.
- **Opportunities** — framed as noteworthy, escalated to urgent only when a signal is genuinely time-sensitive.
- **Historical Trends** — how portfolio health has changed over time, not just its current state.
- **Recommendations** — produced by AI Intelligence and surfaced here without Portfolio taking ownership of them (per [03](03_INFORMATION_ARCHITECTURE.md#relationships)).

**Success Criteria:** A user can state their portfolio's overall health without needing to inspect every individual holding first.

**Related Chapters:** [02](02_UX_STRATEGY.md#portfolio-ux), [03](03_INFORMATION_ARCHITECTURE.md#primary-navigation-structure).

## Watchlists

**Purpose:** A user's personal, curated lens on the Projects registry (per [02](02_UX_STRATEGY.md#watchlist-ux)).

- **Personal Tracking** — multiple named, user-organized collections of projects, distinct from Portfolio's actual holdings.
- **Smart Alerts** — the Alert Engine scoped specifically to a user's watched projects.
- **AI Monitoring** — AI Intelligence's narrative and risk classification applied continuously to whatever is currently watched.
- **Priority Ranking** — watched items surface in order of their current Notification priority (Critical first), reusing the same finite priority vocabulary [Notifications](#notifications) already defines, never a second one.
- **Daily Changes** — what's different for a watched project since the last visit is the primary value a Watchlist delivers, not its static membership list (per [02](02_UX_STRATEGY.md#watchlist-ux)).
- **Recommendations** — produced by AI Intelligence, surfaced here without duplication, exactly as in Portfolio above.

**Success Criteria:** A returning user can identify what changed among their watched projects without re-reading the whole list.

**Related Chapters:** [02](02_UX_STRATEGY.md#watchlist-ux), [03](03_INFORMATION_ARCHITECTURE.md#primary-navigation-structure).

## Governance

**Purpose:** Decision support for on-chain governance activity. Today this lives inside each Project Page; a cross-project Governance section is an anticipated direction tracked in [09. Product Backlog](09_PRODUCT_BACKLOG.md), not yet shipped — this section specifies both the present and the anticipated capability set honestly, without conflating the two.

- **Proposal Tracking** — active and historical governance proposals for a project, sourced from real on-chain/off-chain governance data.
- **Voting Summary** — a proposal's current tally and voting-period timing.
- **Proposal Intelligence** — a plain-language description of what a proposal actually says, already shipped; a deeper, interpretive read of *why* it matters is intentionally out of scope today (see Impact Analysis below).
- **Impact Analysis** — deliberately limited today: Base Radar does not predict a proposal's outcome or downstream effect, since that risk of overstated certainty is explicitly flagged in [09. Product Backlog](09_PRODUCT_BACKLOG.md)'s "Proposal-outcome prediction" item. What ships today is factual (what's being voted on, by when); interpretive impact analysis remains a backlog item pending [05. Intelligence Framework](05_INTELLIGENCE_FRAMEWORK.md) confidence-model review.
- **Timeline** — a proposal's own chronological history (proposed, voting period, resolution).
- **Recommendations** — participation reminders only, never a voting recommendation — Base Radar informs a decision, it never makes one on a user's behalf.

**Success Criteria:** A user can determine whether a proposal affects anything they care about without leaving the page it's presented on.

**Related Chapters:** [03](03_INFORMATION_ARCHITECTURE.md#primary-navigation-structure), [09. Product Backlog](09_PRODUCT_BACKLOG.md).

## Notifications

**Purpose:** The one place read/unread state for the whole Platform lives, regardless of which section produced the underlying event (per [03](03_INFORMATION_ARCHITECTURE.md#global-components)).

- **Alert Categories** — notifications are grouped by the kind of event that produced them, never presented as an undifferentiated stream.
- **Priority Levels** — a finite, four-tier vocabulary (Critical, High, Medium, Low) applied consistently to every notification regardless of source.
- **Delivery Philosophy** — in-app only today; a notification is never fabricated to fill space, and its priority is never inflated to compete for attention (per [02](02_UX_STRATEGY.md#ai-experience)).
- **Digest** — a rolled-up view for users who prefer periodic review over real-time interruption.
- **Real-time** — an in-app indicator reflecting new activity as it's evaluated, without polling or push notifications today.

**Success Criteria:** A user can distinguish something genuinely urgent from routine activity without reading every notification individually.

**Related Chapters:** [03](03_INFORMATION_ARCHITECTURE.md#global-components), [09. Product Backlog](09_PRODUCT_BACKLOG.md) (browser push and email digest are tracked there as anticipated extensions).

## Settings

**Purpose:** Where every other section's configuration lives, deliberately separated from the information those sections display (per [03](03_INFORMATION_ARCHITECTURE.md#primary-navigation-structure)).

- **Account** — a user's local profile today; real authenticated identity is anticipated with [07. Engineering Roadmap](07_ENGINEERING_ROADMAP.md)'s Release 1 (Platform Foundation).
- **Preferences** — per-section behavioral toggles (search history, dashboard filtering) that govern how, not what, information is shown.
- **Personalization** — active-Watchlist selection and the scoping preferences that apply it across Dashboard, Search, and every other section.
- **Notifications** — per-type notification preferences; the enable/disable state, never the notification content itself.
- **Privacy** — today, inherent to the local-only model (nothing leaves the device without a real backend to send it to); becomes a meaningful, distinct settings surface once Release 1 introduces real cloud identity.
- **Security** — the same honest caveat as Privacy: session and credential security become a real, distinct capability only once real authentication exists.
- **Connected Accounts** — not yet a real capability; anticipated once a real Backend (per [07. Engineering Roadmap](07_ENGINEERING_ROADMAP.md)'s Release 1) exists for an account to be "connected" to.

**Success Criteria:** A user can find and change any preference governing their own experience without needing to understand how that preference is implemented.

**Related Chapters:** [03](03_INFORMATION_ARCHITECTURE.md#primary-navigation-structure), [07. Engineering Roadmap](07_ENGINEERING_ROADMAP.md), [11. Architecture Guardrails](11_ARCHITECTURE_GUARDRAILS.md).

## Feature Relationships

This is a usage flow between features — distinct from [03. Information Architecture](03_INFORMATION_ARCHITECTURE.md#relationships)'s data-relationship model, which describes how entities relate structurally, not how a user moves between the features built on them:

```
Dashboard
   ↓
Search
   ↓
Projects
   ↓
AI Intelligence
   ↓
Portfolio
   ↓
Governance
   ↓
Notifications
```

A user typically orients via the Dashboard, uses Search when the Dashboard doesn't already surface what they're after, lands on a Project once found, consults AI Intelligence to interpret what they're looking at, checks Portfolio to see whether it's personally relevant, checks Governance if a decision is pending, and receives Notifications going forward so they never have to repeat the same search. Each arrow exists because the feature above it answers a narrower question than the one below it can — the chain is a widening, not arbitrary, sequence of "what," "where," "what does it mean," "does it affect me," "is anything decided," "keep me posted."

## Feature Lifecycle

Distinct from the flow above (a single session's path) and from [03](03_INFORMATION_ARCHITECTURE.md#intelligence-hierarchy)'s Intelligence Hierarchy (how data becomes an Insight): this describes how a user relates to Base Radar over time.

```
Discover
   ↓
Monitor
   ↓
Understand
   ↓
Decide
   ↓
Act
   ↓
Review
```

A user **discovers** a project (via Search or the Registry), begins to **monitor** it (adds it to a Watchlist), comes to **understand** it (via its Project Page and AI Intelligence's read), reaches a point where they **decide** something matters (via Portfolio or a Recommendation), **acts** on that decision outside the Platform (a real on-chain action Base Radar never performs on their behalf), and later **reviews** the outcome (via Portfolio history or the Timeline). Users move through this lifecycle at their own pace and can re-enter at any stage — nothing in Base Radar forces linear progression through it.

## Cross-Feature Rules

Every rule below already exists in full in the chapter that owns it; this list exists only as a feature-level compliance checklist, not a restatement:

- **Features never duplicate ownership.** (Owned by [03](03_INFORMATION_ARCHITECTURE.md#ia-principles) — "Information Has One Owner.")
- **Features always reference canonical entities.** (Owned by [03](03_INFORMATION_ARCHITECTURE.md#canonical-entity-types).)
- **AI always exposes evidence.** (Owned by [02](02_UX_STRATEGY.md#ai-experience) — the Summary → Evidence → Confidence → Sources hierarchy.)
- **Confidence is always visible.** (Owned by [02](02_UX_STRATEGY.md#core-ux-principles) — Core UX Principle 2.)
- **Sources are always available.** (Owned by [03](03_INFORMATION_ARCHITECTURE.md#product-hierarchy) — the Evidence/Sources levels.)
- **Recommendations are actionable.** (Owned by [02](02_UX_STRATEGY.md#ux-philosophy) — every screen's fourth question, "what should I do next.")
- **Navigation never owns information.** (Owned by [03](03_INFORMATION_ARCHITECTURE.md#information-ownership) — "a page may display information it does not own.")

## Future Features

A new feature earns a section in this chapter only after it can answer four questions — this chapter's own gate, distinct from [09. Product Backlog](09_PRODUCT_BACKLOG.md)'s Graduation Criteria, which governs *scheduling*, not *specification readiness*:

1. Which [Canonical Entity Type](03_INFORMATION_ARCHITECTURE.md#canonical-entity-types) is it centered on?
2. Who owns the information it introduces, per [03](03_INFORMATION_ARCHITECTURE.md#information-ownership)?
3. Which [02](02_UX_STRATEGY.md) UX principles does it need to satisfy?
4. What is its one Success Criterion?

A feature idea that can't yet answer all four belongs in [09. Product Backlog](09_PRODUCT_BACKLOG.md), not here.

## Related Documents

- [01. Product Strategy](01_PRODUCT_STRATEGY.md) — the mission and problems every feature above exists to serve
- [02. UX Strategy](02_UX_STRATEGY.md) — the experience philosophy every feature above is held to
- [03. Information Architecture](03_INFORMATION_ARCHITECTURE.md) — the ownership boundaries and canonical entities every feature above is organized around
- [05. Intelligence Framework](05_INTELLIGENCE_FRAMEWORK.md) — the scoring, risk, and confidence methodology behind AI Intelligence's capabilities above
- [06. Design System](06_DESIGN_SYSTEM.md) — the visual expression of every capability described above
- [07. Engineering Roadmap](07_ENGINEERING_ROADMAP.md) — the platform work several anticipated capabilities above (Settings' Account/Privacy/Security/Connected Accounts) depend on
- [08. Competitive Analysis](08_COMPETITIVE_ANALYSIS.md) — the market gaps several capabilities above (AI Intelligence, Portfolio) are positioned to close
- [09. Product Backlog](09_PRODUCT_BACKLOG.md) — where a feature idea lives before it can answer this chapter's [Future Features](#future-features) gate
- [11. Architecture Guardrails](11_ARCHITECTURE_GUARDRAILS.md) — the non-negotiable rules every feature above must not violate

---

*This document is part of the [Base Radar Product Bible](00_INDEX.md).*
