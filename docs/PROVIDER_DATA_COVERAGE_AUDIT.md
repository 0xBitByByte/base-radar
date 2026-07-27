# Provider & Data Coverage Audit

**Type:** Read-only architecture/engineering audit. No code was modified to produce this report (one pre-existing, uncommitted intelligence-layer change from the prior working session — `resolveMetric`/`MetricResolution` — was already on disk before this audit began and is treated as current-state evidence, not an audit deliverable).
**Scope:** Every integrated data provider, the intelligence/aggregation layers that consume them, and every UI surface (Project Profile, Explorer, Dashboard, Landing) that renders provider-derived data.
**Method:** Direct source reads of every `lib/providers/*` triad, `lib/intelligence/*`, `lib/data/aggregate.ts`, `lib/governance/*`, the Project Registry (`data/projects/*`, all 20 seed files), and the primary consuming components (`app/dashboard/projects/[slug]/page.tsx`, `app/dashboard/projects/page.tsx`, `app/dashboard/page.tsx` widgets, Explorer cards/table). No values in this report are invented — every number, field name, and code path cited below was read directly from the file and line it's attributed to.
**Standing rule for this document:** never write a bare "No Data" — every gap below is traced to one of exactly five causes: **(1) provider genuinely can't supply it, (2) registry never configured the ID needed to ask, (3) the app never wired an existing capability into the matching/merge layer, (4) the app fetched it and then discarded it before rendering, (5) no UI currently reads a value the engine already computes.**

---

## 0. Executive Summary — the one finding that explains most of the others

Base Radar integrates **6 free, keyless, no-auth providers** in the `ProviderName` union (CoinGecko, DexScreener, DefiLlama, Blockscout, GitHub, Base RPC), plus **Snapshot** (free, keyless, deliberately kept outside that union — see §1.7) and the **Project Registry** itself (a static, zero-network "virtual provider" — see §1.8). **Every single one is free**; there is no paid provider anywhere in this codebase today.

The Provider Layer (`lib/providers/*`) and the newer resolution engine (`lib/intelligence/resolution.ts`, `MetricResolution<T>`) are well-built: typed client→mapper→service triads, a shared TTL cache with in-flight de-duplication, a shared fixed-window rate limiter, and (as of the immediately-preceding work session) a real, generic multi-candidate fallback resolver. **The overwhelming majority of "Not Tracked" states on the Project Profile page are not provider failures or engine bugs — they are Project Registry configuration gaps**, quantified directly from all 20 seed files in `data/projects/seed/`:

| Registry field | Populated on | Consequence |
|---|---|---|
| `providerIds.dexscreenerPairAddresses` | **0 / 20 projects** | DexScreener trading-pair matching (`matchTrading` in `sources.ts`) is `not_configured` for **every project in the registry, with no exceptions** — Liquidity, DEX Volume, Pool Distribution, Largest Pool, Top DEX are structurally empty ecosystem-wide, not because DexScreener lacks the data. |
| `providerIds.blockscoutAddress` | **0 / 20 projects** | Direct contract-verification matching (`matchVerifiedContract`) is `not_configured` for every project — verification can only ever appear by the bulk "most-recently-verified-on-Base-chain-wide" coincidence heuristic. |
| `providerIds.baseRpcAddress` | **0 / 20 projects** | Dead field — `matchNetwork` never reads it at all (see §9). |
| `providerIds.dexscreenerChainId` | 2 / 20 (Aerodrome, Uniswap) | Also dead — `matchTrading` never reads this field either; it has zero effect on any match. |
| `contracts: []` (empty) | 19 / 20 (only `usd-coin` has entries) | The Contracts section, contract-verification badges, and verified-contract-% risk/confidence input are structurally empty for 95% of the registry. |
| `providerIds: {}` (fully empty) | 4 / 20 (Clanker, Zora, Farcaster, Basenames) | These four projects get **zero** live market/trading/tvl data under any circumstance. |
| `github` present but org-only (no `repo`) | ≥3 / 20 (Zora, LayerZero, USD Coin) | `matchGithub` explicitly refuses org-only refs — real, active GitHub orgs produce zero stats. |

This is the audit's central finding and is threaded through every section below: **the Provider Layer is more capable than the Project Registry currently lets it be.** Fixing registry data (adding real `dexscreenerPairAddresses`, `blockscoutAddress`, and specific `repo` values) would unlock more real data, for more projects, than any new provider integration — see §15.

---

## 1. Provider Inventory

### 1.1 CoinGecko
- **Purpose:** Market data (price, market cap, volume, supply, ATH/ATL), historical price/volume series, genesis date.
- **Free/Paid:** Free, public `/api/v3`, no API key.
- **Auth:** None.
- **Rate limit:** Self-imposed budget `30 req / 60s` (`coingecko/service.ts:26`) — described in-code as "a conservative in-process budget, not an authoritative published limit."
- **Cache TTL:** 90s (`CACHE_TTL_MS = 90_000`).
- **Implementation status:** Fully implemented triad (`client.ts`/`mapper.ts`/`service.ts`), used by both `lib/intelligence` (per-project) and `lib/data/aggregate.ts` (dashboard-wide).

### 1.2 DexScreener
- **Purpose:** Real-time on-chain DEX pair data — price, 24h volume, liquidity depth, buy/sell counts, pair age.
- **Free/Paid:** Free, public, no API key.
- **Auth:** None.
- **Rate limit:** `30 req / 60s`.
- **Cache TTL:** 60s.
- **Implementation status:** Implemented, but via a **single endpoint** (`/latest/dex/search?q=base`, a keyword search, not a chain-scoped trending feed) reused for both the ecosystem-wide "all Base pairs" list and every individual project's pair match. No direct address-lookup endpoint is used — see §2.2 and §5 for why this is a load-bearing limitation.

