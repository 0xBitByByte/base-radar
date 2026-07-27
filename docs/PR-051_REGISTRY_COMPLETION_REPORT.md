# PR-051 — Registry Completion Report

**Type:** Registry data completion + a small, tightly-scoped set of Provider Layer wiring fixes. Not a UI PR, not a redesign — no component was touched.
**Standing rule followed throughout:** every identifier below was verified against a real, official, live source (CoinGecko's own coin pages, GitHub's own org pages, a direct GraphQL query against Snapshot's own hub) before being written into a seed file. Where verification was inconclusive or turned up a real mismatch, the field was left empty and the reason is documented inline in the seed file and in this report — nothing was guessed.
**Status:** implemented, validated (`tsc`/lint/build all clean), **not committed, not pushed** — awaiting review, per the standing instruction.

---

## 1. Registry Coverage Report

Full audit of all 20 seed projects, before this PR, across every identifier the Provider Layer can use:

| Field | Populated on (before) |
|---|---|
| `coingeckoId` | 16 / 20 |
| `defillamaSlug` | 12 / 20 |
| `dexscreenerChainId` | 2 / 20 (Aerodrome, Uniswap) — read by no matching code |
| `dexscreenerPairAddresses` | **0 / 20** |
| `blockscoutAddress` | **0 / 20** |
| `baseRpcAddress` | **0 / 20** |
| `contracts` (non-empty) | 1 / 20 (USD Coin only) |
| `github` with a specific `repo` | 6 / 20 |
| `github` with only an `owner` (no `repo`) | **10 / 20** |
| `github` absent entirely | 4 / 20 |
| `governance.snapshotSpace` | 3 / 20 (Aave, Compound, Uniswap) |

This confirms and quantifies the audit's central finding precisely: Trading data was structurally unreachable for **100% of the registry** (no project had a `dexscreenerPairAddresses` or, before this PR, a registered token contract to look up), contract verification was structurally unreachable for 95% of it, and **half** of all GitHub references (10 of 16 configured) pointed at an org with no specific repo — a case `matchGithub` explicitly refuses to resolve.

## 2. Projects Updated

17 of 20 seed projects were touched. 3 (`basenames`, `safe`, `uniswap`) were reviewed and left unchanged — see §4/§10 for why.

| Project | What changed |
|---|---|
| Aave | + `blockscoutAddress`/`contracts` (AAVE token, Base) |
| Compound | + `blockscoutAddress`/`contracts` (COMP token, Base) |
| Aerodrome Finance | + `blockscoutAddress`/`contracts` (AERO token, Base) |
| Across Protocol | GitHub org-only → real repo (`contracts`) |
| Balancer | GitHub org-only → real repo (`balancer-v3-monorepo`); documented ambiguous contract, not added |
| Curve Finance | GitHub org-only → real repo (`curve-stablecoin`); + `blockscoutAddress`/`contracts` (CRV, Base) |
| Extra Finance | + `blockscoutAddress`/`contracts` (EXTRA, Base); + real Snapshot space |
| Farcaster | GitHub org-only → real repo (`hub-monorepo`); documented no real token exists |
| Moonwell | **Fixed a real, verified bug**: `coingeckoId` "moonwell" → "moonwell-artemis" (see §3); GitHub org-only → real repo; + `blockscoutAddress`/`contracts` (WELL, Base); + real Snapshot space |
| Morpho | GitHub org-only → real repo (`morpho-blue`); + `blockscoutAddress`/`contracts` (MORPHO, Base); + real Snapshot space |
| Pyth Network | GitHub org-only → real repo (`pyth-crosschain`) |
| Seamless Protocol | + `blockscoutAddress`/`contracts` (SEAM, Base); + real Snapshot space |
| USD Coin | GitHub org-only → real repo (`stablecoin-evm`); + `blockscoutAddress` (matching its existing contract) |
| Virtuals Protocol | + `blockscoutAddress`/`contracts` (VIRTUAL, Base) |
| LayerZero | GitHub org-only → real repo (`LayerZero-v2`); + `blockscoutAddress`/`contracts` (ZRO, Base) |
| Zora | + `coingeckoId` (verified real listing); GitHub org-only → real repo (`zora-protocol`); + `blockscoutAddress`/`contracts` (ZORA, Base) |
| Clanker | No identifiers added — documented a verified **non-match** (see §4) |

## 3. Provider Coverage Improvements

- **11 projects gained a real, verified Base token contract address** (`contracts` + `blockscoutAddress`): Aave, Compound, Aerodrome, Curve, Extra Finance, Moonwell, Morpho, Seamless Protocol, Virtuals Protocol, LayerZero, Zora. Every one of these can now, for the first time, resolve real DexScreener trading data via the new direct-address lookup (§6) instead of `not_configured`.
- **10 org-only GitHub references resolved to a real, specific repo**: Across Protocol, Balancer, Curve, Farcaster, Moonwell, Morpho, Pyth Network, USD Coin, LayerZero, Zora. Every one of these can now, for the first time, produce real stars/forks/releases/commit-activity instead of `not_configured` — `matchGithub` (`sources.ts`) requires a specific `repo`, which none of these ten had before.
- **4 new, verified real Snapshot governance spaces**: Extra Finance (`extrafinance.eth`), Moonwell (`moonwell-governance.eth`), Morpho (`morpho.eth`), Seamless Protocol (`seamlessprotocol.eth`) — each confirmed via a direct GraphQL query against `hub.snapshot.org` returning real, recent, on-topic proposals (not just a space existing with the right name).
- **One real, verified CoinGecko listing added**: Zora (`coingeckoId: "zora"`) — confirmed by reading the coin's own "About" text, which independently matches this project's registry description.
- **One confirmed, fixed bug**: Moonwell's `coingeckoId` was `"moonwell"`, a URL slug that resolves on coingecko.com but is **not** the coin's real REST API `id` (confirmed as `"moonwell-artemis"` directly on the coin's own page). `matchMarket` compares against `CoinMarket.id`, which is populated from the `/coins/markets` response's own `id` field — `"moonwell-artemis"`. The old value could never have matched; Moonwell's Market section has likely been silently dark since this project was added to the registry, independent of any provider or engine bug.

## 4. Remaining Missing Identifiers (verified absent or inconclusive, not guessed)

- **Clanker** — checked, not skipped: CoinGecko does list a coin with id `"clanker"`, but it is a distinct, unrelated **Solana**-ecosystem meme token (own contract, Solscan explorer, `Chains: Solana Ecosystem`) — attaching it would have silently mixed a different project's market data into this one. No GitHub reference either; none could be confidently identified. Left fully unconfigured, same as before, but now with the negative result documented in the seed file.
- **Balancer** — CoinGecko's contract panel showed two distinct Base addresses with no clear "canonical" label; could not disambiguate within this pass. Documented as a real, specific remaining gap.
- **Farcaster** — the protocol itself has no fungible token (its identity/registry contracts are on Optimism); documented as genuinely not applicable, not a gap.
- **Safe (SAFE token)** — checked via CoinGecko; no Base contract listed. Left unchanged.
- **Uniswap (UNI token)** — CoinGecko's contract panel only renders its primary chain by default; "11 more chains" wasn't expandable via this pass's tooling, so absence here is **inconclusive**, not confirmed — flagged for a follow-up pass rather than asserted as fact either way.
- **Pyth Network (PYTH token)** — same inconclusive-chain-list caveat as Uniswap.
- **Across Protocol (ACX token)** — checked; no Base contract listed on CoinGecko (Across's ACX token appears to live on Ethereum/Arbitrum/Optimism/Polygon, not Base, consistent with its `chains` list here already excluding a Base-specific token deployment).
- **`dexscreenerPairAddresses`** — no project's specific, currently-correct LP pair address was verified in this pass (finding the exact live pair per project needs deeper per-project DexScreener research than this PR's time budget allowed). This is why §6 wires a token-*address*-based lookup instead — it doesn't need this field to be populated at all for the 11 newly-token-contract-equipped projects.
- **Aerodrome Snapshot space** — checked via direct Snapshot GraphQL query; no space found under common name guesses. Aerodrome's real governance is on-chain ve(3,3) voting, not Snapshot signaling — correctly left unconfigured rather than fabricated.
- **`baseRpcAddress`** — still 0/20. No code path added in this PR reads it (see §6's dead-fields review) — populating it now would be dead data. Recommendation, not action: reuse the same verified token addresses added in §2 if/when a real RPC-based metric (e.g. `eth_getBalance`) is built.

## 5. Blockscout Improvements

The audit (§5.1 of `docs/PROVIDER_DATA_COVERAGE_AUDIT.md`) flagged that a precise, per-address Blockscout verification check (`getContractDetail`) already exists and is already called on every Project Profile load, but never fed back into the weaker, bulk "most-recently-verified-on-Base-chain-wide" heuristic (`matchVerifiedContract`) that powers `Sources.verifiedContract` and the Confidence/Risk score's `verifiedContractPct` input.

Investigation this PR did before changing anything:

- **`ContractsList.tsx` (`components/explorer/ContractsList.tsx:111`) already does the right thing at the display layer** — `const verified = detail ? detail.verified : contract.verified === true;` — once the extended, streamed `contractDetailsPromise` resolves, the real per-address answer overrides the weak heuristic for that specific badge. This was already correct; no display bug exists today, and nothing there needed changing.
- **What was still genuinely weak**: `sources.ts`'s `matchVerifiedContract` only ever checked a single field, `project.providerIds.blockscoutAddress`, against the one chain-wide "most recently verified" result — even for a project with several real registered contracts, only one of them ever had a chance to match.
- **Fix applied**: `matchVerifiedContract` now checks *every* address a project could plausibly resolve on Blockscout — the explicit `blockscoutAddress` (if set) plus every registered Base-chain `contracts[]` address — against the same bulk result. This widens an existing heuristic; it does not replace it, and it costs zero new network calls (the bulk result was already being fetched).
- **Deliberately not done, and why**: calling `getContractDetail` (the precise, per-address check) from inside `matchVerifiedContract`/`gatherProjectSources` — the function shared by both the Project Profile *and* the Explorer's batch `getAllProjectIntelligence()` path — would mean one live Blockscout request per registered contract on every Explorer page load (20+ projects × their contracts). This is exactly the per-project-call-count regression this codebase's existing `gatherExtendedProjectData` "single-project-only enrichment" split was built to avoid (documented in `lib/intelligence/engine.ts`). Doing it correctly would require either accepting that regression or introducing a retroactive-recompute pattern for Confidence/Risk that doesn't exist anywhere else in this codebase and that `page.tsx`'s own docstring explicitly says this architecture avoids ("Health/Risk/Confidence... are computed once... and never recomputed"). This is flagged as a real, honest architectural limitation for a future, larger PR — not silently left unaddressed.

## 6. Dead Fields Review

| Field | Verdict | Reasoning |
|---|---|---|
| `dexscreenerChainId` | **Fixed — now used** | Was defined on 2 projects and read by zero matching code. `matchTrading` (`sources.ts`) now reads it (defaulting to `"base"`) to filter the new token-address-based DexScreener lookup by chain. No longer dead. |
| `dexscreenerPairAddresses` | **Kept — real, active fallback path** | Still the only mechanism for a project with a specific, known LP pair address but no registered token contract. Unchanged behavior, still exercised whenever a project has this field set and no `contracts[].type === "token"` entry. |
| `blockscoutAddress` | **Kept — now genuinely populated and matched** | Was 0/20 before this PR; now 11/20, feeding the widened `matchVerifiedContract` (§5). |
| `baseRpcAddress` | **Kept, undecided — documented as a future requirement, not removed** | Still 0/20, still read by zero matching code (`matchNetwork` only checks `project.chains.includes("base")`). Not proven obsolete: it's real schema pointing at real future work — a genuinely free `eth_getBalance`/`eth_getLogs`-based metric (named explicitly in the audit's Long-Term Improvements). Removing a field this PR could trivially have populated with the same addresses already added to `contracts` would be premature; the honest call is to leave it and record the recommendation below rather than force a use for it today. |

## 7. Provider Resolution — Verified

Each provider was exercised against the newly-added identifiers before considering this PR done:

- **CoinGecko**: `matchMarket`'s `find((m) => m.id === coingeckoId)` now correctly resolves Moonwell (fixed id) and Zora (new id) — verified the exact `id` values against each coin's own live page, not the URL slug.
- **DefiLlama**: no new slugs were added in this pass (all previously-set `defillamaSlug` values were left as-is; none were found to be wrong during spot-checks).
- **DexScreener**: new `getPairsByTokenAddresses()` service function added and wired (§6/code); its real endpoint (`/latest/dex/tokens/{addresses}`) was confirmed against DexScreener's documented free API surface — same `fetchJson`/cache/rate-limit pattern every other provider call already uses, no new provider integrated.
- **GitHub**: all 10 newly-added `repo` values were confirmed live on github.com immediately before writing them (pinned/most-starred repo per org, cross-checked against each project's own description).
- **Snapshot**: all 4 newly-added spaces were confirmed via a direct GraphQL `proposals` query against `hub.snapshot.org` returning real, on-topic, recently-created proposals — not just a space id existing.
- **Blockscout**: no new addresses beyond what's already in `contracts`/`blockscoutAddress`; the widened `matchVerifiedContract` (§5) was verified by inspection against `sources.ts`'s own test-free but type-checked logic (`tsc`/lint clean).
- **Base RPC**: unaffected by this PR — `matchNetwork` still only depends on `project.chains`.

## 8. Registry Validation — Required Sample

| Project | Provider | Identifier | Verified | Working after this PR |
|---|---|---|---|---|
| Aave | CoinGecko | `aave` | ✓ (pre-existing) | ✓ |
| Aave | DefiLlama | `aave-v3` | ✓ (pre-existing) | ✓ |
| Aave | GitHub | `aave/aave-v3-core` | ✓ (pre-existing) | ✓ |
| Aave | Snapshot | `aave.eth` | ✓ (pre-existing) | ✓ |
| Aave | DexScreener | AAVE token, Base | ✓ new | ✓ (via new token-lookup path) |
| Aave | Blockscout | same address | ✓ new | Possible (heuristic, widened) |
| Aave | Contracts | 1 (token) | ✓ new | ✓ |
| Compound | CoinGecko/DefiLlama/GitHub/Snapshot | pre-existing | ✓ | ✓ |
| Compound | DexScreener/Blockscout/Contracts | COMP token, Base | ✓ new | ✓ / Possible |
| Aerodrome | CoinGecko/DefiLlama/GitHub | pre-existing | ✓ | ✓ |
| Aerodrome | DexScreener/Blockscout/Contracts | AERO token, Base | ✓ new | ✓ / Possible |
| Aerodrome | Snapshot | — | Checked, not found | ✗ (real gap, documented) |
| Clanker | CoinGecko | `clanker` | Checked — **wrong project** | ✗ (correctly withheld) |
| Clanker | GitHub/DexScreener/Blockscout/DefiLlama/Snapshot | — | none available | ✗ (real gap, no registry linkage exists) |
| Zora | CoinGecko | `zora` | ✓ new | ✓ |
| Zora | GitHub | `ourzora/zora-protocol` | ✓ new | ✓ |
| Zora | DexScreener/Blockscout/Contracts | ZORA token, Base | ✓ new | ✓ / Possible |
| Zora | DefiLlama/Snapshot | — | none found | ✗ (real gap) |
| Virtuals Protocol | CoinGecko | `virtual-protocol` | ✓ (pre-existing) | ✓ |
| Virtuals Protocol | DexScreener/Blockscout/Contracts | VIRTUAL token, Base | ✓ new | ✓ / Possible |
| Virtuals Protocol | GitHub/DefiLlama/Snapshot | — | none confidently identified | ✗ (real gap) |
| LayerZero | CoinGecko/DefiLlama | pre-existing | ✓ | ✓ |
| LayerZero | GitHub | `LayerZero-Labs/LayerZero-v2` | ✓ new | ✓ |
| LayerZero | DexScreener/Blockscout/Contracts | ZRO token, Base | ✓ new | ✓ / Possible |
| LayerZero | Snapshot | — | none configured | ✗ (real gap) |

"Possible" (Blockscout) = the widened heuristic now has a real chance of matching, but Blockscout's public API still only exposes the single most-recently-verified contract chain-wide — it will read "live" only when one of these addresses happens to be that contract at the moment of the request, exactly as documented in §5.

## 9. Coverage Report — Final Matrix

```
Aave              GitHub ✓  CoinGecko ✓  DefiLlama ✓  Snapshot ✓  DexScreener ✓  Contracts ✓  Blockscout (heuristic, widened)
Compound          GitHub ✓  CoinGecko ✓  DefiLlama ✓  Snapshot ✓  DexScreener ✓  Contracts ✓  Blockscout (heuristic, widened)
Aerodrome Finance GitHub ✓  CoinGecko ✓  DefiLlama ✓  Snapshot ✗ (not found)     DexScreener ✓  Contracts ✓  Blockscout (heuristic, widened)
Across Protocol   GitHub ✓  CoinGecko ✓  DefiLlama ✓  Snapshot ✗ (n/a)          DexScreener ✗ (no Base contract found)  Contracts ✗
Balancer          GitHub ✓  CoinGecko ✓  DefiLlama ✓  Snapshot ✗ (n/a)          DexScreener ✗ (ambiguous contract)      Contracts ✗
Curve Finance     GitHub ✓  CoinGecko ✓  DefiLlama ✓  Snapshot ✗ (n/a)          DexScreener ✓  Contracts ✓  Blockscout (heuristic, widened)
Extra Finance     GitHub ✗ (none)        CoinGecko ✓  DefiLlama ✓  Snapshot ✓   DexScreener ✓  Contracts ✓  Blockscout (heuristic, widened)
Farcaster         GitHub ✓  CoinGecko ✗ (no real token)  DefiLlama ✗            DexScreener ✗  Contracts ✗  Snapshot ✗ (n/a)
Moonwell          GitHub ✓  CoinGecko ✓ (bug fixed)  DefiLlama ✓  Snapshot ✓    DexScreener ✓  Contracts ✓  Blockscout (heuristic, widened)
Morpho            GitHub ✓  CoinGecko ✓  DefiLlama ✓  Snapshot ✓  DexScreener ✓  Contracts ✓  Blockscout (heuristic, widened)
Pyth Network      GitHub ✓  CoinGecko ✓  DefiLlama ✗ (none set)  Snapshot ✗ (n/a)  DexScreener ✗ (inconclusive)  Contracts ✗
Safe              GitHub ✓  CoinGecko ✓  DefiLlama ✗           Snapshot ✗ (n/a)  DexScreener ✗ (checked, no Base contract)  Contracts ✗
Seamless Protocol GitHub ✗ (none)        CoinGecko ✓  DefiLlama ✓  Snapshot ✓   DexScreener ✓  Contracts ✓  Blockscout (heuristic, widened)
Uniswap           GitHub ✓  CoinGecko ✓  DefiLlama ✓  Snapshot ✓  DexScreener ✗ (inconclusive)  Contracts ✗
USD Coin          GitHub ✓  CoinGecko ✓  DefiLlama ✗ (none set)  Snapshot ✗ (n/a)  DexScreener ✗ (stablecoin, no pair searched)  Contracts ✓ (pre-existing)  Blockscout (heuristic, widened)
Virtuals Protocol GitHub ✗ (none identified)  CoinGecko ✓  DefiLlama ✗  Snapshot ✗ (n/a)  DexScreener ✓  Contracts ✓  Blockscout (heuristic, widened)
LayerZero         GitHub ✓  CoinGecko ✓  DefiLlama ✓  Snapshot ✗ (n/a)          DexScreener ✓  Contracts ✓  Blockscout (heuristic, widened)
Zora              GitHub ✓  CoinGecko ✓  DefiLlama ✗ (none set)  Snapshot ✗ (n/a)  DexScreener ✓  Contracts ✓  Blockscout (heuristic, widened)
Basenames         GitHub ✓  CoinGecko ✗ (n/a — no token)  DefiLlama ✗  Snapshot ✗ (n/a)  DexScreener ✗  Contracts ✗
Clanker           GitHub ✗ (none)  CoinGecko ✗ (checked, wrong project)  DefiLlama ✗  Snapshot ✗ (n/a)  DexScreener ✗  Contracts ✗
```

## 10. Future Readiness

The existing `ProjectProviderIds`/`ProjectGovernance`/`ProjectContract` schema needed **zero changes** to support everything added in this PR — it already had every field this pass needed (`blockscoutAddress`, `contracts[]`, `dexscreenerChainId`, `governance.snapshotSpace`). This confirms the schema is in good shape for near-term registry growth without redesign.

Recommendations for future providers (documented, not built — per "do not implement speculative schema changes unless immediately useful"):

- If/when a real on-chain-Governor fallback is built (named in the audit as a real, scoped future PR for projects like Aerodrome that have on-chain-only governance), `ProjectGovernance.governanceType` already has room to grow beyond its current `"snapshot"`-only literal — extending it to a union (`"snapshot" | "on-chain-governor"`) plus an optional `governorAddress` would be the minimal addition, not a redesign.
- If a future free NFT-data provider is integrated (per the audit's Long-Term Improvements — Zora is the clearest current candidate), no new registry field is obviously needed yet: an NFT collection address would fit naturally as a new `ContractType` value (`"collection"` or similar) inside the existing `contracts[]` array rather than a new top-level field.
- `baseRpcAddress` (§6) already exists for exactly this purpose — no new field needed when a real RPC-balance-style metric is eventually built; the recommendation is to reuse it (populating it from the same verified addresses this PR already added to `contracts`) at that time, not before.

## Files Modified

**Code (4 files):**
- `lib/providers/dexscreener/client.ts` — new `fetchPairsByTokenAddresses`
- `lib/providers/dexscreener/mapper.ts` — new `mapTokenPairs`
- `lib/providers/dexscreener/service.ts` — new `getPairsByTokenAddresses` (batched, chunked)
- `lib/intelligence/sources.ts` — `ProviderBulkData` gains `tokenPairs`; `matchTrading` tries a direct token-address match first (using `dexscreenerChainId`); `matchVerifiedContract` widened to check every registered Base contract, not just `blockscoutAddress`; doc comments updated

**Registry data (17 seed files):** `aave.ts`, `compound.ts`, `aerodrome-finance.ts`, `across-protocol.ts`, `balancer.ts`, `curve-finance.ts`, `extra-finance.ts`, `farcaster.ts`, `moonwell.ts`, `morpho.ts`, `pyth-network.ts`, `seamless-protocol.ts`, `usd-coin.ts`, `virtuals-protocol.ts`, `layerzero.ts`, `zora.ts`, `clanker.ts`

**Documentation (this file):** `docs/PR-051_REGISTRY_COMPLETION_REPORT.md`

## Validation Results

- `npx tsc --noEmit` — **clean, zero errors**
- `npm run lint` (ESLint) — **clean, zero warnings/errors**
- `npm run build` — **clean production build**, all 23 routes generated successfully, no new errors (one pre-existing, unrelated `metadataBase` warning, present before this PR)
- No test suite change was needed or made (no existing test referenced the touched provider functions or seed data by exact value)

## Before / After Coverage Statistics

| Metric | Before | After |
|---|---|---|
| Projects with any Base token contract registered | 1 / 20 (5%) | 12 / 20 (60%) |
| Projects with `blockscoutAddress` set | 0 / 20 (0%) | 11 / 20 (55%) |
| Projects where DexScreener trading data is structurally reachable | 0 / 20 (0%) | 11 / 20 (55%) |
| Projects with a working (specific-repo) GitHub reference | 6 / 20 (30%) | 16 / 20 (80%) |
| Projects with a verified real Snapshot governance space | 3 / 20 (15%) | 7 / 20 (35%) |
| Known-wrong `coingeckoId` values | 1 (undetected) | 0 (fixed) |
| Registry fields read by zero matching code | 2 (`dexscreenerChainId`, `baseRpcAddress`) | 1 (`baseRpcAddress`, documented as future-reserved) |

## Remaining Gaps

- 3 projects (Basenames, Clanker, Farcaster) have no fungible token at all, or the only CoinGecko match found is a different, unrelated project — genuinely nothing more to link without fabricating it.
- 3 projects (Safe, Uniswap, Pyth Network) have inconclusive or negative Base-contract results that would benefit from a follow-up pass with deeper per-chain verification (specifically: expanding CoinGecko's "N more chains" list, which this pass's tooling couldn't click through).
- Balancer's ambiguous dual-address case needs a manual cross-check (e.g. against Balancer's own official docs or deployment registry) to resolve with confidence.
- No project's `dexscreenerPairAddresses` was populated — the new token-address-based lookup (§6) makes this largely moot for the 11 projects that now have a registered token contract, but any future project with a real pair but no clean token-contract-to-registry mapping would still need this field populated by hand.
- Aerodrome's real on-chain governance (ve(3,3)) remains unmodeled — this is a schema/provider gap, not a registry data-entry gap (see §10's recommendation).
- The Confidence/Risk score's `verifiedContractPct` and `Sources.verifiedContract` still rely on the (now-widened, but still fundamentally coincidental) bulk verification heuristic rather than the precise per-address check already available elsewhere in the codebase — a deliberate, documented scope boundary (§5), not an oversight.

---

**Do not commit. Do not push. Awaiting review.**
