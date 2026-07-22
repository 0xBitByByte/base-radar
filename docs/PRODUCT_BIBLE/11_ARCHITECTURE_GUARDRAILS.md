# 11. Architecture Guardrails

> **Status:** ✅ Complete
> **Part of:** [Base Radar Product Bible](00_INDEX.md)
> **Previous:** [← 10. Release Plan](10_RELEASE_PLAN.md) · **Next:** [12. Glossary →](12_GLOSSARY.md)

---

## Executive Summary

This chapter defines the permanent architectural rules that protect Base Radar as it evolves. It is not an architecture specification, not a system design document, not an implementation guide, and not API documentation — those live in [`docs/ARCHITECTURE.md`](../ARCHITECTURE.md) and [`docs/API.md`](../API.md). This chapter defines the architectural *principles* every future engineering decision must respect, at the same product-governance level [07. Engineering Roadmap](07_ENGINEERING_ROADMAP.md) and [10. Release Plan](10_RELEASE_PLAN.md) already operate at, applied specifically to system structure rather than to release sequencing or shipping.

Base Radar's architecture will change many times over the product's life — new providers, new capabilities, eventually a real backend where today only a local one exists. What must never change is the product's identity: a platform that remains **understandable, maintainable, extensible, reliable, trustworthy, consistent, explainable,** and **composable** no matter how much it grows. Architecture is allowed to evolve freely; it is never allowed to evolve *away from* these qualities. Every future feature, service, integration, and refactor is expected to remain compatible with the guardrails below — not because a specific technology is mandated, but because these qualities are what let the product keep being the product as everything underneath it changes.

## Architecture Philosophy

Eight commitments govern every architectural decision:

- **Architecture serves the product.** No structural decision is justified by its own elegance — only by what it makes possible for a user.
- **User value before technical elegance.** A less elegant solution that serves users better always wins over a more elegant one that doesn't.
- **Complexity must justify itself.** Every layer, abstraction, or indirection must earn its place by solving a real problem, not a hypothetical one.
- **Composition over duplication.** A new need is met by combining or extending what already exists wherever possible, never by building a parallel version of it.
- **Evolution over replacement.** Stable systems are extended, not torn out and rebuilt, unless what exists can no longer serve the product at all.
- **Trust before optimization.** Performance and efficiency are never pursued at the cost of the honesty and reliability a user depends on.
- **Every layer has one responsibility.** A layer that does two unrelated things is two layers wearing one name.
- **Explainability is architectural.** A system a user can trust is one whose behavior can be traced and explained — this is a structural property, not something added after the fact.

