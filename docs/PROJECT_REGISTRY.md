# Project Registry

The Project Registry is the canonical, statically-defined list of Base ecosystem
projects that powers Base Radar. It contains **metadata only** — no prices, TVL,
volume, or other live market data. Live data is layered on top of this registry
by provider modules that consume the identifiers stored here.

## Registry philosophy

The registry exists to answer one question honestly: *how much do we actually
know about this project, and how much should a user trust what's shown?*
Every model in this document exists to keep that answer explicit rather than
implied — a project's presence in the registry is never itself a claim that
it's trustworthy, active, or fully understood. Three independent axes
(**lifecycle**, **verification**, **status** — see "How the axes relate"
below) let the registry say precisely which of those things is true, instead
of collapsing them into one ambiguous "good/bad" signal.

This document also defines the model for the registry's *next* stage —
automated discovery, staged verification, and a quality score — none of
which is wired into any current data or UI. Every current seed project
continues to work exactly as before; the new fields are optional and
additive (see "PR-037" below).

## Folder structure

```
data/projects/
  enums.ts        Shared string-literal enums (categories, tags, status, chains, ...)
  types.ts        The `Project` type and its supporting sub-types
  helpers.ts       Read/query helpers (getProject, searchProjects, ...)
  metrics.ts       Registry Metrics model + computeRegistryMetrics() (PR-037)
  quality-score.ts Quality Score weighting + computeMetadataCompletenessFactor() (PR-037)
  index.ts         Public barrel export — import from here
  seed/
    index.ts       Aggregates every seed file into SEED_PROJECTS
    <slug>.ts       One file per project (e.g. aerodrome-finance.ts)
```

Consumers should import from `@/data/projects` (the barrel), not from the
individual files inside it. The barrel re-exports the enums, the `Project`
type, the helper functions, the metrics/quality-score functions, and the
full list as `PROJECTS`.

```ts
import { PROJECTS, getProject, getProjectsByCategory } from "@/data/projects";
```

## Schema

Every project is a single object conforming to the `Project` type
(`data/projects/types.ts`):

| Field           | Type                     | Notes                                            |
| --------------- | ------------------------ | ------------------------------------------------- |
| `id`            | `string`                 | Stable, kebab-case identifier. Never rename.       |
| `slug`          | `string`                 | URL-facing slug. Currently always equal to `id`.   |
| `name`          | `string`                 | Display name.                                      |
| `shortDescription` | `string`             | One sentence, used in cards/lists.                 |
| `description`   | `string`                 | Longer paragraph, used on detail views.            |
| `logoUrl`       | `string?`                | Optional; not yet populated for any seed project.  |
| `websiteUrl`    | `string`                 | Official site.                                     |
| `categories`    | `ProjectCategory[]`      | See "Category taxonomy" below. A project may have more than one. |
| `tags`          | `ProjectTag[]`           | Free-form-but-controlled narrative descriptors.    |
| `status`        | `ProjectStatus`          | Operational status (`live`, `beta`, ...) — see "Project Status". |
| `chains`        | `Chain[]`                | Every chain the project is deployed on.            |
| `contracts`     | `ProjectContract[]`      | See "Contracts" policy below — usually empty.      |
| `github`        | `GithubRepoRef?`         | Optional org/repo reference.                       |
| `social`        | `SocialLinks`            | Optional handles (see "Social links" policy).       |
| `verification`  | `ProjectVerification`    | Editorial trust in this entry — see "Verification status". |
| `providerIds`   | `ProjectProviderIds`     | Lookup keys for future live-data providers.        |
| `governance`    | `ProjectGovernance?`     | Real Snapshot space, if one exists.                |
| `lifecycle`     | `ProjectLifecycle?`      | **PR-037.** Registry-record lifecycle — see "Project Lifecycle". |
| `verificationLevel` | `ProjectVerificationLevel?` | **PR-037.** Pipeline progress — see "Verification Levels". |
| `qualityScore`  | `ProjectQualityScore?`   | **PR-037.** Composite score — see "Quality Score".  |

The three PR-037 fields are optional on every project and unset on every
current seed entry. An unset `lifecycle` is equivalent to `state: "active"`;
an unset `verificationLevel` means no level has been recorded yet (not that
the project has failed to reach one).

