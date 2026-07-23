# AI Intelligence Engine v2

**PR-040 — AI Intelligence Engine v2.** This document covers
`lib/ai-intelligence/` — a reusable, structured model for a single unit of
platform intelligence (an `AIIntelligenceBrief`), designed to eventually
back the Dashboard, Daily Brief, Project pages, Notifications, and a
future email digest with one consistent shape. **This is architecture
only**: no generation logic, no LLM integration, no UI, and nothing wired
into any existing surface. See "Future AI Generation Flow" for what a
later PR still needs to build.

> **Update (PR-041)**: the rule-based generation pipeline this section's
> "Future AI Generation Flow" anticipated now exists —
> `lib/ai-intelligence/generator/`, producing ranked `AIIntelligenceBrief[]`
> from real Registry/Discovery/Alert input via `createIntelligenceBrief()`
> (never bypassed). Still no LLM call, still not wired into any UI. See
> `docs/DAILY_BRIEF_GENERATOR.md`.

## A naming note, read this first

This codebase already has a type literally named `IntelligenceBrief` —
`lib/data/types.ts`'s `{ points: IntelligenceBriefPoint[]; generatedAt }`,
which powers the Dashboard's "Base Intelligence Brief" widget
(`components/dashboard/IntelligenceBrief.tsx`) via
`getIntelligenceBrief()` in `lib/data/aggregate.ts`. That type is a
handful of tone-colored bullet points — nothing like the richer model this
PR introduces. To avoid a collision between two unrelated concepts
sharing a name, this PR's model is called **`AIIntelligenceBrief`**
throughout. It does not replace, modify, or wire into the older,
shipped `IntelligenceBrief` — the two coexist, and only one
(`IntelligenceBrief`) is actually rendered anywhere today.

This is also the fourth codebase concept with "intelligence" in its
path, alongside `lib/intelligence/` (the per-project intelligence bundle
powering Project Profile pages), `lib/intelligence-engine/` (the
pluggable rule-based/future-LLM generation-strategy layer those project
bundles call into), and `lib/alerts/intelligence/` (the Alert Engine's
scoring/narrative pipeline). `lib/ai-intelligence/` is deliberately
separate from all three — it is a cross-surface *output model*, not
another generation engine or another per-project bundle. See
`docs/ARCHITECTURE.md`'s "Future Intelligence Engine" section for how
this fits the platform's longer-term plan.

## Intelligence Philosophy

The philosophy this model must be consistent with already lives in
`docs/PRODUCT_BIBLE/05_INTELLIGENCE_FRAMEWORK.md` — this PR does not
restate it, only implements the pieces that are ready to become real
TypeScript shapes. Two of that document's principles are the ones this
PR enforces in code, not just prose:

- **No Insight Without Evidence** — `createIntelligenceBrief()`
  (`builder.ts`) throws if `supportingSignals` is empty. A brief cannot
  exist without at least one real, cited observation.
- **Confidence Reflects Evidence, Never Optimism** — `confidence` is not
  even an input to `createIntelligenceBrief()`. It is always computed by
  `deriveConfidence()` from the evidence actually attached; there is no
  code path that lets a caller assign a confidence level by hand.

## Brief Lifecycle

1. **Evidence gathered** — something (a future rule-based pass, a human,
   eventually an LLM call) collects real `SupportingSignal`s
   (`evidence.ts`) — each one a genuine observation (a registry change, an
   intelligence signal, a provider update, a contract event, a liquidity
   movement, a governance event) with a real source and timestamp.
2. **Confidence derived** — `deriveConfidence(signals)` (`confidence.ts`)
   turns that evidence into an `IntelligenceConfidence` — never the other
   way around.
3. **Brief constructed** — `createIntelligenceBrief()` (`builder.ts`)
   assembles the full `AIIntelligenceBrief`: the evidence-derived
   confidence, plus caller-supplied `headline`/`summary`/`impact`/
   `category`/`affectedProjects`/`supportingSources`/`tags`. Throws if
   evidence or sources are missing.
