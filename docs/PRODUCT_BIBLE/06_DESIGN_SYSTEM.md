# 06. Design System

> **Status:** ✅ Complete
> **Part of:** [Base Radar Product Bible](00_INDEX.md)
> **Previous:** [← 05. Intelligence Framework](05_INTELLIGENCE_FRAMEWORK.md) · **Next:** [07. Engineering Roadmap →](07_ENGINEERING_ROADMAP.md)

---

## Executive Summary

This chapter defines how Base Radar looks, behaves, communicates, and feels — its visual philosophy, interaction principles, consistency standards, accessibility commitments, and communication system. It is not a component library, not Figma documentation, not CSS or Tailwind documentation, and not implementation documentation of any kind; the actual color tokens, type scale, and component implementation live in [`docs/DESIGN_SYSTEM.md`](../DESIGN_SYSTEM.md) and [`docs/DESIGN_SYSTEM_V1.md`](../DESIGN_SYSTEM_V1.md), which this chapter's philosophy governs rather than restates.

Consistency is not a stylistic preference for an intelligence platform — it is a trust mechanism. [05. Intelligence Framework](05_INTELLIGENCE_FRAMEWORK.md) can produce a perfectly honest, evidence-backed Insight, and a design that presents it inconsistently, decorates it past recognition, or visually overstates its confidence can still betray that honesty on the way to the screen. This chapter exists so that never happens: every future screen is built against the same visual philosophy, so a user's trust in one part of the product transfers to every other part rather than having to be re-earned screen by screen. The interface exists to reveal insight, never to compete with it — every principle below exists in service of that one sentence.

## Design Philosophy

