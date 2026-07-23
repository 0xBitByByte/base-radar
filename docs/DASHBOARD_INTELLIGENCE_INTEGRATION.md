# Dashboard Intelligence Integration

**PR-042 — Dashboard Intelligence Integration.** This document covers how
the Daily Brief Generation Pipeline (PR-041, `lib/ai-intelligence/generator/`)
is wired into the existing Dashboard Intelligence widget
(`components/dashboard/IntelligenceBrief.tsx`). **This is an integration
PR**: no dashboard redesign, no routing change, no LLM integration — only
a new data source behind an unchanged widget, plus two small, additive,
hide-when-empty sections.

## Dashboard Integration Flow

```
 data/projects (Registry)  ──┐
 lib/alerts/service.ts     ──┼──▶ getDashboardIntelligenceBrief()   (lib/data/aggregate.ts)
   getAlerts()                │         │
   getIntelligenceAlerts()  ──┘         │ assembles a DailyBriefGeneratorInput
                                        ▼
                          generateDailyIntelligenceBriefing()   (lib/ai-intelligence/generator, PR-041)
                                        │
                                        ▼
                          DailyIntelligenceBriefing { briefs: AIIntelligenceBrief[], ... }
                                        │
                                        │ lib/ai-intelligence/dashboard-adapter.ts
                                        ▼
                 { points, generatedAt, source } + sources[] + evidenceSummary[]
                                        │
                                        ▼
                     <IntelligenceBrief data={...} sources={...} evidenceSummary={...} />
                          (components/dashboard/IntelligenceBrief.tsx — UNCHANGED layout)
```

`app/dashboard/page.tsx` calls `getDashboardIntelligenceBrief()` in the
same top-level `Promise.all([...])` every other widget's data already
comes from — no new fetch pattern, no Suspense boundary, no route change.

## Data Orchestration

`getDashboardIntelligenceBrief()` (`lib/data/aggregate.ts`) gathers four
real inputs, all from modules that already exist:

| Gathered | From | Real today? |
| --- | --- | --- |
| Registry updates | `getProjects()` (`data/projects`), reading `lifecycle.updatedAt`/`verificationLevel.reachedAt` within a 30-day lookback | **No** — no current seed project has either field set (PR-037's fields remain unpopulated). Returns `[]`, not an error. |
| Alert events | `getAlerts()` (`lib/alerts/service.ts`) | **No** — that module only self-initializes in the browser (`if (typeof window !== "undefined")`), so it's always `[]` on the server. |
| Intelligence signals | `getIntelligenceAlerts()` (`lib/alerts/service.ts`) | **No** — same reason as above. |
| Provider health | *(read, not fed into the generator — see below)* | N/A |

Two inputs `DailyBriefGeneratorInput` accepts are deliberately left
unpopulated, not faked:

- **`discoveryCandidates`** — populating this honestly means calling
  `lib/discovery/`'s `runDiscovery()`, which performs real external API
  requests (CoinGecko/DefiLlama/Blockscout). This PR's own constraint is
  "no API calls" for this lightweight, render-time service, so no live
  Discovery run is triggered here.
- **`providerChanges`** — a real percentage-change value (e.g. "TVL rose
  22%") requires comparing against a previous snapshot, which requires
  persistence. This PR explicitly prohibits persistence, so there is no
  honest way to populate this field from this service alone.

**Provider Health** (`getAllProviderHealth()`, `lib/providers/common/
health.ts`) is read but does not feed into `DailyBriefGeneratorInput` —
it tracks request success/failure counts, not a "material change" in the
shape `ProviderChangeInput` needs (a metric name + a signed percentage).
Forcing health status into that field would be a category error, not a
useful signal.

**Net effect today**: every one of the four populated-attempt inputs
resolves to `[]` in the current environment, so `generateDailyIntelligenceBriefing()`
returns `briefs: []`, and the widget shows the same `MOCK_INTELLIGENCE_BRIEF`
fallback it always has. This is the expected, honest outcome — not a
bug. See "Fallback Behavior" below.

## Adapter Responsibilities

`lib/ai-intelligence/dashboard-adapter.ts` is the **only** place an
`AIIntelligenceBrief`/`DailyIntelligenceBriefing` gets translated into
something the widget renders — three pure functions, no new "brief"
model:

- **`toDashboardIntelligenceBrief()`** → the existing `IntelligenceBrief`
  shape (`lib/data/types.ts`, untouched) — `headline` becomes bullet
  `text`, truncated to 6 points (matching `MOCK_INTELLIGENCE_BRIEF`'s own
  length). Tone is derived conservatively: `category === "security"` →
  `"negative"`, everything else → `"neutral"` — `AIIntelligenceBrief` has
  no valence field, so this never guesses positive/negative sentiment
  beyond the one genuinely unambiguous case.
- **`toDashboardEvidenceSummary()`** → counts real `supportingSignals`
  across every rendered brief, bucketed by a plain-language label (e.g.
  "Registry Update", "Provider Signal"; a `"security"`-category brief's
  signals are labeled "Security Alert" instead of the generic `other`
  kind's default, since that's more accurate given the brief's own real
  category). Sorted highest-count first, matching the brief's own
  example ordering.
- **`toDashboardSourceAttribution()`** → every distinct real
  `supportingSources` entry across every rendered brief, de-duplicated by
  display name.

## Widget Integration

`components/dashboard/IntelligenceBrief.tsx`'s existing bullet list,
`WidgetCard` wrapper, icon/title/subtitle/accent, "Demo data" pill logic,
and all animation/spacing classes are **completely unchanged**. Two new
sections were added, both optional props that default to hidden:

- **Evidence summary** — reuses the exact same bullet-list markup pattern
  already in this file (`<ul>` + dot + text), just smaller/muted, appended
  after the main list behind a `border-t` divider. Renders nothing when
  `evidenceSummary` is `undefined` or `[]`.
- **Source attribution** — mirrors the one existing "sources used" pattern
  in this codebase (`components/explorer/ProfileExecutiveIntelligence.tsx`'s
  green-`Check`-icon link row), inlined here since no shared component
  exists to import. Renders nothing when `sources` is `undefined` or `[]`.

Both are simple `{condition && (...)}` guards — no layout shift, no new
loading state, no change to the card's animation or responsive grid
placement. Verified via browser QA (see below): desktop and mobile both
render identically to the pre-PR-042 widget when these props are empty.

## Fallback Behavior

`getDashboardIntelligenceBriefImpl()` falls back to the same
`MOCK_INTELLIGENCE_BRIEF` (`lib/data/mock.ts`) the widget has always
shown, in two cases:

1. `generateDailyIntelligenceBriefing()` returns `briefs: []` (the current
   reality — see "Data Orchestration").
2. Anything throws (defensive — the pipeline itself is deterministic and
   doesn't throw under normal input, but registry reads or the alerts
   module are still real code paths).

In both cases, `sources: []` and `evidenceSummary: []` accompany the
mock brief — so the two new sections never render alongside fabricated
or stale evidence/source data. No summary text and no headline is ever
invented; the fallback is always the same real, hand-authored mock
content this widget shipped with originally.

## Future Real-Time Update Path

This integration is entirely server-render-time — no client polling, no
`useEffect`, no re-fetch on an interval (per this PR's explicit "do NOT
introduce client-side polling" constraint). A future real-time path would
need:

1. **A server-safe alerts data source** — `lib/alerts/service.ts`'s
   `if (typeof window !== "undefined")` guard means `getAlerts()`/
   `getIntelligenceAlerts()` are permanently empty on the server today.
   Fixing that (a real server-side alert fetch, independent of the
   browser-only self-init) is the single highest-leverage change to make
   this integration produce visibly real briefs.
2. **A registry-diffing job** — something that actually sets
   `lifecycle.updatedAt`/`verificationLevel.reachedAt` on real registry
   entries as they change, so `getRecentRegistryUpdates()` has real
   timestamps to read.
3. **A scheduled/triggered Discovery run** with a place to persist its
   results, so `discoveryCandidates` can be populated without this
   render-time service triggering a live run itself.
4. **A snapshot-comparison mechanism** for `providerChanges` — needs the
   persistence this PR explicitly avoids; likely a separate background
   job's responsibility, not this Dashboard-facing service's.

None of this is built here — `getDashboardIntelligenceBrief()`'s job was
to wire the pipeline in honestly, not to manufacture real-time data
sources that don't exist yet.
