# `getLiveProjects()` Registry Pipeline — Engineering Investigation

**Status:** Research only. No code was changed to produce this document,
and nothing here is authorized for implementation. This is a companion
investigation to [PERFORMANCE_AUDIT.md](PERFORMANCE_AUDIT.md) and
[LOADING_STRATEGY.md](LOADING_STRATEGY.md), narrowed to the one function
every page in the app ultimately depends on for project data — produced
because the prior PR-085.02D investigation concluded that Hero cannot
render before `getLiveProjects()` resolves, because Hero's data genuinely
comes from that call. This document answers the question that finding
left open: *why does `getLiveProjects()` take as long as it does, and
where should engineering effort go next?*

**The same measurement caveat as every prior audit in this series
applies, stated up front rather than buried:** no APM, tracing, or live
network measurement was performed. Every claim below is either a direct
code-reading fact (file:line) or a structural/architectural conclusion
drawn from that code (e.g., "this is a sequential gate" is provable from
the code; "this gate typically takes 200ms" is not, and is never
claimed). Where a real, measured number does exist in the codebase's own
comments, it's quoted and attributed as such.

---

## STEP 1/2 — The Real Execution Pipeline

Built from a direct, current-session reading of every function in the
chain — not assumed.

```
getLiveProjects()                                    [React cache(), per-request]
├── getProjects()                                      sync, 20 registry projects
└── Promise.all([
      getAllProjectIntelligence(),  ─────────────┐      INTELLIGENCE BRANCH
      runDiscoveryPipelineAgainstRegistry()  ─────┼──┐   DISCOVERY BRANCH
    ])                                            │  │
                                                   │  │
  INTELLIGENCE BRANCH ◄────────────────────────────┘  │
  getAllProjectIntelligence()  [NOT cache()-wrapped]   │
  ├── getProjects()                    sync (again, cheap)
  ├── await fetchProviderBulkData()    ◄── SEQUENTIAL GATE: nothing
  │   └── Promise.all([                    per-project starts until
  │         CoinGecko.getBaseEcosystemMarkets,   this settles
  │         CoinGecko.getMarketsByIds,
  │         DexScreener.getBaseTrendingPairs,
  │         DexScreener.getPairsByTokenAddresses,
  │         DefiLlama.getBaseProtocols,
  │         Blockscout.getRecentlyVerifiedContract,
  │         Base.getBaseNetworkStatus,
  │       ])                            7 calls, all BULK (registry-wide,
  │                                      not per-project), concurrent
  └── Promise.all(20 × buildProjectIntelligence(project, bulk))
      per project:
      ├── gatherProjectSources: Promise.all([bulk-match (pure), matchGithub])
      │     matchGithub → GitHub.getRepoStats     PER-PROJECT (≤20, TTL 10min)
      ├── gatherExtendedProjectData                SKIPPED (extended=false)
      ├── 8× merge*()                               pure, sync
      ├── computeHealth()                           pure, O(1)
      ├── computeConfidence()                        pure, O(1)
      ├── computeFreshness()                         pure
      ├── Promise.allSettled([
      │     generateProjectSummary,                 pure
      │     generateNarrative,                      pure
      │     fetchProjectGovernanceEvents,            Snapshot, PER-PROJECT
      │   ])                                         (7 of 20 have snapshotSpace, TTL 5min)
      └── generateRiskAnalysis()                     pure, O(1)

  DISCOVERY BRANCH ◄──────────────────────────────────┘
  runDiscoveryPipelineAgainstRegistry()  [NOT cache()-wrapped]
  └── runDiscoveryPipeline(getProjects())
      ├── runDiscovery(): Promise.allSettled(8 providers.discover())
      │     3 real (CoinGecko, DefiLlama, Blockscout — all bulk)
      │     5 stubs (base-ecosystem, GitHub, Farcaster, community,
      │              ai-discovery — literal no-ops, zero candidates)
      ├── dedupeCandidates()                          pure
      └── Promise.all(deduped.map(buildDiscoveryProject))
          per group:
          ├── matchAgainstRegistry()                  pure
          ├── enrichCandidate()
          │     extractMarketEvidence: pure (reads already-fetched data)
          │     GitHub.getCommitActivity: PER-CANDIDATE (≤16, only
          │       when matched to a registry project with github.repo
          │       set, TTL 10min)
          ├── classifyCandidate()                      pure
          ├── computeDiscoveryConfidence()              pure
          └── computeDiscoveryStatus()                  pure

MERGE (back in getLiveProjects() itself)
├── buildLiveProjectFromIntelligence() × 20
└── buildLiveProjectFromDiscovery() × standalone-discovery-projects
```

