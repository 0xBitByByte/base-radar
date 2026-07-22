# 03. Information Architecture

> **Status:** ✅ Complete
> **Part of:** [Base Radar Product Bible](00_INDEX.md)
> **Previous:** [← 02. UX Strategy](02_UX_STRATEGY.md) · **Next:** [04. Feature Specifications →](04_FEATURE_SPECIFICATIONS.md)

---

## Executive Summary

Information architecture answers three questions [01. Product Strategy](01_PRODUCT_STRATEGY.md) and [02. UX Strategy](02_UX_STRATEGY.md) both depend on but neither owns: **what** information exists inside Base Radar, **where** it lives, and **why** it belongs there. Strategy defines what Base Radar is for; UX defines how that intelligence feels to consume; this chapter defines the structure that makes both of those promises keepable — a single, normalized system in which every fact about the Base ecosystem has exactly one home, every page has exactly one purpose, and every future feature has a place to fit before it's built. This is not a site map or a navigation design — [02](02_UX_STRATEGY.md#navigation-philosophy) owns the experience of moving through the product, and this chapter owns the structure that experience moves through. No page should ever need to exist without an answer to "where does this belong in the architecture," and this document is where that answer is decided once, and referenced everywhere else.

## IA Principles

Where a principle below shares a name with a pillar in [02. UX Strategy](02_UX_STRATEGY.md#ux-philosophy), it is the same idea applied to structure rather than experience — named consistently rather than re-argued, per the cross-referencing this chapter is built on.

- **Single Source of Truth.** Every fact about the Base ecosystem has exactly one canonical home. Every other appearance of that fact anywhere in the product is a reference to that home, never an independent copy — this is the structural foundation the [Information Ownership](#information-ownership) model below exists to enforce.
- **Progressive Disclosure (structural).** [02](02_UX_STRATEGY.md#ux-philosophy)'s Progressive Disclosure governs how a single screen reveals depth; this chapter's version governs the [Product Hierarchy](#product-hierarchy) itself — a user can move one level deeper or broader at a time, never forced to jump multiple levels or blocked from reaching one that exists.
- **Signal Before Detail.** The structural counterpart to [02](02_UX_STRATEGY.md#ux-philosophy)'s Signal over Noise: every page in the architecture is organized so its most significant owned information is reachable before its complete inventory is.
- **Context Before Action.** No page presents an action surface before the information architecture has already made that action's context — ownership, evidence, confidence — visible on the same page.
- **Consistency Over Novelty (structural).** The same hierarchy and the same ownership rules apply to every section and every future feature; nothing earns a bespoke structure just for being new.
- **Information Has One Owner.** No fact is ever assigned to two systems of record. This is the single most load-bearing rule in this chapter, detailed fully in [Information Ownership](#information-ownership).
- **Every Page Has One Purpose.** A page exists to answer one primary question about the information it's organized around. A page that cannot state that question in one sentence does not yet belong in this architecture.
- **Every Piece of Data Has a Home.** No feature ships without first mapping onto the [Product Hierarchy](#product-hierarchy) and being assigned exactly one owner. A feature that can't answer "where does this live and who owns it" is not ready to ship, regardless of how ready its interface is.
- **Every Recommendation Is Traceable.** A Recommendation must always be explainable by tracing it backward through Insight → Signal → Evidence → Source — the same chain the [Intelligence Hierarchy](#intelligence-hierarchy) produces forward, and the same Intelligence → Evidence → Sources levels the [Product Hierarchy](#product-hierarchy) already establishes. This is an architectural guarantee, not an AI implementation detail: [05. Intelligence Framework](05_INTELLIGENCE_FRAMEWORK.md) owns how that trace is computed; this chapter owns the guarantee that a trace always exists.

## Product Hierarchy

Every piece of information in Base Radar sits at exactly one level of a single, nested hierarchy:

```
Platform
   ↓
Workspace
   ↓
Dashboard
   ↓
Category
   ↓
Project
   ↓
Entity
   ↓
Intelligence
   ↓
Evidence
   ↓
Sources
```

- **Platform** — Base Radar itself: the whole product, and the only level with no owner other than the product as a whole.
- **Workspace** — a user's own scoped context: today, this is the Account Layer's identity plus whichever Watchlist is marked active and whichever Personalization preferences are set — a Workspace is a lens on the Platform, not a separate container of its own data.
- **Dashboard** — the live, aggregated front door onto whatever the current Workspace scopes into view.
- **Category** — a narrative or sector grouping (see [Taxonomy](#taxonomy)) that a Project can belong to, often more than one at once.
- **Project** — a single, canonical Project Registry entry: an identity, not yet an opinion about that identity.
- **Entity** — something a Project contains that the Platform tracks individually: a contract, a governance proposal, a tracked wallet.
- **Intelligence** — the scored, classified read produced *about* a Project or Entity (a Health Score, a Risk classification, a Narrative), deliberately one level below the thing it describes, never merged into it.
- **Evidence** — the specific real data points that produced a given piece of Intelligence — the same Evidence layer [02](02_UX_STRATEGY.md#information-consumption-model)'s Information Consumption Model asks a user to be able to reach.
- **Sources** — the real providers or systems Evidence traces back to — the terminal, unownable layer everything above ultimately rests on.

This hierarchy exists because each level answers the same underlying question — what's happening on Base — at a different scope, from the entire ecosystem down to the specific proof behind one claim. It is what makes [02](02_UX_STRATEGY.md#core-ux-principles)'s "depth is one click away, never zero and never three" principle structurally possible: because every piece of information sits at a known, single level, moving one level deeper or broader is always a defined, reachable step, never an ad hoc jump. It is also distinct from — and does not replace — the technical layering [11. Architecture Guardrails](11_ARCHITECTURE_GUARDRAILS.md) defines (Provider → Intelligence Engine → Personalization → Account → Sync → Connector → Backend Service): that is how the Platform is *built*; this is how its *information* is *organized*. The two hierarchies describe different things and are not meant to line up level-for-level.

## Canonical Entity Types

Twelve concrete entity types populate the [Product Hierarchy](#product-hierarchy) above. Every feature, page, and workflow in Base Radar is centered around one or more of these — a feature that can't name which of these it's about does not yet have a place in this architecture:

Project, Token, Protocol, Wallet, Portfolio, Watchlist, Narrative, Governance Proposal, Category, Alert, Source, Intelligence Report.

These are the noun forms of the [Information Ownership](#information-ownership) table below — each belongs to exactly one owner from that table, and each one's finite [Taxonomy](#taxonomy) values apply consistently wherever it appears.

## Primary Navigation Structure

Eight primary sections partition the Platform. For each, this chapter defines only what it **owns** and what it deliberately **excludes** — the experience of using each section belongs to [02. UX Strategy](02_UX_STRATEGY.md), and its feature-level behavior belongs to [04. Feature Specifications](04_FEATURE_SPECIFICATIONS.md).

### Dashboard

- **Purpose:** The Platform's front door. See [02](02_UX_STRATEGY.md#dashboard-ux-philosophy) for its full experience philosophy.
- **Primary questions answered:** What changed across everything the current Workspace cares about, right now?
- **Information owned:** None. The Dashboard is a pure aggregation surface — every widget on it displays information owned elsewhere (see [Cross-Page Principles](#cross-page-principles)).
- **Information intentionally excluded:** Single-project depth (Projects), portfolio transaction history (Portfolio), raw search results (Search).

### Projects

- **Purpose:** The canonical registry of what exists on Base.
- **Primary questions answered:** What is this project, structurally — identity, branding, contracts, chains, categories?
- **Information owned:** Project identity and registry metadata; Category and Narrative membership; a project's own governance proposal listings (until Governance graduates into its own primary section per [09. Product Backlog](09_PRODUCT_BACKLOG.md)).
- **Information intentionally excluded:** The computed Health Score, Risk classification, or Narrative read on a project — owned by AI Intelligence, corresponding to the deliberate separation between the Project and Intelligence levels in the [Product Hierarchy](#product-hierarchy) above; a user's personal relationship to the project (Watchlists).

### Portfolio

- **Purpose:** A user's own on-chain footprint, read against the Projects registry for context.
- **Primary questions answered:** What do I hold, and how healthy is it collectively?
- **Information owned:** Wallet holdings; portfolio-level health, risk, and diversification synthesis.
- **Information intentionally excluded:** The per-project Health Score methodology itself (AI Intelligence, only referenced here); Watchlist membership — holding and watching are deliberately distinct actions with distinct owners.

### Watchlists

- **Purpose:** A user's personal, curated lens on the Projects registry.
- **Primary questions answered:** Which projects do I care about, and what's changed for them specifically?
- **Information owned:** Watchlist membership; naming, icon, and color personalization; active-Watchlist state.
- **Information intentionally excluded:** A project's own identity data (Projects, only referenced); portfolio holdings (Portfolio).

### AI Intelligence

- **Purpose:** The scored, evidence-backed read on the ecosystem.
- **Primary questions answered:** What deserves attention, and how confident is that read?
- **Information owned:** Health Scores, Risk classifications, Narrative classifications, Alerts, Daily Brief content, and Automation's evaluated results (the output, not its configuration — see [Information Ownership](#information-ownership)). The Intelligence Timeline is also surfaced here: it merges Alerts, Brief, and Portfolio output into one chronological view, but owns none of the underlying data it displays.
- **Information intentionally excluded:** A project's own identity data (Projects); a user's personal relevance to any given signal (referenced from Watchlists/Portfolio when personalization scoping applies, never duplicated here).

### Search

- **Purpose:** A cross-cutting lens over every owned information type on the Platform.
- **Primary questions answered:** Where do I find something, when I don't know exactly where it lives?
- **Information owned:** Search history; recent and suggested searches; search preferences.
- **Information intentionally excluded:** Everything it searches over. Search indexes information; it never becomes the canonical home for any of it — the structural fact behind why [02](02_UX_STRATEGY.md#search-ux-philosophy) frames search as "discovery, not retrieval."

### Governance

- **Purpose:** Decision support for on-chain governance activity. Today this lives inside each [Project Page](04_FEATURE_SPECIFICATIONS.md); a cross-project Governance section is an anticipated direction, not yet shipped (see [09. Product Backlog](09_PRODUCT_BACKLOG.md)).
- **Primary questions answered:** What's being decided, and does it affect anything I care about?
- **Information owned:** Governance proposal state, voting-period timing, participation reminders.
- **Information intentionally excluded:** A project's own identity (Projects); the narrative or risk interpretation of why a proposal matters beyond its own text (AI Intelligence).

### Settings

- **Purpose:** Where every other section's configuration lives, deliberately separated from the information those sections display.
- **Primary questions answered:** How should each part of the Platform behave for me?
- **Information owned:** Notification preferences, Automation rule enable/disable state, Personalization preferences, Search preferences, Account profile.
- **Information intentionally excluded:** The content those preferences govern — for example, Automation's evaluated results live in AI Intelligence; only whether Automation is *enabled* lives here. This split is the clearest working example of "information has one owner" applied to something that looks, at first glance, like a single feature.

## Secondary Navigation

Secondary navigation organizes access *within* a primary section's own owned information — it never relocates ownership, only changes what's currently visible.

- **Tabs** — partition a single owned information type into views without changing who owns it (a Project Page's tabs reorganize the display of that project's information; they never move any of it to a different owner).
- **Panels** — surface related-but-unowned information alongside a primary view (a panel referencing a project's Watchlist membership does not give Projects ownership of that membership).
- **Context switching** — moving between sibling instances of the same owned type without leaving the section (moving from one Project to another within Projects).
- **Related content** — a pointer to information owned elsewhere, always rendered as a reference, never copied.
- **Cross-navigation** — the deliberate link from a page displaying unowned information back to the page that owns it — the mechanism [Cross-Page Principles](#cross-page-principles) formalizes below.

## Information Ownership

Every information type in Base Radar has exactly one owner. This is the rule the rest of this chapter exists to enforce, and no exception to it is permitted without redefining the type itself.

| Information Type | Owner |
| --- | --- |
| Project identity & registry metadata | Projects |
| Categories & Narrative membership | Projects |
| Health Score, Risk classification, Narrative classification | AI Intelligence |
| Alerts & Daily Brief content | AI Intelligence |
| Automation results (evaluated output) | AI Intelligence |
| Automation configuration (enabled/disabled, rule settings) | Settings |
| Portfolio holdings & portfolio-level synthesis | Portfolio |
| Watchlist membership & personalization | Watchlists |
| Governance proposal state | Governance |
| Search history, recent & suggested searches | Search |
| Notification read/unread state | Notification System (a [Global Component](#global-components)) |
| Account identity & session | Settings |

Two rules keep this table meaningful rather than aspirational:

- **A page may display information it does not own.** The Dashboard displays Health Scores, Alerts, and Portfolio synthesis without owning any of them — see [Cross-Page Principles](#cross-page-principles). Owning a *page* and owning *information* are different claims; this table is only ever about the latter.
- **When one feature appears to need two owners, it is actually two information types.** Automation is the clearest example: its evaluated results (what actually happened) and its configuration (what a user asked it to do) are structurally distinct facts, so they are assigned to distinct owners rather than forcing a single owner to hold both.

## Relationships

- **Categories relate to Projects** many-to-many — a Project can belong to more than one Category, and a Category exists only in relation to the Projects assigned to it.
- **Entities belong to exactly one Project** — a contract, a tracked wallet, or a governance proposal is always traceable to the single Project that contains it.
- **Intelligence describes a Project or Entity** without merging into it — a Health Score references what it's about, it never becomes part of that Project's own identity record.
- **Evidence supports Intelligence**, and **Sources back Evidence** — the same downward chain [02](02_UX_STRATEGY.md#information-consumption-model) already establishes for how a user reads it.
- **Watchlists reference Projects** — a curated subset, never a copy of registry data.
- **Portfolio references Projects** for context on real holdings — the holding itself originates on-chain, not in the registry.
- **Governance proposals belong to a Project**, the same way any other Entity does.
- **Search indexes every relationship above** without participating in any of them — it is a lens across the graph, never a node in it.
- **AI Intelligence consumes raw and processed data about Projects and Entities** and produces Evidence-backed Intelligence as its output — the relationship formalized next, in the [Intelligence Hierarchy](#intelligence-hierarchy).

Chained together, these relationships form the Platform's core information flow: a Category contains Projects, Projects generate Signals, Signals form Narratives, and Narratives inform the portfolio-level synthesis AI Intelligence produces — which the Portfolio page surfaces as Recommendations without ever taking ownership of them, per [Information Ownership](#information-ownership) above. This is a conceptual flow, not a database schema — it describes how information connects across the product, never how it's stored.

## Intelligence Hierarchy

Before any Intelligence reaches the [Information Consumption Model](02_UX_STRATEGY.md#information-consumption-model) a user actually reads, it passes through six structural stages:

```
Raw Data
   ↓
Processed Data
   ↓
Signals
   ↓
Insights
   ↓
Recommendations
   ↓
Actions
```

- **Raw Data** — what a provider actually returns, unmodified.
- **Processed Data** — raw data normalized into a form the Platform can compare and reason about.
- **Signals** — individual, meaningful observations extracted from processed data (a metric crossing a threshold, a new event occurring).
- **Insights** — signals synthesized into a scored, classified read (a Health Score, a Narrative).
- **Recommendations** — an Insight framed as something worth a user's attention.
- **Actions** — what, if anything, a user might do in response — always optional, per [02](02_UX_STRATEGY.md#ux-philosophy).

This is a different hierarchy from [02](02_UX_STRATEGY.md#information-consumption-model)'s Information Consumption Model, not a restatement of it: this chapter's Intelligence Hierarchy is the *production* pipeline — the stages information passes through before it is ever displayed — while 02's model describes how a user *reads* whatever the pipeline eventually produces. The methodology that transforms one stage into the next belongs entirely to [05. Intelligence Framework](05_INTELLIGENCE_FRAMEWORK.md); this chapter owns only the stages themselves and the fact that each is structurally distinct. Users should be able to move through this hierarchy, rather than only ever seeing its final Action, for the same reason [02](02_UX_STRATEGY.md#ux-philosophy)'s Progressive Disclosure exists: trust is earned by making every stage inspectable, not by asking a user to accept a Recommendation on faith.

## Cross-Page Principles

Some information is allowed to appear on more than one page — but it is never *owned* by more than one. Health Scores, Narratives, Watchlist Status, AI Summaries, Alerts, and Recommendations all commonly appear across the Dashboard, Project Pages, and Portfolio simultaneously.

Every one of these cross-page appearances follows the same rule: **it renders as a reference to its owning page, and it always links back there.** A Health Score shown on the Dashboard is the same fact as the Health Score shown on that project's own page — never a separately computed or independently stale copy — and the Dashboard's version always provides a path back to AI Intelligence's canonical record of it. This is [Information Ownership](#information-ownership)'s "one owner" rule extended across pages: appearing in many places is permitted; disagreeing with yourself across those places is not, which is also why [02](02_UX_STRATEGY.md#core-ux-principles)'s "the interface never argues with itself" principle is enforceable in the first place — it would not be, structurally, without this rule.

## Information Density

Different page types warrant different densities, and conflating them is a common source of a page failing at its one purpose:

- **Overview pages** (Dashboard, Projects Explorer) — the lowest density in the Platform. Headline-level only; per-item depth is deliberately deferred to the owning page.
- **Detail pages** (a Project Page, Portfolio) — the full [Information Consumption Model](02_UX_STRATEGY.md#information-consumption-model) depth is available, but still front-loaded, never presented as an undifferentiated wall.
- **Reference pages** (Registry listings, Taxonomy and status legends) — the highest raw density on the Platform. A reference page's entire purpose is completeness, so Signal Before Detail does not apply to it the same way it applies to an Overview page — being exhaustively look-up-able *is* its signal.
- **AI pages** (Daily Brief, Alerts) — prose-first, medium density, with Evidence one layer down per [02](02_UX_STRATEGY.md#ai-experience)'s AI Experience hierarchy.
- **Search pages** (results) — density scales with result count, but the top result always receives full headline-level treatment regardless of how many results exist below it.

## Global Components

Seven components exist outside any single primary section and are available everywhere:

- **Search** — the cross-cutting lens described in [Primary Navigation Structure](#primary-navigation-structure) above, available from anywhere on the Platform.
- **Notifications** — the one place read/unread state for the whole Platform lives, regardless of which section produced the underlying event.
- **Command Palette** — a second entry point into the same ownership model Primary Navigation exposes, never a parallel structure with information of its own — see [02](02_UX_STRATEGY.md#search-ux-philosophy)'s Command Search principle for its experience treatment.
- **Breadcrumbs** — a rendering of a user's current position in the [Product Hierarchy](#product-hierarchy), never an independent navigation structure with its own logic.
- **Status Bar** — live, Platform-level facts (network status, block height, gas) that belong to no single section because they describe the ecosystem itself, not any one owned entity.
- **AI Assistant** — an anticipated global component (see [09. Product Backlog](09_PRODUCT_BACKLOG.md)'s natural-language Q&A item), not yet shipped; when it exists, its architectural role is a query surface over already-owned Intelligence, never a new source of information in its own right.
- **Global Filters** — apply a Workspace's own scoping (active Watchlist, Personalization preferences) across every owned information type at once, so no individual section needs its own filtering logic.

## URL Philosophy

This chapter defines principles, not routes — the actual route table belongs to implementation, not architecture.

- **Stable** — a URL identifying a given entity does not change once assigned.
- **Predictable** — a URL's shape mirrors the entity's position in the [Product Hierarchy](#product-hierarchy), so its structure can be inferred rather than memorized.
- **Human-readable** — an entity's real identity appears in its own URL wherever one exists, rather than an opaque identifier alone.
- **Shareable** — any URL reachable by navigating reloads to the identical state; nothing that can be reached only by clicking is unreachable by a fresh, shared link.

## Taxonomy

A fixed, finite, product-wide vocabulary exists for each of the following. This chapter owns the vocabulary itself — the set of values that are allowed to exist and how they're named — while the methodology that decides which value applies to a specific entity belongs to [05. Intelligence Framework](05_INTELLIGENCE_FRAMEWORK.md).

- **Categories, Tags, Labels** — groupings a Project can belong to, simultaneously and non-exclusively, owned by Projects' Category and Narrative membership.
- **Status** — the finite set of lifecycle states any given entity type can be in (for example, a governance proposal's active/passed/failed states); which state currently applies belongs to whichever system owns that entity.
- **Health, Risk, Confidence** — the finite set of levels or labels for each is defined once, here, and reused identically everywhere it appears; [05](05_INTELLIGENCE_FRAMEWORK.md) defines the methodology that assigns a specific level to a specific Project or Entity.
- **Source Types** — Live, Fallback, and Inferred — the same three trust categories [02](02_UX_STRATEGY.md#ai-experience)'s AI Experience section already names; this chapter's role is ensuring it is the same literal vocabulary everywhere it's used, never reinvented per feature.
- **Verification Levels** — the finite set of Registry verification tiers referenced by [01](01_PRODUCT_STRATEGY.md#product-principles)'s "verification is never for sale" principle, used identically everywhere a Project's verification status appears.

## Metadata Standards

Every entity that has a lifecycle exposes the same common metadata fields, so no future feature ever needs to invent its own version of a fact this common:

- **Updated At** — when this entity's information was last refreshed.
- **Verified** — whether this entity has cleared the Platform's verification process.
- **Confidence** — the evidence-quality qualifier defined in [02](02_UX_STRATEGY.md#ux-philosophy)'s four-question framework.
- **Sources** — which real systems this entity's information traces back to.
- **Category** — which Category grouping(s) this entity belongs to.
- **Status** — this entity's current lifecycle state, drawn from its type's finite [Taxonomy](#taxonomy).
- **Tags** — any additional, non-exclusive labels applied to this entity.

## Future Expansion

The Product Hierarchy above never references a specific feature by name, which is precisely what lets the architecture absorb new work without a redesign: a new primary section (a graduated, cross-project Governance area per [09. Product Backlog](09_PRODUCT_BACKLOG.md)) or a new Workspace-level capability (real authenticated identity, per [07. Engineering Roadmap](07_ENGINEERING_ROADMAP.md)'s Release 1) slots into an existing level of the hierarchy rather than requiring the levels themselves to change. The IA Principle that "every piece of data has a home before it ships" is the actual mechanism that forces this — a feature that can't be placed in this structure isn't rejected by any single rule, it simply reveals which principle above it hasn't satisfied yet.

## Related Documents

- [01. Product Strategy](01_PRODUCT_STRATEGY.md) — the mission and principles this structure exists to serve
- [02. UX Strategy](02_UX_STRATEGY.md) — the experience and navigation philosophy layered on top of this structure
- [04. Feature Specifications](04_FEATURE_SPECIFICATIONS.md) — the feature-level detail for every section this chapter defines the ownership boundaries of
- [05. Intelligence Framework](05_INTELLIGENCE_FRAMEWORK.md) — the methodology behind every Health Score, Risk classification, and Narrative this chapter assigns to AI Intelligence's ownership
- [06. Design System](06_DESIGN_SYSTEM.md) — the visual expression of the components and hierarchy this chapter defines
- [07. Engineering Roadmap](07_ENGINEERING_ROADMAP.md) — the platform work that will extend this architecture over time
- [09. Product Backlog](09_PRODUCT_BACKLOG.md) — where anticipated structural changes (a cross-project Governance section, an AI Assistant) are tracked before they graduate
- [11. Architecture Guardrails](11_ARCHITECTURE_GUARDRAILS.md) — the technical layering this chapter's Product Hierarchy is deliberately distinct from, and the rules that keep this structure from eroding

---

*This document is part of the [Base Radar Product Bible](00_INDEX.md).*
