# 07. Engineering Roadmap

> **Status:** ✅ Complete
> **Part of:** [Base Radar Product Bible](00_INDEX.md)
> **Previous:** [← 06. Design System](06_DESIGN_SYSTEM.md) · **Next:** [08. Competitive Analysis →](08_COMPETITIVE_ANALYSIS.md)

---

## Executive Summary

This chapter is a **product execution roadmap** — it exists to communicate strategic sequencing, priorities, dependencies, and release objectives. It is not a sprint plan, not a project-management board, not a task list, and not an implementation specification; those live in [`docs/ROADMAP.md`](../ROADMAP.md), [09. Product Backlog](09_PRODUCT_BACKLOG.md), and [`docs/ARCHITECTURE.md`](../ARCHITECTURE.md) respectively. Every other chapter of the Product Bible answers a "what" or "why" question — [01](01_PRODUCT_STRATEGY.md) why the product exists, [02](02_UX_STRATEGY.md) how it should feel, [03](03_INFORMATION_ARCHITECTURE.md) how it's structured, [04](04_FEATURE_SPECIFICATIONS.md) what it does, [05](05_INTELLIGENCE_FRAMEWORK.md) how it reasons, [06](06_DESIGN_SYSTEM.md) how it looks. This chapter answers the one question none of those chapters can: **in what order, and why that order.**

The governing progression is:

```
Strategy → UX → Information Architecture → Features → Intelligence → Design → Engineering → Release
```

Every release below was validated against this chain before it earned a place on the roadmap — a release is only sequenced here once its user value is already justified by [01](01_PRODUCT_STRATEGY.md), its experience is already shaped by [02](02_UX_STRATEGY.md), its structure already fits [03](03_INFORMATION_ARCHITECTURE.md), its capability is already specified by [04](04_FEATURE_SPECIFICATIONS.md), its reasoning already respects [05](05_INTELLIGENCE_FRAMEWORK.md), and its surface already inherits [06](06_DESIGN_SYSTEM.md). Engineering sequencing never runs ahead of that chain, and it never runs backward through it.

## Roadmap Philosophy

Three commitments govern every release this chapter sequences:

- **Every release must deliver meaningful user value.** A release that ships only internal capability, with no user-observable improvement, is not yet a release — it's unfinished work sitting inside one.
- **Infrastructure enables features; it never becomes the release itself.** Platform work (a new backend, a new sync path, a new provider integration) is justified entirely by what it lets a user do next — never scheduled for its own sake.
- **Every release must answer three questions before it is sequenced:**
  1. **What user problem does this solve?**
  2. **Why is it prioritized now** — what dependency, risk, or opportunity makes this the correct moment?
  3. **What capability does it unlock next** — what does this make possible that wasn't possible before?

A release that cannot answer all three does not belong on this roadmap yet — it belongs in [09. Product Backlog](09_PRODUCT_BACKLOG.md) until it can.

## Roadmap Principles

These principles govern *how* releases are planned and sequenced, distinct from [04. Feature Specifications](04_FEATURE_SPECIFICATIONS.md)'s Feature Design Principles (which govern how an individual feature is designed) and [05. Intelligence Framework](05_INTELLIGENCE_FRAMEWORK.md)'s Design Principles (which govern how intelligence is produced). Where a principle below shares a root idea with one of those chapters, it's named here explicitly rather than re-derived.

### 1. User Value Before Infrastructure

- **Purpose:** Ensure every release is justified by what a user gains, not by what engineering finds tidy to build next.
- **Reasoning:** Infrastructure has a natural gravity — it always feels urgent to the people building it. Left unchecked, a roadmap drifts toward infrastructure-for-its-own-sake releases that never actually reach a user.
- **Example:** **Platform Foundation** below introduces real identity and real cross-device sync — infrastructure, on its face — but it is sequenced first only because it is the direct prerequisite for a user-visible value (their Watchlists and preferences finally belonging to them personally, not to one browser).
- **Expected outcome:** No release ships that a user cannot, in one sentence, say they're better off for.

### 2. Ship Complete Workflows, Not Partial Features

