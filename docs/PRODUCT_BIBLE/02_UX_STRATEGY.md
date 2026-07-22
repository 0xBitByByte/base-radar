# 02. UX Strategy

> **Status:** ✅ Complete
> **Part of:** [Base Radar Product Bible](00_INDEX.md)
> **Previous:** [← 01. Product Strategy](01_PRODUCT_STRATEGY.md) · **Next:** [03. Information Architecture →](03_INFORMATION_ARCHITECTURE.md)

---

## Executive Summary

Base Radar's mission — a single, trustworthy place to understand the Base ecosystem — is only as good as the experience that delivers it. Intelligence that is accurate but hard to read, slow to reach, or ambiguous about its own confidence fails the mission just as surely as intelligence that's wrong. UX is not the decoration layer on top of Base Radar's [Intelligence Framework](05_INTELLIGENCE_FRAMEWORK.md); it is the mechanism by which that intelligence actually reaches a person and earns their trust. This chapter defines the philosophy, principles, and standards every screen in Base Radar is built against — it does not repeat the *why* of the product (that belongs to [01. Product Strategy](01_PRODUCT_STRATEGY.md)), it defines the *how it feels* that strategy demands.

## UX Philosophy

Seven pillars govern every experience decision in Base Radar. Where a pillar extends a principle already established in [01. Product Strategy](01_PRODUCT_STRATEGY.md#product-philosophy), it is named as such rather than re-argued — this chapter picks up where that one leaves off, at the level of what happens on screen.

- **Signal over Noise.** This is [01](01_PRODUCT_STRATEGY.md#product-philosophy)'s "signal over noise" philosophy made visual: on any screen, what deserves attention is given visual weight, and what doesn't is quiet or absent. The strategic case for this is made in 01; this chapter's job is to enforce it in layout, hierarchy, and density.
- **Explain Before Visualize.** A chart or score is never the first thing a user encounters — a plain-language conclusion comes first, with the visualization as supporting evidence, not the headline itself. An intelligence platform that leads with a chart is asking the user to do the interpretation the platform exists to do for them.
- **AI Assists but Never Replaces Judgment.** Every AI-derived output is presented as an input to the user's own decision, never as a verdict to be obeyed. This is the UX expression of the honesty principle [05. Intelligence Framework](05_INTELLIGENCE_FRAMEWORK.md) enforces computationally — this chapter governs how that honesty is communicated, not how it's calculated.
- **Confidence Before Speed.** It is better to show a conclusion a beat later, fully qualified with its confidence, than instantly and unqualified. Speed is a real UX value at Base Radar, but never traded against honesty about certainty.
- **Progressive Disclosure.** A screen's first layer is a conclusion; every layer beneath it is available, never forced. Depth is something a user chooses to enter, not something the platform requires them to wade through.
- **Fast Navigation.** Reaching the right context matters as much as what's found there — an intelligence platform that's accurate but slow to reach an answer has effectively withheld it.
- **Consistency over Novelty.** A returning user's mental model is never invalidated for the sake of freshness. Familiarity is treated as an asset that compounds, not a constraint to escape.

Every screen in Base Radar is built to answer four questions, in this order, before anything else:

1. **What happened?** — the plain, current state.
2. **Why does it matter?** — the interpretation, in context.
3. **How confident are we?** — the evidence quality behind everything stated so far.
4. **What should I do next?** — an optional, never mandatory, next step.

A screen that cannot answer all four has not earned its place in the product.

Confidence is not a footnote on an intelligence platform — it is a first-class UX concept, on equal footing with the conclusion it qualifies. Base Radar exists to tell people what's true about the Base ecosystem; the moment it states a conclusion without also stating how sure it is, it has quietly asked for a trust it hasn't earned. This is why "how confident are we" sits between interpretation and action rather than after both: a user should know the evidence quality *before* deciding what to do, not discover it as an afterthought once a decision is already made. Confidence must never be read as certainty — it communicates evidence quality, not a guarantee — and it is surfaced everywhere the platform provides intelligence, predictions, recommendations, risk assessments, or summaries, never selectively. Core UX Principle 2 below turns this into a concrete interface rule.

## Core UX Principles

Twelve operating principles translate the philosophy above into standards specific and concrete enough to apply consistently across every screen.

### 1. Every Number Needs a Source

- **Purpose:** No metric appears without the user being able to trace where it came from.
- **Reasoning:** An intelligence platform's value proposition collapses the moment a number can't be traced to a real signal — this is [01](01_PRODUCT_STRATEGY.md#product-principles)'s "transparency about sourcing" principle enforced at the interface level.
- **Real-world example:** A TVL figure is always shown next to, or one interaction from, which provider produced it and when it was last refreshed.
- **Expected user outcome:** Trust is built incrementally, number by number, rather than demanded wholesale.

### 2. Confidence Is Always Visible, Never Implied

- **Purpose:** Every score, classification, or recommendation carries its own confidence signal in the same moment the user sees the conclusion.
- **Reasoning:** Showing a headline without its confidence is overstatement by omission, even if no false claim is ever stated outright.
- **Real-world example:** A project's risk classification is never shown without an adjacent, or one-tap-away, confidence qualifier.
- **Expected user outcome:** Users calibrate how much weight to give a signal before acting on it, not after being misled by its absence.

### 3. The Most Important Thing Is Always the Biggest Thing

- **Purpose:** Visual weight matches actual significance — never recency, novelty, or decoration.
- **Reasoning:** A platform that lets a cosmetic element out-compete a real risk warning for attention has failed at its core job before a user has read a word.
- **Real-world example:** A security-risk narrative classification is never visually subordinate to a follower count or a decorative badge.
- **Expected user outcome:** A user scanning quickly still sees what matters most first, without needing to read closely.

### 4. Every Screen Answers One Primary Question

- **Purpose:** Each screen is organized around a single dominant question the user came to answer.
- **Reasoning:** A screen trying to answer five equally-weighted questions answers none of them well.
- **Real-world example:** The Project Page's primary question is "is this project healthy right now" — every other element supports that question rather than competing with it.
- **Expected user outcome:** Users leave every screen knowing whether they got their answer, rather than unsure what the screen was even for.

### 5. Nothing Loads Silently Forever

- **Purpose:** Every loading state communicates what's coming, not just that something is happening.
- **Reasoning:** An uncontextualized spinner reads as the platform not knowing what it's doing — the opposite of the confidence an intelligence product needs to project.
- **Real-world example:** A streaming section of a page shows a shape matching its eventual content, not a generic blank spinner.
- **Expected user outcome:** Users never wonder whether the platform has stalled or is genuinely still computing something real.

### 6. Missing Data Is Disclosed, Never Hidden Behind a Blank Wall

- **Purpose:** When a real data point genuinely isn't available, the interface says so and explains why, rather than presenting an empty or broken-looking gap.
- **Reasoning:** Silence about a known gap reads as the platform not noticing its own limitation — worse than admitting one honestly.
- **Real-world example:** "Not Currently Available — no documentation link is configured for this project" rather than a blank field.
- **Expected user outcome:** Users trust the platform more, not less, at the exact moment it admits what it doesn't know.

### 7. Comparisons Are Earned, Not Assumed

- **Purpose:** A number is shown alongside a comparison — to history, to a peer, to a threshold — only when that comparison is real and meaningful.
- **Reasoning:** An unearned comparison manufactures a signal that isn't actually there.
- **Real-world example:** A "+12% this week" figure is never shown unless the underlying data genuinely supports that specific window.
- **Expected user outcome:** Every comparison a user sees is one they can rely on, never filler dressing up a raw number.

### 8. Actions Are Always Reversible or Clearly Labeled Otherwise

- **Purpose:** A user always knows, before acting, whether an action can be undone.
- **Reasoning:** Uncertainty about reversibility creates hesitation — friction directly opposed to the decisive action an intelligence platform should enable.
- **Real-world example:** Clearing a queue or removing a watchlist states its consequence up front, before confirmation.
- **Expected user outcome:** Users act confidently because the cost of a mistake is known in advance, not discovered after the fact.

### 9. The Interface Never Argues With Itself

- **Purpose:** Two labels, badges, or numbers on the same screen never contradict each other.
- **Reasoning:** Internal contradiction is the fastest way to destroy trust in a platform whose entire premise is a coherent read on reality.
- **Real-world example:** A project cannot display a "Growth" narrative classification alongside a "Declining" trend indicator on the same screen without one honestly giving way to the other.
- **Expected user outcome:** Users never have to reconcile the platform disagreeing with itself.

### 10. Depth Is One Click Away, Never Zero and Never Three

- **Purpose:** The layer beneath any headline is always exactly one interaction away — never already fully exposed, never buried two or more steps deep.
- **Reasoning:** This is Progressive Disclosure made into a concrete, testable rule rather than an aspiration.
- **Real-world example:** A Health Scorecard's headline grade expands to its contributing factors in a single tap, not a full page navigation.
- **Expected user outcome:** Users self-select their own depth of engagement instead of the platform choosing it for them.

### 11. Time Is Always Explicit

- **Purpose:** Every timestamp is stated in a way that's immediately readable and never ambiguous.
- **Reasoning:** Vague freshness ("recently," "a while ago") undermines confidence in a platform whose value depends on real-time accuracy.
- **Real-world example:** A relative timestamp ("2m ago") is always backed by an exact one available on demand.
- **Expected user outcome:** Users always know precisely how fresh what they're looking at actually is.

### 12. The User's Own Context Always Outranks the Generic View

- **Purpose:** When a user has expressed a preference — an active watchlist, a saved search, a personalization setting — the interface reflects it by default.
- **Reasoning:** Ignoring what a user has already told the platform about their priorities asks them to re-establish context on every visit.
- **Real-world example:** A personalized Dashboard scoped to an active watchlist takes priority over the generic ecosystem-wide view, without hiding the option to see everything.
- **Expected user outcome:** Repeat users experience the platform as increasingly tailored to them, not static.

## Information Consumption Model

Every piece of intelligence Base Radar surfaces — a project's health, a governance proposal, a portfolio read — is consumed through the same six-layer hierarchy:

```
Headline
   ↓
Summary
   ↓
Context
   ↓
Evidence
   ↓
Sources
   ↓
Action
```

- **Headline** — the single most important takeaway, readable in under two seconds.
- **Summary** — one or two sentences establishing why the headline is true right now.
- **Context** — how this compares to history, peers, or expectation (where Principle 7, "comparisons are earned," applies).
- **Evidence** — the specific data points supporting the headline and summary; what a skeptical user checks next.
- **Sources** — which providers or systems produced the evidence, and whether it's live or a fallback.
- **Action** — what, if anything, a user might reasonably do next, always optional, never a mandate.

This hierarchy exists because it lets every user stop reading at the depth that satisfies them. A headline-only reader and a full-evidence auditor both get a complete, honest experience from the same content — the platform never has to choose one audience over the other. It is the same hierarchy the [Intelligence Framework](05_INTELLIGENCE_FRAMEWORK.md)'s outputs (the Health Scorecard, narrative classification, the Daily Brief) are meant to be read through; this chapter defines the reading order, [05](05_INTELLIGENCE_FRAMEWORK.md) defines how the Evidence and Confidence a reader eventually finds are actually computed.

## Dashboard UX Philosophy

**The Dashboard must answer the user's most important questions within 60 seconds.** This is a deliberate optimization target, not a suggestion: the Dashboard exists for fast orientation, important changes, and critical, actionable intelligence — never for information density. A Dashboard that is comprehensive but takes minutes to parse has failed at the one job a dashboard has.

- **Purpose of Dashboard:** Answer "what's happening across everything I care about, right now" in the time it takes to glance at one screen.
- **Primary user questions:** What changed? Why does it matter? What deserves my attention today? Is anything I'm exposed to at risk?
- **Information hierarchy:** Ecosystem-wide signal first, personalized/watchlist-scoped signal layered on top per Core Principle 12; individual project depth is deliberately excluded — that belongs to the [Project Page](#project-page-ux-philosophy).
- **Daily workflow:** The Dashboard is meant to be a habit — opened first, read fast, and either closed (nothing needs attention) or used as a launch point into deeper Project, Portfolio, or Timeline views.
- **Mental model:** A briefing, not a control panel. The Dashboard tells the user something; it does not ask them to configure something.
- **Success criteria:** A user can answer all three Primary User Questions above within 60 seconds of opening it — the practical test of whether today is a normal day or not.

The Dashboard's actual widget inventory and feature-level behavior are specified in [04. Feature Specifications](04_FEATURE_SPECIFICATIONS.md), not here — this section defines the philosophy that specification is held to.

## Search UX Philosophy

Search should feel like an intelligence assistant, not a database lookup — the difference between being handed an answer and being handed a list of rows to search through yourself.

**Search is discovery, not retrieval.** Most users arrive at a search box without knowing the exact name of what they're looking for — they have a hunch, a narrative, a category, or a question, not a precise query. A retrieval-oriented search only rewards someone who already knows exactly what they want; Base Radar's search instead helps a user discover projects, narratives, opportunities, relationships, risks, and trends they couldn't have named exactly, but would recognize the moment they saw them. This is the philosophical difference from a traditional database search: retrieval assumes the answer already exists in the user's head and just needs to be located; discovery assumes the answer doesn't exist yet in the user's head, and search's job is to help form it.

The following principles put this philosophy into practice:

- **Universal Search:** One entry point searches everything — projects, timeline events, notifications, automation results, portfolio, brief — never a search restricted to a single data type by default.
- **Natural Language Search:** A query works whether typed as a ticker, a project name, or a plain question about what's happening — a user should never need to learn the platform's internal vocabulary to find something.
- **Command Search:** The same entry point doubles as an action launcher. Search and action share one mental model rather than two separate systems competing for the same keystroke.
- **Discovery Search:** An empty or exploratory query still surfaces something useful — trending, recent, suggested — rather than a blank box waiting for exact input.
- **Intent-based Search:** Results are ranked by what the user is most likely trying to accomplish, not literal string match alone.
- **Search Result hierarchy:** The best match across every source wins the top position regardless of which subsystem produced it — see [04](04_FEATURE_SPECIFICATIONS.md) for how Global Search's actual sources are specified.
- **Empty Search:** Before a user types anything, the box already offers something — never a truly empty invitation.
- **Zero Results:** A query that finds nothing still offers a next step (broaden the query, browse the Registry), never a dead end.
- **Recent Searches:** Exist to shorten the distance between having a question and having an answer, treated as core to the experience rather than a bolted-on convenience.
- **Suggested Searches:** Anticipate a question before it's fully typed, the same instinct a knowledgeable assistant would have.

## Project Page UX Philosophy

Every Project Page answers five questions, in this order:

1. **What is this?** — identity, established before anything else.
2. **Why should I care?** — the stakes, before any analysis is shown.
3. **What's happening now?** — current state.
4. **Why is it important?** — interpretation of that state.
5. **What should I do next?** — an optional action.

This reading order mirrors the [Information Consumption Model](#information-consumption-model)'s Headline-to-Action hierarchy, applied to a single project: identity and stakes come first because a user hasn't yet been given a reason to care about raw evidence — asking them to interpret data before establishing why it matters to them reverses the order a trustworthy analyst would actually use.

## AI Experience

This section governs how AI-derived output is *framed and positioned on screen* — never how it is computed. The scoring, risk classification, and confidence methodology behind every output described here belongs to [05. Intelligence Framework](05_INTELLIGENCE_FRAMEWORK.md); this section is strictly about presentation.

Every AI-generated insight is a specialization of the [Information Consumption Model](#information-consumption-model) above, compressed into the four layers that matter most for an AI-derived output:

```
Summary
   ↓
Evidence
   ↓
Confidence
   ↓
Sources
```

- **Summary** — the conclusion, stated plainly, in the same front-loaded style as every other headline in the product.
- **Evidence** — the specific signals that produced the summary; an insight with no evidence layer is not an insight, it's an assertion.
- **Confidence** — how much the evidence actually supports the summary, never omitted and never inflated beyond what the evidence justifies.
- **Sources** — the real systems or providers the evidence came from, always inspectable by the user, never hidden behind the summary.

Four rules govern this hierarchy without exception: **AI must never make unsupported claims. AI must always expose the evidence supporting a claim. AI's stated confidence must reflect the evidence actually available, never more. Users must always be able to inspect the sources behind an insight.** Trust in an AI-derived output is earned exactly this way — through transparency — never assumed, and never granted by default just because the platform stated something with apparent confidence.

Each of the following surfaces applies this hierarchy in its own way:

- **Daily Brief:** Reads as a briefing a trusted analyst would hand you — a consistent structure every time, never a conversation the user has to steer.
- **Project Summary:** One paragraph, front-loaded with the conclusion, following the same Headline-then-Summary structure as the Information Consumption Model.
- **Narrative Summary:** A classification label (Growth, Decline, Security Risk, and so on) is always paired with the evidence that produced it — never a bare label taken on faith.
- **Recommendations:** Phrased as considerations, never instructions — "worth watching," never "you should sell."
- **Warnings:** Visually distinct from routine information, escalated in proportion to real severity, never inflated to compete for attention.
- **Risk:** Always shown with its classification's reasoning available, never just a color.
- **Confidence:** Never omitted, never buried — appears in the same visual moment as the conclusion it qualifies, per Core Principle 2.
- **Source attribution:** Every AI-assisted output states which real signals it drew from.
- **Trust indicators:** A consistent, learnable visual language distinguishes "this is live," "this is a fallback," and "this is inferred" — a user should be able to tell these apart without reading text.

Two rules here are non-negotiable, not stylistic preferences: **never hallucinate, and never overstate confidence.** Where this chapter defines how that honesty is communicated, [11. Architecture Guardrails](11_ARCHITECTURE_GUARDRAILS.md) is where it becomes an enforced rule rather than an intention.

## Portfolio UX

A Portfolio view should feel like a second opinion on a user's own holdings, not a mirror of the Dashboard scoped to fewer projects.

- **Health:** One clear read on overall condition, not a wall of individual metrics with no synthesis.
- **Risk:** Concentrated exposure is surfaced honestly, never smoothed over to feel more comfortable than it is.
- **Diversification:** Described, never prescribed — the platform states clearly how concentrated a portfolio is without ever implying the user is wrong to hold it that way.
- **Opportunities:** Framed as noteworthy, not urgent, unless a signal is genuinely time-sensitive.
- **Warnings:** Reserved for real risk, never triggered by routine fluctuation.
- **Actions:** Optional next steps, always non-binding.

## Watchlist UX

- **Purpose:** A personal lens on the ecosystem, not a static list — the mechanism that turns ecosystem-wide signal into what's personally relevant.
- **Daily usage:** Checked as often as the Dashboard, and functions as its personalization input per Core Principle 12.
- **Change detection:** What's different since the last visit is the primary value a Watchlist delivers, not the static membership list itself.
- **Notifications:** A Watchlist is what turns general ecosystem noise into signal a specific user actually needs to hear about.
- **Personal relevance:** The same event means something different depending on whether it touches something the user actually holds or watches — the Watchlist is what makes that distinction possible.

## Governance UX

- **Purpose:** Governance should feel like decision support, not a voting record.
- **Decision support:** A proposal is presented so a user can decide whether it matters to them before deciding how they'd vote.
- **Proposal summaries:** Front-loaded with the conclusion, following the same Information Consumption Model as every other intelligence output in the product.
- **Voting reminders:** Timely, never nagging — a reminder earns its place by being genuinely useful, not by repetition.
- **Impact explanations:** State plainly what actually changes if a proposal passes — the "why does it matter" question from the [UX Philosophy](#ux-philosophy) applied specifically to governance.

## Navigation Philosophy

- **Primary Navigation:** Answers "where in the product am I, broadly." Stable and learnable — rarely reordered.
- **Secondary Navigation:** Answers "what are my options within this area," scoped to the current primary section.
- **Context Navigation:** Surfaces related content a user didn't explicitly search for but is relevant given where they already are.
- **Breadcrumbs:** Exist so a user is never uncertain how they arrived somewhere or how to back out cleanly.
- **Keyboard Navigation:** Full parity with mouse and touch — never a secondary-citizen experience for anyone who prefers it.
- **Mobile Navigation:** Collapses depth, never removes it — a mobile user reaches the same information through a different physical interaction.

The actual site map, route hierarchy, and navigation structure these principles govern are defined in [03. Information Architecture](03_INFORMATION_ARCHITECTURE.md), not here.

## Empty States

Every empty state must:

- **Educate** — explain what would normally appear here and why it doesn't yet, actively teaching the user how Base Radar works rather than simply announcing that data is missing.
- **Build confidence** — an empty state is proof the platform knows exactly what it doesn't have yet, not evidence that something is wrong.
- **Explain the benefit** — state what the user gains once this state is no longer empty, so the absence reads as anticipation rather than deficiency.
- **Recommend the next action** — a concrete, reachable way to change the empty state, when one exists.
- **Never feel like an error** — an empty state is a normal, anticipated condition, never indistinguishable from a failure.

## Loading States

- **Skeletons:** Shape-matching placeholders reflecting the eventual content, never a generic spinner standing in for structure.
- **Optimistic loading:** The expected state is shown immediately wherever the outcome is virtually certain.
- **Streaming:** Partial content appears progressively rather than one blocking wait for everything at once.
- **Progress indicators:** Used only when a real, boundable duration exists — never faked to feel more informative than it is.
- **Background refresh:** Updates arrive without interrupting whatever the user is already doing.

## Error States

Every error must be:

- **Helpful** — states plainly what went wrong, in terms a user (not an engineer) understands.
- **Actionable** — offers a real next step, even if that step is simply "try again."
- **Human** — written the way a person would explain the problem, not a stack trace.
- **Recovery-oriented** — an error is often the platform being honest about a real limitation (a provider being unreachable, for instance) rather than a defect, and should read that way.

## Accessibility Philosophy

- **Keyboard:** Every interaction reachable by mouse or touch is equally reachable by keyboard alone.
- **Screen Readers:** Every meaningful element is announced in a way that conveys its actual purpose, not just its visual label.
- **ARIA:** Used to clarify structure and state, never as a substitute for genuinely accessible markup.
- **Contrast:** Every piece of information-bearing text and color meets a real, verifiable contrast standard.
- **Focus:** Always visible, always restored to a sensible place after a dialog or menu closes.
- **Reduced Motion:** Respected as a genuine preference, not a decorative toggle.
- **Touch Targets:** Sized for a real thumb, not a cursor.
- **Responsive behavior:** Adapts layout, never hides meaningful information, across any viewport.

The concrete tokens, contrast ratios, and component-level implementation of these commitments live in [06. Design System](06_DESIGN_SYSTEM.md).

## Mobile UX

Base Radar's mobile experience is not a redesign — it is the same information hierarchy, the same honesty principles, and the same Information Consumption Model, adapted to a smaller viewport and a touch-first interaction model. Nothing is simplified by hiding real signal; only layout adapts. Where the previous section states an accessibility commitment and [06. Design System](06_DESIGN_SYSTEM.md) states its visual implementation, mobile is the same relationship: this document defines that mobile must preserve, not shrink, the experience — the Design System defines how.

## UX Writing Principles

- **Voice:** A calm, precise analyst — never a hype-driven influencer, never a robotic system reciting values.
- **Tone:** Adjusts to severity. Routine information reads calmly; real risk reads seriously. Never alarmist, never falsely reassuring.
- **Microcopy:** Short and specific — never a generic "Success!" or "Oops!" standing in for an actual message.
- **Buttons:** Describe the actual action a click will take, never a vague "OK" or "Submit" without context.
- **Tooltips:** Add information the visible label doesn't already convey — never simply repeat it.
- **AI summaries:** Written the way a careful human analyst would write them — measured, sourced, never emphatic beyond what the data actually supports.
- **Notifications:** State what happened and why it was surfaced, never just "something changed."

## Success Metrics

These are UX-specific measures, distinct from — and feeding into — [01. Product Strategy](01_PRODUCT_STRATEGY.md#success-metrics)'s four business-level categories (Habitual Trust, Data Integrity, Ecosystem Reliance, Signal Quality). Where 01 asks whether the product is succeeding strategically, this section asks whether the *experience* is the reason it is or isn't:

- **Task completion** — can a user accomplish what they opened the platform to do, without abandoning the attempt.
- **Search success** — does a search end in the user finding what they needed, rather than giving up on the query.
- **Daily engagement** — brief, habitual visits rather than infrequent long ones, the Dashboard-as-briefing model succeeding in practice.
- **Time to insight** — how quickly a *returning* user reaches the Headline/Summary layer that actually answers their question, on any given visit.
- **Time to First Insight** — distinct from the metric above: the amount of time required for a brand-new user to discover one genuinely meaningful piece of intelligence, measured once, at onboarding. This matters more than raw time spent on the platform, because time spent is easily inflated by confusion or friction, while time to first insight can only be short if the platform proves its value from the very first visit.
- **Retention** — users returning specifically because the experience earned their trust, not generic stickiness.

## Future UX Vision

The UX vision evolves in step with [07. Engineering Roadmap](07_ENGINEERING_ROADMAP.md)'s planned Releases, without repeating their technical detail:

- As **Release 1 (Platform Foundation)** introduces real authenticated sessions and genuine cross-device continuity, the UX must extend its trust-indicator language to honestly distinguish an authenticated session from a Guest one — without ever implying more permanence or security than a Guest session already honestly has — while a user's context (active watchlist, personalization) comes to feel identical on whichever device they open, something today's local-only storage cannot promise.
- As **Release 3 (Project Intelligence)** deepens per-project evidence, the Information Consumption Model's Evidence and Sources layers grow richer — the UX challenge is ensuring more evidence becomes more trust, not more noise.

## Related Documents

- [01. Product Strategy](01_PRODUCT_STRATEGY.md) — the mission, principles, and philosophy this UX strategy exists to serve
- [03. Information Architecture](03_INFORMATION_ARCHITECTURE.md) — the site map, navigation structure, and page hierarchy the [Navigation Philosophy](#navigation-philosophy) above governs
- [04. Feature Specifications](04_FEATURE_SPECIFICATIONS.md) — the concrete feature-level specifications every philosophy section above is applied to
- [05. Intelligence Framework](05_INTELLIGENCE_FRAMEWORK.md) — the scoring, risk, and confidence methodology the [AI Experience](#ai-experience) section presents but does not define
- [06. Design System](06_DESIGN_SYSTEM.md) — the visual language (color, typography, motion, tokens) these principles are expressed through
- [09. Product Backlog](09_PRODUCT_BACKLOG.md) — where UX gaps and improvement ideas surfaced against this chapter are captured and prioritized

---

*This document is part of the [Base Radar Product Bible](00_INDEX.md).*
