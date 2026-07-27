# PR-053 — Live Project Discovery Engine

**Type:** Backend/data layer only. No route, page, or component changed — the Projects page (Explorer) is untouched, per this PR's explicit scope.
**Status:** implemented, validated (`lint`/`tsc`/`build`/94 tests all clean), **not committed, not pushed** — awaiting review.
**Builds on:** PR-039's Discovery Engine foundation (`lib/discovery/`) — this PR extends that directory in place rather than building a second, parallel system, consistent with PR-052's "consolidate, don't duplicate" principle.

---

## 1. Discovery Architecture

```
Registry (data/projects/)
      │  (read-only comparison target)
      ▼
DiscoveryProvider.discover() → CandidateProject[]           (PR-039)
      │
      ▼
dedupeCandidates()                                            NEW — lib/discovery/dedupe.ts
      │  groups raw candidates from different sources referring
      │  to the same real-world project (shared coingeckoId/
      │  defillamaSlug/contract/website/handle — never name alone)
      ▼
matchAgainstRegistry()                                        NEW — lib/discovery/registryMatch.ts
      │  new | duplicate | updated | renamed | alias | needs-review
      ▼
enrichCandidate()                                              NEW — lib/discovery/enrich.ts
      │  real market/TVL evidence already fetched + (only for a
      │  matched project with a known repo) GitHub commit activity
      ▼
classifyCandidate()                                            NEW — lib/discovery/classify.ts
      │  deterministic ProjectCategory (DefiLlama category →
      │  name-keyword table → "other")
      ▼
computeDiscoveryConfidence()                                   NEW — lib/discovery/confidence.ts
      │  evidence-weighted 0-100 score
      ▼
computeDiscoveryStatus()                                       NEW — lib/discovery/status.ts
      │  evidence-based DiscoveryStatus
      ▼
DiscoveryProject                                                NEW — lib/discovery/project.ts
```

`runDiscoveryPipeline(existingProjects, providers?)` ties every stage together; `runDiscoveryPipelineAgainstRegistry()` is the real-usage convenience wrapper. **Neither is called from any route, page, or cron job** — matching PR-039's own "nothing wired in yet" scope, extended rather than broken. Full architecture detail, including exact type shapes and worked examples, is in [docs/DISCOVERY_ENGINE.md](DISCOVERY_ENGINE.md)'s new "PR-053 — Live Project Discovery Engine" section.

## 2. Files Modified

**New:**
- `lib/discovery/dedupe.ts` — cross-candidate deduplication
- `lib/discovery/registryMatch.ts` — 6-way registry match classification
- `lib/discovery/classify.ts` — deterministic category classification
- `lib/discovery/confidence.ts` — evidence-weighted confidence model
- `lib/discovery/status.ts` — evidence-based Discovery Status
- `lib/discovery/enrich.ts` — provider enrichment (market/TVL + GitHub activity)
- `lib/discovery/project.ts` — `DiscoveryProject` model + pipeline orchestrator
- `tests/lib/discovery/{fixtures,dedupe,classify,registryMatch,confidence,status,project}.test.ts` — 46 new tests
- `docs/PR-053_LIVE_DISCOVERY_ENGINE.md` (this file)

**Modified:**
- `lib/discovery/types.ts` — `CandidateProject` gained `coingeckoId?`/`defillamaSlug?`
- `lib/discovery/duplicates.ts` — added `coingeckoId`/`defillamaSlug` as matching signals (weights 45/25)
- `lib/discovery/providers/coingecko.ts` — sets `coingeckoId` (already had the value as `externalId`)
- `lib/discovery/providers/defillama.ts` — sets `defillamaSlug` (best-effort, via a local `slugify`)
- `lib/discovery/normalize.ts` — added `slugify()`
- `lib/discovery/index.ts` — barrel now exports every new module
- `data/projects/enums.ts` — `PROJECT_CATEGORIES` gained `meme`/`payments`
- `docs/DISCOVERY_ENGINE.md` — new architecture section documenting every addition
- `docs/PROJECT_REGISTRY.md` — category-taxonomy table updated for the two new values

**Not touched:** any provider (`lib/providers/*`), any UI component, any route, `lib/intelligence/*`, `lib/data/aggregate.ts`, any seed project data file, the Provider Resolution Engine (PR-052).

## 3. Discovery Pipeline

Answering the brief's Goals questions directly, with the evidence each answer is actually grounded in:

| Question | Answered by |
| --- | --- |
| What projects exist on Base? | `runDiscovery()` (PR-039) — 3 real sources today: CoinGecko, DefiLlama, Blockscout |
| Which are verified? | `DiscoveryStatus: "verified"` — a registry match whose `verification.status` is `"verified"` |
| Which are new? | `DiscoveryStatus: "new"` — no registry match, with real corroborating activity evidence |
| Which were recently announced? | `DiscoveryStatus: "announced"` — real rule, currently inert (see §9) |
| Which are trending? | Not computed by this PR — the model (`sources.length`, `confidence`, enrichment's `volume24hUsd`/`changePct24h`) carries everything a future ranking needs; ranking itself is a Projects-page concern, out of this PR's backend-only scope |
| Which have governance? | Not populated — no discovery source surfaces Snapshot data (documented honestly in `confidence.ts`, never faked) |
| Which have active development? | `evidence.enrichment.githubActivity.hasRecentActivity` — real GitHub commit-activity check, only for a matched project with a known repo |
| Which are abandoned? | The same `githubActivity` evidence (zero recent commits) plus `DiscoveryStatus: "deprecated"`/`"inactive"` when the matched registry project's own `status`/`lifecycle` already says so |
| Which need manual review? | `DiscoveryStatus: "needs-review"`, and `RegistryMatchType: "alias"`/`"renamed"` |

## 4. Classification Rules

Deterministic, two real signal sources, **no AI, no fuzzy matching, no randomness**:

1. **DefiLlama's own `category` string** (`Protocol.category`), mapped onto the existing `ProjectCategory` enum via a fixed table (`DEFILLAMA_CATEGORY_MAP` in `classify.ts`) — `"high"` confidence, only available for `defillama`-sourced candidates.
2. **A fixed name-keyword table** (`NAME_KEYWORD_RULES`), checked in a fixed priority order — `"medium"` confidence.
3. **`"other"`**, `"low"` confidence, `method: "unclassified"` — when neither signal produces a match. Never a fabricated guess.

Two categories were added to the registry's existing 20-value taxonomy — `meme` and `payments` — both real, distinct verticals live discovery data surfaces regularly with no prior bucket. See §2 and `docs/PROJECT_REGISTRY.md`'s updated taxonomy table.

Confirmed deterministic by test (`classify.test.ts`'s "is deterministic" case: identical input always produces a byte-identical result).

## 5. Confidence Model

Documented in full in `lib/discovery/confidence.ts`'s own header comment; summarized:

```
score = SOURCE_CONFIDENCE[source]        (PR-039's existing baseline, 20-80)
      + 10  if official website present
      + 15  if a real CoinGecko id is present
      + 8   if a best-effort DefiLlama slug is present
      + 15  if a GitHub reference is present
      + 20  if an on-chain contract address is present
      + 15  if a Snapshot governance space is present   (always 0 today — no source surfaces this)
      + 20  if corroborated by 2+ independent discovery sources
      + 10  if matched to an existing registry project
      + 10  if live market or TVL data is confirmed
      = clamp(0, 100)
```

`level`: `"high"` ≥70, `"medium"` ≥40, `"low"` otherwise. Every contributing factor is recorded in `factors: string[]` with its exact point value — never a bare number with no explanation.

## 6. Registry Matching Strategy

Extends (not replaces) PR-039's `findDuplicateMatches()` — added `coingeckoId` (weight 45) and `defillamaSlug` (weight 25) as two more independent matching signals alongside the original five (contract 50, GitHub 30, website 30, Twitter 25, name 20). `lib/discovery/registryMatch.ts` then interprets the ranked matches into one of 6 outcomes:

| Type | Requires |
| --- | --- |
| `new` | No match on any signal |
| `duplicate` | A unique identifier match (contract/coingeckoId/GitHub) + name agreement, nothing new |
| `updated` | Same as `duplicate`, but the candidate carries a real field the registry doesn't have yet |
| `renamed` | A unique identifier matches, but the name differs |
| `alias` | Only a secondary signal (website/Twitter/fuzzy DefiLlama slug) matches, with a different name |
| `needs-review` | Only a bare name match, or nothing strong enough to trust alone |

**"Never rely only on project name" is structurally enforced**: a bare name match can only ever resolve to `new` or `needs-review` — there is no code path from a name-only match to `duplicate`/`updated`/`renamed`/`alias` (confirmed by `registryMatch.test.ts`'s dedicated test).

## 7. Future Projects Page Integration

`DiscoveryProject` (`lib/discovery/project.ts`) is designed so every filter bucket the brief names is already backed by a real field, with no future engine change needed:

| Future filter | Backed by |
| --- | --- |
| Verified Projects | `status === "verified"` |
| New Projects | `status === "new"` |
| Recently Added | `discoveredAt` (this run's timestamp) + `status === "new"` |
| Trending | `sources.length` (multi-source corroboration) + `evidence.enrichment.volume24hUsd`/`changePct24h` |
| Recently Updated | `status === "recently-updated"` |
| Upcoming | `status === "upcoming"` (real rule, inert today — see §9) |
| Categories | `category` (real `ProjectCategory`) |
| Search | `displayName`/`normalizedName`/`website`/`github` |
| Filters | `confidence.level`, `evidence.registryMatch.type`, `sources` |

## 8. Validation Results

| Check | Result |
| --- | --- |
| `npx tsc --noEmit` | **Clean** |
| `npm run lint` | **Clean** |
| `npm run build` | **Clean** — all 23 routes unchanged (no new route added, per this PR's backend-only scope), one pre-existing unrelated `metadataBase` warning |
| `npm test` | **94/94 passed** (48 pre-existing + 46 new), 14 test files |
| Deterministic discovery | Confirmed — `classify.test.ts`, `registryMatch.test.ts`, `confidence.test.ts`, `status.test.ts`, and `project.test.ts` each include an explicit "is deterministic" case (identical input → identical output) |
| Duplicate detection | Confirmed — `dedupe.test.ts` covers merge-on-coingeckoId, merge-on-contract, merge-on-website, and the critical negative case (no merge on name alone) |
| Registry matching | Confirmed — all 6 `RegistryMatchType` outcomes exercised in `registryMatch.test.ts`, including the "never classifies stronger than needs-review on a name match alone" guarantee |
| Confidence scoring | Confirmed — `confidence.test.ts` covers the baseline, each evidence bonus independently, the multi-provider-agreement bonus, the registry-match bonus, and the 0-100 clamp |
| Classification | Confirmed — `classify.test.ts` covers DefiLlama-category mapping, name-keyword fallback, the AI/meme tag cases, and the "other"/unclassified fallback |

## 9. Remaining Limitations

- **Real discovery breadth is still 3 sources** (`coingecko`, `defillama`, `blockscout`) — the other five (`base-ecosystem`, `github`, `farcaster`, `community`, `ai-discovery`) remain documented placeholders from PR-039, unchanged by this PR (adding a real integration for any of them was explicitly out of this PR's scope: "Do NOT add paid providers," and none of them have a free, lightweight wrapper to build on yet).
- **`upcoming`/`announced` statuses cannot currently fire** against any of the 3 real sources — all three only ever surface already-live, already-trading projects. The rules are real, evidence-gated, and tested, but honestly inert until `community`/`base-ecosystem` gain real integrations. Documented, not hidden.
- **Governance/Snapshot evidence is always absent** — no discovery source surfaces a Snapshot space. The confidence model includes the signal (per the brief's own example list) but it never contributes points today.
- **`defillamaSlug` is a fuzzy, name-derived approximation**, not a real provider-issued identifier (DefiLlama's typed wrapper in this codebase carries no real slug field) — weighted lower everywhere it's used as evidence, but still a real, if imperfect, matching signal worth having.
- **`dedupeCandidates()` is O(n²)** (every candidate compared against every existing group) — acceptable at this codebase's real scale (a few hundred Base-ecosystem listings per run), would need a real index (e.g. a hash map keyed by each identifier) if discovery volume grows by orders of magnitude.
- **No persistence layer** — exactly like PR-039's own `DiscoveryQueueEntry`, a `DiscoveryProject` is a pure in-memory shape with no store. Running the pipeline twice produces two independent result sets with no memory of the first — "New" therefore means "not yet in the registry," never "not seen by a prior discovery run" (there is no prior run to compare against). A real Projects-page integration would need a persistence layer before "Recently Added"/"New" could distinguish those two meanings.
- **GitHub enrichment is bounded to already-matched projects only** — a deliberate scope decision (see §1's table) to stay within GitHub's real 60 req/hour unauthenticated limit; it does not attempt to discover or verify a *candidate's own* GitHub repo (candidates from the 3 real sources never carry one — none of CoinGecko/DefiLlama/Blockscout's wrapped endpoints return a repo reference).
- **No route, cron job, or UI calls any of this yet** — by design, per this PR's explicit "backend/data layer only, do NOT redesign the Projects page" scope. The next PR in this series would need to decide the persistence layer (§ above) before wiring a real Projects-page experience on top of `DiscoveryProject`.

---

**Do not commit. Do not push. Awaiting review.**