Several pillars below share a name with a principle already established in [01](01_PRODUCT_STRATEGY.md#product-philosophy), [02](02_UX_STRATEGY.md#ux-philosophy), or [03](03_INFORMATION_ARCHITECTURE.md#ia-principles). Where they do, this is that same value expressed visually — named consistently, not re-argued.

- **Intelligence Before Decoration.** Nothing on screen exists to look impressive; everything exists to make an Insight clearer.
- **Clarity Before Density.** The visual expression of [02](02_UX_STRATEGY.md#ux-philosophy)'s Signal over Noise and [03](03_INFORMATION_ARCHITECTURE.md#ia-principles)'s Signal Before Detail: a screen is judged on how quickly it can be read, never on how much it can hold.
- **Calm Before Excitement.** The interface's default register is composed, not energetic — excitement is earned by genuinely significant events, never manufactured by design.
- **Purpose Before Aesthetics.** A visual choice is justified by what it communicates, never by what looks current.
- **Consistency Builds Trust.** The visual counterpart to [02](02_UX_STRATEGY.md#ux-philosophy) and [03](03_INFORMATION_ARCHITECTURE.md#ia-principles)'s Consistency over Novelty: a returning user's visual memory of the product is never invalidated for freshness's sake.
- **Motion Serves Understanding.** Animation exists to explain a change, never to entertain during one — detailed in [Motion Philosophy](#motion-philosophy) below.
- **Visual Hierarchy Reveals Importance.** The visual mechanism behind [02](02_UX_STRATEGY.md#core-ux-principles)'s "the most important thing is always the biggest thing" — detailed in [Visual Hierarchy](#visual-hierarchy) below.
- **Minimalism With Meaning.** Restraint is a discipline, not an absence — every element that remains on screen earns its place; nothing is removed that a user actually needs.
- **Professional Over Playful.** Base Radar reads as a trading or analyst tool, never a consumer novelty app — consistent with [01](01_PRODUCT_STRATEGY.md#product-principles)'s "craft as a feature."
- **Design Should Reduce Cognitive Load.** The visual expression of [04](04_FEATURE_SPECIFICATIONS.md#feature-design-principles)'s "features should reduce cognitive load" — a screen that requires effort to parse has already failed regardless of how accurate its content is.

## Design Principles

Thirteen principles translate the philosophy above into standards specific enough to hold any screen accountable.

### 1. Visual Weight Matches Real Significance

- **Purpose:** Size, color intensity, and position on screen are assigned strictly in proportion to actual significance.
- **Reasoning:** This is the visual technique behind [02](02_UX_STRATEGY.md#core-ux-principles)'s Core UX Principle 3 — that principle states the rule; this one defines how size, color, and position actually deliver it.
- **Real-world example:** A security-risk classification is rendered larger and more visually prominent than a decorative follower count, on every screen it appears on.
- **Expected user outcome:** A user scanning quickly sees what matters most first, without reading a single word.

### 2. Whitespace Is Structure, Not Emptiness

- **Purpose:** The space between elements is used deliberately to group related information and separate unrelated information.
- **Reasoning:** Whitespace is a hierarchy tool; removing it to fit more in does not increase information, it destroys the structure that made the information readable.
- **Real-world example:** A Health Score and its supporting factors are visually grouped by proximity, not just by a shared heading.
- **Expected user outcome:** A user understands what belongs together before reading a single label.

### 3. One Visual Language, Every Screen

- **Purpose:** The same visual vocabulary — spacing, weight, color meaning — applies identically whether a user is on the Dashboard, a Project Page, or Settings.
- **Reasoning:** A second, slightly different visual dialect for the same concept is how a user starts to distrust the first one.
- **Real-world example:** A Risk badge looks and behaves identically on the Dashboard, a Project Page, and inside Portfolio.
- **Expected user outcome:** A pattern learned once is recognized everywhere.

### 4. Color Communicates Meaning, Never Decorates

- **Purpose:** Every use of color on screen carries a specific, learnable meaning; nothing is colored for visual variety alone.
- **Reasoning:** A color palette used decoratively trains users to stop trusting color as a signal, defeating its entire purpose.
- **Real-world example:** A Risk classification's color is drawn from the same finite, meaningful palette [Color Philosophy](#color-philosophy) below defines — never an arbitrary accent color chosen for a specific screen.
- **Expected user outcome:** A user can read a screen's overall tone from color alone, before reading any text.

### 5. Every Interactive Element Looks Interactive

- **Purpose:** Anything a user can click, expand, or select is visually distinguishable from something they cannot.
- **Reasoning:** An interface where static and interactive elements look alike forces a user to discover functionality by trial and error.
- **Real-world example:** A "View Queue" action and a static status label are never rendered with the same visual weight and styling.
- **Expected user outcome:** A user always knows, before clicking, whether something is clickable.

### 6. Motion Has a Job or It Doesn't Exist

- **Purpose:** Every animation explains, orients, confirms, or guides — detailed in [Motion Philosophy](#motion-philosophy) below. Motion with none of those four jobs does not ship.
- **Reasoning:** Motion without a job is decoration wearing the costume of feedback, and it costs a user attention for nothing in return.
- **Real-world example:** A dialog's entrance animation confirms it opened; nothing animates purely because the interface was otherwise still.
- **Expected user outcome:** A user's attention is only ever pulled by motion that means something.

### 7. Density Matches Purpose, Not Habit

- **Purpose:** How much a screen shows is decided by [Information Density](#information-density) below, never carried over from another screen out of convention.
- **Reasoning:** A Reference page and an Overview page have opposite correct densities; treating them the same fails one of them by design.
- **Real-world example:** A Registry listing is deliberately denser than the Dashboard that links to it.
- **Expected user outcome:** Every screen feels appropriately full, never overwhelming or sparse for its actual purpose.

### 8. Typography Is a Hierarchy Tool, Not a Style Choice

- **Purpose:** Type weight and size exist to establish reading order, never to express a design mood.
- **Reasoning:** If typographic hierarchy doesn't match actual informational hierarchy, a user's eye is led somewhere the content doesn't support.
- **Real-world example:** A Project's Health Score reads larger than the timestamp of when it was last updated, every time, regardless of screen.
- **Expected user outcome:** A user's eye naturally lands on what matters most first, without conscious effort.

### 9. Icons Reinforce, Never Replace

- **Purpose:** An icon adds a recognizable visual shortcut to a label; it never stands in for the label entirely where meaning would otherwise be ambiguous.
- **Reasoning:** An icon's meaning is learned, not universal — relying on it alone excludes anyone who hasn't yet learned it.
- **Real-world example:** A Risk icon appears alongside the word "Risk," never as the only indication of what a badge means.
- **Expected user outcome:** No user is ever left guessing what a symbol means.

### 10. Charts Reveal Truth, Never Flatter It

- **Purpose:** A chart's scale, axis, and framing are chosen to represent the underlying data accurately, never to make a trend look better or worse than it is.
- **Reasoning:** A chart is itself a claim about the data; a distorted chart is a fabricated claim in exactly the sense [05](05_INTELLIGENCE_FRAMEWORK.md#trust-framework)'s Trust Framework prohibits in words.
- **Real-world example:** A price chart's Y-axis always starts from a value chosen for accurate representation, never truncated specifically to exaggerate a move.
- **Expected user outcome:** A user can trust a chart's shape to mean what it appears to mean.

### 11. Every State Has a Visual Signature

- **Purpose:** Loading, empty, error, and success states are each immediately visually distinguishable from one another, never a variation on the same generic look.
- **Reasoning:** A user glancing at a screen should be able to tell which state they're in without reading text, per [Feedback Philosophy](#feedback-philosophy) below.
- **Real-world example:** A loading skeleton, an empty-state illustration, and an error message never share the same visual shape.
- **Expected user outcome:** A user's eye tells them what kind of state they're looking at before they read a word of it.

### 12. Confidence Is Never Visually Overstated

- **Purpose:** The visual prominence given to a conclusion never exceeds what [05](05_INTELLIGENCE_FRAMEWORK.md#confidence-framework)'s Confidence Framework actually supports.
- **Reasoning:** A low-confidence Insight rendered with the same bold visual authority as a high-confidence one is a design lie, even when the underlying text is scrupulously honest — this is the entire subject of [Trust by Design](#trust-by-design) below.
- **Real-world example:** A tentative, low-confidence Recommendation is never given the same visual weight as a well-evidenced one, regardless of how much more interesting it might look.
- **Expected user outcome:** A user's visual impression of certainty always matches the Platform's actual, disclosed certainty.

### 13. Consistency Is a Promise, Not a Preference

- **Purpose:** Once a visual pattern is established for a concept, it is never changed casually or inconsistently applied elsewhere.
- **Reasoning:** Every inconsistency asks a returning user to re-learn something they already knew, which is a real cost even when the new version is arguably "better."
- **Real-world example:** A change to how Risk is visually represented is applied everywhere Risk appears, in the same release, never rolled out screen by screen.
- **Expected user outcome:** A user's learned visual vocabulary keeps working for the life of the product.

### 14. Design Debt Prevention *(Permanent)*

- **Purpose:** Base Radar evolves through intentional design, never accidental design. Every new screen, interaction, component, layout, workflow, or visual pattern must either reuse an existing Design System pattern, or extend the Design System with a documented rationale and become part of it. A one-off solution never becomes a permanent fixture.
- **Reasoning:** This is the governance mechanism that produces Design Principle 3's "one visual language, every screen" and protects Design Principle 13's "consistency is a promise" from eroding one shortcut at a time. Consistency is treated as a product asset the team actively maintains, not a design limitation to work around.
- **Real-world example:** A new feature that needs a card is built with the existing Card pattern (per [Component Philosophy](#component-philosophy) below), not a bespoke layout designed to fit that one screen slightly better.
- **Expected user outcome:** A pattern a user learned on one screen keeps working, unquestioned, on every screen built afterward.

**Why uncontrolled variation creates product debt.** Every one-off pattern is a small, compounding cost paid by everyone who touches the product afterward: **user familiarity** erodes each time a concept is represented a new way instead of the way already learned; **predictable interactions** require a pattern to behave the same way everywhere it appears, which a new interaction model for the same concept breaks; **faster feature development** depends on new work reusing decisions already made rather than re-deciding the same questions from scratch each time; **easier maintenance** follows directly from fewer, well-understood patterns, since every additional one-off is one more thing that must be separately understood and kept correct; **lower cognitive load** for users is only possible if the visual vocabulary they've already learned keeps applying; **team scalability** depends on a documented system new contributors can build from rather than requiring them to rediscover or guess at decisions the product already made; **product quality** is a function of consistency at least as much as it is a function of any single screen's polish; **brand consistency** is what makes Base Radar recognizably itself across every surface; and **trust through consistency** is not a slogan — per the Design Philosophy above, every unnecessary deviation is a small, real withdrawal from the trust "Consistency Builds Trust" describes.

**Real-world examples of the shortcut this principle prevents:**
- **A new card layout when an existing card already satisfies the need** — reusing the existing pattern preserves a user's already-learned expectations; a new layout asks them to re-learn something for no real gain.
- **A new button style instead of extending an approved pattern** — every additional button style reopens the "is this clickable, and how" question a user already answered once, in violation of Design Principle 5.
- **A unique filter interaction instead of the established filtering model** — per [Interaction Philosophy](#interaction-philosophy) below, Filtering already has a defined behavior; a second model doubles what a user must learn to accomplish the same task.
- **A custom dialog duplicating existing modal behavior** — beyond the wasted effort, a second dialog behavior risks the exact focus-management and Escape-key inconsistencies a single, well-understood pattern avoids by construction.
- **A new badge style with undocumented semantic meaning** — a Badge's entire value is its finite, learnable meaning (per [Color Philosophy](#color-philosophy) below); an undocumented one is a color with no promise behind it.

In every case, the correct move is either to reuse what already exists, or — when a genuinely new need exists that the system doesn't yet serve — to extend the Design System deliberately, with the rationale documented, so the next person facing the same need inherits a real pattern instead of another one-off.

**Expected user outcomes:** users learn the interface once, and it keeps working; navigation feels predictable rather than surprising; interactions become intuitive because the same gesture always means the same thing; confidence increases over time rather than resetting with every new screen; and the product feels like one cohesive whole, never a set of screens assembled by different hands with different instincts.

**Relationship to other Product Bible chapters:**
- **[02. UX Strategy](02_UX_STRATEGY.md#core-ux-principles)** — consistent interaction patterns are what let 02's cognitive-load commitments hold up over time, not just at launch.
- **[03. Information Architecture](03_INFORMATION_ARCHITECTURE.md#information-ownership)** — visual consistency is what makes Information Ownership legible: a user recognizes the same owned information the same way wherever it's displayed, per [03](03_INFORMATION_ARCHITECTURE.md#cross-page-principles)'s Cross-Page Principles.
- **[04. Feature Specifications](04_FEATURE_SPECIFICATIONS.md)** — every feature specified there inherits existing Design System patterns before any new one is considered; a Feature Specification that requires a new pattern must say so explicitly, never silently.
- **[05. Intelligence Framework](05_INTELLIGENCE_FRAMEWORK.md#trust-framework)** — consistent presentation is part of what makes intelligence output trustworthy; a Confidence indicator that looks different on every screen undermines the very consistency 05's Trust Framework depends on to be legible at all.
- **[11. Architecture Guardrails](11_ARCHITECTURE_GUARDRAILS.md)** — design consistency is a governance responsibility, not only an engineering one; this principle is this chapter's half of that shared obligation.

**Non-Goals:** This principle defines governance and product philosophy only. It never defines a component implementation, CSS, Tailwind, design tokens, Figma variables, a spacing system, a color palette, or typography specifications — those remain entirely outside this chapter's scope, per its own opening rule.

## Visual Identity

Base Radar should feel **professional** (an analyst's tool, not a toy), **modern** (current without chasing trend), **technical** (precise, comfortable with real data density where it's earned), **readable** (legible before it is anything else), **confident** (composed, never hesitant or apologetic in its own presentation), and **minimal** (nothing on screen that isn't there to do a job). The product should feel like the calm, capable colleague who already did the research — not a dashboard performing busyness, and not a consumer app performing delight.

## Visual Hierarchy

Five tiers of visual importance exist, and every screen is composed from them:

- **Critical** — the single most important fact on the screen (a Health Score, a security warning); the first thing an eye should land on.
- **Important** — directly supports the Critical fact's interpretation (the Evidence behind it).
- **Supporting** — adds useful context without competing for first attention (comparisons, secondary metrics).
- **Reference** — available but deliberately quiet (metadata, timestamps, identifiers).
- **Background** — present for structure only (dividers, containers) and never competes with content at all.

A user should be able to scan any screen in this exact order — Critical, then Important, then Supporting — without needing to read Reference or Background content at all to understand what the screen is telling them.

## Information Density

This section defines the *visual technique* that expresses the density levels [03. Information Architecture](03_INFORMATION_ARCHITECTURE.md#information-density) already assigns by page type; it does not reassign them.

- **Dashboards** (an Overview page, per 03) — the lowest visual density: generous whitespace, headline-sized type, minimal simultaneous detail.
- **Project pages** (a Detail page, per 03) — moderate density, front-loaded — Critical and Important tiers dominate the first view, Supporting and Reference tiers are reached by scrolling or expansion, never removed.
- **Search** — density scales with result count, but the top result is always rendered at Dashboard-level visual weight regardless of how many results follow it.
- **Portfolio** (a Detail page, per 03) — the same visual density as a Project page, applied at the portfolio level.
- **AI Intelligence** (an AI page, per 03) — prose-first, moderate density, with Evidence visually one layer down per [02](02_UX_STRATEGY.md#ai-experience)'s AI Experience hierarchy.
- **Settings** — Reference-page density: complete and look-up-able rather than triaged, since a settings page's job is coverage, not a first impression.
- **Reference pages** (Registry listings, Taxonomy legends) — the highest visual density Base Radar uses, deliberately, since exhaustive lookup *is* a Reference page's purpose.

## Color Philosophy

This section defines what color *means*, never what color *is* — no palette or hex value appears here; those live in [`docs/DESIGN_SYSTEM.md`](../DESIGN_SYSTEM.md).

- **Success** — something is healthy or has resolved favorably. Used only when genuinely earned, never to make a neutral update feel more positive than it is.
- **Warning** — something deserves attention but isn't yet a confirmed problem.
- **Risk** — a real, evidenced concern exists, drawn from [05](05_INTELLIGENCE_FRAMEWORK.md#confidence-framework)'s actual Risk classification, never applied for visual drama.
- **Verification** — a project or claim has cleared the Platform's verification process, distinct from any performance judgment about it.
- **Confidence** — how strongly the evidence behind a conclusion supports it, always a separate visual signal from Success/Warning/Risk rather than blended into them.
- **Neutral** — no judgment is being made; the default state for anything that isn't one of the above.

Every color used for meaning is drawn from this finite set of categories, applied identically everywhere a given meaning appears — the same discipline [03](03_INFORMATION_ARCHITECTURE.md#taxonomy)'s Taxonomy already requires of the underlying labels these colors represent.

## Typography Philosophy

No font is named here; this defines the principles any typeface must satisfy.

- **Readable** — legible first, distinctive second, at every size actually used in the product.
- **Scannable** — a clear, learnable size and weight scale lets a user's eye find the right level of a page without reading every word.
- **Accessible** — every size and weight combination meets a real, verifiable readability standard, never chosen for visual effect at readability's expense.
- **Consistent** — the same concept is rendered at the same size and weight everywhere it appears, per Design Principle 8 above.

Hierarchy is expressed through a small number of clearly distinguishable levels — headline, body, and reference — never a proliferation of subtly different sizes that a user can't reliably tell apart.

## Iconography Philosophy

Icons exist to support comprehension, never to replace it. An icon always reinforces a visible label — it is a recognizable shortcut for something already stated in words, never the only way a piece of meaning is conveyed (per Design Principle 9 above). The same icon means the same thing everywhere it appears; a new meaning is never assigned to an icon a user has already learned to associate with something else.

## Motion Philosophy

Motion exists for exactly four jobs, and none other:

- **Explain** — showing how one state became another, rather than a hard cut that leaves the change unexplained.
- **Orient** — helping a user understand where they are after a navigation change.
- **Confirm** — acknowledging that an action was received and understood.
- **Guide** — directing attention toward something that newly deserves it.

Motion never entertains for its own sake. An animation that doesn't fulfill one of these four jobs is a distraction from the intelligence the interface exists to reveal, and it does not ship, per Design Principle 6 above.

## Component Philosophy

Every component type below is expected to prioritize clarity and consistency over novelty — this section defines the expectation, never the implementation.

- **Cards** — a single, self-contained unit of information with one clear subject, never a container for unrelated content.
- **Tables** — dense, comparable rows of the same information type, optimized for scanning down a column, not just across a row.
- **Panels** — supplementary context alongside a primary view, always clearly subordinate to it.
- **Dialogs** — a single, focused task or piece of information that demands attention before anything else can proceed.
- **Forms** — the minimum number of fields required, each with an unambiguous purpose.
- **Filters** — narrow what's shown without ever being required to see anything useful in the first place.
- **Badges** — a single, glanceable piece of classification, using [Color Philosophy](#color-philosophy)'s finite meaning set.
- **Tags** — a lightweight, non-exclusive label, visually distinct from a Badge's classification.
- **Charts** — governed by [Data Visualization Philosophy](#data-visualization-philosophy) below.

## Interaction Philosophy

- **Hover** — previews what an action would do without committing to it.
- **Focus** — always visible, never ambiguous about which element currently has it.
- **Selection** — a selected state is visually unmistakable from an unselected one.
- **Expansion** — revealing more of something already on screen, never navigating away from it.
- **Sorting** — the current sort order is always visible, never a hidden default.
- **Filtering** — the currently active filters are always visible and easy to clear, never silently applied.
- **Searching** — governed by [02](02_UX_STRATEGY.md#search-ux-philosophy)'s Search UX Philosophy; this chapter governs only its visual and interaction consistency, not its behavior.
- **Comparison** — placing two things side by side never obscures which value belongs to which.

The same interaction always produces the same category of response everywhere it's used — a hover means the same thing on a Project card as it does on a Watchlist row.

## Feedback Philosophy

The experiential commitments for each state below are defined in [02. UX Strategy](02_UX_STRATEGY.md#empty-states)'s Empty/Loading/Error States; this section defines only their visual signature, per Design Principle 11 above.

- **Loading** — a shape-matching skeleton, never a generic, contentless spinner.
- **Success** — a brief, calm confirmation, never a celebratory interruption.
- **Warnings** — visually distinct from both routine information and confirmed Risk, escalated only as far as real severity warrants.
- **Errors** — visually calm and human, never alarming in a way the underlying problem doesn't warrant.
- **Empty States** — visually inviting, never visually indistinguishable from an error.
- **Notifications** — priority-differentiated at a glance, per the finite priority vocabulary [04](04_FEATURE_SPECIFICATIONS.md#notifications) already defines.
- **AI Responses** — governed by [AI Presentation Philosophy](#ai-presentation-philosophy) below.

## AI Presentation Philosophy

AI-generated content must never visually resemble verified fact. Six categories are always visually distinguishable from one another:

- **Facts** — directly observed, presented with the most neutral, declarative visual treatment.
- **Interpretation** — a synthesized read, visually marked as distinct from a bare fact.
- **Recommendations** — visually framed as a consideration, never styled with the authority of an instruction, per [05](05_INTELLIGENCE_FRAMEWORK.md#recommendation-framework)'s Recommendation Framework.
- **Confidence** — always visually present alongside the conclusion it qualifies, per Design Principle 12 above.
- **Evidence** — visually one layer beneath the conclusion it supports, reachable, never hidden.
- **Sources** — visually attributed, never presented as if the Platform itself is the origin of a claim.

This is the visual execution of [05](05_INTELLIGENCE_FRAMEWORK.md#trust-framework)'s Trust Framework principle to "separate observations from conclusions" and "separate conclusions from recommendations" — that framework defines the epistemic separation; this section defines how it must look.

## Data Visualization Philosophy

Every chart in Base Radar exists to show a trend or reveal a change — never merely to decorate a page with a graphic. A chart must avoid distortion (per Design Principle 10), highlight genuinely important movement without exaggerating it, and support real comparison between values a user actually needs to compare. Above all, a chart must remain truthful: if a chart's shape would mislead a viewer about the underlying data, the chart is wrong, regardless of how visually compelling it is.

## Accessibility Philosophy

The experiential commitments below are defined in full in [02. UX Strategy](02_UX_STRATEGY.md#accessibility-philosophy); this section defines their visual expression specifically:

- **Contrast** — every meaningful color distinction (per [Color Philosophy](#color-philosophy) above) remains legible at a real, verifiable contrast ratio.
- **Keyboard navigation** — every interactive element's visual focus state, defined next, is what makes keyboard use possible at all.
- **Focus visibility** — a focus indicator is never subtle to the point of being missed; it is one of the most visually prominent states in the entire system.
- **Touch targets** — sized generously enough for a real thumb, never sized to fit more controls into a tight visual layout.
- **Reduced motion** — every animation in [Motion Philosophy](#motion-philosophy) above has a reduced-motion equivalent that still fulfills its job (explain, orient, confirm, guide) without relying on movement.
- **Screen readers** — visual-only meaning (color alone, icon alone) is never the sole carrier of information, per Design Principle 4 and 9 above.
- **Responsive layouts** — density and hierarchy (per [Information Density](#information-density) and [Visual Hierarchy](#visual-hierarchy) above) are preserved across viewport sizes, never simplified by silently dropping meaningful content.
- **Inclusive language** — visual content (icons, illustrations, color-only cues) is chosen to be broadly legible and never dependent on a single cultural or visual convention to be understood.

## Content Design Philosophy

Voice, tone, and microcopy are defined in full in [02. UX Strategy](02_UX_STRATEGY.md#ux-writing-principles); this section adds only the visual and hierarchical treatment of content types that chapter doesn't cover:

- **Headings** — rendered at a size and weight that matches their actual level in the page's hierarchy, never chosen for visual balance.
- **Labels** — always visually paired with the value they describe, never separated by so much space or so different a style that the pairing is ambiguous.
- **Buttons** — visually distinct from static text at a glance, per Design Principle 5 above; their content follows [02](02_UX_STRATEGY.md#ux-writing-principles)'s Buttons principle.
- **Tooltips** — visually secondary to the element they annotate, appearing only on demand.
- **Notifications** — visually consistent with their [Feedback Philosophy](#feedback-philosophy) treatment above.
- **AI summaries** — visually consistent with [AI Presentation Philosophy](#ai-presentation-philosophy) above.
- **Error messages** — visually calm per [Feedback Philosophy](#feedback-philosophy), worded per [02](02_UX_STRATEGY.md#error-states)'s Error States.
- **Descriptions** — visually secondary to the heading or label they support, never competing with it for attention.
- **Microcopy** — brief enough that its visual footprint never overwhelms the element it's attached to.

Every piece of content on screen exists to reduce ambiguity — content that could be removed without making a screen harder to understand is content that shouldn't be there.

## Trust by Design

Design is a trust responsibility in its own right — not merely a delivery mechanism for the honesty [05. Intelligence Framework](05_INTELLIGENCE_FRAMEWORK.md)'s Trust Framework already guarantees at the content layer. An Intelligence output can be perfectly honest in its Confidence, Evidence, and wording, and a design can still betray that honesty — by rendering a low-confidence Insight with the same bold visual authority as a well-evidenced one, by using an alarming color for a routine update, or by making a Recommendation *look* more like an instruction than the words themselves claim to be. This is why Trust by Design exists as its own discipline:

- **Confidence is visible** — never rendered as an afterthought to the conclusion it qualifies.
- **Sources are visible** — never buried behind additional clicks that make them feel optional to check.
- **Evidence is accessible** — one interaction away, never hidden behind a wall of polish.
- **Verified information is distinguishable** — a verified fact and an interpretation are never rendered identically.
- **Uncertainty is communicated** — visually, not just in a caveat sentence a user might not read.
- **Recommendations remain explainable** — their supporting Evidence is never visually detached from them.
- **Design never exaggerates certainty** — visual confidence never outpaces evidentiary confidence, per Design Principle 12 above.
- **Visual emphasis reflects evidence, not marketing** — what looks important is what the evidence says is important, never what would look most compelling.

Trust is a design responsibility, not just an AI responsibility, because a user does not experience [05](05_INTELLIGENCE_FRAMEWORK.md)'s methodology directly — they experience its visual presentation. If that presentation overstates what the methodology actually supports, the dishonesty is real even though no single word was false.

## Anti-Patterns

This is a different list from [05. Intelligence Framework](05_INTELLIGENCE_FRAMEWORK.md#anti-patterns)'s own Anti-Patterns — that list names dishonest *content*; this one names dishonest *presentation*, the visual-layer sibling of the same underlying value. Base Radar's design never adopts:

- **Visual noise** — the opposite of Clarity Before Density; volume presented in place of hierarchy.
- **Clickbait styling** — visual treatment sensationalized beyond what the content underneath actually supports.
- **Fake urgency** — visual alarm applied to something that isn't actually urgent.
- **Misleading colors** — a color used outside its defined meaning in [Color Philosophy](#color-philosophy) above, or a meaning rendered in the wrong color.
- **Over-animation** — motion that fails Design Principle 6's test — it doesn't explain, orient, confirm, or guide anything.
- **Dark patterns** — any visual design intended to produce an action a user wouldn't take if the interface were fully transparent about its consequences.
- **Hidden information** — Evidence, Sources, or Confidence made harder to find than the conclusion they support.
- **Ambiguous buttons** — an interactive element whose visual treatment doesn't make clear what it will do.
- **Decorative charts** — a visualization that exists for visual interest rather than to reveal a real trend, per [Data Visualization Philosophy](#data-visualization-philosophy) above.
- **Confusing navigation** — a visual treatment of navigation that doesn't match [03](03_INFORMATION_ARCHITECTURE.md#primary-navigation-structure)'s actual structure.

Every item above reduces trust the same way: each one creates a gap between what the interface visually implies and what is actually, honestly true.

## Future Design Vision

This chapter's philosophy — not any specific token or component — is what has to hold as the product surface grows. As [07. Engineering Roadmap](07_ENGINEERING_ROADMAP.md)'s Releases introduce real identity and real cross-device sync, new surfaces (authenticated states, sync conflict resolution) must be designed against the same Visual Hierarchy, Color Philosophy, and Trust by Design principles already established here, never a bespoke visual treatment invented for the occasion. As [09. Product Backlog](09_PRODUCT_BACKLOG.md)'s more ambitious ideas mature (a conversational AI Assistant, cross-project Governance), each inherits this chapter's AI Presentation Philosophy and Trust by Design obligations before a single pixel is designed — the philosophy is the constraint new surfaces are designed inside of, never a retrofit applied afterward.

## Related Documents

- [01. Product Strategy](01_PRODUCT_STRATEGY.md) — the mission and principles this visual language exists to express
- [02. UX Strategy](02_UX_STRATEGY.md) — the experience and accessibility commitments this chapter gives visual form to
- [03. Information Architecture](03_INFORMATION_ARCHITECTURE.md) — the structure, density classification, and taxonomy this chapter's visual techniques express
- [04. Feature Specifications](04_FEATURE_SPECIFICATIONS.md) — the features every component and interaction pattern above is applied to
- [05. Intelligence Framework](05_INTELLIGENCE_FRAMEWORK.md) — the Confidence, Evidence, and Trust methodology this chapter's Trust by Design section gives visual honesty to
- [07. Engineering Roadmap](07_ENGINEERING_ROADMAP.md) — the platform work new visual surfaces will need to be designed against
- [08. Competitive Analysis](08_COMPETITIVE_ANALYSIS.md) — the "craft as a differentiator" positioning this chapter's discipline exists to earn
- [09. Product Backlog](09_PRODUCT_BACKLOG.md) — where design-related ideas and gaps are captured and prioritized
- [11. Architecture Guardrails](11_ARCHITECTURE_GUARDRAILS.md) — the non-negotiable rules this chapter's Trust by Design section must never violate
- [`docs/DESIGN_SYSTEM.md`](../DESIGN_SYSTEM.md), [`docs/DESIGN_SYSTEM_V1.md`](../DESIGN_SYSTEM_V1.md) — the existing implementation-level design documentation (tokens, components) this chapter's philosophy governs

---

*This document is part of the [Base Radar Product Bible](00_INDEX.md).*