4. **(Not built by this PR) Surfaced** — a brief would be rendered on the
   Dashboard, folded into the Daily Brief, shown on a Project page,
   turned into a Notification, or included in a future email digest. No
   such wiring exists yet.
5. **(Not built by this PR) Timelined** — `toTimelineFriendlyEntry()`
   (`timeline-adapter.ts`) produces a shape ready for the Intelligence
   Timeline, but nothing registers it there. See "Timeline Readiness."

## Confidence vs Impact

The two axes are independent by design — a brief can land anywhere in
this 4×4 grid, and both extremes are real, valid combinations:

| | Low confidence | Very-high confidence |
| --- | --- | --- |
| **Critical impact** | An unconfirmed report of a security exploit — matters enormously if true, but only one weak signal so far. | A confirmed, multi-source-corroborated critical exploit. |
| **Informational impact** | A single, unverified rumor of a minor config change — barely matters even if true. | A well-evidenced, routine release note. |

- **Confidence** (`confidence.ts`) answers *"how sure are we this is
  true?"* — always derived from `supportingSignals`, never assigned.
- **Impact** (`impact.ts`) answers *"how much does this matter if it's
  true?"* — an editorial/domain judgment about the news itself, supplied
  explicitly by whatever builds the brief. This PR does not attempt to
  derive impact from evidence quantity, since significance depends on
  *what* happened (a governance vote vs. an exploit vs. a routine TVL
  tick), not how many sources reported it.

Confidence levels: `low` | `medium` | `high` | `very-high`
(`INTELLIGENCE_CONFIDENCE_LEVELS`). Impact levels: `informational` |
`moderate` | `significant` | `critical` (`INTELLIGENCE_IMPACT_LEVELS`).

### How confidence is calculated today, and what's still missing

`deriveConfidence()` implements exactly two of the seven dimensions
`docs/PRODUCT_BIBLE/05_INTELLIGENCE_FRAMEWORK.md`'s Confidence Framework
names:

- **Evidence quantity** — more independent `SupportingSignal`s raise the
  level.
- **Consensus**, approximated as source diversity — signals spread
  across more distinct `IntelligenceSourceType`s raise the level faster
  than the same count from one source alone.

| Evidence count | Distinct sources | Level |
| --- | --- | --- |
| ≥ 5 | ≥ 3 | `very-high` |
| ≥ 3 | ≥ 2 | `high` |
| ≥ 2 | any | `medium` |
| 1 | 1 | `low` |

These thresholds are a starting heuristic, not a statistically validated
model — the same honest caveat this codebase already applies to
`lib/discovery/duplicates.ts`'s match weights.

