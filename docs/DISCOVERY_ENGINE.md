# Discovery Engine

**PR-053 update:** this document originally covered only PR-039's
foundation (Discovery Sources → Normalization → Duplicate Detection →
Queue). PR-053 — the **Live Project Discovery Engine** — extends the same
directory with the rest of the pipeline the brief's architecture diagram
calls for: Deduplication (cross-candidate, before registry matching),
Registry Matching (a richer 6-way classification), Provider Enrichment,
Classification, Confidence Scoring, and the final `DiscoveryProject`
model. See "PR-053 — Live Project Discovery Engine" at the bottom of this
document for the new stages; everything above that section (PR-039's
original content) is unchanged and still accurate.

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

---

## PR-053 — Live Project Discovery Engine

Extends the pipeline above with the remaining stages, none of which
existed in PR-039:

```
 DiscoveryProvider.discover() → CandidateProject[]     (PR-039, unchanged)
        │
        ▼
 dedupeCandidates()                                     lib/discovery/dedupe.ts
   groups raw candidates from different sources that
   refer to the same real-world project (shared
   coingeckoId/defillamaSlug/contract/website/handle —
   never a bare name match) into one DeduplicatedCandidate
        │
        ▼
 matchAgainstRegistry()                                  lib/discovery/registryMatch.ts
   classifies the group against data/projects/ into
   exactly one of: new | duplicate | updated | renamed |
   alias | needs-review
        │
        ▼
 enrichCandidate()                                        lib/discovery/enrich.ts
   real market/TVL evidence already sitting in
   providerMetadata, plus (only for a matched project with
   a known repo) real GitHub commit-activity evidence
        │
        ▼
 classifyCandidate()                                      lib/discovery/classify.ts
   deterministic ProjectCategory — DefiLlama's own
   category string first, a fixed name-keyword table
   second, "other" otherwise. No AI, no fuzzy matching.
        │
        ▼
 computeDiscoveryConfidence()                             lib/discovery/confidence.ts
   evidence-weighted 0-100 score
        │
        ▼
 computeDiscoveryStatus()                                 lib/discovery/status.ts
   evidence-based DiscoveryStatus
        │
        ▼
 DiscoveryProject                                          lib/discovery/project.ts
   the final, reusable per-project model
```

`runDiscoveryPipeline(existingProjects, providers?)` (`lib/discovery/project.ts`)
ties every stage together; `runDiscoveryPipelineAgainstRegistry()` is the
real-usage convenience wrapper defaulting to the live registry. Neither is
called from any route, page, or cron job yet — same "nothing wired in"
scope PR-039 established, extended rather than broken.

### Registry field additions

`CandidateProject` (`lib/discovery/types.ts`) gained two structured,
optional fields so matching never has to reach into untyped
`providerMetadata`:

- `coingeckoId?: string` — the real CoinGecko API id, set by the
  `coingecko` source (it already had this value as `externalId`).
- `defillamaSlug?: string` — a **best-effort, name-derived** slug (via
  `slugify()`, `lib/discovery/normalize.ts`), set by the `defillama`
  source. DefiLlama's typed `Protocol` wrapper carries no real slug field
  (see this doc's "Provider Contracts" section above), so this is
  deliberately weighted lower than `coingeckoId` everywhere it's used as
  evidence — never treated as an exact identifier.

`data/projects/enums.ts`'s `PROJECT_CATEGORIES` gained two values —
`"meme"` and `"payments"` — both real, distinct Base-ecosystem verticals
the prior 20-category taxonomy had no bucket for, additive per that file's
own documented policy.

### Deduplication (`dedupe.ts`)

Groups raw candidates from a single discovery run using the same
"never rely on name alone" discipline as PR-039's own duplicate detection
— two candidates only merge when they share a `coingeckoId`,
`defillamaSlug`, contract address, normalized website, or normalized
social handle. This is the concrete mechanism behind Task 6's "multiple
provider agreement" confidence signal: a `DeduplicatedCandidate.sources`
with more than one entry means two+ independent providers corroborated
the same real project in the same run.

### Registry Matching (`registryMatch.ts`)

Builds directly on `duplicates.ts`'s `findDuplicateMatches()` (which
PR-053 also extended with two more signals — `coingeckoId` at weight 45,
`defillamaSlug` at weight 25, alongside the original contract/GitHub/
website/Twitter/name weights) rather than re-implementing comparison
logic. Classifies the strongest match into:

| Type | Real evidence required |
| --- | --- |
| `new` | No match on any signal. |
| `duplicate` | A unique identifier (contract/coingeckoId/GitHub) **and** the name both match, with nothing new in the candidate. |
| `updated` | Same as `duplicate`, but the candidate carries a real field (website/GitHub/social/contract) the registry record doesn't have yet. |
| `renamed` | A unique identifier matches, but the reported name differs — likely a rebrand. |
| `alias` | Only a secondary signal (website/Twitter/fuzzy DefiLlama slug) matches, with a different name — plausible, not confirmed. |
| `needs-review` | Only a bare name match, or a match too weak to trust alone. |

A name-only match can **only ever** produce `new` or `needs-review` —
structurally enforced, never a shortcut to a stronger classification.

### Provider Enrichment (`enrich.ts`)

Two real evidence sources, zero new provider integrations:

1. Market/TVL fields already present in `providerMetadata` (the
   `coingecko`/`defillama` discovery sources already fetch these as part
   of their bulk listing call) — read synchronously, no network call.
2. GitHub commit-activity (`github.getCommitActivity()`,
   `lib/providers/github/service.ts`) — but **only** when Registry
   Matching already found an existing project with a real `github.repo`.
   Never called for the bulk of brand-new/unmatched candidates, which
   have no repo to check — this is what answers "which have active
   development?"/"which are abandoned?" for already-tracked projects
   being rediscovered, without an unbounded GitHub call fan-out.

### Classification (`classify.ts`)

Deterministic, two real signals, no AI: DefiLlama's own `category` string
(mapped onto the existing `ProjectCategory` enum) when available, a fixed
name-keyword table otherwise, `"other"` when neither produces a confident
match. See the module's own `DEFILLAMA_CATEGORY_MAP`/`NAME_KEYWORD_RULES`
for the exact, auditable mapping — nothing here infers meaning beyond
those two fixed tables.

### Confidence Model (`confidence.ts`)

Starts from the existing `SOURCE_CONFIDENCE` baseline (PR-039, unchanged)
and adds a fixed point value per real evidence signal actually present
(official website, real CoinGecko id, GitHub reference, on-chain contract,
Snapshot space, multiple-provider agreement, an existing registry match,
live market/TVL data), clamped 0-100. `Snapshot` is included in the model
(per the brief's own example list) but is honestly always absent today —
no discovery source surfaces governance data — documented in the module
itself, not silently omitted.

### Discovery Status (`status.ts`)

Distinct from `DiscoveryQueueStatus` (queue.ts's human-review workflow
state) — this is an evidence-based read of what kind of project this is:
`verified` / `tracked` / `discovered` / `new` / `recently-updated` /
`upcoming` / `announced` / `deprecated` / `inactive` / `needs-review` /
`unknown`. Every rule cites its real evidence in a `reason` string. Two
statuses (`upcoming`/`announced`) are real, evidence-gated rules that
cannot currently fire against any of the three real discovery sources
(`coingecko`/`defillama`/`blockscout` only ever surface already-live
projects) — they activate automatically once the `community`/
`base-ecosystem` placeholder sources gain a real integration, with zero
code change needed here.

### Future Projects Page Integration

`DiscoveryProject` (`lib/discovery/project.ts`) already carries every
field a future Projects page needs without this engine changing shape
again: `status` → Verified/New/Recently Updated/Upcoming filter buckets;
`category` → Categories filter; `confidence` → a trust/quality sort;
`sources` → provenance display and a "Trending" candidate signal (a
project corroborated by multiple sources, or one enrichment later
confirms real volume growth); `displayName`/`normalizedName`/`website`/
`github` → Search. None of this is wired into any UI yet — per this PR's
explicit "backend/data layer only" scope.
