# Project Intelligence Integration

**PR-043 — Project Intelligence Integration.** This document covers how
the Project Registry (PR-037), Discovery Engine (PR-039), and AI
Intelligence Engine/Daily Brief Pipeline (PR-040/041/042) surface on the
individual Project Profile page (`app/dashboard/projects/[slug]/page.tsx`).
**Integration-focused enhancement**: no page redesign, no routing change,
no LLM integration — one new, fully-optional section added to an
otherwise-unchanged page.

## A naming note

`lib/intelligence/engine.ts` already exports `getProjectIntelligence(idOrSlug)`
— a large, unrelated per-project bundle (identity/market/trading/tvl/
contracts/github/chain/community/health/confidence/freshness/summary/
narrative/risk/governance). This PR's new service is named
**`getProjectAIIntelligence`** to avoid colliding with that existing name.
It surfaces a narrower, different concept: PR-040/041's `AIIntelligenceBrief`
model plus PR-037's registry metadata, for one project. The two functions
are unrelated and both remain in use — this PR does not touch
`getProjectIntelligence` or any of its callers.

Worth noting: the Project Profile page itself doesn't actually call
`getProjectIntelligence(idOrSlug)` either — it calls `buildProjectIntelligence`
directly (a PR13.7-era performance rewrite, predating this PR). This PR's
`getProjectAIIntelligence()` is additive to that existing architecture,
not a replacement for any part of it.

## Project Intelligence Architecture

```
 getProjectAIIntelligence(projectId)          (lib/data/aggregate.ts)
        │
        ├─▶ getProject(projectId)              (data/projects/helpers — registry metadata)
        │
        └─▶ getCurrentDailyIntelligenceBriefing()   (same cached call PR-042's
              │                                       getDashboardIntelligenceBrief()
              │                                       uses — never re-run)
              ▼
        DailyIntelligenceBriefing { briefs: AIIntelligenceBrief[], ... }
              │
              │ .filter(brief => brief.affectedProjects.includes(projectId))
              ▼
        ProjectAIIntelligence { registry, briefs, evidenceSummary, sources }
              │
              ├─▶ lib/ai-intelligence/project-adapter.ts
              │     toLatestProjectHighlight() / toRelatedProjectHighlights()
              │
              └─▶ lib/ai-intelligence/dashboard-adapter.ts (REUSED, not duplicated)
                    toDashboardEvidenceSummary() / toDashboardSourceAttribution()
                            │
                            ▼
              <ProfileIntelligencePanel /> (components/explorer/)
```

## Service Orchestration

`getProjectAIIntelligence(projectId)` (`lib/data/aggregate.ts`, `cache()`-wrapped
like every other function in that file):

1. `getProject(projectId)` — real registry lookup (accepts id or slug);
   returns `null` if the project doesn't exist, mirroring `getProject`'s
   own contract.
2. `getCurrentDailyIntelligenceBriefing()` — the **same cached call**
   `getDashboardIntelligenceBrief()` (PR-042) uses. Extracting this shared
   function was this PR's one refactor to `lib/data/aggregate.ts`: before
   PR-043, the generation logic lived inline inside
   `getDashboardIntelligenceBriefImpl()`; now both the Dashboard service
   and this new per-project service call the identical cached function,
   so a request can never run `generateDailyIntelligenceBriefing()` more
   than once — directly satisfying this PR's "do not trigger duplicate
   Daily Brief generation."