- **Purpose:** Prevent a release from landing a capability that looks finished but leaves a user's task half-done.
- **Reasoning:** A workflow that stops one step short of the outcome a user actually wants (per [02](02_UX_STRATEGY.md#information-consumption-model)'s Headline→Summary→Context→Evidence→Sources→Action model) produces frustration disproportionate to the work saved.
- **Example:** **Portfolio Intelligence** ships real wallet-connect together with the Health/Risk/Diversification synthesis already promised in [04](04_FEATURE_SPECIFICATIONS.md) — never wallet-connect alone, with synthesis deferred to a later release.
- **Expected outcome:** Every release's exit criteria requires an end-to-end user workflow, never a technically-complete but experientially-incomplete one.

### 3. Build for Extensibility, Not Just Today's Need

- **Purpose:** Bias engineering decisions toward foundations that absorb tomorrow's requirement as a registration, not a redesign.
- **Reasoning:** The platform's existing layered architecture (Provider, Intelligence, Personalization, Account, Sync, Connector, Backend Service — see [`docs/ARCHITECTURE.md`](../ARCHITECTURE.md)) was already built this way; this principle keeps every future release consistent with that discipline rather than eroding it under schedule pressure.
- **Example:** **Platform Foundation**'s real backend is designed so that a second real backend, later, is a registration change — exactly how the Connector Layer already treats `LocalConnector` today.
- **Expected outcome:** No release requires an architectural rewrite of a prior release to build on top of it.

### 4. Minimize Technical Debt at the Root

- **Purpose:** Treat technical debt as a root-cause problem to prevent, not a balance to pay down later.
- **Reasoning:** Debt taken on to hit a release date compounds into every subsequent release's risk and cost; it is cheaper to sequence correctly than to schedule a future release solely to repay an earlier shortcut.
- **Example:** **Platform Foundation**'s real backend is held to the same contract-conformance standard the Local Backend already meets, rather than shipping a looser, "we'll harden it later" implementation.
- **Expected outcome:** No release's exit criteria is satisfied by a shortcut that another release must later exist to fix.

### 5. Protect Product Consistency Across Releases

- **Purpose:** Ensure a new release never introduces a surface, term, or pattern that contradicts what [02](02_UX_STRATEGY.md), [03](03_INFORMATION_ARCHITECTURE.md), or [06](06_DESIGN_SYSTEM.md) already establish.
- **Reasoning:** A roadmap that ships fast but inconsistently erodes the exact trust [01](01_PRODUCT_STRATEGY.md#product-philosophy)'s "earned trust over asserted trust" pillar depends on.
- **Example:** **Governance Intelligence** below extends the existing per-project Governance surface into a cross-project one — it does not introduce a second, differently-styled governance concept alongside it.
- **Expected outcome:** A user moving between a pre-release and post-release surface never has to relearn a pattern that looks similar but behaves differently.

### 6. Preserve Trust Above Shipping Speed

- **Purpose:** Make trust a hard constraint on scheduling, not a quality that's traded off when a release is behind.
- **Reasoning:** [05](05_INTELLIGENCE_FRAMEWORK.md#trust-framework)'s Trust Framework and [01](01_PRODUCT_STRATEGY.md#success-metrics)'s Habitual Trust metric both depend on the platform never asserting more confidence, completeness, or capability than it actually has — a pressure this roadmap must never override.
- **Example:** **Narrative Intelligence** below is explicitly bounded by [05](05_INTELLIGENCE_FRAMEWORK.md)'s honesty guardrails before any conversational layer can ship, regardless of how far behind schedule that guardrail work runs.
- **Expected outcome:** No release ever ships a capability that overstates what the platform can actually verify.

### 7. Avoid Premature Optimization

- **Purpose:** Prevent engineering effort from being spent hardening a capability before real usage has shown it needs hardening.
- **Reasoning:** Performance and scale work sequenced ahead of actual demand is speculative cost paid against a need that may never materialize in that shape.
- **Example:** **Project Intelligence**'s Explorer-wide enrichment performance work is sequenced as part of that release specifically *because* enrichment is expanding from one profile to the full Registry at that point — not sequenced earlier, before there's real load to optimize against.
- **Expected outcome:** Performance and scale investment is always traceable to an actual, current release's actual, current load — never a hypothetical future one.

### 8. Iterate Through Validated Learning

- **Purpose:** Treat each release as a hypothesis about user value, not a final answer, and let real usage — not opinion — decide what comes next.
- **Reasoning:** This is the same discipline the [Change Management](#change-management) section below formalizes for the roadmap as a whole; naming it here as a principle makes it binding at the level of an individual release, not just the roadmap's evolution over time.
- **Example:** **Alerts & Personalization**'s exit criteria is explicitly usage-based ("fewer irrelevant notifications, not more total notifications") rather than a ship-and-move-on feature checklist.
- **Expected outcome:** Every release's success criteria is something that can be measured after shipping, not just verified before shipping.

### 9. Sequence by Dependency, Not by Preference

- **Purpose:** Ensure release order reflects what genuinely has to exist first, not which release is simply more exciting to build.
- **Reasoning:** A roadmap that reorders around preference rather than dependency creates hidden rework — a later release quietly needing something an earlier one skipped.
- **Example:** The [Dependency Model](#dependency-model) below is the explicit artifact this principle produces — every release's **Key dependencies** field is checked against it before the release is placed in sequence.
- **Expected outcome:** No release, once sequenced, is later discovered to secretly require an unscheduled release ahead of it.

### 10. A Release Is Never Just Infrastructure *(Non-Negotiable)*

- **Purpose:** Close the loophole Principle 1 leaves open — infrastructure work is permitted to justify a release, but it must never be the entirety of what that release ships.
- **Reasoning:** This is the single guardrail that most directly prevents this roadmap from drifting into an engineering-convenience document. Every release below pairs its infrastructure component with a specific, named, user-facing capability in the same release, never a separate "infrastructure release" with no user-facing exit criteria of its own.
- **Real-world example:** Because of this principle, **Platform Foundation** ships real authentication and real sync *and* the cross-device continuity a user actually experiences from them, in one release — this chapter deliberately does not schedule "backend migration" as its own standalone release with no directly attached user value.
- **Non-Goals:** This principle does not forbid infrastructure-heavy releases — **Platform Foundation** is exactly that. It forbids infrastructure-*only* releases with no accompanying user-facing exit criteria.
- **Expected outcome:** Every release in this chapter, without exception, has at least one exit criterion a user — not an engineer — would recognize as a real improvement.

## Releases

Nine releases are sequenced below. Consistent with this roadmap's own [Quality Rules](#quality-rules), **no release below carries a date** — sequencing communicates order and dependency, not a delivery commitment. A release's number reflects its position in the dependency-driven sequence, not a fixed schedule slot; the [Change Management](#change-management) section below governs how that sequence itself can change.

**A note on sequencing relative to the previous roadmap:** the earlier version of this chapter proposed a *Release/Epic/Feature/PR* engineering breakdown with cloud identity and sync as the immediate next release, followed separately by registry enrichment. This rewrite keeps that same dependency reality but organizes it differently: identity and sync are combined into a single **Platform Foundation** release (rather than two sequential releases), and registry enrichment is absorbed into **Project Intelligence** below, since deepening what the platform knows about each project is exactly what that release theme means. Per this chapter's own permission to adjust sequencing with justification: identity and sync are placed *first*, not last, because [01](01_PRODUCT_STRATEGY.md#long-term-vision), [02](02_UX_STRATEGY.md#future-ux-vision), [03](03_INFORMATION_ARCHITECTURE.md#future-expansion), and [04](04_FEATURE_SPECIFICATIONS.md#settings) already treat real identity as the immediate next foundation — and because every later release in this sequence (Governance Intelligence's cross-device watchlists, Alerts & Personalization's email delivery, Premium Experience's billing, Developer Platform's API keys) depends on identity existing first. Deferring it to a late release would create exactly the kind of hidden dependency Principle 9 above exists to prevent.

### Release 1: Platform Foundation

- **Vision:** Turn the platform's existing local-only foundation — Provider Layer, Intelligence Engines, Personalization, Account, Sync, Connector, and Backend Service layers, each already built as an interface-only contract with only a local implementation registered — into a real, cloud-backed platform for the first time.
- **Primary user value:** A user's identity, Watchlists, and preferences belong to them personally, not to a single browser profile — signing in on a second device shows the same platform state, not a fresh start.
- **Major capabilities:** Real authentication and session lifecycle (Authenticated, Guest, Signed Out, Loading, Expired); a first real Backend Service implementation satisfying the existing Account, Sync, Storage, and Health contracts; genuine cross-device synchronization draining the Sync Queue for the first time; automatic and manual conflict resolution for the rare case two devices disagree; Guest Mode preserved, unchanged, as the default for anyone who never signs in.
- **Key dependencies:** None — this is the foundation every later release in this sequence depends on.
- **Success criteria:** A signed-in user's Watchlists and preferences are identical on a second device without manual re-creation; Guest Mode users experience zero behavior change.
- **Risks:** Real authentication introduces a genuine security surface for the first time in the platform's history; a real backend becoming the source of truth for user data is a materially higher-stakes responsibility than any layer has held before. Both risks are why this release is sequenced first, while the team's full attention can be on it, rather than folded into a later, more crowded release.
- **Exit criteria:** Real identity and real sync are live in production; a full keyboard-only sign-in/sign-out pass has no regressions; no existing Guest-mode workflow behaves differently than it did before this release.

### Release 2: Discovery & Search

- **Vision:** Make finding anything on the platform feel like discovery, not retrieval — realizing [02](02_UX_STRATEGY.md#search-ux-philosophy)'s already-established "search is discovery, not retrieval" principle at full depth.
- **Primary user value:** A user who doesn't know exactly what they're looking for still finds what they need, and their search context follows them across devices.
- **Major capabilities:** Saved searches; search history insights; improved ranking that surfaces relevant results even for an imprecise query; cross-device persistence of saved and recent searches.
- **Key dependencies:** **Release 1** — a saved search needs a real identity and real sync to persist anywhere beyond a single browser.
- **Success criteria:** Measurable reduction in searches that end with no result acted on.
- **Risks:** Over-tuning ranking toward "smart" results could bury an exact-match result a user was confident they'd find immediately — the same failure mode [02](02_UX_STRATEGY.md#search-ux-philosophy) already warns against.
- **Exit criteria:** Saved and recent searches are live, persist across devices via Release 1's sync foundation, and ranking changes are validated against exact-match regressions before shipping.

### Release 3: Project Intelligence

- **Vision:** Deepen what the platform actually knows about each individual project — extending live-provider integration so every Project Registry entry, not just what a Dashboard widget already shows, carries real market and on-chain evidence.
- **Primary user value:** A Project Page — and now every entry across the full Explorer listing — answers "is this healthy" with real, richly-sourced evidence, not a static registry snapshot.
- **Major capabilities:** Registry-to-provider live data binding at read time, using the provider identifiers every project already carries; freshness indicators showing whether a given entry's enrichment is live, cached, or unavailable, per [01](01_PRODUCT_STRATEGY.md#product-principles)'s transparency-about-sourcing principle; confidence and verification labeling extended to work correctly across a full Registry listing, not just a single profile; the performance work needed for that enrichment to stay fast at Explorer scale (the direct product companion to [09](09_PRODUCT_BACKLOG.md)'s "Explorer-wide enrichment performance hardening" backlog item).
- **Key dependencies:** None beyond what's already shipped — this release extends the Provider Layer, a part of the architecture independent of Release 1's Account/Sync work.
- **Success criteria:** Every Registry entry carries live market/on-chain context, not just static identity, without degrading Explorer load time.
- **Risks:** Enriching every Registry entry at once, rather than a single profile at a time, is a genuinely different performance problem — this is why performance hardening is scoped inside this release rather than assumed to come for free.
- **Exit criteria:** Registry-wide enrichment is live and performant across the full Explorer listing, with freshness and confidence labeling visible on every entry.

### Release 4: Portfolio Intelligence

- **Vision:** Connect a user's real on-chain footprint to everything the platform already knows, turning Portfolio from a manual tracker into a second opinion on a user's own holdings.
- **Primary user value:** A user connects a real wallet and immediately sees Health, Risk, and Diversification synthesis read against their actual holdings — not a mock or manually-entered position.
- **Major capabilities:** Real wallet-connect integration; multi-wallet aggregation; historical portfolio performance charting reusing the chart components already built for token and price data.
- **Key dependencies:** **Release 1** — a connected wallet needs a real identity to attach to and real sync to follow the user across devices.
- **Success criteria:** A user can connect a wallet and see accurate, real-time Portfolio Intelligence synthesis without a manual data-entry step.
- **Risks:** Wallet-connect is a genuinely security-sensitive integration surface — the single highest-risk item in this release, requiring its own dedicated security review before shipping, independent of the rest of this release's timeline.
- **Exit criteria:** Real wallet connection is live; Health/Risk/Diversification synthesis reads against real holdings; the security review above is signed off before this release is considered shippable, not treated as a parallel-track afterthought.

### Release 5: Narrative Intelligence

- **Vision:** Deepen the platform's classification and pattern-recognition capability across the ecosystem, extending [05](05_INTELLIGENCE_FRAMEWORK.md#narrative-framework)'s existing Narrative Framework.
- **Primary user value:** Users see the story behind the data — how projects relate, which patterns are forming — not just the underlying numbers.
- **Major capabilities:** Expanded narrative classification depth across a larger set of projects and signals; the first bounded step toward natural-language Q&A over already-computed Intelligence output, gated entirely by [05](05_INTELLIGENCE_FRAMEWORK.md)'s honesty and Traceable Intelligence guardrails before any of it can ship.
- **Key dependencies:** **Release 3** — deeper narrative classification depends on the richer per-project evidence Project Intelligence provides to draw from.
- **Success criteria:** Users report narrative classifications as genuine pattern recognition they act on, not noise they ignore.
- **Risks:** A conversational layer carries real fabrication risk if it answers beyond what the platform has actually computed — this is why [05](05_INTELLIGENCE_FRAMEWORK.md)'s existing guardrails, not this roadmap, are the final gate on whether any part of this capability ships.
- **Exit criteria:** Expanded Narrative Intelligence ships without a single instance of the platform answering a question its own Evidence Framework can't support.

### Release 6: Governance Intelligence

- **Vision:** Graduate Governance from a per-project section into genuine cross-project decision support, extending the structure [03](03_INFORMATION_ARCHITECTURE.md) and [04](04_FEATURE_SPECIFICATIONS.md) already establish.
- **Primary user value:** A user with holdings or watches across many projects sees every pending governance decision that affects them in one place, instead of checking each project individually.
- **Major capabilities:** A cross-project Governance surface (already anticipated in [03](03_INFORMATION_ARCHITECTURE.md) and [09](09_PRODUCT_BACKLOG.md)); participation reminders scaled across every watched project at once, extending the existing Automation rule engine rather than introducing a new one.
- **Key dependencies:** **Release 1** — a genuinely personal, cross-project Governance view depends on a Watchlist that actually syncs across devices, not a per-browser one.
- **Success criteria:** A user never misses a governance decision affecting a project they've explicitly watched.
- **Risks:** Interpretive "impact analysis" remains explicitly out of scope, per the existing honesty caveat already recorded in [04](04_FEATURE_SPECIFICATIONS.md) and [09](09_PRODUCT_BACKLOG.md) — this release must not quietly cross that line under schedule pressure, consistent with Roadmap Principle 6.
- **Exit criteria:** Cross-project Governance ships as informational decision support only — never a voting recommendation, never a predicted outcome.

### Release 7: Alerts & Personalization

- **Vision:** Deepen what's already shipped — Notifications, Automation, and Personalization — rather than introduce a new subsystem alongside them.
- **Primary user value:** A user's alerts feel personally tuned to what they actually watch, not generically broadcast to everyone.
- **Major capabilities:** Opt-in browser push notifications; an email digest option; configurable digest scheduling; per-watchlist alert threshold customization extending the existing per-project alert toggle.
- **Key dependencies:** **Release 1** — delivering an alert outside the app (email, in particular) needs a real identity to have somewhere to send it.
- **Success criteria:** Users who enable deeper personalization report fewer irrelevant notifications — not simply a higher total notification volume.
- **Risks:** Expanding delivery channels must not compromise the strictly-opt-in commitment [04](04_FEATURE_SPECIFICATIONS.md) already establishes for Notifications — today's in-app-only design is a deliberate choice, not a gap to be quietly reversed.
- **Exit criteria:** Every new delivery channel ships opt-in by default; the in-app experience is unchanged for anyone who never opts in.

### Release 8: Premium Experience

- **Vision:** Introduce the platform's first paid tier without compromising the free core, in direct service of [01](01_PRODUCT_STRATEGY.md#product-principles)'s "ecosystem-first, not extractive" principle.
- **Primary user value:** Professional researchers, analysts, and funds get deeper analytics, historical data, and export access; every other user keeps exactly the free core they already have.
- **Major capabilities:** Professional research tooling — deeper analytics, historical data, export access; optional project-facing tooling for teams managing their own Registry presence, per [01](01_PRODUCT_STRATEGY.md#future-expansion)'s existing expansion directions.
- **Key dependencies:** **Release 1** — a paid tier needs a real identity to attach billing and entitlement to.
- **Success criteria:** Free-tier functionality is measurably unchanged — in capability and in experience — after this release ships.
- **Risks:** This release carries the single greatest risk to [01](01_PRODUCT_STRATEGY.md)'s founding mission of any release in this sequence — any monetization decision that narrows the free experience violates that mission and must be rejected regardless of the revenue it would generate.
- **Exit criteria:** A paid tier exists, is entirely optional, and a side-by-side comparison of the free experience before and after this release shows no reduction in capability.

### Release 9: Developer Platform & Ecosystem

- **Vision:** Extend the platform's Registry and intelligence outward to other builders, completing the "infrastructure" half of [01](01_PRODUCT_STRATEGY.md#vision)'s founding Vision.
- **Primary user value:** Third-party builders can depend on Base Radar's verified Registry the same way an end user already does — a canonical, verified answer to "what exists on Base" that other products reference rather than re-derive.
- **Major capabilities:** Registry API access for third-party builders; ecosystem partnerships aligned with the mission, evaluated on the same terms [01](01_PRODUCT_STRATEGY.md#future-expansion) already sets for every other product decision.
- **Key dependencies:** **Release 1** — issuing an API access key requires a real identity, per the dependency [09](09_PRODUCT_BACKLOG.md) already records for this backlog item.
- **Success criteria:** At least one real third-party integration depends on the Registry API in production.
- **Risks:** API access must preserve the same verification and honesty guarantees the first-party product already provides — a lower bar for API consumers would undermine the credibility of the entire Registry, not just the API surface.
- **Exit criteria:** The Registry API ships exposing the same confidence and verification metadata a first-party user already sees — never a stripped-down version of the truth.

## Dependency Model

Four layers of capability, each enabling the next:

- **Foundational capabilities** — already shipped, local-only: the Provider Layer, Intelligence Engines, Personalization Layer, and the Account/Sync/Connector/Backend Service layers in their local-implementation-only form. Every release above builds on top of this layer; none of it is re-sequenced or rebuilt by this roadmap.
- **Platform capabilities** — **Release 1**'s real identity and real cross-device sync. This is the layer that turns "foundational" into "personal" — data that belongs to a user, not a browser.
- **Intelligence capabilities** — **Releases 2 through 6** (Discovery & Search, Project Intelligence, Portfolio Intelligence, Narrative Intelligence, Governance Intelligence), each deepening a different facet of what the already-shipped Intelligence Framework can reason about, once Platform capabilities exist to personalize and persist that reasoning across devices.
- **Premium capabilities** — **Release 8**, monetizing depth on top of the free core without gating it, once the Intelligence layer above has enough depth to be worth paying for more of.
- **Future expansion** — **Release 9** and beyond: the same layered, interface-only architecture absorbing a second real backend, a public API surface, or project-facing tooling as further registrations, not further redesigns — exactly the extensibility discipline Roadmap Principle 3 requires.

Each layer is a genuine prerequisite for the one above it, not merely a suggested order: Intelligence capabilities need Platform capabilities to be personal and persistent; Premium capabilities need Intelligence capabilities deep enough to be worth paying for; Future expansion needs Premium capabilities to prove the platform can sustain paid, external-facing surfaces before extending trust to outside builders.

## Engineering Decision Framework

Before any engineering work begins on a release above, it is evaluated against seven questions:

1. **Does it improve user value?** — checked against [01](01_PRODUCT_STRATEGY.md#success-metrics)'s Success Metrics.
2. **Does it preserve trust?** — checked against [05](05_INTELLIGENCE_FRAMEWORK.md#trust-framework)'s Trust Framework and [01](01_PRODUCT_STRATEGY.md#product-philosophy)'s "earned trust over asserted trust" pillar.
3. **Does it align with UX?** — checked against [02. UX Strategy](02_UX_STRATEGY.md)'s Core UX Principles.
4. **Does it respect Information Architecture?** — checked against [03. Information Architecture](03_INFORMATION_ARCHITECTURE.md)'s Information Ownership rules.
5. **Does it strengthen the Intelligence Framework?** — checked against [05. Intelligence Framework](05_INTELLIGENCE_FRAMEWORK.md)'s Design Principles, never weakening them for schedule convenience.
6. **Can it be explained?** — checked against [05](05_INTELLIGENCE_FRAMEWORK.md#explainability-framework)'s Explainability Framework; a capability that can't be explained to a user isn't ready to ship, regardless of how well it performs.
7. **Can it be maintained?** — checked against [11. Architecture Guardrails](11_ARCHITECTURE_GUARDRAILS.md); a capability that violates a Guardrail is not scheduled, no matter how valuable it looks in isolation.

A release that cannot answer "yes" to all seven is not ready to be sequenced — it moves back to [09. Product Backlog](09_PRODUCT_BACKLOG.md) with a note on which question it failed.

## Feature Maturity Model

Every capability this roadmap sequences moves through the same six stages before it's considered fully shipped:

| Stage | Expectation |
| --- | --- |
| **Concept** | A direction, not a commitment — lives in [09. Product Backlog](09_PRODUCT_BACKLOG.md) at `Idea` status. |
| **Prototype** | Exercised against the existing local foundation (e.g. the Local Backend) to validate the idea before any real dependency is built. |
| **Internal** | Functional but not user-facing — verifiable by the team, not yet exposed to a real user. |
| **Beta** | User-facing, opt-in, and explicitly labeled as such — expectations are set honestly rather than presented as a finished capability. |
| **General Availability** | The default experience for all applicable users — held to the same trust, explainability, and consistency bar as everything else already shipped. |
| **Continuous Improvement** | No capability is "done" at General Availability — it continues to be refined against real usage, per the [Change Management](#change-management) section below. |

A capability does not advance a stage until it meets that stage's expectation in full — a Beta that quietly becomes the default without being relabeled General Availability has skipped a stage, not reached one early.

## Change Management

Roadmaps evolve through evidence, not opinion. The sequence and content of the releases above can change, but only in response to one of six real inputs:

- **User feedback** — direct signal that a release's assumed user value doesn't hold, or holds differently than expected.
- **Analytics** — usage data contradicting an assumption a release's sequencing depended on.
- **Technical constraints** — a dependency assumed to be straightforward turning out not to be, changing what a release actually requires first.
- **Market changes** — a shift in the ecosystem Base Radar serves that changes which capability is actually most urgent.
- **Security** — a vulnerability or risk that requires resequencing regardless of the release's original position.
- **Quality** — a release consistently failing its own exit criteria, signaling it wasn't actually ready to be sequenced where it was.

This is distinct from [09. Product Backlog](09_PRODUCT_BACKLOG.md)'s Idea Intake Process, which governs how new ideas enter consideration; this section governs how an idea already sequenced onto this roadmap can be resequenced or reconsidered. Neither process permits a release to move based on preference alone, consistent with Roadmap Principle 9.

## Success Metrics

This section measures whether the roadmap itself — its sequencing and its releases — is succeeding, distinct from [01](01_PRODUCT_STRATEGY.md#success-metrics)'s product-level Success Metrics and [02](02_UX_STRATEGY.md#success-metrics)'s UX-level ones, which this section draws on rather than repeats:

- **User adoption** — the rate at which users engage with each release's primary capability once it ships.
- **Task completion** — whether [02](02_UX_STRATEGY.md#success-metrics)'s Task Completion metric improves for the workflow each release targets.
- **Time to insight** — whether [01](01_PRODUCT_STRATEGY.md#success-metrics)'s Signal Quality and [02](02_UX_STRATEGY.md#success-metrics)'s Time to Insight metrics improve as Intelligence capabilities deepen.
- **Retention** — whether a release's capability shows up in [01](01_PRODUCT_STRATEGY.md#success-metrics)'s Habitual Trust and Ecosystem Reliance metrics over time, not just at launch.
- **Trust** — whether a release changes a user's confidence in the platform's honesty, per [05](05_INTELLIGENCE_FRAMEWORK.md#trust-framework), for better or worse.
- **Quality** — whether a release ships meeting its own exit criteria on the first attempt, or requires a follow-up release to actually satisfy them.
- **Performance** — whether a release's real-world load behaves the way its Risks section anticipated.
- **Reliability** — whether a release, once at General Availability, continues to behave correctly as later releases build on top of it.

A release that scores well on adoption but poorly on trust, or vice versa, is not a success — every metric above is read together, never in isolation.

## Release Acceptance Checklist

Completing development work is not the same as completing a release. Engineering can finish every line of code a release requires and the release can still not be *done* — done means it satisfies the product, UX, information-architecture, intelligence, design, and quality expectations defined throughout this Product Bible, not merely that its capabilities exist. This checklist is the final validation step before any release above (or any future release this roadmap eventually sequences) is considered production-ready. It is a permanent gate: every release, without exception, is checked against all ten items below before it graduates from "built" to "shipped."

This checklist does not introduce new standards — it operationalizes standards this Product Bible already establishes, gathering them into one place so a release can be checked against all of them at once rather than trusting that each was independently remembered.

### 1. User Value Delivered

- **Purpose:** Confirm the release solves the intended user problem and provides meaningful, user-observable value.
- **Why it matters:** This is Roadmap Principle 1 (User Value Before Infrastructure) and Principle 10 (A Release Is Never Just Infrastructure) made checkable at the finish line rather than only reasoned about at planning time — a release can honor both principles on paper and still drift by the time it ships.
- **Expected outcome:** A user, not just an engineer, can state in one sentence what they're better off for.

### 2. UX Strategy Preserved

- **Purpose:** Confirm the release follows the UX principles defined in [02. UX Strategy](02_UX_STRATEGY.md#core-ux-principles) — no unnecessary complexity, no increased cognitive load.
- **Why it matters:** A release can deliver real user value and still erode the experience it arrives through; [02](02_UX_STRATEGY.md)'s principles exist precisely to catch that tradeoff before it ships, not after users notice it.
- **Expected outcome:** A user familiar with the pre-release product recognizes the new capability's interaction patterns immediately, without relearning anything already established.

### 3. Information Architecture Respected

- **Purpose:** Confirm the release follows [03. Information Architecture](03_INFORMATION_ARCHITECTURE.md#information-ownership)'s Information Ownership rules, [Canonical Entity Types](03_INFORMATION_ARCHITECTURE.md#canonical-entity-types), and [Primary Navigation Structure](03_INFORMATION_ARCHITECTURE.md#primary-navigation-structure).
- **Why it matters:** A release that introduces a new surface without a clear owner, or that reuses an entity type loosely, recreates exactly the ambiguity [03](03_INFORMATION_ARCHITECTURE.md)'s ownership model exists to prevent.
- **Expected outcome:** Every new piece of information the release introduces has exactly one canonical home and a place in the existing navigation structure, not a new one invented for the occasion.

### 4. Intelligence Framework Preserved

- **Purpose:** Confirm every intelligence output the release introduces remains explainable, traceable, evidence-based, confidence-qualified, and source-attributed, per [05. Intelligence Framework](05_INTELLIGENCE_FRAMEWORK.md#intelligence-design-principles) — in particular its [Explainability Framework](05_INTELLIGENCE_FRAMEWORK.md#explainability-framework), [Evidence Framework](05_INTELLIGENCE_FRAMEWORK.md#evidence-framework), [Confidence Framework](05_INTELLIGENCE_FRAMEWORK.md#confidence-framework), and [Source Framework](05_INTELLIGENCE_FRAMEWORK.md#source-framework).
- **Why it matters:** This is where Roadmap Principle 6 (Preserve Trust Above Shipping Speed) is actually enforced rather than merely stated — an intelligence output that can't be traced back to its evidence has failed this gate regardless of how useful it looks.
- **Expected outcome:** Every new Insight or Recommendation the release ships can answer Traceable Intelligence's chain in full — Recommendation, Insight, Evidence, Source — on demand.

### 5. Design System Compliance

- **Purpose:** Confirm all new screens and interactions comply with [06. Design System](06_DESIGN_SYSTEM.md#design-principles) — no one-off UI patterns, no unnecessary visual inconsistency, and Design Debt Prevention remains satisfied.
- **Why it matters:** Design Debt Prevention's own governance rule — reuse or extend an existing pattern, or justify a new one in writing — is only meaningful if it's actually checked at release time; otherwise a bespoke pattern can slip through under schedule pressure and become the next release's inherited debt.
- **Expected outcome:** No new screen introduces a visual or interaction pattern that isn't either already established in [06](06_DESIGN_SYSTEM.md) or explicitly justified as a deliberate, documented extension of it.

### 6. Accessibility Reviewed

- **Purpose:** Confirm accessibility expectations remain satisfied — keyboard navigation, readable hierarchy, clear focus states, inclusive interaction — per [06. Design System](06_DESIGN_SYSTEM.md#accessibility-philosophy).
- **Why it matters:** Accessibility is the expectation most likely to be silently skipped under release pressure precisely because its absence isn't visible to a sighted, mouse-using reviewer moving quickly.
- **Expected outcome:** A full keyboard-only pass of the release's new surfaces completes with no dead end, no invisible focus state, and no interaction reachable only by mouse.

### 7. Documentation Updated

- **Purpose:** Confirm every Product Bible document affected by the release remains accurate — cross-references validated, no stale documentation left behind.
- **Why it matters:** This is the same discipline this chapter's own [Related Documents](#related-documents) sections and every prior chapter's synchronization passes already depend on — a release that changes what a chapter describes without updating that chapter creates exactly the kind of inconsistency the Documentation Steward role exists to prevent.
- **Expected outcome:** Every chapter referencing the capability the release ships describes it accurately, with no dangling reference to a capability, name, or number the release changed.

### 8. Analytics Defined

- **Purpose:** Confirm success metrics and telemetry exist for every significant capability the release introduces, measured against this chapter's own [Success Metrics](#success-metrics) and [01](01_PRODUCT_STRATEGY.md#success-metrics)'s product-level metrics.
- **Why it matters:** Roadmap Principle 8 (Iterate Through Validated Learning) depends on evidence existing to learn from — a release shipped without a way to measure its own outcome cannot be validated after the fact, only assumed.
- **Expected outcome:** Measurement is planned and instrumented before the release ships, never added afterward once someone asks how it's performing.

### 9. Technical Debt Reviewed

- **Purpose:** Confirm any intentional technical debt the release takes on is documented — why it exists, and when it should be addressed — rather than left hidden.
- **Why it matters:** This is the retrospective check on Roadmap Principle 4 (Minimize Technical Debt at the Root): that principle governs debt prevention at planning time, and this item confirms, at the finish line, that any debt actually taken on was a deliberate, recorded decision rather than an undocumented shortcut.
- **Expected outcome:** Every deliberate shortcut a release takes has an owner, a written reason, and a stated condition for when it gets revisited — never a silent gap discovered by a future release.

### 10. Success Criteria Achieved

- **Purpose:** Confirm the release satisfies the specific Success criteria and Exit criteria already defined in its own entry under [Releases](#releases) above.
- **Why it matters:** A release is not complete simply because development is complete — this item exists to catch the gap between "the code is done" and "the release's own stated bar for success was actually met," which is the entire reason each release above defines those criteria in the first place rather than leaving success implicit.
- **Expected outcome:** Every criterion the release's own Releases entry names is verifiably true in production, not merely assumed true because the code shipped.

### Engineering Philosophy

Shipping software is easy. Shipping software users can confidently depend on is difficult, and it is the only kind of shipping this roadmap considers a release complete. A release earns that status only when a user can benefit from it with confidence — not when its last pull request merges. Quality, here, is verified against the ten items above, never assumed because the work looks finished.

### Relationship to Other Product Bible Chapters

This checklist does not introduce a competing standard — it operationalizes standards several other chapters already define, giving each one a checkable moment at release time rather than replacing any of them:

- **[01. Product Strategy](01_PRODUCT_STRATEGY.md)** — Item 1 and Item 8 check the release against the Success Metrics and mission this chapter's own priorities are ultimately in service of.
- **[02. UX Strategy](02_UX_STRATEGY.md)** — Item 2 checks the release against the Core UX Principles directly.
- **[03. Information Architecture](03_INFORMATION_ARCHITECTURE.md)** — Item 3 checks the release against Information Ownership and the Canonical Entity Types.
- **[05. Intelligence Framework](05_INTELLIGENCE_FRAMEWORK.md)** — Item 4 checks every intelligence output the release ships against the Explainability, Evidence, Confidence, and Source Frameworks.
- **[06. Design System](06_DESIGN_SYSTEM.md)** — Item 5 and Item 6 check the release against Design Debt Prevention and the Accessibility Philosophy.
- **[09. Product Backlog](09_PRODUCT_BACKLOG.md)** — this checklist is the release-time counterpart to that chapter's Graduation Criteria; Graduation Criteria decides whether an idea earns a place in a Release, and this checklist decides whether that Release, once built, actually earns its shipped status.
- **[11. Architecture Guardrails](11_ARCHITECTURE_GUARDRAILS.md)** — Item 9's technical debt review is checked against whatever non-negotiable invariants that chapter defines, once populated.

### Non-Goals

This checklist does not replace QA testing, security reviews, code reviews, CI/CD validation, performance testing, release management, or sprint completion — every one of those remains a real, separate, necessary process with its own tooling and ownership. This is a **product-governance checklist**, not an engineering process: it exists to confirm a release honors the Product Bible's product, UX, architecture, intelligence, and design commitments, not to verify that its code is correct, secure, or performant. A release can pass every item above and still fail QA, and a release can pass every engineering process and still fail this checklist — both gates are required, and neither substitutes for the other.

## Future Vision

Beyond the nine releases above, Base Radar's engineering trajectory continues to serve the same two long-term ambitions [01](01_PRODUCT_STRATEGY.md#long-term-vision) already names: a destination good enough to be someone's default, and infrastructure other builders can depend on. This section describes philosophy, not implementation — no specific future release is committed to beyond Release 9, consistent with this chapter's own [Quality Rules](#quality-rules). The same architectural discipline that has held since the platform's local-only foundation — every layer an interface-only contract, every new capability a registration rather than a redesign — is expected to keep holding regardless of what a tenth, eleventh, or twelfth release eventually turns out to be. What changes is depth and reach; what does not change is the platform's obligation to remain explainable, trustworthy, and free at its core, per [01](01_PRODUCT_STRATEGY.md)'s founding mission.

## Quality Rules

This chapter deliberately excludes implementation details, API shapes, database schemas, sprint-level tasks, and dates — all of that detail belongs in [`docs/ARCHITECTURE.md`](../ARCHITECTURE.md), [`docs/ROADMAP.md`](../ROADMAP.md), or [09. Product Backlog](09_PRODUCT_BACKLOG.md). Anything that reads as an engineering task rather than a strategic release belongs in one of those documents instead of here.

## Related Documents

- [01. Product Strategy](01_PRODUCT_STRATEGY.md) — the mission and long-term vision this roadmap sequences platform work toward
- [02. UX Strategy](02_UX_STRATEGY.md) — the experience every release above is validated against before it's sequenced
- [03. Information Architecture](03_INFORMATION_ARCHITECTURE.md) — the structure every release's capabilities must fit into
- [04. Feature Specifications](04_FEATURE_SPECIFICATIONS.md) — the user-facing specification of the capabilities this roadmap sequences
- [05. Intelligence Framework](05_INTELLIGENCE_FRAMEWORK.md) — the reasoning and honesty guardrails several releases above are explicitly bounded by
- [06. Design System](06_DESIGN_SYSTEM.md) — the visual and interaction language every new surface above must inherit
- [08. Competitive Analysis](08_COMPETITIVE_ANALYSIS.md) — the external landscape this sequencing is weighed against
- [09. Product Backlog](09_PRODUCT_BACKLOG.md) — where ideas live before they've earned a place in a numbered Release above
- [11. Architecture Guardrails](11_ARCHITECTURE_GUARDRAILS.md) — the invariants every release above must respect
- [`docs/ROADMAP.md`](../ROADMAP.md) — the authoritative, milestone-level roadmap this chapter sequences in product terms
- [`docs/ARCHITECTURE.md`](../ARCHITECTURE.md) — the implementation-level detail behind the platform work this chapter sequences

---

*This document is part of the [Base Radar Product Bible](00_INDEX.md).*
