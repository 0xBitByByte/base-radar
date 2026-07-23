# Discovery Engine

**PR-039 — Registry Discovery Engine.** This document covers `lib/discovery/`
— the infrastructure that finds candidate Base ecosystem projects from
multiple sources and prepares them for human review. It does **not**
populate the Project Registry (`data/projects/`) — see "Future Ingestion
Flow" below for what would still need to happen for that.

This PR builds on PR-037's foundation: `DiscoverySource`,
`RegistryLifecycleState`, and `VerificationLevel` (`data/projects/enums.ts`)
already model *where* a project came from and *how far* it has progressed
through review. This PR is the first thing that actually produces
`DiscoverySource`-tagged data — it does not introduce a competing model.

## Discovery Architecture

```
 DiscoveryProvider (one per DiscoverySource)
        │
        │ discover() → real API call, where a lightweight wrapper
        │              already exists; otherwise an immediate,
        │              documented no-op
        ▼
 CandidateProject[]              (lib/discovery/types.ts)
        │
        │ findDuplicateMatches() against data/projects/ (lib/discovery/duplicates.ts)
        ▼
 DiscoveryQueueEntry              (lib/discovery/queue.ts)
   status: new | needs-review | accepted | rejected | duplicate
        │
        │ (a future PR: human review, then registry ingestion)
        ▼
 Project                          (data/projects/ — NOT written by this PR)
```

`runDiscovery()` (`lib/discovery/engine.ts`) is the one place that ties a
list of `DiscoveryProvider`s together — it calls every provider in
parallel, records per-source health, and returns the union of every
candidate found. Nothing calls `runDiscovery()` yet; no route, page, or
cron job is wired to it. It exists so a future ingestion job has a single
function to call.

## Provider Contracts

Every source implements one interface (`lib/discovery/provider.ts`):

```ts
interface DiscoveryProvider {
  readonly source: DiscoverySource;
  discover(): Promise<DiscoveryResult>;
}
```

Eight providers exist, one per `DiscoverySource`
(`data/projects/enums.ts`) — matching the trust table already documented
in `PROJECT_REGISTRY.md`'s "Discovery Sources" section:

| Source | Implementation | Why |
| --- | --- | --- |
| `coingecko` | Real — wraps `getBaseEcosystemMarkets()` | Already lists Base-ecosystem coins; no new API surface added. |
| `defillama` | Real — wraps `getBaseProtocols()` | Already lists Base-chain protocols; no new API surface added. |
| `blockscout` | Real — wraps `getRecentlyVerifiedContract()` | Already surfaces the latest verified Base contract (0-1 candidate per call, not a list). |
| `base-ecosystem` | Placeholder | No official, programmatic ecosystem-directory API exists to wrap. |
| `github` | Placeholder | Every existing GitHub wrapper fetches a single, already-known repo — none search/list repos. |
| `farcaster` | Placeholder | No Farcaster client exists anywhere in this codebase. |
| `community` | Placeholder | No submission form exists yet to poll. |
| `ai-discovery` | Placeholder | By definition depends on the other seven sources already running. |

A "real" provider is still a thin wrapper: it calls an existing
`lib/providers/*/service.ts` function (never a new `fetch()`), and maps
the result through `lib/discovery/normalize.ts`. A "placeholder" provider
resolves immediately with zero candidates and a code comment explaining
exactly what's missing — never a silent stub with no explanation, and
never a fabricated response.

Adding a real integration for a placeholder source later means writing
one new file that satisfies `DiscoveryProvider` and registering it in
`DISCOVERY_PROVIDERS` (`lib/discovery/engine.ts`) — nothing else in the
pipeline needs to change.

## Candidate Lifecycle

1. **Discovered** — a `DiscoveryProvider.discover()` call produces a
   `CandidateProject` (`lib/discovery/types.ts`). This is data only; it is
   never written anywhere.
2. **Duplicate-checked** — `findDuplicateMatches()`
   (`lib/discovery/duplicates.ts`) compares the candidate against every
   existing `Project` and returns ranked `DuplicateMatch[]`. Never merges
   or mutates anything — a pure comparison.
3. **Queued** — `createQueueEntry()` (`lib/discovery/queue.ts`) builds a
   `DiscoveryQueueEntry` from the candidate and its duplicate matches,
   defaulting to `"duplicate"` (confidence ≥ 70 match found),
   `"needs-review"` (a weaker match found), or `"new"` (no match at all).
4. **Reviewed** — `acceptCandidate()` / `rejectCandidate()` /
   `markAsDuplicate()` transition an entry's status and stamp
   `reviewedAt`/`reviewedBy`/`notes`. No UI exists yet to call these — see
   the brief's explicit "No UI required" for this PR.
