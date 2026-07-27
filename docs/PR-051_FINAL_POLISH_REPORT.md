# PR-051 — Final Polish: Registry Validation, Coverage & Documentation

**Type:** Engineering hardening for the Registry Foundation — no provider architecture change, no UI change, no new provider. Adds tooling and documentation only.
**Status:** implemented, validated (`lint`/`tsc`/`build`/full test suite all clean), **not committed, not pushed** — awaiting review.

---

## 1. Registry Validation Summary

New pure module: `data/projects/validation.ts` — `validateRegistry(projects)`. Runs the real registry (`PROJECTS`, 20 projects) through every category of check requested:

- **Duplicates**: `id`, `slug`, `coingeckoId`, `defillamaSlug`, `snapshotSpace`, GitHub `owner/repo`, contract addresses (any type), token-typed addresses specifically.
- **Format**: GitHub owner/repo/url consistency, CoinGecko/DefiLlama id casing, Snapshot space characters, EVM address shape (contracts, `blockscoutAddress`, `baseRpcAddress`, `dexscreenerPairAddresses`), every URL field, `contracts[].chain`/`.type` against the real enums.
- **Missing required identifiers**: empty `name`/`shortDescription`/`description`/`categories`/`chains`.
- **Orphan provider ids**: a `dexscreenerChainId` with nothing to filter; a `blockscoutAddress` matching no registered contract.
- **Conflicting metadata**: `lifecycle` state/target mismatches, `governance` type/space mismatches, a contract on a chain the project doesn't declare, `verificationLevel` ahead of `verification.status`.

**Result against the real registry, run just now:**

```
============================================================
Registry Validation Report
============================================================
Status: PASS
Errors: 0
Warnings: 1

-- Warnings -----------------------------------------------
[WARN]  dexscreener-chain-id-without-target (uniswap): dexscreenerChainId is set
to "base", but this project has neither dexscreenerPairAddresses nor a
registered Base token contract for `matchTrading` to look up — the field
currently has nothing to act on.
============================================================
```

**Zero errors.** The one warning is a real, already-known, already-documented
gap (Uniswap's UNI-on-Base contract address was inconclusive to verify in
PR-051's registry-completion pass — see that report's §4/§10) — the tool
finding exactly this and nothing else is itself the validation that it
works correctly, not a new problem.

The tool **fails** validation (non-zero exit via a failing test assertion)
whenever a real error is introduced — proven by 14 synthetic-fixture tests
that each construct a deliberately broken project and assert the specific
rule catches it (duplicate ids, duplicate CoinGecko ids, duplicate contract
addresses on two projects, malformed addresses, a contract on an
undeclared chain, GitHub url/owner mismatches, governance
type/space mismatches, invalid URLs, empty required fields, orphaned
`dexscreenerChainId`, orphaned `blockscoutAddress`, and an unresolved
`lifecycle: "duplicate"`), plus one fixture confirming a fully-correct
project produces zero issues.

## 2. Coverage Statistics

New pure module: `data/projects/coverage.ts` — `computeRegistryCoverage(projects)`, 8 dimensions per project (GitHub, CoinGecko, DefiLlama, DexScreener, Snapshot, Contracts, Token Address, Blockscout), each mirroring the real matching logic in `lib/intelligence/sources.ts` (not an independent, looser definition).

**Output against the real registry, run just now:**

```
Aave              100%   Compound          100%   Moonwell          100%   Morpho  100%
Aerodrome Finance  88%   Extra Finance      88%   Seamless Protocol  88%   Curve Finance 88%   LayerZero 88%
Zora               75%   USD Coin           75%
Virtuals Protocol  63%
Uniswap            50%
Balancer           38%   Across Protocol    38%
Safe               25%   Pyth Network       25%
Farcaster          13%   Basenames          13%
Clanker             0%

Total projects: 20
Average coverage: 63%
Highest coverage: Aave (100%)
Lowest coverage: Clanker (0%)
```

This matches — and now automates — the hand-computed coverage matrix from
`docs/PR-051_REGISTRY_COMPLETION_REPORT.md` exactly (same four projects at
100%, same lowest at Clanker 0%). Reproducible any time registry data
changes via `npm run registry:coverage`.

## 3. Provider Coverage Summary

Same module, `computeProviderCoverage(report)` / `formatProviderCoverageReport`:

```
GitHub        Configured 16/20  Missing 4/20   Coverage 80%
CoinGecko     Configured 17/20  Missing 3/20   Coverage 85%
DefiLlama     Configured 12/20  Missing 8/20   Coverage 60%
DexScreener   Configured 12/20  Missing 8/20   Coverage 60%
Snapshot      Configured  7/20  Missing 13/20  Coverage 35%
Contracts     Configured 12/20  Missing 8/20   Coverage 60%
Token Address Configured 12/20  Missing 8/20   Coverage 60%
Blockscout    Configured 12/20  Missing 8/20   Coverage 60%
Base RPC      Configured 20/20  Missing 0/20   Coverage 100%
  (matchNetwork only requires "base" in `chains` — no separate identifier field exists.)
```