### Enums (`data/projects/enums.ts`)

All enums are plain `as const` string-literal tuples with a derived union
type, e.g.:

```ts
export const PROJECT_CATEGORIES = ["dex", "lending", ...] as const;
export type ProjectCategory = (typeof PROJECT_CATEGORIES)[number];
```

This is used instead of TypeScript `enum` so values are:
- Plain strings (JSON-serializable, easy to log/debug/store)
- Iterable at runtime (`PROJECT_CATEGORIES.map(...)` for building filter UIs)
- Comparable without importing an enum object

The nine enums are: `ProjectCategory`, `ProjectTag`, `ProjectStatus`,
`VerificationStatus`, `Chain`, `ContractType`, and (PR-037)
`RegistryLifecycleState`, `VerificationLevel`, `DiscoverySource`. See the
doc comments in `enums.ts` for the meaning of each individual value.

### Verification status

`verification.status` describes how much the **registry** vouches for the
metadata itself — it is unrelated to on-chain "verified contract" status,
and unrelated to the new `verificationLevel` pipeline-stage field below
(see "How the axes relate").

- `verified` — Base Radar reviewed the entry directly against primary sources.
- `community` — sourced from a Base ecosystem directory/listing, not independently confirmed by Base Radar.
- `unverified` — recently added or self-reported, not yet reviewed.
- `flagged` — a known issue exists with this entry; kept for transparency rather than deleted.

---

## PR-037 — Project Lifecycle

`ProjectLifecycle` (optional field: `lifecycle`) tracks the state of the
**registry record itself** — whether Base Radar still surfaces it, and why
not if it doesn't. This is independent of whether the underlying product is
still operating (`status`, below) and independent of how much data has been
collected about it (`verificationLevel`, below).

```
                 ┌───────────┐
   (discovery)──▶│ discovered│
                 └─────┬─────┘
                       │ becomes a full registry entry
                       ▼
                 ┌───────────┐      ┌──────────┐
                 │  active   │◀────▶│ inactive │
                 └─────┬─────┘      └──────────┘
                       │
        ┌──────────────┼──────────────┬───────────────┐
        ▼              ▼              ▼               ▼
   ┌─────────┐   ┌───────────┐  ┌───────────┐   ┌──────────┐
   │ archived│   │ duplicate │  │ migrated  │   │   scam   │
   └─────────┘   └───────────┘  └───────────┘   └──────────┘
```

| State | Meaning | Notes |
| --- | --- | --- |
| `discovered` | Surfaced by a discovery source (see below); no full registry entry exists yet. | A candidate, not yet a `Project` record with an `id`. |
| `active` | A full registry entry, surfaced normally in discovery/search/dashboards. | The default — equivalent to omitting `lifecycle` entirely. |
| `inactive` | Still a valid entry, but excluded from default discovery surfaces (e.g. long-dormant, no activity in a long window). | Reversible — can return to `active`. |
| `archived` | Deliberately removed from active discovery. | Kept for historical/audit purposes. Distinct from `status: "sunset"` — a project can be a fully live, active product (`status: "live"`) that Base Radar has simply stopped tracking (`lifecycle: "archived"`), or a defunct product (`status: "sunset"`) that Base Radar still tracks for historical reference (`lifecycle: "active"`). |
| `duplicate` | A confirmed duplicate of another entry. | `duplicateOf` must be set to the canonical project's `id`. Never surfaced in discovery. |
| `migrated` | Superseded by a successor entry (rebrand, contract migration, chain move). | `migratedTo` must be set to the successor's `id`. The old entry is kept, never deleted, so historical references (alerts, timeline events) still resolve. |
| `scam` | Confirmed fraudulent or malicious. | Kept for transparency, exactly like `verification.status: "flagged"` — never deleted, never surfaced in discovery. |

**Why "duplicate" and "migrated" keep the record instead of deleting it:**
this codebase's existing convention (`docs/PROJECT_REGISTRY.md`'s own "never
rename `id`" rule, and the Alert Engine's `relatedAlertIds`/Timeline's
`projectId` references) assumes an `id` is permanent. Deleting a record
would silently break every past reference to it; setting `lifecycle.state`
instead preserves referential integrity while still correctly excluding the
record from active discovery.