5. **(Future) Ingested** — an *accepted* entry becoming a real `Project`
   record is explicitly out of scope here. See "Future Ingestion Flow."

No queue entry currently persists anywhere (no database, no localStorage)
— `DiscoveryQueueEntry` is a model, not a store. A real queue needs a
persistence layer sized for unbounded growth, which is a deliberate
decision for a future PR rather than an oversight here (see "Future
Expansion" in the PR's own report).

## Normalization Process

`lib/discovery/normalize.ts` provides the shared, source-agnostic pieces
every provider composes:

- `normalizeName(name)` — lowercases, strips punctuation, collapses
  whitespace. Used for `CandidateProject.normalizedName` and for
  name-based duplicate matching.
- `normalizeWebsite(url)` — strips protocol/`www.`/trailing slash so two
  differently-formatted URLs for the same site compare equal.
- `normalizeHandle(handle)` — strips a leading `@` and lowercases, so a
  social handle compares equal regardless of formatting.
- `SOURCE_CONFIDENCE` — a flat, per-source default (`base-ecosystem: 80`
  down to `ai-discovery: 20`), directly encoding the "default trust
  implication" column `PROJECT_REGISTRY.md` already documented for
  `DiscoverySource`. This PR does not attempt to score any individual
  candidate more precisely than "which source found it."

Each provider maps its own raw shape into `CandidateProject` using only
fields its existing wrapper already returns — never inventing a website,
social link, or contract the source didn't actually provide. Where a
source's real API has more available (e.g. DefiLlama's public
`/protocols` response has a slug/website/twitter in reality) but this
codebase's typed wrapper doesn't map it yet, this PR leaves that field
unset rather than reading untyped raw fields — extending the wrapper's
own types is a separate, small follow-up, not something this PR reaches
past its stated scope to do.

## Duplicate Detection Strategy

`findDuplicateMatches()` checks five independent signals per existing
`Project`, matching the brief's list exactly:

| Signal | Weight | Compared as |
| --- | --- | --- |
| Contract address | 50 | Same `chain` + case-insensitive address. |
| GitHub | 30 | Same `owner`+`repo`, or same `url` if no repo. |
| Website | 30 | `normalizeWebsite()` equality. |
| X/Twitter | 25 | `normalizeHandle()` equality. |
| Name | 20 | `normalizeName()` equality. |

Weights sum (capped at 100) across every signal that matched — a
candidate matching on both contract address and name scores 70, not just
the stronger of the two. This is a starting heuristic for a future
reviewer UI, not a statistically validated model. No fuzzy/approximate
string matching is used (no new dependency) — only exact comparisons
after normalization.

`findDuplicateMatches()` never merges, discards, or modifies a `Project`
— it only returns ranked matches for something else (today, `queue.ts`'s
status defaulting) to act on.

## Provider Health

`lib/discovery/health.ts` tracks per-`DiscoverySource` sync health
in-memory (process lifetime, resets on restart) — deliberately separate
from `lib/providers/common/health.ts`, which tracks the six *live
intelligence* providers (a different, overlapping-but-distinct set: it
has no `base-ecosystem`/`farcaster`/`community`/`ai-discovery` entries,
and this file has no `dexscreener` entry). Each of the three real
providers (`coingecko`, `defillama`, `blockscout`) records a real
success/failure/`itemsDiscovered` count on every `discover()` call; each
placeholder records a trivial "ran, found nothing" success so its status
reads `"healthy"` rather than `"unknown"` once the engine has actually run
once. Nothing consumes this yet — no dashboard widget, no status bar
entry — reserved for a future moderation UI.

## Future Ingestion Flow

This PR deliberately stops at "here are ranked candidates and their
review status." Turning an *accepted* `DiscoveryQueueEntry` into a real
`data/projects/seed/<slug>.ts` entry needs, at minimum:

1. A real persistence layer for the queue (today's `DiscoveryQueueEntry`
   is an in-memory shape with no store).
2. A mapping step from `CandidateProject` to `Project` — deciding
   `category`/`tags`/`status`/`verification.status` is an editorial
   judgment this PR does not attempt to automate (per the brief: "the goal
   is NOT automatic publishing").
3. A reviewer-facing UI to actually accept/reject/annotate queue entries
   (explicitly out of scope here — "No UI required").
4. Wiring `runDiscovery()` to something that runs it on a schedule (a cron
   job, an admin-triggered action) — nothing currently calls it.

None of this exists today, and this PR does not fabricate a shortcut
around it.