## 4. Documentation Updates

`docs/PROJECT_REGISTRY.md` — the existing canonical registry doc — extended, not duplicated:

- **New "Field Reference" section**: every field on `Project` (identity/copy, classification, on-chain data, GitHub, social, verification/registry-state, every `providerIds` sub-field, every `governance` sub-field) documented with purpose, which provider consumes it, required/optional, expected format, and a real example pulled from the actual registry — not a placeholder.
- **New "Registry Validation & Coverage Tools" section**: documents both new modules, every check category, both npm scripts, and exactly what each coverage dimension means.
- **New "Adding a New Project — Checklist"**: required fields, optional fields, a **How to verify an identifier** subsection naming the exact live source and method for each provider (CoinGecko's own "API ID" field vs. its URL slug, GitHub's pinned/most-starred repo, a direct Snapshot GraphQL query, cross-referencing a contract address against two sources), accepted data sources, 6 real common mistakes (each with a real example from this session's own work — the Moonwell id bug, the Clanker/Solana collision, org-only GitHub refs, orphaned `dexscreenerChainId`, `github.url` drift, guessed Snapshot space names), and the full validation workflow.
- **Folder structure / Helpers sections**: updated to list `validation.ts`/`coverage.ts` alongside the existing `metrics.ts`/`quality-score.ts`.

No other doc was touched — `ARCHITECTURE.md`/`API.md` were deliberately left alone, consistent with how `metrics.ts`/`quality-score.ts` (the direct precedent for this kind of registry-internal helper) were also only ever documented in `PROJECT_REGISTRY.md`, never `API.md`.

## 5. Validation Results

| Check | Result |
| --- | --- |
| `npx tsc --noEmit` | **Clean** |
| `npm run lint` | **Clean** |
| `npm run build` | **Clean** — all 23 routes generated (one pre-existing, unrelated `metadataBase` warning) |
| `npm run registry:validate` | **PASS** — 0 errors, 1 known/documented warning |
| `npm run registry:coverage` | Generates successfully — 20/20 projects computed, statistics consistent with PR-051's hand-computed figures |
| `npm test` (full suite) | **48/48 passed**, 8 test files (6 pre-existing + 2 new) |

## 6. Files Modified

**New:**
- `data/projects/validation.ts` — `validateRegistry`, `formatValidationReport`
- `data/projects/coverage.ts` — `computeProjectCoverage`, `computeRegistryCoverage`, `computeProviderCoverage`, `formatCoverageReport`, `formatProviderCoverageReport`
- `tests/data/projects/validation.test.ts` — 2 real-registry tests + 14 synthetic-fixture tests
- `tests/data/projects/coverage.test.ts` — 2 real-registry tests + 5 synthetic-fixture tests
- `docs/PR-051_FINAL_POLISH_REPORT.md` (this file)

**Modified:**
- `data/projects/index.ts` — barrel now re-exports `validation.ts`/`coverage.ts`
- `package.json` — added `registry:validate` and `registry:coverage` scripts
- `docs/PROJECT_REGISTRY.md` — Field Reference, Validation & Coverage Tools, and Adding a New Project sections (see §4)

**Not touched:** any provider (`lib/providers/*`), any UI component, `lib/intelligence/*`, any seed project data file.

## 7. Remaining Known Gaps

- The one live warning (`Uniswap`'s `dexscreenerChainId`) is a carry-over from PR-051's own documented "inconclusive" verification result, not a new issue — resolving it means re-attempting to verify UNI's Base contract address (expanding CoinGecko's "N more chains" list), which is registry *data* work, out of scope for this tooling-and-documentation pass.
- `validateRegistry`'s Snapshot-space format check is a permissive character-class regex, not a live existence check (this module makes no network calls by design) — a syntactically valid but non-existent space would still pass; only a real GraphQL query (as done by hand in PR-051) catches that.
- Coverage dimensions measure "is the registry configured well enough for a match to be attempted," not "does the live provider currently respond" — a project can show 100% coverage today and still show "Not Tracked" in the UI if, say, a provider is rate-limited at request time. This is the correct, intentional scope boundary for a pure, network-free module, but worth stating explicitly so a future reader doesn't conflate the two.
- No pre-commit/CI hook wires `registry:validate` into the build pipeline automatically yet — it runs as part of `npm test` (and therefore CI, per `docs/CI.md`), but there's no dedicated fast-fail step calling it out by name. A future, small PR could add one if registry-only changes should get a faster signal than the full test suite.

---

**Do not commit. Do not push. Awaiting review.**
