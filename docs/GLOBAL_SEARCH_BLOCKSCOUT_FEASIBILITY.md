# Global Search — Blockscout Feasibility (PR-078 §6)

Research only, per the PR brief. Nothing in this document has been wired into the app.

## What was tested live

`https://base.blockscout.com/api/v2/search?q=<query>` (Blockscout's real, public v2 search endpoint — the same host and API version every other provider call in this codebase already uses).

**Confirmed live** against a known Base address (`0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`, USDC):

```json
{
  "items": [
    { "type": "token", "name": "USDC", "symbol": "USDC", "address_hash": "0x8335...", "token_type": "ERC-20", "is_smart_contract_verified": true, "exchange_rate": "0.999714", "circulating_market_cap": "...", "token_url": "/token/0x8335..." },
    { "type": "address", "name": "FiatTokenProxy", "address_hash": "0x8335...", "is_smart_contract_verified": true, "url": "/address/0x8335..." }
  ],
  "next_page_params": null
}
```

One query, multiple typed results (`type` discriminates the result kind), each carrying enough metadata (name, verification status, market cap, URL) to render a real result row without a follow-up request.

**Attempted but inconclusive:** a plain keyword query (`q=USDC`, no address) timed out after 15s against the live endpoint during this research session — a real, encountered latency/availability data point, not a hypothetical concern (see Risks below). Blockscout's own public API documentation states the same endpoint also matches transaction hashes (`type: "transaction"`) and block numbers/hashes (`type: "block"`) in addition to the address/token types confirmed live above; that part is documented capability, not independently re-confirmed live in this session.

## Mapping to the user's requested categories

| Requested | Blockscout coverage | Notes |
|---|---|---|
| **Tokens** | Yes — confirmed live (`type: "token"`) | Real name/symbol/market cap/verification per result. |
| **Contracts / Wallets** | Yes — confirmed live (`type: "address"`) | Blockscout doesn't distinguish "contract" from "wallet" at the type level; `is_smart_contract_address` on the result disambiguates. |
| **Transactions** | Documented, not independently re-confirmed this session | Matches by exact tx hash only — no partial/fuzzy hash search. |
| **NFT Collections** | Partial, via the same `token` type | Blockscout has no separate "NFT collection" endpoint — an ERC-721/ERC-1155 contract surfaces as a `token` result with `token_type: "ERC-721"` — generic token search already covers this, no new integration needed. |
| **ENS** | Not applicable on Base | ENS is an Ethereum-mainnet naming system; Base's equivalent is Basenames (already a tracked project in this registry — `data/projects/seed/basenames.ts`). Whether Blockscout's Base instance resolves Basenames through the same `ens_info`/domain-name matching its mainnet instance uses for ENS was not tested this session — a real open question, not assumed either way. |
| **Projects** | Not applicable — and shouldn't be | "Project" is this app's own curated Registry concept (`data/projects/`), not something Blockscout has any notion of. A Blockscout text match for "Aave" would only ever find an on-chain contract/token literally named "Aave," never the curated Base Radar entity — Project search must stay owned by `lib/search/globalSearch.ts`'s existing `normalizeProject`, never delegated to Blockscout. |

## Architectural fit

Global Search today (`lib/search/types.ts`, `lib/search/globalSearch.ts`) is built entirely from **already-computed, synchronous, in-memory** sources: the static command registry, the static Project Registry, and five engine outputs (Timeline, Notifications, Automation, Portfolio, Daily Brief) that are all pre-built before a keystroke ever reaches the search box. `SearchableItem`/`SearchGroup`/`SearchResultType` are simple closed unions with no async variant anywhere in the pipeline.

A Blockscout-backed result category would be the **first live, network-backed, debounced search source** in this system — every other group answers instantly from memory; this one would round-trip to `base.blockscout.com` on every keystroke (or every debounced keystroke). That's a real, new kind of moving part for `useGlobalSearch`/`CommandPalette` to handle (loading state per keystroke, a request that can outlive its own input value, a result set that can partially fail) — not a rewrite, but not "zero-change" either.

**What would NOT need to change:** the shared `SearchableItem` shape already generalizes cleanly — a new `type: "onchain-address" | "onchain-token" | "onchain-tx"` and a new `SearchGroup: "On-Chain"` slot in cleanly alongside the existing seven groups. The provider-layer pattern (`client.ts` → `mapper.ts` → `service.ts`, `getOrSet` cache, `assertRateLimit`) that every one of Blockscout's five other functions already follows applies identically to a sixth `search(query)` function — no new pattern needs inventing.

**What WOULD need to change:** `useGlobalSearch` (currently a pure, synchronous `useMemo` over static data) would need a debounced-async branch specifically for this one new source, merged into the same result list once it resolves — a genuinely new code path in that hook, not an extension of its existing one.

## Recommendation

**Feasible without major architectural changes** — the provider-layer pattern and the `SearchableItem` shape both already generalize to this cleanly. The real cost is entirely in `useGlobalSearch`'s hook logic (adding its first async/debounced branch), not in the data layer.

**Scope it as its own PR, not a §6 add-on here** — per this PR's "do not implement unless minimal" instruction, and because a debounced network search source touches user-perceived latency and rate-limit budget in a way that deserves its own focused implementation and QA pass, not a rider on a trust/wording PR. Suggested phase order for that future PR: (1) `blockscout.search(query)` in the provider layer, tokens + addresses only (the two types confirmed live here); (2) wire into `useGlobalSearch` as a new debounced "On-Chain" group; (3) evaluate transaction-hash and Basenames/ENS-equivalent matching as a follow-up once the base integration is live and its real latency/rate-limit behavior is observed in production, not assumed from a single research session.

## Risks / open questions

- **Latency**: a plain keyword search timed out at 15s once during this research session against the live public endpoint — real evidence this endpoint is not uniformly fast, which matters directly for a per-keystroke UX. Needs its own timeout/debounce tuning, tighter than this codebase's existing 8s default (`DEFAULT_TIMEOUT_MS`, `common/utilities.ts`).
- **Rate limits**: Blockscout's public API is free but not unlimited (this codebase's own `blockscout` service already budgets 30 req/60s app-side); a live-as-you-type search source could burn that budget fast without its own, separate, tighter limit.
- **Basenames/ENS resolution on Base** — untested this session, called out above, not assumed.