---

## PR-037 — Verification Levels

`ProjectVerificationLevel` (optional field: `verificationLevel`) tracks how
far a project has progressed through the registry's **ingestion pipeline** —
a funnel, where each level is a strict superset of the previous one's
requirements.

| Level | Requirements |
| --- | --- |
| `discovered` | Surfaced by a discovery source. No registry entry exists yet — this level exists conceptually (for `RegistryMetrics`) but isn't itself recorded on a `Project`, since a project at this stage has no `id` to attach a `verificationLevel` to. |
| `indexed` | A full registry entry exists with the required core fields populated: `name`, `shortDescription`, `description`, `categories`, `chains`, and at least one `providerIds` key set. |
| `verified` | `verification.status` is `"verified"` or `"community"` (never `"unverified"` or `"flagged"`), **and** every populated `providerIds` key resolves to a real project that matches this entry's identity (no mismatched CoinGecko id, no wrong contract address). |
| `intelligence-ready` | Enough live data resolves through `providerIds`/`github`/`governance` that the Alert Engine, Health Scorecard, Daily Brief, and Portfolio Intelligence can produce a real, populated read for this project — not a "Not Currently Available" placeholder in any of those surfaces. |

**Relationship to `verification.status` (the "how the axes relate" case
worth calling out specifically):** reaching `verified` level *requires* a
non-negative `verification.status`, but the two fields are still tracked
independently and can diverge afterward. A project that reached
`level: "verified"` last month and was flagged for a new, unrelated issue
this month has `verification.status: "flagged"` *and* `verificationLevel.level:
"verified"` at the same time — the level describes historical pipeline
progress, the status describes current trust. A future registry maintenance
pass would use this divergence as a signal to re-review the entry, not treat
it as a data inconsistency to silently "fix."

---

## Project Status

`status` (`ProjectStatus`, existing) describes the underlying **product's**
real-world operational state — already fully separate from `verification`
(editorial trust) and, as of PR-037, also separate from `lifecycle`
(registry-record state). The existing five values already cover the
operational states a Base Radar entry needs to distinguish:

| `ProjectStatus` value | Meaning |
| --- | --- |
| `live` | Deployed and operating on mainnet. |
| `beta` | Live, but explicitly labeled beta/testnet-adjacent by the team. |
| `development` | Announced or building, not yet live — covers "launching soon." |
| `deprecated` | The team has stopped recommending/maintaining it, but it may still be technically operable. |
| `sunset` | Formally wound down. |

No new values were added to `ProjectStatus` for PR-037 — extending this
enum is a non-breaking, additive change if a genuine future gap appears
(new string literals never invalidate existing seed data), but the states
this PR's brief named as examples all map cleanly onto the existing five,
so none were needed:

| PR-037 example | Maps to |
| --- | --- |
| Active | `live` |
| Mainnet | `live` |
| Beta | `beta` |
| Launching | `development` |
| Sunsetting | `sunset` |
| Archived | **Not a `ProjectStatus` value** — this is `lifecycle.state: "archived"` (see above). "Archived" describes what *Base Radar* did with the record, not what the *product* is doing, so it belongs on the lifecycle axis, not here. |

## How the axes relate

Three fields answer three different questions about the same project. They
are independent — any combination is valid, and none of them can be derived
from the others:

| Axis | Field | Question it answers |
| --- | --- | --- |
| **Lifecycle** | `lifecycle.state` | Does Base Radar still treat this as a normal, active registry record? |
| **Verification** | `verification.status` + `verificationLevel.level` | How much do we trust this entry's metadata, and how far has it progressed through ingestion? |
| **Status** | `status` | Is the real-world product live, in beta, or wound down? |