### Per-stage report

| Stage | Purpose | Sync/Async | `cache()` | Provider calls | Bulk/per-project | Repeated work | Cost class |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `getLiveProjects()` | Orchestrates the whole pipeline | Async | **Yes** (React `cache()`, per-request) | — | — | None | Orchestration |
| `getProjects()` | Reads the static 20-project registry | Sync | No (no I/O, doesn't need it) | — | — | Called twice (once in `getLiveProjects`, once in `getAllProjectIntelligence`) — both free, in-memory | Free |
| `fetchProviderBulkData()` | 7 registry-wide provider snapshots | Async | No | 7, all bulk | Bulk | None — one call each | **Real I/O, sequential gate** |
| `buildProjectIntelligence()` × 20 | Per-project record assembly | Async, concurrent fan-out | No | 1 GitHub call/project (conditional) | Per-project | None | Mixed — mostly pure, one real call |
| `computeHealth`/`computeConfidence`/`generateRiskAnalysis` | Scoring | Sync | N/A (pure) | 0 | — | None | Free, O(1) |
| `fetchProjectGovernanceEvents` | Per-project Snapshot proposals | Async | No | 1 Snapshot call, 7 of 20 projects | Per-project | None | Real I/O, bounded (7) |
| `runDiscovery()` | 8 discovery providers | Async | No | 3 real (bulk), 5 stubs (0-cost) | Bulk | None | Real I/O, bulk |
| `enrichCandidate()` | Discovery evidence enrichment | Async, per-candidate | No | 1 GitHub call, ≤16 candidates | Per-candidate | **Competes with intelligence branch's GitHub calls for the same rate-limit budget** | Real I/O, bounded (≤16) |
| Final merge | Assemble `LiveProject[]` | Sync | N/A | 0 | — | None | Free |

---

## STEP 3 — Bottlenecks, Ranked

**Critical**

- **`fetchProviderBulkData()` is a hard sequential gate.** Everything in the intelligence branch — all 20 projects' health/confidence/risk/merge work — is blocked until all 7 of its bulk calls settle (`Promise.all`, meaning it waits for the *slowest* of the 7, not the average). This is the single point in the entire graph where the most downstream work is blocked on the fewest upstream calls. Its real duration was **not measured** in this investigation (no APM available) — but its *position* in the dependency graph makes it structurally the highest-leverage target regardless of its absolute duration, which is why it's ranked Critical on structural grounds alone.

**High**

- **Real network I/O is the dominant cost class, full stop.** Every single expensive stage identified across both branches — the 7 bulk calls, ≤20 per-project GitHub calls, 7 per-project Snapshot calls, 3 real discovery-provider calls, ≤16 discovery-side GitHub calls — is genuine outbound network I/O. Every CPU-bound stage (8 merge functions, health, confidence, risk, dedupe, match, classify) was independently confirmed pure and cheap by both investigating agents, with zero exceptions found in either branch. This asymmetry is the load-bearing fact behind this entire investigation's conclusions (see the Product Owner Questions below).
- **GitHub rate-limit contention between the two branches.** The intelligence branch's `matchGithub` (≤20 calls) and the discovery branch's `enrichCandidate` (≤16 calls) both draw from the *same* shared GitHub rate-limit budget (60/hr unauthenticated, 5,000/hr with `GITHUB_TOKEN` — `lib/providers/github/service.ts:38-40`), running concurrently, from two code paths that have no awareness of each other. In the worst case, up to 36 GitHub calls could be in flight from one `getLiveProjects()` invocation. Neither branch throttles against the other.

**Medium**

- **Nothing above `getLiveProjects()` itself is `cache()`-wrapped.** `getAllProjectIntelligence()` and `runDiscoveryPipelineAgainstRegistry()` rely entirely on the outer function's per-request memoization for their own de-duplication. Today, nothing in the codebase calls either of them directly (bypassing `getLiveProjects()`), so this is a latent structural risk, not an active problem — but it means any future code that does call them directly would silently re-run the entire pipeline with zero protection.
- **The fully-assembled `LiveProject[]` result is never cached beyond one request.** The underlying provider *responses* are cached (via `getOrSet()`, TTLs 20s-600s), but the *assembly* work that turns them into `LiveProject[]` — all 20 projects' merge/score/risk computation, plus the entire discovery dedupe/match/classify fan-out — re-runs on every single request, even when 100% of its inputs are still warm in the provider cache.

**Low**

- **Base RPC's 20-second TTL** is the shortest of any provider (`lib/providers/base/service.ts:11`, self-documented as such) — likely to re-fetch on most real page-to-page navigations. Not part of `getLiveProjects()`'s own call graph, but the shortest link in the shared cache overall.
- **`base.ts`'s `getFinality()` calls `assertRateLimit()` twice** for what should be one guarded operation (found incidentally, not part of `getLiveProjects()`'s graph — Base RPC isn't a discovery provider).

---

## STEP 4 — Duplicate Work, Confirmed Real Only

1. **GitHub budget contention** (already covered above, High) — not literally duplicate *data* fetching (the two branches call different endpoints — `getRepoStats` vs. `getCommitActivity`), but genuinely duplicate/competing *load* against one shared, rate-limited resource, for potentially the *same* repos in the *same* request.
2. **Cross-branch bulk-call sharing is correctly deduped, not duplicated — verified, not assumed.** The intelligence and discovery branches both need CoinGecko/DefiLlama/Blockscout data. `lib/projects/service.ts`'s own doc comment states this is deliberate: both branches "land inside the same in-flight request window and de-duplicate through `getOrSet()` instead of firing twice," using a shared cache key (`BASE_ECOSYSTEM_MARKETS_PAGE_SIZE` referenced explicitly). This is correct, working design — flagged here only so it isn't mistaken for a duplication bug by a future reader; it depends on both branches continuing to use identical cache keys, which is a real, if currently-honored, invariant.
3. **No other real duplication found.** The 8 merge functions, health/confidence/risk computation, and discovery's dedupe/match/classify chain each run exactly once per project/candidate, with no repeated calls to the same function for the same input found in either branch.

---

## STEP 5 — Cache Audit

| Cache | What's cached | What's NOT cached | What SHOULD be cached (not implemented) |
| --- | --- | --- | --- |
| React `cache()` on `getLiveProjects()` | The whole pipeline's result, but only for the lifetime of one request | Anything beyond one request | — |
| `lib/providers/common/cache.ts`'s `getOrSet()` | Every individual provider response, keyed per-provider-per-argument, TTL 20s-600s, **process-lifetime** (a shared, module-level `Map`, not per-request — survives across requests until TTL expiry or process restart) | The *assembled* `LiveProject[]` itself | The assembled result, with a short TTL, so a second request within that window skips re-running the assembly even when every provider response is already warm |
| `unstable_cache()` | Nothing — confirmed zero usage anywhere in the codebase, both in this pipeline and previously in the whole app (re-confirmed this investigation) | — | — |
| `getAllProjectIntelligence()` / `runDiscoveryPipelineAgainstRegistry()` | Nothing directly — inherit protection only from the outer `getLiveProjects()` `cache()` wrap | Direct calls to either function, if any ever exist outside `getLiveProjects()` | Their own `cache()` wrap, as defense-in-depth (Safe category, STEP 7) |

---

## STEP 6 — Performance Waterfall

**Structural waterfall** (proven from the code's own control flow):

```
t=0    getLiveProjects() starts
       │
       ├─ Intelligence branch and Discovery branch start concurrently
       │
t=A    fetchProviderBulkData() resolves (7 concurrent calls, gated on the SLOWEST of the 7)
       │  ↓ nothing in the intelligence branch's per-project work could start before this
       │
t=A+B  20× buildProjectIntelligence() complete (concurrent fan-out; each pays its own
       │  GitHub call + Snapshot call where applicable, plus free CPU work)
       │
       │  [discovery branch, running the whole time in parallel]
t=C    runDiscovery() resolves (3 real bulk calls, 5 free stubs)
t=C+D  Discovery's per-candidate enrichCandidate() fan-out completes (≤16 GitHub calls)
       │
t=max(A+B, C+D)   Promise.all([intelligence, discovery]) resolves
       │
t=max+ε  Final merge (buildLiveProjectFromIntelligence × 20 + buildLiveProjectFromDiscovery × N) — free
       │
       return LiveProject[]
```

**The longest single stage, by structural position:** `fetchProviderBulkData()`, because it is the only stage every other piece of intelligence-branch work is strictly ordered *after* — it is a true bottleneck in the graph-theoretic sense (a cut vertex), not merely "one of several slow things." **Absolute duration was not measured** — this conclusion is about position in the dependency graph, which is provable from the code; it is not a claim about milliseconds.

---

## STEP 7 — Optimization Opportunities (recorded only, none implemented)

**Safe** (no architecture or business-logic change):
- Wrap `getAllProjectIntelligence()` and `runDiscoveryPipelineAgainstRegistry()` in their own `cache()`, as defense-in-depth against a future direct caller bypassing `getLiveProjects()`'s protection.
- Fix `base.ts`'s `getFinality()` double `assertRateLimit()` call.
- Correct `docs/API.md`'s stale claims (DefiLlama `/protocols` caching, and a stale module-path reference) — a documentation-accuracy fix, not a code change.

**Needs Architecture**:
- Cache the fully-assembled `getLiveProjects()` output itself with a short TTL (beyond React's per-request `cache()`), so the assembly cost is paid once per TTL window across all requests, not once per request. This is the single highest-leverage item found in this investigation — see Product Owner Question 4.
- Reconcile GitHub rate-limit contention between the intelligence branch's `matchGithub` and the discovery branch's `enrichCandidate` — e.g. a shared per-repo in-flight lock so the same repo is never queried concurrently by both independent code paths.

**Needs Product Decision**:
- Whether to configure `GITHUB_TOKEN` in production (60/hr → 5,000/hr rate limit) — a real, high-leverage lever *if* GitHub rate-limiting is ever actually hit in practice, but it's an infrastructure/secrets decision, not a code change.
- Whether Base RPC's 20-second TTL (shortest of any provider, self-documented as such) is an intentional freshness choice or should be lengthened — a data-freshness tradeoff, not a technical one.

**Future**:
- Real APM/tracing instrumentation — the single biggest gap in this entire investigation. Everything here is structurally sound reasoning from real code; none of it is a substitute for actual measured production latency.
- Confirming the real, per-request discovery-candidate volume (the "~1,000-project catalog" figure found elsewhere in the codebase is a theoretical ceiling across repeated runs, not confirmed as a per-request number — flagged as unverified by the investigating agent).

---

## Product Owner Questions — Answered

**1. If we improved ONLY ONE stage, which would produce the largest real-world speed improvement?**

`fetchProviderBulkData()`. Not because it's provably the slowest in absolute terms (unmeasured), but because it's the one stage every other piece of intelligence-branch work is strictly blocked behind — improving it improves the floor for everything downstream of it, while improving any other single stage only improves that one stage's own contribution to the total.

**2. If `getLiveProjects()` became twice as fast, would users noticeably perceive it?**

**It depends entirely on which half got faster** — and this isn't a hedge, it's the central, evidence-backed finding of this investigation:
- If the "twice as fast" comes from the CPU-bound assembly work (merge/health/confidence/risk/dedupe/match/classify) — **no, imperceptible.** Every one of these stages was confirmed pure and O(1)-to-cheap by two independent investigations with zero exceptions; halving an already-negligible cost stays negligible.
- If it comes from the real network I/O (the 7 bulk calls, the per-project GitHub/Snapshot calls, the 3 real discovery providers) — **yes, likely perceptible**, especially on a cold cache (first load after deploy, or after a TTL window expires), since network round-trips are exactly the class of cost (hundreds of ms to seconds) humans do notice.

**3. Is the bottleneck provider latency or our own computation?**

**Provider latency**, and the evidence for this is direct and convergent, not inferred: both independent investigations, covering every function in both branches, found that literally every expensive stage in the entire pipeline is real network I/O, and literally every CPU-bound stage is pure and cheap, with zero exceptions in either category. This isn't a probabilistic guess — it's a complete enumeration.

**4. What is the single highest ROI optimization remaining?**

**Caching the fully-assembled `getLiveProjects()` output itself**, beyond React's per-request `cache()`. Reasoning: it's additive (doesn't touch business logic or any scoring rule), it benefits every consumer of `getLiveProjects()` across every request within its TTL window rather than one page, and it directly targets the one thing confirmed *not* cached at all today — the assembly work that turns already-warm provider data into `LiveProject[]`, currently repeated on every single request regardless of whether its inputs changed.

---

## Provenance

Every codebase claim in this document is drawn from two direct,
current-session background investigations — one covering the intelligence
branch (`lib/intelligence/engine.ts`, `sources.ts`, `scoring.ts`,
`confidence.ts`, `scorecard.ts`, `report.ts`, and
`lib/intelligence-engine/rule-based-provider.ts`, read in full), one
covering the discovery branch and shared provider infrastructure
(`lib/discovery/project.ts`, `engine.ts`, all 8
`lib/discovery/providers/*.ts` files, `lib/providers/common/cache.ts` and
`utilities.ts`, and every `lib/providers/*/service.ts` file's TTL/rate-limit
constants) — together with a direct reading of `lib/projects/service.ts`
(`getLiveProjects()` itself) performed directly, not delegated. Every
"could not verify" item (real measured latencies, the exact per-request
discovery-candidate volume) is stated as such in the relevant section
above, not silently omitted. See the corresponding chat responses this
document was delivered alongside for the complete underlying evidence.