3. Filters `briefing.briefs` down to entries where
   `affectedProjects.includes(project.id)` — including ecosystem-wide
   briefs that mention several projects at once (e.g. "3 projects reached
   Verified status"), not just single-project ones. Verified with a
   synthetic smoke test during this PR's own build: a brief naming two
   projects correctly appears for both.
4. Reuses `lib/ai-intelligence/dashboard-adapter.ts`'s
   `toDashboardEvidenceSummary()`/`toDashboardSourceAttribution()`
   unchanged, against the project-filtered brief set — the exact same
   formatting the Dashboard widget uses, per this PR's "reuse the
   Dashboard evidence/attribution formatting" requirement.

No new network call, no persistence, no LLM — this function only reads
already-real data (the registry, the cached briefing) and filters/adapts
it.

## Adapter Responsibilities

`lib/ai-intelligence/project-adapter.ts` — the "Project Intelligence
Adapter" this PR's scope names as its own deliverable. Two small, pure
functions converting `AIIntelligenceBrief[]` into `ProjectIntelligenceHighlight`,
a presentation-only projection (drops `category`/`affectedProjects`/
`tags`/`supportingSignals`/`supportingSources` — those travel through
`dashboard-adapter.ts` instead, never duplicated here; flattens
`confidence.level` for direct display):

- **`toLatestProjectHighlight(briefs)`** — the single highest-priority
  brief (already ranked by `lib/ai-intelligence/generator/ranking.ts`);
  `undefined` when there are none.
- **`toRelatedProjectHighlights(briefs)`** — every brief after the
  latest one; empty when there's only one (or zero) briefs, so the Panel
  never shows a redundant one-item "related" list under a "latest"
  section already showing that same brief.

This is genuinely new, small code — not a duplicate of `AIIntelligenceBrief`
(PR-040) or `DashboardIntelligenceBriefData` (PR-042): it's a narrower
read-projection scoped to exactly what the Panel's "Latest Intelligence"/
"Related Intelligence" sections need.

## Registry Integration

Registry metadata (`ProjectAIIntelligence.registry`) is read directly off
the `Project` record via `getProject()` — no new query function, no
duplicate model:

| Field | Source | Real today? |
| --- | --- | --- |
| `verificationLevel` | `project.verificationLevel?.level` | No — unset on every current seed project (PR-037's field). |
| `lifecycleState` | `project.lifecycle?.state` | No — same reason. |
| `discoverySource` | `project.lifecycle?.discoverySource` | No — same reason. |
| `qualityScore` | `project.qualityScore?.total` | No — no seed project has a computed `qualityScore` yet. |

**Badges are reused, never recreated**: `VerificationLevelBadge` and
`LifecycleBadge` (both built in PR-038, previously only ever rendered on
the Explorer grid's `ProjectCardHeader`) are imported unchanged into
`ProfileIntelligencePanel` — the exact same components, same props, same
"renders `null` when unset" contract. This PR is the first time either
badge appears on the Project Profile page.

## Evidence Flow

"Supporting Evidence" reuses `toDashboardEvidenceSummary()`
(`lib/ai-intelligence/dashboard-adapter.ts`, PR-042) unchanged, applied to
this project's filtered brief set — same bucketing (by `EvidenceKind`,
with a `"security"`-category override to "Security Alert"), same
plain-language labels, same sort order. `ProfileIntelligencePanel`'s JSX
for this section mirrors `components/dashboard/IntelligenceBrief.tsx`'s
own evidence-list markup exactly (dot + count + label), per this PR's
"reuse the Dashboard evidence formatting."

## Source Attribution

"Sources" reuses `toDashboardSourceAttribution()` unchanged, same
deduplication-by-display-name behavior. The JSX mirrors the existing
green-`Check`-icon link row pattern already used in two places in this
codebase (`components/dashboard/IntelligenceBrief.tsx`'s own sources
section, itself mirroring `components/explorer/ProfileExecutiveIntelligence.tsx`'s
`sourcesUsed` row) — the third, not a fourth, distinct implementation of
this pattern.

## Empty States

`ProfileIntelligencePanel` renders `null` entirely when there is
**neither** real registry metadata **nor** any real brief for this
project — the honest, current reality for every seed project today (see
"Registry Integration" table above; confirmed live via browser QA on
Aave's profile, which shows zero change from pre-PR-043 behavior). Within
the panel, each of the five sub-sections (registry badges / Latest
Intelligence / Supporting Evidence / Sources / Related Intelligence)
independently disappears when its own data is empty — never a
placeholder, never literal "No Intelligence" text, matching every other
"omit rather than fabricate" section already on this page (Contracts,
Governance, Community Metrics).

## Performance

- `getProjectAIIntelligence` is `cache()`-wrapped (React's per-request
  memoization, the same pattern every function in `lib/data/aggregate.ts`
  already uses) — calling it more than once for the same `projectId`
  within one request returns the same cached promise.
- It depends on `getCurrentDailyIntelligenceBriefing()`, itself
  `cache()`-wrapped — so even across multiple different services calling
  it in the same request (this one, plus PR-042's Dashboard service, were
  they ever both invoked in one request), the generator runs at most
  once.
- No repeated registry lookups: `getProject(projectId)` is a synchronous,
  in-memory array scan (`data/projects/helpers.ts`) — cheap enough that
  no additional caching layer was warranted beyond the function-level
  `cache()` already applied.
- Wired into the Project Profile page's existing fast-path
  `Promise.allSettled` batch (alongside `buildProjectIntelligence`,
  genesis date, whale events, signals, finality) — not deferred behind a
  new Suspense boundary, since `getProjectAIIntelligence` involves no
  slow provider call (unlike the page's three genuinely slow calls —
  commit activity, TVL history, token transfers — which stay unawaited
  exactly as before).

## Future Timeline Integration

`ProjectIntelligenceHighlight` (this PR's adapter output) is not wired
into `lib/timeline/`'s `Timeline`/`TimelineEvent` model — the "Related
Intelligence" list this PR adds is a self-contained list inside the new
Panel, not a new Timeline event type. A future integration would need to:

1. Map `ProjectIntelligenceHighlight` (or `AIIntelligenceBrief` directly,
   via `lib/ai-intelligence/timeline-adapter.ts`'s existing
   `toTimelineFriendlyEntry()` from PR-040) into `lib/timeline/`'s real
   `TimelineEvent` shape.
2. Register a new `TimelineEventType` for it and fold it into
   `buildTimeline()`'s merge step.
3. Decide whether this project-scoped Panel's list should then defer to
   the page's existing Timeline section (`ProfileActivityFeed`'s
   `Timeline` tab) instead of maintaining its own separate list.

None of this is built here — PR-040's `toTimelineFriendlyEntry()` already
exists for exactly this future purpose (see docs/AI_INTELLIGENCE_ENGINE.md
"Timeline Readiness"); this PR doesn't call it, since wiring a second
Timeline integration point was out of scope for an "integration-focused
enhancement" that also must not redesign any existing section.