**Worked example:** a project could simultaneously be `status: "sunset"`
(the team shut it down), `verification.status: "verified"` (the metadata
was reviewed while it was still active and hasn't changed),
`verificationLevel.level: "intelligence-ready"` (it reached full data
coverage before shutting down), and `lifecycle.state: "active"` (Base Radar
still surfaces it for historical reference). Four independently-true facts,
none of which contradicts any other.

---

## PR-037 — Category taxonomy

`PROJECT_CATEGORIES` (`data/projects/enums.ts`) is the standardized,
top-level sector taxonomy. Audited for this PR against every category
already in use across the 20 seed projects — no duplicates or overlapping
names were found, so the existing 20 values are confirmed as the canonical
taxonomy, unchanged:

| Category | Scope |
| --- | --- |
| `dex` | Spot/perp exchanges, AMMs, aggregators. |
| `lending` | Collateralized lending/borrowing markets. |
| `derivatives` | Options, perps, structured products (distinct from `dex` when the core product is the derivative, not the trading venue). |
| `yield` | Yield aggregation/optimization, vault strategies. |
| `stablecoin` | Stablecoin issuers. |
| `bridge` | Cross-chain asset/message bridges. |
| `infrastructure` | Node/RPC providers, indexers, middleware. |
| `oracle` | Price/data oracles. |
| `wallet` | Wallet software and account-abstraction providers. |
| `identity` | Naming services, identity/attestation protocols. |
| `nft` | NFT marketplaces, standards, tooling. |
| `gaming` | Onchain games and gaming infrastructure. |
| `social` | Onchain social protocols and apps. |
| `ai` | AI agents/infrastructure built on or for Base. |
| `rwa` | Real-world-asset tokenization. |
| `dao` | DAO tooling and governance infrastructure. |
| `launchpad` | Token/project launch platforms. |
| `analytics` | Dashboards, data, and analytics tooling (distinct from Base Radar's own domain — third-party analytics products). |
| `security` | Auditing, monitoring, and security tooling. |
| `other` | Genuinely uncategorizable — used sparingly. |

**Categories vs. tags:** `categories` are the mutually-legible top-level
buckets above (used for primary filtering); `PROJECT_TAGS` is a separate,
narrower set of narrative descriptors (`ai-agents`, `real-yield`,
`liquid-staking`, etc.) that layer on top — a project can be `categories:
["lending"]` and `tags: ["real-yield", "cross-chain"]` at once. Tags are
allowed to be narrower and more numerous than categories precisely because
they aren't the primary filtering/taxonomy axis.

---

## PR-037 — Discovery Sources

`DiscoverySource` (`data/projects/enums.ts`) records where a candidate
project was first surfaced, before it becomes a registry entry. This is a
**model definition** — no automated discovery pipeline exists yet; every
current seed project was added by hand and has no `lifecycle.discoverySource`
set.

| Source | What it contributes | Default trust implication |
| --- | --- | --- |
| `base-ecosystem` | Coinbase/Base's own official ecosystem directory. | High — closest thing to an authoritative list. |
| `coingecko` | Any Base-chain listing on CoinGecko. | Medium — broad but unmoderated for quality. |
| `defillama` | Any Base-chain protocol on DefiLlama. | Medium — same caveat as CoinGecko. |
| `blockscout` | High-activity contracts observed directly on Base's Blockscout explorer with no existing registry match. | Low — purely on-chain signal, no identity confirmation. |
| `github` | Repos tagged or named in a way that suggests a Base project, found via GitHub search/topics. | Low — requires manual identity confirmation. |
| `farcaster` | Projects announced or discussed on Farcaster, Base's native social layer. | Low — community signal, not confirmation. |
| `community` | Manually submitted (e.g. a future "submit a project" form). | Low until reviewed — same handling as `verification.status: "unverified"`. |
| `ai-discovery` | Surfaced by an automated agent cross-referencing the above sources for candidates none of them caught individually. | Lowest — always starts at `verification.status: "unverified"` and `lifecycle.state: "discovered"`. |

No trust level is enforced in code by this PR — the "default trust
implication" column is guidance for whatever future ingestion pipeline
consumes `DiscoverySource`, not a rule this layer applies itself.

**PR-039** built that future ingestion pipeline's first stage — the
Discovery Engine (`lib/discovery/`) encodes this exact table as
`SOURCE_CONFIDENCE` and produces real `DiscoverySource`-tagged candidates
for three sources today (`coingecko`, `defillama`, `blockscout`), with the
remaining five as documented placeholders. It still does not write to
`data/projects/` — see `docs/DISCOVERY_ENGINE.md`.

---

## PR-037 — Registry Metrics

`RegistryMetrics` (`data/projects/metrics.ts`) defines the counts a future
Projects page header can surface. **No current counts are fabricated or
hardcoded** — `computeRegistryMetrics(projects)` derives every field from
real `Project` records, and because no current seed project has adopted
`lifecycle`/`verificationLevel` yet, calling it today against `PROJECTS`
correctly returns `0` for every field except `discovered` (which equals the
registry's total size, since every registry entry was at least discovered).

| Metric | Definition |
| --- | --- |
| Projects Discovered | Every project that has ever been surfaced, at any stage — the funnel's widest point. |
| Indexed | `verificationLevel.level` is `"indexed"` or further along. |
| Verified | `verificationLevel.level` is `"verified"` or further along. |
| Intelligence Ready | `verificationLevel.level` is `"intelligence-ready"`. |
| New This Month | `lifecycle.discoveredAt` falls in the current UTC calendar month. |
| Updated Today | `lifecycle.updatedAt` falls on the current UTC calendar day. |

```ts
import { PROJECTS, computeRegistryMetrics } from "@/data/projects";

const metrics = computeRegistryMetrics(PROJECTS);
// { discovered: 20, indexed: 0, verified: 0, intelligenceReady: 0, newThisMonth: 0, updatedToday: 0 }
// — honest today's-truth output: no seed project has adopted the new
// lifecycle/verificationLevel fields yet, so only the total is non-zero.
```

---

## PR-037 — Quality Score

`ProjectQualityScore` proposes a future-ready 0-100 composite score across
seven factors. **Only one factor is computable from the static registry
today** — the rest require the live provider/intelligence layer and are
explicitly deferred (see "Explicitly out of scope for this layer" below).

| Factor | Weight | Computable today? | Source |
| --- | --- | --- | --- |
| Security | 0.20 | No | Future: contract verification status, audit links, absence of flagged issues — from the live intelligence layer. |
| Documentation | 0.15 | No | Future: docs link present and freshness-checked. |
| Activity | 0.15 | No | Future: GitHub commit/release cadence — already computed by the existing Health Scorecard's Developer tile; this factor would reuse that, not recompute it. |
| Liquidity | 0.15 | No | Future: TVL/volume depth and stability, where a market exists. |
| Development | 0.15 | No | Future: contributor count, release cadence, repo health. |
| Metadata Completeness | 0.10 | **Yes** | `computeMetadataCompletenessFactor(project)` — see below. |
| Community | 0.10 | No | Future: social reach/engagement, where measurable. |

**Weight rationale:** Security and Documentation are weighted highest
because they're the two factors most directly tied to user risk (a
security issue or missing docs materially changes whether someone should
trust or use a project); Metadata Completeness and Community are weighted
lowest because they're the most cosmetic — a sparse but real, safe project
should never be outscored by a well-documented but insecure one.

```ts
import { computeMetadataCompletenessFactor, computeQualityScore } from "@/data/projects";

const metadataCompleteness = computeMetadataCompletenessFactor(project);
// Real, computable today: checks logoUrl, github, social, contracts,
// providerIds, and governance — the share of those six that are populated.

// Once the other five factors are available from the live layer:
const score = computeQualityScore({
  metadataCompleteness,
  security: /* from live layer */ 0,
  activity: /* from live layer */ 0,
  liquidity: /* from live layer */ 0,
  development: /* from live layer */ 0,
  community: /* from live layer */ 0,
  documentation: /* from live layer */ 0,
});
```

`computeQualityScore` only performs the weighted average — it never invents
a value for a factor it wasn't given.

---

## Naming conventions

- **File name**: kebab-case, matches `id`/`slug` — `data/projects/seed/aerodrome-finance.ts`.
- **Export name**: camelCase version of the file name — `export const aerodromeFinance`.
- **`id` and `slug`**: kebab-case, identical to the file name, and stable forever once shipped (other parts of the app may reference a project by this string).

## How to add a project

1. Create `data/projects/seed/<slug>.ts` exporting a single `const <camelCaseSlug>: Project = { ... }`.
2. Fill in every required field. Leave optional fields (`logoUrl`, `github`, `contracts`, provider IDs, and the PR-037 `lifecycle`/`verificationLevel`/`qualityScore` fields) out entirely rather than guessing.
3. Register the new project in `data/projects/seed/index.ts`: add the import and append the const to the `SEED_PROJECTS` array.
4. Run `npx tsc --noEmit` to confirm the shape is valid.

### Contracts policy

`contracts` defaults to `[]`. Only add an entry when the address is a
canonical, publicly-published deployment you are highly confident about (for
example, USDC's official native Base contract). A wrong address in a registry
that claims to be "verified" is actively harmful — when in doubt, leave it
out and note the gap instead.

### Social links policy

- `twitter` and `github` are populated on a best-effort basis — low stakes if a handle is slightly stale, and easy to correct later.
- `discord` and `telegram` are intentionally omitted for every seed project. Invite links rotate and expire, so a hardcoded link is likely to go dead; they're left out entirely rather than shipped with a broken value.

## How provider IDs work

`providerIds` holds the lookup keys that a **future** live-data provider layer
will use to fetch market/chain data. Nothing in `data/projects/` calls any of
these APIs — this is pure, static metadata that prepares the registry for
that integration.

| Field                     | Used by     | Notes                                              |
| ------------------------- | ----------- | --------------------------------------------------- |
| `coingeckoId`              | CoinGecko   | The `id` slug from CoinGecko's `/coins/list`.        |
| `dexscreenerChainId`       | DexScreener | Chain identifier (e.g. `"base"`).                    |
| `dexscreenerPairAddresses` | DexScreener | Known pair addresses to query directly, if any.      |
| `defillamaSlug`            | DefiLlama   | Protocol slug from DefiLlama's protocol list.        |
| `blockscoutAddress`        | Blockscout  | Primary contract address to look up on Base Blockscout. |
| `baseRpcAddress`           | Base RPC    | Address for direct on-chain reads via Base RPC.       |

A project may leave any of these `undefined` if the corresponding provider
doesn't track it (e.g. a naming service like Basenames has no CoinGecko
listing). GitHub metadata (`github.owner`/`github.repo`) doubles as the
identifier the future GitHub activity provider will use — no separate field
is needed for it.

## Helpers (`data/projects/helpers.ts`)

- `getProjects()` — the full registry, in seed order.
- `getProject(idOrSlug)` — a single project by `id` or `slug`, or `undefined`.
- `getProjectsByCategory(category)`
- `getProjectsByTag(tag)`
- `getProjectsByVerificationStatus(status)`
- `searchProjects(query)` — case-insensitive match across name, short description, tags, and categories. Returns `[]` for a blank query.

### PR-037 additions

- `computeRegistryMetrics(projects, now?)` (`data/projects/metrics.ts`) — derives `RegistryMetrics` from real data; see "Registry Metrics" above.
- `computeMetadataCompletenessFactor(project)` (`data/projects/quality-score.ts`) — the one quality factor computable today; see "Quality Score" above.
- `computeQualityScore(factors, now?)` (`data/projects/quality-score.ts`) — weighted composite from a fully-supplied factor set.

## Explicitly out of scope for this layer

- Fetching from CoinGecko, DexScreener, DefiLlama, Blockscout, GitHub, Farcaster, or Base RPC.
- Live prices, TVL, volume, or any other time-varying market data.
- Any UI components or dashboard wiring.
- **(PR-037)** An automated discovery/ingestion pipeline that actually populates `lifecycle`/`verificationLevel` — this PR defines the model and the shape only.
- **(PR-037)** The five live-data quality-score factors (security, activity, liquidity, development, community) — the model and weights are defined; computing them requires the intelligence/provider layer.
- **(PR-037)** Any Projects page UI surfacing `RegistryMetrics` or `ProjectQualityScore` — no route or component changes were made in this PR.

These are intentionally deferred to a future provider/ingestion layer that
will consume `providerIds`/`DiscoverySource` from this registry, and to a
future dashboard PR that will surface `RegistryMetrics`/`ProjectQualityScore`
in the UI.