### 1.3 DefiLlama
- **Purpose:** Protocol-level TVL, chain-wide TVL/stablecoin market cap, protocol metadata (category, market cap).
- **Free/Paid:** Free, public (`api.llama.fi` / `stablecoins.llama.fi`), no API key.
- **Auth:** None.
- **Rate limit:** `30 req / 60s`.
- **Cache TTL:** 120s.
- **Implementation status:** Fully implemented (4 endpoints). One exported function, `getBaseProjectCount`, is **implemented but never called anywhere in the codebase** (confirmed via `grep -rn "getBaseProjectCount"` — the only match is its own definition in `defillama/service.ts:75`) — dead code.

### 1.4 Blockscout (Base explorer)
- **Purpose:** Chain-wide stats, contract verification status/metadata, address creation info, ERC-20 transfer history (whale detection).
- **Free/Paid:** Free, public (`base.blockscout.com/api/v2`), no API key.
- **Auth:** None.
- **Rate limit:** `30 req / 60s`.
- **Cache TTL:** 60s (30s for token transfers, a deliberately shorter window for whale detection).
- **Implementation status:** 5 endpoints implemented across two distinct verification paths that are **not unified** — see §9's architecture finding. `ChainStats` maps 7 fields; only 2 are ever rendered (see §6).

### 1.5 GitHub REST API
- **Purpose:** Repo stats, releases, contributors, weekly commit activity.
- **Free/Paid:** Free, unauthenticated.
- **Auth:** None (no token) — genuinely constrained by GitHub's real **60 requests/hour per IP** unauthenticated cap.
- **Rate limit:** Self-imposed `55 req/hour` (`github/service.ts:23`), intentionally just under GitHub's real hard limit.
- **Cache TTL:** 600s (10 min) — the longest of any provider, a direct, sensible response to the tight hourly budget.
- **Implementation status:** 5 endpoints implemented. `fetchCommitActivity` has documented, correct handling of GitHub's real `202 Accepted` "still computing stats" response (treated as "no data yet," not an error).

### 1.6 Base RPC
- **Purpose:** Live network status (gas price, block height, chain ID, estimated TPS) and finality lag.
- **Free/Paid:** Free, public JSON-RPC (`mainnet.base.org`), no API key.
- **Auth:** None.
- **Rate limit:** `30 req / 60s`.
- **Cache TTL:** 20s — the shortest of any provider, appropriate for a live-polled network-status widget.
- **Implementation status:** 4 JSON-RPC methods implemented. `fetchLatestBlock` requests **full transaction objects** for the latest block but only ever reads `.transactions.length` — the entire transaction array is fetched and discarded (see §6).

### 1.7 Snapshot (governance)
- **Purpose:** Off-chain governance proposal signaling (title, body, state, timing, participation, quorum).
- **Free/Paid:** Free, public GraphQL (`hub.snapshot.org/graphql`), no API key.
- **Auth:** None.
- **Rate limit:** `20 req / 60s`.
- **Cache TTL:** 300s (5 min) — governance changes slowly, correctly reflected in the longer TTL.
- **Implementation status:** One GraphQL query implemented (`fetchProposals`). **Deliberately excluded from the shared `ProviderName` union** — a documented design decision (`snapshot/client.ts:5-13`): the six-provider list is a curated, "Trusted Data Sources" set, and Snapshot's governance data flows through a parallel `lib/governance/` abstraction (`GovernanceProvider` interface) instead. This means Snapshot has no `SourceAttribution` entry in the `Sources` record, no confidence-scoring contribution, and no line in `ProfileSources.tsx`'s provider list — a real, if intentional, transparency gap (see §7).
- **Non-real governance providers:** `lib/governance/index.ts`'s `getGovernanceProvider()` throws for `"tally"`, `"compound-governor"`, `"oz-governor"`, `"aragon"`, `"safe"` — named stubs for real systems, confirmed not implemented.

### 1.8 Project Registry (virtual, non-network "provider")
- **Purpose:** The join key for every other provider (`providerIds`), plus data no external API can supply (categories, tags, editorial verification status, GitHub repo *reference*, governance space *reference*).
- **Free/Paid:** N/A — static TypeScript data, zero network calls, zero rate limit, zero cache.
- **Implementation status:** 20 seed projects (`data/projects/seed/*.ts`). Functions as the actual bottleneck for provider coverage — see §0 and §15.

**Total: 7 real network providers (all free) + 1 static virtual source = 8 distinct data sources feeding the platform.**

---

## 2. Endpoint Coverage Matrix

Legend: ✓ implemented · ⚠ implemented but unused/dead · □ free and available, not implemented.

### CoinGecko
- ✓ `/coins/markets` (bulk Base-ecosystem list, 250/page)
- ✓ `/simple/price` (ETH/BTC major prices)
- ✓ `/coins/{id}` (genesis date only — `community_data`/`developer_data` explicitly suppressed via query params, see §5)
- ✓ `/coins/{id}/market_chart` (price series **and** volume series — both mapped, both used)
- □ `/coins/{id}/market_chart/range` (custom date range vs. the fixed `days` param used today)
- □ `/coins/{id}/ohlc` (candlestick data — no chart in this app currently needs it)
- □ `/coins/{id}/tickers` (per-exchange order-book/ticker breakdown)
- □ `/search/trending` (CoinGecko's own trending-coins feed — a genuinely different signal from this app's locally-computed narrative heuristic)
- □ `/coins/categories` (category-level aggregate market data)
- □ `/coins/{id}` **with** `community_data=true&developer_data=true` (see §5 — a real, currently-suppressed opportunity)

