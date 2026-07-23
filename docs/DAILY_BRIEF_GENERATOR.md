# Daily Brief Generation Pipeline

**PR-041 — Daily Brief Generation Pipeline.** This document covers
`lib/ai-intelligence/generator/` — a deterministic, rule-based pipeline
that turns real Registry/Discovery/Alert/Provider input into ranked
`AIIntelligenceBrief`s (PR-040's model), wrapped in a `DailyIntelligenceBriefing`
collection. **No LLM, no external API call, no persistence, no UI.** Given
the same input (including the same explicit clock), the output is
byte-for-byte identical every time — verified by a smoke test during this
PR's own build (see "Validation").

## A naming note

This is the **third** "Daily Brief"-adjacent thing in this codebase, and
deliberately produces a **different** type than the other two:

- `lib/brief/`'s `DailyBrief` (PR16) — built from `IntelligenceAlert[]`
  (`lib/alerts/intelligence/`), has its own `headline`/`summary` at the
  collection level, and is what `/dashboard/brief` actually renders today.
- `lib/data/types.ts`'s `IntelligenceBrief` (older, simpler) — a handful of
  tone-colored bullet points powering the Dashboard's "Base Intelligence
  Brief" widget.
- **This PR's `DailyIntelligenceBriefing`** (`generator/briefing.ts`) —
  wraps `AIIntelligenceBrief[]` (PR-040's richer confidence/impact/
  evidence/source model), produced by this PR's own rule engine, not by
  `lib/brief/`'s engine. Nothing here is wired into `/dashboard/brief` or
  any other route.

None of the three replace each other. See `docs/AI_INTELLIGENCE_ENGINE.md`'s
own naming note for the `AIIntelligenceBrief` vs. `IntelligenceBrief`
distinction this PR inherits.

## Daily Brief Lifecycle

```
 DailyBriefGeneratorInput                  (generator/types.ts — every field optional)
        │
        │ normalizeInput() — fills missing fields with []
        ▼
 DAILY_BRIEF_RULES.map(rule => rule.evaluate(normalized))   (generator/rules.ts)
        │
        │ zero or more real BriefDraft[] per rule
        ▼
 createIntelligenceBrief(draft)            (lib/ai-intelligence/builder.ts — PR-040, never bypassed)
        │
        │ throws if a draft ever has zero evidence/sources (should never
        │ happen — every rule only emits a draft once it has real evidence)
        ▼
 AIIntelligenceBrief[]
        │
        │ rankBriefs() — deterministic priority sort (ranking.ts)
        ▼
 generateDailyBrief() returns this ranked array
        │
        │ generateDailyIntelligenceBriefing() wraps it with statistics
        ▼
 DailyIntelligenceBriefing                 (briefing.ts)
```

`generateDailyBrief(input)` is the brief's own suggested entry point,
returning just the ranked `AIIntelligenceBrief[]`.
`generateDailyIntelligenceBriefing(input)` wraps that with the "Daily
Brief Collection" the brief's scope item 6 asks for (statistics,
`briefingDate`, `version`). Both are pure functions — nothing is
persisted, nothing calls out to any service.

## Generator Architecture

### Inputs (`generator/types.ts`)

`DailyBriefGeneratorInput` — every field optional, so `generateDailyBrief({})`
and `generateDailyBrief()` are both valid and return `[]`:

| Field | Type | Real source |
| --- | --- | --- |
| `registryUpdates` | `RegistryUpdateInput[]` | Caller-supplied — this generator does not diff `data/projects/` itself (no snapshot-comparison logic exists yet anywhere in this codebase). |
| `discoveryCandidates` | `CandidateProject[]` | `lib/discovery/` (PR-039) — passed through directly, no re-normalization. |
| `providerChanges` | `ProviderChangeInput[]` | Caller-supplied — this generator does not poll any provider itself (per this PR's "do not call external services" constraint). |
| `alertEvents` | `Alert[]` | `lib/alerts/types.ts` — passed through directly. |
| `intelligenceAlerts` | `IntelligenceAlert[]` | `lib/alerts/intelligence/` — accepted for forward compatibility; **no shipped rule consumes it yet** (see "Rule Evaluation Flow"). |
| `timelineEvents` | `TimelineEvent[]` | `lib/timeline/` — accepted for forward compatibility; **no shipped rule consumes it yet**. |
| `now` | `string` (ISO) | The generator's explicit clock — see "Determinism" below. |

`normalizeInput()` (`generate.ts`) is the one place missing fields become
real (if empty) arrays, so every `Rule.evaluate()` can assume it always
receives arrays, never `undefined` — "gracefully handle missing inputs"
implemented once, not re-checked in every rule.

### Determinism

`generateDailyBrief()`/`generateDailyIntelligenceBriefing()` never call
`Math.random()` or read any ambient clock except `input.now` (defaulted to
`new Date().toISOString()` only when the caller omits it entirely — the
same convention `data/projects/metrics.ts`'s `computeRegistryMetrics(projects,
now = new Date())` already established). Pass the same `input` — `now`
included — twice, and the output is identical down to every `id` string,
verified during this PR's own smoke test (two calls with an identical
input, `now` included, produced byte-identical `JSON.stringify()` output).

## Rule Evaluation Flow

`DAILY_BRIEF_RULES` (`generator/rules.ts`) is a fixed array of six `Rule`s,
one per example the brief names. Each rule is a pure function: real,
normalized input in, zero or more real `BriefDraft`s out — never a draft
manufactured to "fill a slot."

| Rule | Fires when | Threshold |
| --- | --- | --- |
| `security-incidents` | Any real `alertEvents` entries are `category: "security"` + `severity: "critical"` | One draft per alert, capped at 5 per run |
| `multiple-verified-projects` | Real `registryUpdates` reaching `"verified"` | ≥ 2 |
| `large-tvl-movement` | Real `providerChanges` with `metric: "tvl"` and `\|changePct\|` past threshold | ≥ 15% (≥ 30% raises impact to `"significant"`) |
| `major-governance-activity` | Real `alertEvents` tagged `"governance"` | ≥ 2 |
| `significant-discovery-spike` | Real `discoveryCandidates` batch size | ≥ 5 |
| `ecosystem-growth` | Real `registryUpdates` `"new-entry"` **and** real `discoveryCandidates` in the same run | ≥ 1 of each |

Every threshold is a documented starting heuristic — the same honest
caveat this codebase already applies to `lib/discovery/duplicates.ts`'s
match weights and `lib/ai-intelligence/confidence.ts`'s confidence
thresholds, never a claim of statistical validation.

`intelligenceAlerts` and `timelineEvents` are accepted inputs but
deliberately unused by any of the six rules above — their richer
confidence/severity/narrative classification is a natural fit for future
rules (e.g. "recurring narrative shift detected"), but building those
rules wasn't part of this PR's scope. This is an explicit boundary, not an
oversight.

## Evidence Assembly

Every rule builds real `SupportingSignal[]`/`SourceReference[]` from the
actual input it matched — never a placeholder. A `security-incidents`
draft's evidence is the literal alert that triggered it; a
`multiple-verified-projects` draft's evidence is one signal per project
that actually reached `"verified"`. `generate.ts` then hands each
`BriefDraft` to **`createIntelligenceBrief()`** — PR-040's builder,
imported and called directly, never reimplemented or bypassed. That
function is what actually derives `confidence` (via `deriveConfidence()`)
and enforces "at least one signal, at least one source" — this PR relies
on those guarantees rather than re-checking them itself.

`affectedProjects` is populated only from real project ids the matching
input actually carried (`registryUpdates[].projectId`,
`providerChanges[].projectId`, `alertEvents[].projectId`) — a
`discoveryCandidates`-driven draft leaves `affectedProjects: []`, since a
freshly-discovered candidate has no real `Project.id` yet (it isn't a
registry entry).

## Ranking Strategy

`rankBriefs()` (`generator/ranking.ts`) sorts `AIIntelligenceBrief[]`
highest-priority first using a weighted sum of the five inputs the brief
names — no ML, no randomness:

| Input | Weight | Why |
| --- | --- | --- |
| Impact | ×100 (informational=1 … critical=4) | The dominant axis — nothing else can push a lower-impact brief above a higher-impact one. |
| Confidence | ×40 (low=1 … very-high=4) | Second most important — how sure we are, given we already know how much it matters. |
| Evidence count | ×5, capped at 10 | A tie-breaking refinement — more real signals nudge a brief up, but can never out-weigh impact. |
| Source diversity | ×8, capped at 5 distinct sources | Corroboration from independent sources nudges a brief up further. |
| Freshness | ×20, linear decay to 0 over 24h | Newer briefs edge out older ones of otherwise-equal priority; never turns negative — an old brief just stops being boosted, it isn't penalized. |

Exact ties (identical score) break first by `generatedAt` descending, then
by `id` ascending — both real, stable fields, so the final order is fully
deterministic even when two briefs score identically (common for two
`critical`/`very-high` briefs from the same run).

## Daily Brief Collection

`DailyIntelligenceBriefing` (`generator/briefing.ts`):

```ts
type DailyIntelligenceBriefing = {
  generatedAt: string;
  briefingDate: string;      // YYYY-MM-DD, derived from generatedAt
  version: 1;
  briefs: AIIntelligenceBrief[];   // already ranked
  statistics: DailyIntelligenceBriefingStatistics;
};
```

Deliberately has **no** top-level `headline`/`summary` — unlike `lib/brief/`'s
`DailyBrief`, synthesizing an aggregate summary when `briefs` might
legitimately be `[]` would mean inventing text with nothing real to
summarize. Every individual `AIIntelligenceBrief` already carries its own
real headline/summary; this collection is a ranked container plus
statistics, nothing more.

`statistics` is always real and always computed, even when `briefs` is
empty:

- `projectsAnalyzed` — distinct real `projectId`s across every input
  stream that carries one.
- `providersScanned` — distinct real `IntelligenceSourceType`s across
  `registryUpdates` (counts as `"base-registry"` if any exist),
  `providerChanges`, and `discoveryCandidates`.
- `alertsProcessed` — `alertEvents.length`.
- `discoveriesReviewed` — `discoveryCandidates.length`.

## Empty-State Handling

`generateDailyBrief({})` (or any input where no rule's real conditions are
met) returns `[]` — confirmed by this PR's own smoke test. There is no
code path that emits a placeholder brief, a synthetic "nothing happened
today" headline, or a fabricated summary. `generateDailyIntelligenceBriefing({})`
still returns a fully-formed `DailyIntelligenceBriefing` with `briefs: []`
and real (zero) statistics — an empty result is a valid, honestly-reported
result, never an error and never padded.

## Future LLM Enhancement Path

This pipeline's rules produce template-based, deterministic prose
(`headline`/`summary` built from real field interpolation — see any rule
in `rules.ts`). A future LLM integration would slot in at exactly one
point: replacing a rule's `headline`/`summary` generation with a call to
`lib/intelligence-engine/`'s `IntelligenceProvider` interface (the same
seam `docs/AI_INTELLIGENCE_ENGINE.md`'s "Future AI Generation Flow"
describes), while leaving everything else — evidence assembly via
`createIntelligenceBrief()`, ranking, statistics, the empty-state
guarantee — completely unchanged. The rule engine's *evaluation* (which
real inputs qualify) is not something an LLM should ever replace — only
the *prose* describing an already-qualified, already-evidenced event. This
PR does not build that integration; it only leaves the seam in an obvious
place.