The [Architectural Principles](#architectural-principles) below give each of these full operational depth, in the same relationship [07](07_ENGINEERING_ROADMAP.md#roadmap-philosophy)'s Roadmap Philosophy has to its Roadmap Principles, and [10](10_RELEASE_PLAN.md#release-philosophy)'s Release Philosophy has to its Release Principles.

## Architectural Principles

### 1. Single Responsibility

- **Purpose:** Ensure every architectural component does exactly one job, and is understandable by that job alone.
- **Reasoning:** This is Architecture Philosophy's "every layer has one responsibility" made checkable at the level of an individual component, not just a whole layer — a component with two responsibilities is harder to reason about, test, and safely change than two components with one each.
- **Real-world example:** The Provider Layer's responsibility is acquiring external data; the Intelligence layer's responsibility is reasoning about it. Neither has ever been asked to do the other's job, which is why either can change without the other needing to.
- **Expected outcome:** Any component can be described in one sentence, and that sentence never contains the word "and."

### 2. Loose Coupling

- **Purpose:** Ensure components depend on each other through stable contracts, never on each other's internal details.
- **Reasoning:** A component that reaches into another's internals can be broken by a change that was never meant to affect it — loose coupling is what makes it possible to change one thing without having to reason about everything that touches it.
- **Real-world example:** The Sync Engine depends on a Connector's `push()`/`pull()` contract, never on how a specific Connector implementation actually moves data — exactly why a Connector can be swapped without the Sync Engine itself changing.
- **Expected outcome:** No component's internal change requires a change anywhere else that only depended on its contract.

### 3. High Cohesion

- **Purpose:** Ensure everything inside a single component genuinely belongs together, related by a shared purpose rather than convenience.
- **Reasoning:** Cohesion is loose coupling's complement — a system can have perfectly decoupled components that are each internally incoherent; this principle is what keeps a component's own contents meaningful, not just its boundary with others.
- **Real-world example:** The Account Layer holds identity and session state together because they are genuinely one concept from a user's perspective — not because it was convenient to put them in the same place.
- **Expected outcome:** Removing any piece of a cohesive component would break the concept it represents, not just remove a feature bolted onto it.

### 4. Stable Interfaces

- **Purpose:** Ensure the contracts components depend on change far less often than the implementations behind them.
- **Reasoning:** A stable interface is what lets everything built on top of a component keep working while the component itself evolves underneath — instability at this level cascades into every consumer at once.
- **Real-world example:** The Backend Service Layer's four contracts (Account, Sync, Storage, Health) have not changed since they were first defined, even as the implementations behind them have gone from a single local one to real, production-grade ones.
- **Expected outcome:** A new implementation of an existing contract never requires that contract itself to change.

### 5. Replaceable Implementations

- **Purpose:** Ensure any implementation behind a stable interface can be swapped for another without the rest of the system noticing.
- **Reasoning:** This is what actually makes Stable Interfaces (Principle 4) valuable in practice — an interface that's stable but has only ever had one possible implementation hasn't yet proven it enables replacement, only that it hasn't been tested.
- **Real-world example:** `LocalConnector` and `LocalBackend` are today's only registered implementations of their respective contracts specifically so that a real Connector or Backend, later, is a registration change rather than a redesign, per [07](07_ENGINEERING_ROADMAP.md#roadmap-principles)'s "Build for Extensibility" principle.
- **Expected outcome:** Introducing a second implementation of an existing contract requires no change to any consumer of that contract.

### 6. Provider Abstraction

- **Purpose:** Ensure the rest of the system never depends directly on any single external data source's specific shape or behavior.
- **Reasoning:** External providers change, rate-limit, and occasionally disappear; a system that depends on their raw shape directly breaks every time they do. Abstraction is what lets the system depend on a stable, internal shape instead.
- **Real-world example:** The Provider Layer normalizes every external source into the platform's own internal data shape before anything else in the system ever sees it — no downstream component has ever needed to know which specific API a given fact came from to use it.
- **Expected outcome:** Adding, removing, or replacing an external provider never requires a change to any component outside the Provider Layer itself.

### 7. Clear Ownership

- **Purpose:** Ensure every architectural capability has exactly one component responsible for it.
- **Reasoning:** This is the architecture-level counterpart to [03](03_INFORMATION_ARCHITECTURE.md#information-ownership)'s Information Ownership — that chapter ensures every piece of *information* has one product-surface owner; this principle ensures every *capability* has one architectural home implementing it. The [Ownership Principles](#ownership-principles) section below gives this full treatment.
- **Real-world example:** Session and identity logic lives in the Account Layer alone — no other component independently tracks or decides whether a user is signed in.
- **Expected outcome:** No capability is ever implemented in two places that could plausibly disagree with each other.

### 8. Composable Systems

- **Purpose:** Ensure new capabilities are built by combining existing components in new ways wherever possible, rather than building new components that duplicate what already exists.
- **Reasoning:** This is Architecture Philosophy's "composition over duplication" made structural — a platform that composes grows in capability without growing in the number of things that can independently go wrong.
- **Real-world example:** Automation's rule engine, per [07](07_ENGINEERING_ROADMAP.md#releases)'s Alerts & Personalization release, is extended rather than replaced to support new delivery channels — the existing engine is composed with a new channel, not duplicated for it.
- **Expected outcome:** A new capability's design starts by asking what already exists that it could extend, before asking what needs to be built new.

### 9. Backward Compatibility

- **Purpose:** Ensure evolving a component never silently breaks something that already depended on it.
- **Reasoning:** This is the architectural expression of [10](10_RELEASE_PLAN.md#release-principles)'s Release Principle 8 (Protect Existing Workflows) — a workflow can only stay protected at the release level if the architecture underneath it actually preserves compatibility as it changes.
- **Real-world example:** Every migration runner in the Account and Sync layers exists specifically so a schema change never leaves an existing user's data unreadable — compatibility is carried forward explicitly, never assumed.
- **Expected outcome:** No architectural change requires every consumer of the changed component to be updated in lockstep for the system to keep working.

### 10. Evidence Preservation

- **Purpose:** Ensure the architecture itself never discards the traceability [05. Intelligence Framework](05_INTELLIGENCE_FRAMEWORK.md#intelligence-design-principles) requires.
- **Reasoning:** Evidence, Confidence, and Source data are only as trustworthy as the architecture that carries them — a system design that drops or flattens this data anywhere in its pipeline makes honesty impossible further downstream, regardless of how carefully 05's principles are followed in isolation.
- **Real-world example:** Every stage of the Intelligence Pipeline is required to pass its evidence and sourcing forward, never to summarize it away before the next stage.
- **Expected outcome:** No architectural refactor of the Intelligence pipeline ever reduces what a Recommendation can be traced back to. The [Intelligence Preservation](#intelligence-preservation) section below gives this its full treatment.

### 11. Failure Isolation

- **Purpose:** Ensure a failure in one component degrades gracefully rather than cascading into components that had nothing to do with it.
- **Reasoning:** A tightly coupled system turns one provider's outage into a platform-wide failure; an isolated one turns it into a single, honestly-labeled gap, per [02](02_UX_STRATEGY.md)'s existing commitment that missing data is disclosed, never hidden behind a blank wall.
- **Real-world example:** A single external provider becoming unavailable degrades only the specific data that provider supplies — it has never taken down an unrelated feature that doesn't depend on it.
- **Expected outcome:** Any single component's failure is contained to what it alone was responsible for.

### 12. Observability

- **Purpose:** Ensure the system's actual behavior can always be seen and understood, not just inferred from its outputs.
- **Reasoning:** A system that can't be observed can't be trusted to be debugged, explained, or improved with confidence — this is the architectural precondition for [10](10_RELEASE_PLAN.md#post-release-evaluation)'s Post-Release Evaluation to be possible at all.
- **Real-world example:** The Sync Layer's diagnostics exist specifically so a sync conflict or failure can be understood after the fact, not just noticed.
- **Expected outcome:** No architectural component exists as a black box whose behavior can only be guessed at from the outside.

### 13. Explainability Is Architectural

- **Purpose:** Ensure a user-facing explanation of *why* the system behaved a certain way is always structurally possible to produce, not something bolted onto a component after the fact.
- **Reasoning:** This is Architecture Philosophy's "explainability is architectural" commitment given full principle depth — [05](05_INTELLIGENCE_FRAMEWORK.md#explainability-framework)'s Explainability Framework can only ever be as strong as the architecture beneath it allows.
- **Real-world example:** Every Recommendation the platform surfaces can be traced back through Insight, Evidence, and Source, per [05](05_INTELLIGENCE_FRAMEWORK.md)'s Traceable Intelligence principle — a guarantee only possible because the architecture carries that chain forward at every stage, not because the UI happens to display it.
- **Expected outcome:** Explainability never requires a special-case addition to a component after the fact — it is already possible because of how the component was structured from the start.

### 14. Architecture Serves the Product *(Non-Negotiable)*

- **Purpose:** Close the loophole every principle above leaves open on its own — that a technically sound architectural decision could still be the wrong one if it doesn't actually serve the product.
- **Reasoning:** This is the permanent guarantee underneath all thirteen principles above, in the same relationship [07](07_ENGINEERING_ROADMAP.md#roadmap-principles)'s "A Release Is Never Just Infrastructure" has to its own numbered list, and [10](10_RELEASE_PLAN.md#release-integrity)'s Release Integrity has to Release Principles. No architectural decision is ever justified purely by technical merit, novelty, or convenience — every one of them is ultimately in service of [01](01_PRODUCT_STRATEGY.md)'s mission, or it does not belong in this system.
- **Real-world example:** An architecturally elegant redesign that provides no path to a clearer user benefit is not scheduled, regardless of how much it would improve engineering convenience — consistent with [07](07_ENGINEERING_ROADMAP.md#roadmap-principles)'s "User Value Before Infrastructure" applied at the level of architecture itself, not just release scope.
- **Non-Goals:** This principle does not forbid architecture-heavy work — Principles 1 through 13 above describe real, substantial architectural discipline. It forbids architecture work that cannot point to a product reason for existing.
- **Expected outcome:** Every architectural decision, without exception, can be traced back to a product reason a user — not just an engineer — would recognize as worthwhile.

## Architectural Integrity *(Permanent Architecture Principle)*

**Every architectural decision should leave Base Radar easier to understand, easier to extend, easier to maintain, and easier to trust — not merely more technically sophisticated.** Architectural Integrity is the permanent commitment that protects the product from gradual architectural erosion: the slow, decision-by-decision accumulation of complexity that no single change seems responsible for, but that compounds over time into a system nobody can safely reason about anymore. Architecture evolves through simplification and thoughtful extension, never through sophistication for its own sake.

This principle complements [Principle 14](#architectural-principles) (Architecture Serves the Product) rather than restating it. That principle asks whether an architectural decision serves a real product reason; Architectural Integrity asks the next question — given that it does, does the decision leave the architecture itself *healthier* afterward, or merely different. A change can pass the first test and still fail the second: a decision can serve genuine user value while still being implemented in a way that quietly erodes long-term maintainability. Architectural Integrity is the guard against that specific failure mode, and it is why this principle sits outside the numbered list above rather than as its fifteenth entry — it governs the cumulative, long-term health the fourteen principles above collectively produce at each individual decision, not a fifteenth individual decision rule of its own.

Every architectural change should strengthen one or more of the following:

- **Simplicity**
- **Maintainability**
- **Extensibility**
- **Understandability**
- **Reliability**
- **Consistency**
- **Explainability**
- **Testability**
- **Observability**
- **Trustworthiness**

These ten qualities are not a new checklist alongside the [Architectural Principles](#architectural-principles) above — they are the qualities those fourteen principles already exist to produce. Architectural Integrity is the commitment to protecting them *over time*, as the system grows, not a fifteenth practice to apply at any single decision. **Architectural sophistication that creates no measurable product value is avoided, regardless of how technically impressive it is.**

### Why This Matters

- **Sustainable engineering** — a system that improves as it grows can keep growing; one that only accumulates complexity eventually can't.
- **Reduced architectural drift** — without an explicit, permanent commitment to it, a system's architecture drifts away from its own principles one convenient exception at a time.
- **Lower maintenance costs** — a healthier architecture costs less to safely change, release after release.
- **Easier onboarding** — a system that stays understandable is one a new contributor can actually learn, rather than one only its original authors can safely touch.
- **Better collaboration** — a shared, legible architecture is one multiple people can work in at once without stepping on each other's assumptions.
- **Safer refactoring** — a system that has stayed simple is one that can still be safely changed; a system that has silently accumulated complexity becomes too risky to touch.
- **Faster future development** — every future feature is faster to build in an architecture that hasn't eroded than in one that has.
- **Long-term product quality** — the product a user experiences can only stay as good as the architecture underneath it remains.
- **Trustworthy engineering decisions** — a team that consistently protects architectural health earns the same kind of trust [01](01_PRODUCT_STRATEGY.md#product-philosophy)'s "earned trust over asserted trust" pillar describes for the product itself.

### Real-World Examples

**Example 1 — A proposed abstraction is rejected because it solves no current or foreseeable problem.** Avoiding unnecessary abstraction strengthens the architecture because every abstraction has an ongoing cost — a concept every future contributor must now learn — and that cost is only worth paying once a real, not hypothetical, problem justifies it. This is Architecture Philosophy's "complexity must justify itself" applied specifically to the temptation to build for a future that may never arrive.

**Example 2 — A shared capability is extracted into a reusable platform service after repeated, well-understood usage patterns emerge.** This improves Architectural Integrity because the abstraction is earned by real, observed repetition rather than anticipated in advance — the opposite order from Example 1's rejected abstraction, and the reason both examples are consistent with the same principle rather than in tension with each other.

**Example 3 — A provider integration is added through the existing provider abstraction instead of creating a new integration pathway.** This preserves architectural consistency because it keeps Provider Abstraction (Principle 6) a genuine guarantee rather than a rule with exceptions — the moment one integration bypasses it, the abstraction stops being something the rest of the system can actually rely on.

**Example 4 — A complex subsystem is simplified without changing user-visible behavior.** Reducing complexity is valuable architectural progress in its own right, exactly as [10](10_RELEASE_PLAN.md#release-integrity)'s Release Integrity already establishes for a release with no visible feature — a system that got simpler got better, even though a user watching the surface would never notice.

**Example 5 — An architectural shortcut is postponed because it would violate dependency rules or ownership boundaries.** Protecting architectural integrity is more valuable than short-term implementation speed because a shortcut that crosses a dependency or ownership boundary doesn't just cost time later — it quietly reopens a question (whose responsibility is this, really?) that [Dependency Rules](#dependency-rules) and [Ownership Principles](#ownership-principles) exist specifically to keep permanently closed.

### Expected Outcomes

- Architecture remains understandable, no matter how much the product grows around it.
- Future contributors learn the system faster, because it hasn't quietly become more complex than its own principles describe.
- Refactoring becomes safer, because a healthier architecture is one that can still be confidently changed.
- Features integrate predictably, because the system they're built on hasn't eroded into a collection of special cases.
- Technical debt grows more slowly, because Architectural Integrity is a standing check against the specific decisions that create it.
- User trust is preserved, because the engineering quality underneath the product a user experiences stays consistently high, release after release.

### Relationship to Other Product Bible Chapters

- **[01. Product Strategy](01_PRODUCT_STRATEGY.md#long-term-vision)** — architecture should reinforce the long-term vision, staying healthy enough to keep serving it as it grows, not just at the moment of a single decision.
- **[03. Information Architecture](03_INFORMATION_ARCHITECTURE.md#information-ownership)** — Architectural Integrity is what keeps [Ownership Principles](#ownership-principles) genuinely true over time, preserving the ownership boundaries that chapter depends on rather than letting them blur through accumulated shortcuts.
- **[05. Intelligence Framework](05_INTELLIGENCE_FRAMEWORK.md)** — Traceable Intelligence depends on a stable architecture; an architecture that erodes is one where the evidence chain [Intelligence Preservation](#intelligence-preservation) above protects can quietly start to fray.
- **[06. Design System](06_DESIGN_SYSTEM.md#design-principles)** — design consistency depends on architectural consistency; [Design Preservation](#design-preservation) above can only hold if the architecture underneath it isn't drifting.
- **[07. Engineering Roadmap](07_ENGINEERING_ROADMAP.md#releases)** — every release should improve, never weaken, the platform underneath it — the release-by-release expression of this principle's system-wide commitment.
- **[10. Release Plan](10_RELEASE_PLAN.md#release-integrity)** — Release Integrity depends on Architectural Integrity: a release can only leave the *product* in a better state if the architecture it's built on is itself left in a better state at the same time.

### Non-Goals

Architectural Integrity does not define programming languages, frameworks, libraries, folder structures, deployment architecture, cloud infrastructure, microservices, database design, or any other implementation detail — all of that remains out of scope for this chapter, per its own Executive Summary. This principle defines **architectural governance only**: a permanent commitment to the system's long-term health, never a technical prescription for achieving it.

## Architectural Layers

Base Radar's architecture is described here as six conceptual layers, each with one responsibility, never as a specific implementation:

```
Presentation → Experience → Intelligence → Application → Provider → Infrastructure
```

- **Presentation** — what a user actually sees and interacts with; responsible for rendering and interaction only, per [06. Design System](06_DESIGN_SYSTEM.md)'s visual and interaction language.
- **Experience** — the state a user's session carries: personalization, watchlists, account, and preferences, per [04. Feature Specifications](04_FEATURE_SPECIFICATIONS.md)'s capability specifications.
- **Intelligence** — scoring, narrative classification, confidence, and recommendation synthesis, per [05. Intelligence Framework](05_INTELLIGENCE_FRAMEWORK.md)'s Design Principles.
- **Application** — orchestration and business logic connecting Experience to Provider — the layer real identity, sync, and backend services live in, per [07](07_ENGINEERING_ROADMAP.md#releases)'s Platform Foundation release.
- **Provider** — acquisition of external data, normalized into the platform's own internal shape before anything else depends on it, per Principle 6 (Provider Abstraction) above.
- **Infrastructure** — what Provider and Application ultimately read from or write to: external APIs and any real backend a Connector or Backend implementation connects to.

These layers describe responsibility, not file structure or technology choice — the concrete systems named throughout this Product Bible and detailed in [`docs/ARCHITECTURE.md`](../ARCHITECTURE.md) each sit within exactly one of them.

## Dependency Rules

- **Allowed direction:** Each layer above may depend only on the layer(s) directly below it in the chain above — Presentation depends on Experience, Experience on Intelligence, Intelligence on Application, Application on Provider, Provider on Infrastructure.
- **Prohibited direction:** No layer may depend on the layer above it. Infrastructure never depends on Provider's abstractions; Provider never depends on Intelligence's scoring logic; no lower layer is ever aware that a higher one exists.
- **Prohibited shortcut:** A layer may not reach past the layer directly below it to depend on one further down — Presentation depending directly on Provider, skipping Experience and Intelligence entirely, is exactly the kind of shortcut this rule exists to prevent.
- **Why this matters:** A strict, one-directional dependency chain is what makes every principle above actually enforceable. Loose Coupling and Replaceable Implementations only hold if a lower layer can never be quietly depended upon by something two layers above it — a shortcut dependency is a hidden coupling that this rule prevents from ever forming in the first place.

This is described entirely in terms of responsibility and direction, never in terms of specific technology, framework, or folder structure.

## Ownership Principles

- **Every capability has one owner.** Exactly one component is responsible for implementing any given capability — never a capability split silently across two places that could drift out of agreement.
- **Every responsibility has one home.** A responsibility that seems to need two homes is actually two responsibilities, mirroring the same distinction [03](03_INFORMATION_ARCHITECTURE.md#information-ownership)'s Information Ownership already draws for Automation's evaluated results versus its configuration.
- **Avoid duplicate logic.** The same rule, calculation, or decision is never independently implemented in two places — it is implemented once, and depended upon everywhere it's needed.
- **Avoid competing sources of truth.** No two components are ever each allowed to claim authority over the same fact — this is the architectural precondition for [05](05_INTELLIGENCE_FRAMEWORK.md#design-principles)'s "One Fact, One Interpretation" principle to be possible at all.

This is the architecture-level counterpart to [03. Information Architecture](03_INFORMATION_ARCHITECTURE.md)'s Information Ownership: that chapter ensures every piece of product-facing *information* has one owner; this section ensures every architectural *capability* implementing that information has one home. The two are companions, not restatements of each other.

## Extensibility Philosophy

- **New capabilities should extend architecture, not sidestep it.** A new need is met by adding to the existing layered structure — a new Provider, a new Backend implementation, a new Intelligence domain — never by building a separate system alongside it that solves the same class of problem differently.
- **Avoid replacing stable systems.** A stable system is retired only once it can no longer serve the product at all, per Principle 5 (Replaceable Implementations) — replacement is the last resort, not the default response to a new requirement.
- **Evolution should preserve compatibility.** Growth never comes at the cost of Principle 9 (Backward Compatibility) — a system that grows by breaking what already worked has not actually grown, it has traded one set of capabilities for another.

This is the architectural expression of [07](07_ENGINEERING_ROADMAP.md#roadmap-principles)'s "Build for Extensibility, Not Just Today's Need" and directly protects [10](10_RELEASE_PLAN.md#release-integrity)'s Release Integrity commitment to Maintainability — a release can only honor that commitment if the architecture beneath it was actually built to be extended rather than replaced.

## Integration Philosophy

- **Loose coupling** — any new provider or external service integrates behind Principle 6's (Provider Abstraction) normalization boundary, never by threading its specific shape through the rest of the system.
- **Replaceable providers** — a new integration is built so it could later be swapped for an equivalent one without the rest of the system changing, per Principle 5.
- **Graceful degradation** — an external service becoming unavailable degrades only the specific capability it supplies, per Principle 11 (Failure Isolation), and is disclosed honestly rather than hidden, consistent with [05](05_INTELLIGENCE_FRAMEWORK.md#design-principles)'s "Absence of Data Is Reported, Never Guessed."
- **Vendor independence** — the platform is never architecturally dependent on any single external vendor's continued existence or specific behavior, precisely because Provider Abstraction and Replaceable Implementations already require every external dependency to sit behind a stable, internal boundary.

This matters because external services are, by definition, outside the platform's control — every integration built this way is one the platform can survive losing, degrade honestly from, or replace, without that risk ever reaching a user as a broken experience rather than a disclosed, temporary gap.

## Intelligence Preservation

Architecture protects [05. Intelligence Framework](05_INTELLIGENCE_FRAMEWORK.md) by guaranteeing, structurally, what that chapter already requires in principle:

- **Evidence must remain traceable** — carried forward through every layer an Insight or Recommendation passes through, never summarized away in transit, per Principle 10 (Evidence Preservation) above.
- **Confidence must remain visible** — a confidence qualifier attached to a fact travels with that fact everywhere it goes, never dropped by an intermediate layer that didn't think it was relevant.
- **Sources must remain available** — the origin of any fact is retrievable at the point it's finally presented, not just at the point it was first acquired.
- **Explainability must never be lost** — per Principle 13 (Explainability Is Architectural) above, the ability to explain a Recommendation is a structural guarantee, not a feature that can be quietly dropped during a refactor.

**Architecture should preserve intelligence, never reinterpret it.** A layer that touches an Insight or Recommendation on its way to a user is permitted to carry it forward faithfully; it is never permitted to alter its meaning, soften its confidence, or omit its sourcing to make it simpler to render. This is what makes it structurally possible for [07](07_ENGINEERING_ROADMAP.md#release-acceptance-checklist)'s Release Acceptance Checklist Item 4 (Intelligence Framework Preserved) to actually be satisfiable at release time — that checklist item verifies a release honored this guarantee; this section is what makes honoring it architecturally possible in the first place.

## Design Preservation

Architecture protects [06. Design System](06_DESIGN_SYSTEM.md) the same way it protects Chapter 05 — by guaranteeing the structural conditions consistency actually depends on:

- **Consistent presentation** — the Presentation layer draws from one shared visual and interaction language, never a feature-specific reinterpretation of it.
- **No feature-specific UI systems** — a new feature extends the existing component and interaction vocabulary rather than inventing its own, per [06](06_DESIGN_SYSTEM.md#design-principles)'s Design Debt Prevention principle.
- **No parallel design systems** — there is exactly one design system, never a second one growing quietly alongside it for "just this one case."
- **Shared interaction patterns** — the same gesture, control, or feedback pattern behaves identically everywhere it appears, per [06](06_DESIGN_SYSTEM.md#design-principles)'s "Consistency Is a Promise, Not a Preference."

This section is the architectural precondition for [07](07_ENGINEERING_ROADMAP.md#release-acceptance-checklist)'s Release Acceptance Checklist Item 5 (Design System Compliance) to be satisfiable — a Presentation layer built any other way would make that checklist item impossible to honor at release time, no matter how carefully any individual release tried to comply.

## Engineering Decision Framework

Before any architectural change is adopted, it is evaluated against eight questions. Four of these are shared with [07](07_ENGINEERING_ROADMAP.md#engineering-decision-framework)'s own Engineering Decision Framework — restated here rather than only cross-referenced, because they apply at the scope of an architectural decision itself, not only at the scope of a release built on top of one:

1. **Does it improve user value?** — the same test [07](07_ENGINEERING_ROADMAP.md#engineering-decision-framework) applies to a release, applied here to the architectural decision underneath it.
2. **Does it simplify the system?** — new, architecture-specific: a change that adds complexity must justify that cost against Architecture Philosophy's "complexity must justify itself."
3. **Does it preserve trust?** — checked against [05](05_INTELLIGENCE_FRAMEWORK.md#trust-framework)'s Trust Framework, the same standard 07 applies at the release level.
4. **Does it respect Information Architecture?** — checked against [03](03_INFORMATION_ARCHITECTURE.md#information-ownership)'s Information Ownership rules.
5. **Does it strengthen the Intelligence Framework?** — checked against [Intelligence Preservation](#intelligence-preservation) above, never weakening it for architectural convenience.
6. **Can it evolve safely?** — new, architecture-specific: checked against Principle 9 (Backward Compatibility) and the [Extensibility Philosophy](#extensibility-philosophy) above.
7. **Can it be maintained?** — the same long-term-cost question 07 asks of a release, asked here of the architecture itself.
8. **Should it become part of the platform?** — new, architecture-specific: a one-off solution to a single problem is not automatically promoted to a permanent architectural pattern; it earns that status only if it will genuinely be reused.

A change that cannot answer "yes" to all eight is not ready to be adopted as architecture — it may still exist as a narrow, contained solution to the immediate problem, but it does not earn a permanent place in the layers above.

## Architectural Review Checklist

This is the architecture-level counterpart to [07](07_ENGINEERING_ROADMAP.md#release-acceptance-checklist)'s Release Acceptance Checklist — applied to an architectural change itself (a new layer, pattern, or integration) rather than to a release built on top of one. It does not replace that checklist; a release can still require both, at different scopes:

- **Single responsibility maintained** — the change doesn't leave any component responsible for more than one job.
- **Dependencies respected** — the change follows the [Dependency Rules](#dependency-rules) above in both direction and shortcut avoidance.
- **Ownership preserved** — the change doesn't create a second home for a capability or fact that already has one, per [Ownership Principles](#ownership-principles) above.
- **No duplicate logic** — the change doesn't reimplement a rule or calculation that already exists elsewhere.
- **Intelligence preserved** — the change honors [Intelligence Preservation](#intelligence-preservation) above in full.
- **Design consistency maintained** — the change honors [Design Preservation](#design-preservation) above in full.
- **Documentation updated** — every Product Bible chapter and implementation-level document affected by the change remains accurate.
- **Extensibility maintained** — the change can itself be extended later without requiring replacement, per [Extensibility Philosophy](#extensibility-philosophy) above.
- **Performance considered** — the change's real-world cost has been reasoned about, not assumed to be negligible.
- **Maintainability improved** — the change leaves the system easier, not harder, to safely change again in the future.

## Architectural Anti-Patterns

- **God objects** — a single component that knows or does far more than one responsibility justifies, violating Principle 1 (Single Responsibility) until no one can safely reason about everything it affects.
- **Circular dependencies** — two or more components depending on each other in a loop, violating the [Dependency Rules](#dependency-rules)' one-directional chain and making it impossible to change one without the other.
- **Feature-specific frameworks** — a new, parallel abstraction built to serve one feature alone, violating Principle 8 (Composable Systems) and the [Design Preservation](#design-preservation) rule against parallel design systems.
- **Hidden business logic** — a rule or decision buried inside a component whose stated responsibility doesn't include making it, making the system's real behavior undiscoverable from its own structure.
- **Tight coupling** — a component reaching into another's internal details rather than its stable contract, violating Principle 2 (Loose Coupling) and making both components fragile to each other's changes.
- **Duplicate providers** — two independent integrations acquiring the same external data differently, violating Principle 6 (Provider Abstraction) and creating two sources of truth for one fact.
- **Multiple sources of truth** — the same fact tracked independently in two places, violating [Ownership Principles](#ownership-principles) above and creating the possibility the two disagree.
- **Architecture by convenience** — a structural decision made because it was easiest to build today, not because it was right for the product, violating Principle 14 (Architecture Serves the Product).
- **Premature abstraction** — an interface built to support a future need that doesn't yet exist, violating Architecture Philosophy's "complexity must justify itself" by paying an abstraction's cost before its benefit is real.
- **Unexplained complexity** — any structural decision that can't be justified in terms a reviewer can evaluate, violating Principle 13 (Explainability Is Architectural) at the level of the architecture's own design, not just its user-facing output.

## Future Architecture Vision

As Base Radar's architecture grows to include a real backend, deeper intelligence capabilities, and eventually a public API surface per [07](07_ENGINEERING_ROADMAP.md#releases)'s later releases, the guardrails above are expected to hold regardless of what specific technology ends up implementing them. This section describes that trajectory in principle, not in technology: the same layered, one-directional, ownership-respecting structure that has held since the platform's local-only foundation is expected to keep holding as Infrastructure gains a second real Backend, as Intelligence deepens per [07](07_ENGINEERING_ROADMAP.md#future-vision)'s own Future Vision, and as the platform eventually extends trust to external builders through a public Provider-adjacent surface. What changes is scale and reach; what does not change is the guarantee that every layer still has one responsibility, every capability still has one owner, and every architectural decision still serves [01](01_PRODUCT_STRATEGY.md)'s founding mission.

## Related Documents

- [01. Product Strategy](01_PRODUCT_STRATEGY.md) — the mission every architectural decision is ultimately in service of
- [02. UX Strategy](02_UX_STRATEGY.md) — the experience principles Failure Isolation and Provider Abstraction exist to protect
- [03. Information Architecture](03_INFORMATION_ARCHITECTURE.md) — the Information Ownership model this chapter's Ownership Principles extend to the architecture level
- [04. Feature Specifications](04_FEATURE_SPECIFICATIONS.md) — the capabilities the Experience and Application layers implement
- [05. Intelligence Framework](05_INTELLIGENCE_FRAMEWORK.md) — the honesty and traceability guarantees Intelligence Preservation exists to protect structurally
- [06. Design System](06_DESIGN_SYSTEM.md) — the consistency guarantees Design Preservation exists to protect structurally
- [07. Engineering Roadmap](07_ENGINEERING_ROADMAP.md) — the release sequencing this chapter's guardrails constrain, and the Release Acceptance Checklist this chapter's Intelligence and Design Preservation sections make satisfiable
- [09. Product Backlog](09_PRODUCT_BACKLOG.md) — where architectural ideas are captured before they earn a place in the layers above
- [10. Release Plan](10_RELEASE_PLAN.md) — the release-level governance this chapter's architecture-level governance underlies
- [`docs/ARCHITECTURE.md`](../ARCHITECTURE.md) — the implementation-level detail these guardrails constrain
- [`docs/API.md`](../API.md) — the implementation-level API detail this chapter deliberately stays agnostic to

---

*This document is part of the [Base Radar Product Bible](00_INDEX.md).*