**Not yet implemented** (needs richer per-signal metadata this PR's
`SupportingSignal` doesn't carry): Evidence Quality (how strong is this
specific piece of evidence, not just its existence), Source Reliability
(a trust score per source, distinct from `lib/discovery/normalize.ts`'s
flat `SOURCE_CONFIDENCE`), Freshness (how stale is this signal now,
relative to when the brief is read), Coverage (how much of the full
picture does this evidence actually cover), Conflicting Evidence
(signals that disagree should lower confidence, not just add to the
count), and Unknowns (explicitly acknowledging what isn't known). A
future pass would need to extend `SupportingSignal` with per-item
quality/reliability/freshness fields before any of these can be computed
honestly — this PR does not fabricate placeholder values for them.

## Evidence Model

`SupportingSignal` (`evidence.ts`) — one real, observed fact backing a
brief:

```ts
type SupportingSignal = {
  id: string;
  kind: EvidenceKind;      // registry-change | intelligence-signal | provider-update
                           // | contract-event | liquidity-movement | governance-event | other
  description: string;     // what was actually observed — never a restatement of the brief's headline
  source: IntelligenceSourceType;
  occurredAt: string;      // the evidence's own timestamp, independent of the brief's generatedAt
  referenceUrl?: string;
};
```

A brief supports arbitrarily many (`AIIntelligenceBrief.supportingSignals:
SupportingSignal[]`) — `createIntelligenceBrief()` only requires at least
one. `"other"` exists for a real signal that doesn't fit the other six
kinds, never as a place to stash something unverified — an unverified
claim isn't evidence at all, and doesn't get a `SupportingSignal`.

## Source Attribution

`IntelligenceSourceType` (`sources.ts`) extends `ProviderName`
(`lib/providers/common/types.ts` — the six live-API providers) with two
non-API sources this codebase already produces real data from:
`base-registry` (`data/projects/` — editorial/registry facts) and
`discovery-engine` (`lib/discovery/` — PR-039's candidate pipeline).
`INTELLIGENCE_SOURCE_LABEL` gives each a display name matching
`lib/intelligence/scorecard.ts`'s existing `PROVIDER_DISPLAY_NAME`
wording for the six shared values.

`SourceReference` (`{ source, label?, url? }`) is one citation;
`AIIntelligenceBrief.supportingSources: SourceReference[]` requires at
least one. A brief's `supportingSignals` and `supportingSources` are
deliberately separate lists — a signal is a specific observation
(`"TVL rose 18% over 24h"`), a source is the general attribution
(`"DefiLlama"`) — a brief can cite a source generally even for context
that didn't produce a specific dated signal.

## Timeline Readiness

`toTimelineFriendlyEntry()` (`timeline-adapter.ts`) maps an
`AIIntelligenceBrief` into a shape field-compatible with
`lib/timeline/types.ts`'s `TimelineEvent` (same `id`/`timestamp`/
`projectId`/`projectName`/`title`/`summary`/`source`/`link`/`metadata`
names and meanings) — **without** importing from `lib/timeline/` or
registering a new `TimelineEventType`. Per this PR's explicit constraint
("do not implement the timeline UI"), nothing calls this function from
anywhere, and no route or page merges its output into the real
`Timeline`.

`severity`, `score`, and `category` are deliberately absent from the
adapter's output rather than force-mapped onto `TimelineEvent`'s
`AlertSeverity | null` / `number | null` / `AlertCategory | null` fields
— `impact`, `confidence.level`, and `IntelligenceCategory` are different
vocabularies from those fields' real types, and coercing one into
another would be exactly the kind of scoring-vocabulary conflation
`docs/PRODUCT_BIBLE/05_INTELLIGENCE_FRAMEWORK.md` warns against. They
travel in `metadata` instead, honestly labeled as their own kind.

A brief concerning exactly one project populates `projectId`/
`projectName`; zero or multiple affected projects leave both `null` (the
same "aggregate-level event" convention `TimelineEvent` itself already
documents) with the full `affectedProjects` list preserved in
`metadata`.

## Future AI Generation Flow

This PR defines the *shape* intelligence takes, not how it gets
produced. A future generation step — most naturally a new method on
`lib/intelligence-engine/`'s existing `IntelligenceProvider` interface
(`generateIntelligenceBrief(evidence): Promise<AIIntelligenceBrief>`,
alongside its current `generateBrief`/`generateProjectSummary`/
`generateNarrative`/`generateRiskAnalysis`) — would need to:

1. Gather real `SupportingSignal`s from wherever evidence already exists
   in this codebase: `lib/alerts/`'s `Alert`s, `lib/discovery/`'s
   `CandidateProject`s, registry `lifecycle`/`verificationLevel`
   changes, provider data refreshes.
2. Call `createIntelligenceBrief()` with that evidence plus a
   `headline`/`summary`/`impact`/`category` — generated by the
   `RuleBasedIntelligenceProvider` today, or by a real LLM integration
   later (this PR's own constraint: "do NOT integrate OpenAI or Claude").
3. Surface the resulting `AIIntelligenceBrief`s somewhere — a Dashboard
   widget, a Daily Brief section, a Project page panel, a Notification, a
   future email digest — none of which this PR builds.
4. Feed accepted briefs through `toTimelineFriendlyEntry()` into a real
   Timeline integration, if and when one is built.

None of this exists today, and this PR does not fabricate a shortcut
around it.