### DexScreener
- ✓ `/latest/dex/search?q=base` (used for both the bulk trending list and every per-project match)
- □ `/latest/dex/pairs/{chainId}/{pairAddress}` (direct pair lookup by address — see §5, this is the fix for the "not currently trending" limitation)
- □ `/latest/dex/tokens/{tokenAddresses}` (batch lookup by token address, up to 30 per call)
- □ `/token-boosts/latest/v1`, `/token-boosts/top/v1` (promoted-token feeds — low relevance to this app)

### DefiLlama
- ✓ `/v2/historicalChainTvl/{chain}`
- ✓ `/stablecoincharts/{chain}`
- ✓ `/protocols`
- ✓ `/protocol/{slug}`
- ⚠ `getBaseProjectCount()` — implemented, wraps `/protocols`, **never called**
- □ `/yields` (yields.llama.fi pools — real APY data, zero overlap with anything integrated; high-value for `yield`/`lending` category projects like Aerodrome, Moonwell, Morpho)
- □ `/overview/dexs/{chain}` (Base-scoped DEX volume aggregator — a real, chain-scoped 3rd Volume candidate, distinct from CoinGecko's asset-global volume)
- □ `/overview/fees/{chain}` (protocol fee/revenue — an entirely new metric category, not shown anywhere today)
- □ `/chains` (all-chains TVL ranking — would let Base's TVL be shown in ecosystem context)

### Blockscout
- ✓ `/stats` (chain-wide stats — 7 fields mapped, 2 rendered, see §6)
- ✓ `/smart-contracts` (bulk recently-verified list)
- ✓ `/smart-contracts/{address}` (per-address detail — compiler/optimization/license/proxy/implementations)
- ✓ `/addresses/{address}` (creator address, creation tx hash)
- ✓ `/tokens/{address}/transfers` (whale detection)
- □ Address-scoped balance/tx-count reads (would enable a real "treasury balance" metric — see §14)
- □ `/addresses/{address}/transactions` (full tx history — not needed today)

### GitHub
- ✓ `/repos/{full}` (repo stats + `archived` flag)
- ✓ `/repos/{full}/releases/latest`
- ✓ `/repos/{full}/releases?per_page=10`
- ✓ `/repos/{full}/contributors?per_page=100&anon=true`
- ✓ `/repos/{full}/stats/commit_activity`
- □ `/repos/{full}/stats/participation` (owner-vs-total commit split — free, would distinguish core-team vs. community activity)
- □ `/repos/{full}/languages` (byte-weighted language breakdown, richer than the single `language` field used today)
- □ `/repos/{full}/community/profile` (README/LICENSE/CONTRIBUTING presence + a "health percentage")
- □ `/repos/{full}/issues`, `/repos/{full}/pulls` (only the bare `open_issues_count` number is used today — no issue/PR content anywhere)
- □ `/orgs/{owner}/repos` (would resolve an org-only registry reference to its most relevant repo — see §5, directly relevant to Zora/LayerZero/USD Coin)

### Base RPC
- ✓ `eth_gasPrice`
- ✓ `eth_getBlockByNumber("latest", true)` (full tx objects fetched, only `.length` used — see §6)
- ✓ `eth_chainId`
- ✓ `eth_getBlockByNumber("safe", false)`
- □ `eth_feeHistory` (real historical base-fee/priority-fee percentiles — richer gas UI than one instantaneous price)
- □ `eth_getBalance` / `eth_getTransactionCount` (per-address — would enable a genuinely free "contract balance" metric, see §14)
- □ `eth_getLogs` (contract event logs — a fully free, provider-independent alternative data source for on-chain activity)

### Snapshot
- ✓ `proposals(space)` query (id/title/body/state/start/end/scores_total/quorum/link)
- □ `votes(proposal)` (per-voter breakdown — would enable a real "governance whale" signal)
- □ `space(id)` query (space metadata — `followersCount` would give a real, free "governance participants" count)
- □ Multi-space batched query (`proposals(where: {space_in: [...]})`) — today `fetchProjectGovernanceEvents` issues **one GraphQL call per project** (`Promise.allSettled` over `input.projects.map(...)` in `snapshot-provider.ts`); Snapshot's own schema supports fetching all tracked spaces in one round trip.

---

## 3. Data Coverage Matrix

Every metric the Project Profile / Explorer / Dashboard can display, its real candidate provider(s), which one is actually selected, and why. "Fallback" = a second real candidate wired via `resolveMetric`.

| Metric | Real candidate providers | Selected today | Fallback wired? | Why |
|---|---|---|---|---|
| Price | CoinGecko, DexScreener (on-chain pair) | CoinGecko primary | ✓ DexScreener (medium confidence) | Both real; DexScreener candidate starved by `dexscreenerPairAddresses` never being configured (§0) |
| 24h/7d/30d Change | CoinGecko only | CoinGecko | — | DexScreener only reports 24h change per pair, no 7d/30d; not a real second candidate for those windows |
| Market Cap / FDV / Rank / ATH / ATL / Supply | CoinGecko only | CoinGecko | — | No other integrated provider carries these fields at all |
| Volume 24h | DexScreener (on-chain), CoinGecko (`total_volume`, exchange-wide), **DefiLlama `/overview/dexs/{chain}` (not integrated)** | DexScreener primary | ✓ CoinGecko (medium confidence) | DexScreener candidate starved the same way as Price; DefiLlama's chain-scoped DEX-volume endpoint is a real, unintegrated 3rd candidate (§2) |
| Liquidity | DexScreener only | DexScreener | — (only one real candidate) | No other free provider aggregates DEX liquidity depth |
| TVL | DefiLlama only | DefiLlama | — | CoinGecko's API has no per-protocol TVL; no on-chain TVL aggregator implemented |
| TVL 7d/30d change | DefiLlama history (`/protocol/{slug}`) | DefiLlama | — | Same provider, historical endpoint |
| Contract verified/compiler/license/proxy | Blockscout only | Blockscout (**two separate, unreconciled code paths** — see §5, §9) | — | Only integrated block-explorer |
| GitHub stars/forks/releases/commits/contributors | GitHub only | GitHub | — | Registry stores a repo *reference*, never stats |
| Governance (proposals/status/participation) | Snapshot only | Snapshot | — | Tally/Compound-Governor/OZ-Governor/Aragon/Safe are named but unimplemented stubs |
| Network gas/block height/TPS/finality | Base RPC only | Base RPC | — | Only integrated RPC endpoint |
| Chain-wide tx count / total addresses | Blockscout only | Blockscout | — | Not available from Base RPC without expensive indexing |
| Twitter/Discord/Telegram follower or member counts | **None integrated**; CoinGecko `community_data` partially covers Twitter/Telegram/Reddit for coins that have it linked, currently suppressed (§5) | — | — | No dedicated social-API integration; CoinGecko's own optional fields are unused |
| NFT floor price / NFT volume | **None** | — | — | No NFT marketplace provider (OpenSea/Reservoir/etc.) integrated at all — see §14 |
| Contract owner / treasury balance | **None wired**, but trivially derivable from Base RPC `eth_getBalance`/`eth_getTransactionCount` (unintegrated) | — | — | See §14/§15 |
| Proposal execution date | **None** — Snapshot is off-chain signaling only | — | — | No real on-chain execution timestamp exists to report; correctly labeled unavailable in `report.ts` |

---

## 4. Project Coverage Audit

Tested against the required set (Aave, Compound, Clanker, Aerodrome) plus one project per NFT / AI / Infrastructure category, chosen directly from the registry: **Zora** (nft), **Virtuals Protocol** (ai), **LayerZero** (infrastructure). All fields below are read directly from each project's seed file and the matching logic in `sources.ts`/`merge.ts` — none are estimated.

### Aave (`lending`)
`providerIds: {coingeckoId: "aave", defillamaSlug: "aave-v3"}` · `contracts: []` · `github: aave/aave-v3-core` · `governance.snapshotSpace: "aave.eth"`

| Metric | Provider selected | Fallback used | Available elsewhere? | Reason if missing |
|---|---|---|---|---|
| Price | CoinGecko | No (primary succeeds) | — | — |
| Volume | CoinGecko (fallback) | **Yes** | DexScreener would be primary if a pair address existed | No `dexscreenerPairAddresses` configured |
| Liquidity | — | — | No | DexScreener not configured; no fallback candidate exists |
| TVL | DefiLlama | No | — | — |
| Contracts | — | — | No | `contracts: []` in registry — Blockscout was never asked |
| GitHub | GitHub | No | — | Full stats live: stars/forks/releases/commits/contributors |
| Governance | Snapshot | No | — | Real, live proposals |

### Compound (`lending`)
`providerIds: {coingeckoId: "compound-governance-token", defillamaSlug: "compound-v3"}` · `contracts: []` · `github: compound-finance/comet` · `governance.snapshotSpace: "comp-vote.eth"`
Identical shape and gaps to Aave: rich Market/TVL/GitHub/Governance, zero Trading, zero Contracts — for the same registry reasons.

### Clanker (`ai`) — required project, also serves as a "near-zero-configuration" case study
`providerIds: {}` (fully empty) · **no `github` field at all** · `contracts: []` · **no `governance` field**

| Metric | Provider selected | Reason if missing |
|---|---|---|
| Price/MarketCap/FDV | — | No `coingeckoId` **and** no `dexscreenerPairAddresses` — both real candidates checked, both fail; `priceResolution.failureReason` correctly names both |
| Volume/Liquidity | — | Same — no candidate configured |
| TVL | — | No `defillamaSlug` |
| Contracts | — | `contracts: []` |
| GitHub | — | No `github` reference recorded at all — Clanker has a real, public GitHub presence in reality; this is a registry gap, not a provider gap |
| Governance | — | No `governance` field |
| Network | Base RPC | Live — the one metric that doesn't depend on the registry's provider IDs |

Clanker demonstrates that a project can be **100% dark** in Base Radar's intelligence layer except chain-wide network status, purely from registry non-configuration — every provider that *could* supply data for a real, active Base project (CoinGecko likely lists CLANKER; DexScreener certainly has its pair) was simply never linked.

### Aerodrome Finance (`dex`, `yield`) — required project
`providerIds: {coingeckoId, dexscreenerChainId: "base", defillamaSlug}` · `contracts: []` · `github: aerodrome-finance/contracts` · **no `governance` field** (Aerodrome has real on-chain ve(3,3) governance; unmodeled in the registry)

| Metric | Provider selected | Fallback used | Reason if missing |
|---|---|---|---|
| Price | CoinGecko | No | — |
| Volume | CoinGecko (fallback) | Yes | Same `dexscreenerPairAddresses` gap — notably, `dexscreenerChainId: "base"` **is** set here but is never read by `matchTrading` (confirmed dead field, §0) |
| Liquidity | — | — | No fallback candidate; DexScreener never queried for this project despite being the single project most defined by DEX liquidity |
| TVL | DefiLlama | No | — |
| Contracts | — | — | `contracts: []` |
| GitHub | GitHub | No | Live |
| Governance | — | — | No `governance` field recorded, despite Aerodrome running real, active on-chain governance |

Aerodrome is the sharpest illustration of the audit's central finding (§0): the Base ecosystem's flagship DEX — the project where Liquidity/Volume data matters most — has zero real DexScreener pair linkage.

### Zora (`nft`)
`providerIds: {}` · `github: {owner: "ourzora"}` (**org-only, no `repo`**) · `contracts: []` · no `governance`

Every section is empty: Market/Trading/TVL are `not_configured` (no provider IDs at all); GitHub is `not_configured` specifically because `matchGithub` requires a `repo` and refuses an org-only reference (`sources.ts:189-191`) — even though `ourzora` is a real, active GitHub org. **No NFT-specific metric (floor price, NFT trading volume, collection count) exists anywhere in this codebase** — Zora is categorized `nft` but the platform has zero capability to describe what actually makes it an NFT platform (§14).

### Virtuals Protocol (`ai`)
`providerIds: {coingeckoId: "virtual-protocol"}` only · no `github` field · `contracts: []` · no `governance`

The one project in this sample with a **partially rich** profile: Market data is fully live (price, market cap, ATH/ATL, 24h/7d/30d change all populate from CoinGecko), but Volume/Liquidity fall to the same DexScreener gap, TVL is correctly "Not Tracked" (no DefiLlama-tracked protocol page for this project), and GitHub is entirely dark for lack of any registry reference — Virtuals Protocol has real public repos that this app never points at.

### LayerZero (`infrastructure`)
`providerIds: {coingeckoId, defillamaSlug}` · `github: {owner: "LayerZero-Labs"}` (**org-only**) · `contracts: []` · no `governance`

Market and TVL both live (a real, DefiLlama-tracked bridge/messaging protocol); GitHub dark for the same org-only reason as Zora; Trading dark for the same missing-pair-address reason as everyone else.

### Cross-project pattern
Across all 7 tested projects: **Trading was `not_configured` in every single case** (7/7). **Contracts was empty in every case except none** (0/7 had any registered contract). GitHub was live for exactly the projects that recorded a specific `repo` (Aave, Compound, Aerodrome) and dark for every org-only or absent reference (Clanker, Zora, Virtuals, LayerZero). This is not a provider-capability pattern — it is a registry-completeness pattern.

---

## 5. Missing Opportunities (Provider A empty, Provider B already has usable data)

These are the confirmed, code-level instances where real, already-fetched or trivially-fetchable data is not reaching a metric that shows as unavailable or weaker than it needs to be.

1. **Contract verification uses the wrong (weaker) data path.** `mergeContracts` (`merge.ts:205-217`) and `sources.ts`'s `verifiedContract` slice (feeding `Sources`/`Confidence`) both resolve verification only through `matchVerifiedContract`, which checks whether a project's contract happens to be the **single, chain-wide most-recently-verified contract on Base** (`sources.ts:165-185`, explicitly documented there as "almost always unavailable"). Meanwhile, `page.tsx` already calls `blockscout.getContractDetail(address)` **per registered contract, on every Project Profile load** (Phase 6, `contractDetailsPromise`) — a precise, direct, correct verification answer — but this result only ever reaches `ContractsList.tsx`'s compiler/license/proxy badges. It is **never fed back** into `ContractInfo.verified`, the `verifiedContract` `Sources` entry, or the `verifiedContractPct` input to Confidence/Risk scoring. The exact-answer data is fetched and sitting in memory on the same page render that shows the weaker, near-always-false heuristic.
2. **DexScreener direct pair lookup would eliminate the "not currently trending" failure mode entirely.** `matchTrading`'s own comment (`sources.ts:127-132`) states the limitation plainly: "a configured address that isn't trending right now simply won't appear here." DexScreener's free `/latest/dex/pairs/{chainId}/{pairAddress}` endpoint (§2.2) looks up a specific pair directly and is completely unaffected by trending status — it is not implemented anywhere in this codebase.
3. **CoinGecko's own `community_data`/`developer_data` are explicitly turned off** in the exact call already made for genesis date. `fetchCoinDetail` (`coingecko/client.ts:51-54`) requests `/coins/{id}` with `community_data=false&developer_data=false`. For coins CoinGecko has linked, this optional payload includes `community_data.twitter_followers`, `telegram_channel_user_count`, and `developer_data` (a second, corroborating GitHub-stats source: stars/forks/subscribers/PRs). `report.ts`'s `thingsWeCouldntVerify` currently states Discord/Telegram counts are unavailable because "Telegram doesn't expose public member counts through a free API" — true for a direct Telegram integration, but doesn't account for this already-open door on a call this app already makes.
4. **GitHub org-only references are never resolved to a repo.** Three of the seven tested projects (Zora, LayerZero, USD Coin) record only an org (`{owner: "ourzora"}`) with no `repo`, and `matchGithub` explicitly refuses to proceed (`sources.ts:189-191`). GitHub's free `/orgs/{owner}/repos` (sortable by stars/pushed date) is not implemented, even though it would resolve exactly this case for real, active organizations.
5. **Blockscout's own ETH price (`ChainStats.ethPriceUsd`) is never offered as a fallback** for the ETH price shown on the live ticker/major-prices path, which depends solely on CoinGecko's `getMajorPrices()`. It's a real, already-mapped, already-fetched (for the KPI row) field that sits unused as a redundancy option.
6. **Snapshot governance is fetched once per project instead of batched**, even though the app already knows the full list of tracked spaces up front (`getGovernanceTrackedProjects()` in `aggregate.ts`) and Snapshot's GraphQL schema supports an `in` filter across multiple space IDs in one request.

---

## 6. Data Being Lost (fetched → mapped → discarded → never rendered)

| Field | Provider | Fetched by | Rendered anywhere? |
|---|---|---|---|
| `ChainStats.totalTransactions` (all-time) | Blockscout `/stats` | `getChainStats()` | **No** |
| `ChainStats.averageBlockTimeMs` | Blockscout `/stats` | `getChainStats()` | **No** |
| `ChainStats.networkUtilizationPct` | Blockscout `/stats` | `getChainStats()` | **No** |
| `ChainStats.gasPriceGwei.{slow,average,fast}` | Blockscout `/stats` | `getChainStats()` | **No** (only Base RPC's single instantaneous gas price is ever shown) |
| `ChainStats.ethPriceUsd` | Blockscout `/stats` | `getChainStats()` | **No** (see §5.5 — a real fallback candidate, unused) |
| Full `transactions: unknown[]` array on the latest block | Base RPC `eth_getBlockByNumber` | `fetchLatestBlock()` | **No** — only `.length` is read (`mapNetworkStatus`, `base/mapper.ts:18`); every transaction hash/from/to/value in the array is discarded |
| DefiLlama protocol `marketCapUsd`/`category` on the **bulk `/protocols` list** result (distinct from the per-protocol history endpoint) | DefiLlama `/protocols` | `getBaseProtocols()` | Only `category` reaches `Tvl.defillamaCategory`; the bulk list's own `marketCapUsd` per protocol is read into the `Protocol` type but the only place a protocol-level `marketCapUsd` is actually displayed is `ProfileTokenAndPrice.tsx`'s `market.marketCapUsd` — which is CoinGecko's figure, not DefiLlama's. DefiLlama's independent protocol-market-cap read is never surfaced or cross-checked against it. |
| GitHub `open_issues_count` — the **count** is used; no issue titles/content ever fetched | GitHub | `getRepoStats()` | Count only |
| Snapshot proposal `description`/`body` beyond the first ~140 characters | Snapshot | `getProposals()` | Truncated to 140 chars in Recent Developments (`report.ts:538`); full body available in `GovernanceEvent.description` but `GovernanceList.tsx` (not modified this session, confirmed present) is the only other consumer — worth a manual check for whether the full text is shown there or also truncated. |
| `getBaseProjectCount()` (DefiLlama) | DefiLlama | Defined, never called | **No** — the entire function is dead code |

---

## 7. Duplicate / Divergent Provider Logic (Architecture)

Two structurally separate systems independently call the same six providers with different attribution models:

| | `lib/intelligence/*` (Project Profile, Explorer) | `lib/data/aggregate.ts` (Dashboard, Landing) |
|---|---|---|
| Attribution granularity | Per-metric (`MetricResolution<T>`: provider, fallback used, confidence, failure reason) | Per-bundle (`WithSource<T>`: one `"live" \| "mock"` flag for an entire widget's data) |
| Fallback mechanism | Centralized `resolveMetric()` | None — each function independently tries one provider, and falls back to a **hand-authored mock constant** (`MOCK_KPIS`, `MOCK_MARKET_OVERVIEW`, etc.) on failure, never to a second real provider |
| Derived scores | `Health`/`Confidence`/`Risk` via dedicated, documented modules (`scoring.ts`, `confidence.ts`) | Ad hoc inline heuristics per widget: `ProjectSpotlight`'s `developerActivityScore = Math.log10(stars)×22`, `healthScore = 70 + change×1.5 + tvlBonus`, `aiScore` (82 or 24, binary) — each a one-off formula with no shared scoring module |
| Contract verification | Two unreconciled paths (§5.1) | Not applicable |
| Governance batching | One call per project, `Promise.allSettled` | Same underlying call, also one-per-project (`getRegistryGovernanceEventsImpl`) |

This is not a bug in either file individually — both are internally coherent — but it means **the same six providers are integrated twice, with two different reliability/transparency contracts**, and any future provider-layer improvement (a new fallback candidate, a richer confidence model) has to be applied twice to reach both the Project Profile and the Dashboard.

---

## 8. Recommended Provider Priority

| Metric | Priority order |
|---|---|
| Price | 1. CoinGecko 2. DexScreener (once pair addresses are populated) |
| Volume | 1. DexScreener 2. DefiLlama `/overview/dexs/base` (new, chain-scoped — recommended over the current #2) 3. CoinGecko `total_volume` (broadest, least Base-specific) |
| Liquidity | 1. DexScreener (only real candidate today) |
| TVL | 1. DefiLlama 2. Registry-declared static fallback (last resort only, for a project DefiLlama has genuinely never indexed) |
| Contract verification | 1. Blockscout per-address `getContractDetail` (recommended promotion — see §5.1) 2. Blockscout bulk "most-recently-verified" heuristic (demote to a last-resort signal only) |
| GitHub | 1. GitHub REST (specific repo) 2. GitHub `/orgs/{owner}/repos` resolution for org-only refs (new) |
| Governance | 1. Snapshot 2. On-chain Governor read (Tally/Compound-Governor/OZ-Governor — real, scoped future work, not a fake fallback) 3. Registry `governanceUrl` as a static link only |
| Network status | 1. Base RPC (only real candidate) |

---

## 9. Architecture Audit

- **Is fallback centralized?** Yes, for the Project Profile path — `resolveMetric()` (`lib/intelligence/resolution.ts`) is the single place a winning provider is chosen among real candidates, and every call site documents its exact candidate list. This is genuinely good architecture.
- **Is provider selection duplicated?** Yes, at a higher level — see §7. The Dashboard/Landing aggregation layer re-implements "try a provider, fall back to mock" independently per widget, with no shared resolver and no shared confidence model.
- **Does business logic leak into UI?** Mostly no on the Profile page (components render `MetricResolution`/`ScorecardTile` shapes built entirely in `lib/intelligence`). Partially yes on the Dashboard: `ProjectSpotlight`'s score formulas (`aggregate.ts:516-543`) are computed inline in the aggregation function rather than a dedicated, testable scoring module — functionally fine, architecturally inconsistent with `lib/intelligence/scoring.ts`'s pattern.
- **Is resolution reusable?** Yes for `resolveMetric` — it's generic over `T` and used identically for Price/Volume/Liquidity/TVL. It is not yet used by `lib/data/aggregate.ts` at all.
- **Is caching reusable?** Yes — `getOrSet` (`lib/providers/common/cache.ts`) is provider-agnostic, in-flight-deduplicated, and used identically by all 6 providers with no divergence.
- **Is confidence scoring reusable?** Partially. `computeConfidence`/`computeFreshness` are shared, well-factored modules for the Profile path. The Dashboard path has no equivalent — its per-widget heuristic scores (§7) are not confidence scores in the same sense and aren't interchangeable with them.
- **Is rate-limit handling reusable?** Yes — `assertRateLimit` (`lib/providers/common/rate-limit.ts`) is identical across all 6 providers, keyed per-provider, with no divergence.
- **Two unreconciled contract-verification paths** (detailed in §5.1) is the single clearest architectural inconsistency found in this audit — one module (`sources.ts`) uses a documented-weak heuristic for a data point (`ContractInfo.verified`) that a stronger, already-implemented, already-called sibling function (`getContractDetail`) could answer precisely.
- **Registry fields with zero code path reading them**: `providerIds.baseRpcAddress` (never referenced by `matchNetwork` or anywhere else) and `providerIds.dexscreenerChainId` (never referenced by `matchTrading`) are both live TypeScript fields on `ProjectProviderIds` that no matching function consults — dead schema, not just dead data (see §0).

---

## 10. UX Coverage Audit

### Project Profile (`app/dashboard/projects/[slug]/page.tsx`)
The most mature surface. Every Quick Stat tile (`ProfileQuickStats.tsx`) shows a real tooltip built from `resolutionTooltip()` — naming the winning provider, whether it was a fallback, and (when nothing resolved) the precise `failureReason` naming every provider checked. `ProfileSources.tsx` lists per-provider live/unavailable/not-configured status for all 6 `ProviderName` providers plus a synthetic "Registry" row. This is the only surface in the app with full metric-level provenance.

### Explorer (`app/dashboard/projects/page.tsx`, `ProjectCard.tsx`, `ProjectRow.tsx`)
Confirmed via direct grep: **zero provider attribution anywhere** — no `sources`, no `SourceAttribution`, no `ProviderBadge`/`ProviderIndicator` usage in either `ProjectCard.tsx` or `ProjectRow.tsx`. Both consume only 4 raw fields (`market.priceUsd`, `market.changePct24h`, `tvl.tvlUsd`, `github.stars`) directly off `ProjectIntelligence`, rendered as a bare `—` when unavailable, with no reason shown. `ExplorerTable`/`ProjectCard` also never show Volume, Liquidity, FDV, ATH/ATL, verification, or governance — a much narrower metric surface than what `ProjectIntelligence` actually contains for a project. This is the weakest transparency surface in the app given how much richer data already exists one click away on the Profile page.

### Dashboard (`app/dashboard/page.tsx` + `components/dashboard/*`)
Every widget consumes `WithSource<T>` from `lib/data/aggregate.ts`, not `ProjectIntelligence` directly — confirmed via import-level grep across `MarketWidget`, `KPIRow`, `TrendingWidget`, `WhaleActivityWidget`, `NarrativeHeatmap`, `SignalsWidget`, `AIProjectsWidget`, `ProjectSpotlight`, `ActivityFeed`, `IntelligenceBrief`: none import from `lib/intelligence/*` or `lib/providers/*`. Provenance is a single coarse `"live"`/`"mock"` flag per widget bundle — a real signal, but far coarser than the Profile page's per-metric resolution. A widget showing `source: "live"` gives no indication of *which* provider(s) actually succeeded within it (e.g. `getKpisImpl` blends up to 6 independent provider calls into one KPI row with one shared "live" flag once any single one succeeds).

### Cards / Tables / Widgets generally
Missing data is explained with a reason on the Project Profile (tooltips, `ProfileSources`, `EmptyState` components with cause-specific copy) but **not** on the Explorer or Dashboard, where an unavailable value is either a bare dash or falls back silently to a mock value with no visible "this is illustrative, not live" marker to the end user beyond an internal `source` flag that isn't rendered as UI copy anywhere checked in this audit.

---

## 11. Duplicate Provider Logic
See §7 (folded in above to avoid repeating the same evidence twice) — the two-tier `lib/intelligence` vs. `lib/data/aggregate.ts` architecture is the substantive duplicate-logic finding of this audit.

---

## 12. Quick Wins (High Impact, Low Effort — no new provider, code-only)

1. **Feed `getContractDetail`'s real verification result back into `ContractInfo.verified`, `Sources.verifiedContract`, and `verifiedContractPct`.** The data is already fetched on every Profile load (§5.1) — this is a wiring fix, not a new integration.
2. **Stop suppressing CoinGecko's `community_data`/`developer_data`** on the already-made `fetchCoinDetail` call; surface Twitter/Telegram follower counts and a secondary GitHub-stats cross-check when CoinGecko has them linked (§5.3).
3. **Remove or wire up the dead `dexscreenerChainId`/`baseRpcAddress` registry fields** — currently defined, occasionally populated (Aerodrome, Uniswap), and read by nothing (§0, §9). Either delete them or make `matchTrading`/`matchNetwork` actually consult them.
4. **Delete `getBaseProjectCount()`** (DefiLlama) or find it a caller — confirmed dead code (§1.3, §6).
5. **Add per-metric provider attribution to `ProjectCard`/`ProjectRow`** (Explorer) — the underlying `ProjectIntelligence` already carries `Sources`; the Explorer simply never reads it (§10).
6. **Batch Snapshot governance into one GraphQL call** across all tracked spaces instead of one per project (§2.7, §5.6) — no new endpoint, just a query shape change.

## 13. Medium Improvements (some new integration work)
1. Add DexScreener's direct pair-address lookup (`/latest/dex/pairs/{chainId}/{pairAddress}`) as the real fix for the "not currently trending" limitation (§5.2) — still zero new provider, one new endpoint on an already-integrated one.
2. Resolve GitHub org-only registry references via `/orgs/{owner}/repos` (§5.4, §8) — unlocks GitHub data for Zora/LayerZero/USD Coin without any registry edits.
3. Integrate DefiLlama's `/overview/dexs/{chain}` as a genuine third Volume candidate, chain-scoped to Base (§2.3, §8).
4. Unify the Dashboard's ad hoc per-widget scoring (`ProjectSpotlight`'s formulas, §7) into `lib/intelligence/scoring.ts`-style shared, documented functions.
5. Populate real `dexscreenerPairAddresses` and `blockscoutAddress` for the highest-traffic registry projects (starting with Aerodrome, Aave, Compound) — a registry data-entry task, not a code task, but the single highest-leverage item in this entire audit (§0).

## 14. Long-Term Improvements
1. Integrate a free NFT data source (Reservoir's free tier, or OpenSea's public API) — there is currently **no NFT metric of any kind** anywhere in this codebase, despite `nft` being a first-class registry category (Zora, §4).
2. Integrate DefiLlama `/yields` for `yield`/`lending` category projects — a real, free, entirely unexploited dataset.
3. Add a real, free "contract balance" metric via Base RPC `eth_getBalance` for any registered contract — closes part of the "treasury" gap without needing a new provider or a new (non-existent) `ContractType` enum value.
4. Add an on-chain Governor read (a real `Governor.state()`/`proposalVotes()` contract read via Base RPC) as a second governance candidate alongside Snapshot, for projects with real on-chain (not just Snapshot-signaling) governance.
5. Reconcile the two aggregation architectures (§7) behind one shared resolution/confidence layer, so a future provider improvement only needs to be made once.

## 15. Metrics That Can Never Be Supported With Current FREE Providers
- **NFT floor price / NFT collection volume** — no NFT marketplace provider integrated; not obtainable from any of the 6 currently-integrated providers regardless of registry configuration.
- **Contract owner (arbitrary contract)** — not exposed by Blockscout's public API for a general contract; would require assuming a specific ABI (`owner()`), which isn't safe across arbitrary contract types (documented reasoning already in `merge.ts`/`types.ts`).
- **Discord/Telegram exact member counts** — genuinely require bot-level/authenticated access; no free public endpoint exists for either.
- **X/Twitter follower count via a dedicated API** — X's own API requires a paid tier; CoinGecko's optional `community_data.twitter_followers` (§5.3) is a *partial*, coin-dependent substitute, not a general solution.
- **On-chain proposal execution date** — Snapshot is off-chain signaling only; no real execution timestamp exists to fetch from any free source for a Snapshot-only governance setup.
- **Audit report presence/quality** — no audit-registry (e.g. a Certik/audits.wtf-style feed) is integrated, free or otherwise.

## 16. Metrics We Can Add TODAY Without Adding Any New Provider
- Real contract verification (§5.1/§12.1) — data already fetched, just needs to be wired into the right field.
- CoinGecko `community_data`/`developer_data` (§5.3/§12.2) — one query-parameter change on an existing call.
- Blockscout `ChainStats`'s 5 currently-discarded fields (§6) — total transactions, average block time, network utilization %, slow/average/fast gas tiers, Blockscout's own ETH price.
- A real Base-RPC-derived contract balance for any registered `ProjectContract` (§14.3) — one new, free RPC call per contract, no new provider.
- GitHub `/repos/{full}/languages` and `/repos/{full}/community/profile` for any project with a specific repo already configured (§2.6) — richer Engineering Health with zero new provider.
- Batched Snapshot governance (§5.6/§12.6) — same provider, fewer requests, same data.

---

## Final Score

| Dimension | Grade | Basis |
|---|---|---|
| Provider Integration | **B+** | 6 real free providers, cleanly triaded, well cached/rate-limited; one dead function (`getBaseProjectCount`), several high-value free endpoints on already-integrated providers left unimplemented (direct DexScreener pair lookup, GitHub org-repo resolution, DefiLlama yields/DEX-volume) |
| Data Coverage | **C+** | Provider *capability* is broad, but registry configuration is the real ceiling: Trading is unreachable for 100% of tested projects, Contracts for 95% of the registry, purely from unset provider IDs, not provider limits |
| Fallback Logic | **B** | `resolveMetric` is a genuinely well-designed, centralized, generic resolver — but only 2 of 5 eligible metrics (Price, Volume) currently have a real second candidate wired, and even those are starved of data by the registry gap above |
| Architecture | **B-** | Clean triad pattern and shared cache/rate-limit/resolution primitives on the Profile path; a second, structurally divergent aggregation system (`lib/data/aggregate.ts`) duplicates provider calls with a coarser attribution model and ad hoc scoring; one confirmed unreconciled dual-path bug (contract verification, §5.1) |
| Provider Transparency | **C+** | Best-in-class on the Project Profile (per-metric resolution tooltips, full Sources panel); effectively absent on the Explorer (zero attribution surfaced); coarse (single live/mock flag per widget bundle) on the Dashboard |
| UX Data Quality | **B-** | Every empty state on the Profile page has a real, specific, non-fabricated reason — a genuine strength confirmed across every component read in this audit; the Explorer's bare `—` with no reason is the clearest regression from that standard |
| **Overall Intelligence Platform Readiness** | **B-** | The engineering foundation (typed providers, centralized caching/rate-limiting/resolution) is solid and ready to scale; the platform's actual data richness today is bottlenecked by Project Registry completeness far more than by provider capability or code quality — closing the registry gap (§0, §12.6, §13.5) would raise nearly every other grade in this table without a single new integration |
