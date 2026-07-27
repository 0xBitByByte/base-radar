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
  validation.ts    Registry Validation Utility — validateRegistry() (PR-051 final polish)
  coverage.ts      Registry/Provider Coverage Report — computeRegistryCoverage() (PR-051 final polish)
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

### Contracts policy

`contracts` defaults to `[]`. Only add an entry when the address is a
canonical, publicly-published deployment you are highly confident about (for
example, USDC's official native Base contract). A wrong address in a registry
that claims to be "verified" is actively harmful — when in doubt, leave it
out and note the gap instead.

### Social links policy

- `twitter` and `github` are populated on a best-effort basis — low stakes if a handle is slightly stale, and easy to correct later.
- `discord` and `telegram` are intentionally omitted for every seed project. Invite links rotate and expire, so a hardcoded link is likely to go dead; they're left out entirely rather than shipped with a broken value.

---

## Field Reference

Every field on `Project`, what it's *for*, which provider(s) actually
consume it (via `lib/intelligence/sources.ts`'s `matchX` functions), whether
it's required, its expected format, and a real example drawn from the
current registry. "Consumed by" names the real matching function — if a
field isn't named there, nothing in the Provider Layer reads it yet (it may
still be used for display, search, or a future provider).

### Identity & copy

| Field | Purpose | Required? | Format | Example |
| --- | --- | --- | --- | --- |
| `id` | Stable internal identifier. Never renamed once shipped — Alert Engine, Timeline, and Watchlist references all key off this string. | Required | kebab-case | `"aerodrome-finance"` |
| `slug` | URL-facing identifier. Kept as a separate field so routing could diverge from `id` in principle, but by convention always identical to it (see "Naming conventions"). | Required | kebab-case, matches `id` | `"aerodrome-finance"` |
| `name` | Display name shown everywhere in the UI. | Required | Free text | `"Aerodrome Finance"` |
| `shortDescription` | One sentence (~≤80 chars), used in cards/lists/search results. | Required | Free text, one sentence | `"The central liquidity hub and ve(3,3) AMM for Base."` |
| `description` | A few sentences of neutral, factual detail, used on the Project Profile. | Required | Free text, 2-4 sentences | See any seed file |
| `logoUrl` | Project logo/icon. Not yet populated for any seed project — the UI falls back to a generated avatar. | Optional | Absolute image URL | *(unset today)* |
| `websiteUrl` | Official site link. | Required | `https://` URL | `"https://aerodrome.finance"` |

### Classification

| Field | Purpose | Required? | Format | Example |
| --- | --- | --- | --- | --- |
| `categories` | Primary sector taxonomy — drives Explorer filtering. See "Category taxonomy" below. Must be non-empty. | Required (≥1) | `ProjectCategory[]` | `["dex", "yield"]` |
| `tags` | Narrower, narrative descriptors layered on top of categories. May be empty. | Optional | `ProjectTag[]` | `["base-native", "real-yield"]` |
| `status` | The real-world product's operational state (`live`/`beta`/`development`/`deprecated`/`sunset`). | Required | `ProjectStatus` | `"live"` |
| `chains` | Every chain the project is deployed on. Any `contracts[].chain` must appear here too (enforced by `validateRegistry`). | Required (≥1) | `Chain[]` | `["base"]` |

### On-chain data

| Field | Purpose | Consumed by | Required? | Format | Example |
| --- | --- | --- | --- | --- | --- |
| `contracts` | Registered on-chain contracts. Feeds the Contracts section, the widened Blockscout verification match (PR-051), and — for a `type: "token"` entry on `chain: "base"` — the direct DexScreener pair lookup (PR-051). Defaults to `[]`; only add an entry you're highly confident is the canonical, publicly-published deployment (see "Contracts policy"). | Blockscout (`matchVerifiedContract`), DexScreener (`matchTrading`) | Optional (defaults `[]`) | `{chain, address, type, label?}[]` | `{chain: "base", address: "0x9401...8631", type: "token", label: "AERO token (Base)"}` |
| `contracts[].chain` | Which chain this specific contract lives on. | — | Required per entry | One of `Chain` | `"base"` |
| `contracts[].address` | The contract's address. | — | Required per entry | `0x` + 40 hex chars | `"0x940181a94a35a4569e4529a3cdfb74e38fd98631"` |
| `contracts[].type` | What kind of contract this is. | — | Required per entry | One of `ContractType` | `"token"` |
| `contracts[].label` | Human-readable label shown next to the address. | — | Optional | Free text | `"AERO token (Base)"` |

### GitHub

| Field | Purpose | Consumed by | Required? | Format | Example |
| --- | --- | --- | --- | --- | --- |
| `github` | Repo reference for real engineering-activity data — stars, forks, releases, commit activity, contributors. **A `repo` is required for any of this to resolve** — `matchGithub` explicitly refuses an org-only reference (`{owner}` with no `repo`), a real gap PR-051 found on half the registry's GitHub-configured projects and fixed by resolving each to a specific repo. | GitHub (`matchGithub`) | Optional | `{owner, repo?, url}` | `{owner: "aerodrome-finance", repo: "contracts", url: "https://github.com/aerodrome-finance/contracts"}` |
| `github.owner` | GitHub org or username. | — | Required if `github` is set | GitHub username/org rules (alphanumeric, single hyphens) | `"aerodrome-finance"` |
| `github.repo` | Specific repo name. **Omitting this makes the whole reference non-functional for live data** — only do so if you genuinely can't identify one confident, official repo. | — | Optional, but functionally required | GitHub repo-name rules | `"contracts"` |
| `github.url` | Full URL, must match `owner`/`repo` exactly (`https://github.com/{owner}` or `https://github.com/{owner}/{repo}`). | — | Required if `github` is set | `https://github.com/...` URL | `"https://github.com/aerodrome-finance/contracts"` |

### Social

| Field | Purpose | Required? | Format | Notes |
| --- | --- | --- | --- | --- |
| `social.twitter` | X/Twitter profile link. | Optional | `https://` URL | Best-effort; low stakes if stale. |
| `social.discord`, `social.telegram` | Community invite links. | Optional | `https://` URL | **Intentionally omitted for every current seed project** — invite links rotate/expire; a hardcoded one is likely to go dead. Leave unset rather than ship a broken link. |
| `social.farcaster`, `.docs`, `.blog`, `.forum`, `.medium`, `.mirror`, `.linkedin` | Additional official links, when known. | Optional | `https://` URL | Populate only when confirmed official. |

### Verification & registry state

| Field | Purpose | Required? | Format | Example |
| --- | --- | --- | --- | --- |
| `verification` | Base Radar's own editorial trust in this entry's *metadata* — unrelated to on-chain "verified contract" status. | Required | `{status, verifiedAt?, source?, notes?}` | `{status: "verified", source: "Base Radar review"}` |
| `verification.status` | `"verified"` \| `"community"` \| `"unverified"` \| `"flagged"` — see "Verification status" above. | Required | `VerificationStatus` | `"verified"` |
| `lifecycle` | **PR-037.** Registry-record lifecycle, independent of `status`/`verification` — see "PR-037 — Project Lifecycle". Omitted entirely for a normal active entry. | Optional | `ProjectLifecycle` | *(unset for every current seed project)* |
| `verificationLevel` | **PR-037.** Pipeline progress toward full live-data coverage — see "PR-037 — Verification Levels". | Optional | `ProjectVerificationLevel` | *(unset for every current seed project)* |
| `qualityScore` | **PR-037.** Composite 0-100 score. Always computed, never hand-authored — never set this by hand in a seed file. | Optional, computed only | `ProjectQualityScore` | *(unset for every current seed project)* |

### `providerIds` — live-data lookup keys

`providerIds` holds the identifiers `lib/intelligence/sources.ts` uses to
join a registry entry against a live provider response. Every field is
optional — a project leaves one `undefined` when the corresponding provider
genuinely doesn't track it (e.g. Basenames has no CoinGecko listing), never
when it's simply unverified yet (in that case, verify it, per "How to
verify an identifier" below, or leave it out and note the gap).

| Field | Used by | Purpose | Format | Example |
| --- | --- | --- | --- | --- |
| `coingeckoId` | Price, 24h/7d/30d change, Market Cap, FDV, Volume (fallback), Supply, ATH/ATL, genesis date | The coin's real REST API `id` — **not necessarily the same as the URL slug on coingecko.com** (Moonwell's URL is `/coins/moonwell` but its real API id is `moonwell-artemis`; see docs/PR-051_REGISTRY_COMPLETION_REPORT.md §3 for the bug this caused before it was caught). Always confirm the id shown directly on the coin's own page, not the URL. | Lowercase kebab-case | `"aerodrome-finance"` |
| `defillamaSlug` | TVL, TVL 7d/30d change, protocol category | DefiLlama's protocol slug. | Lowercase kebab-case | `"aerodrome-finance"` |
| `dexscreenerChainId` | DexScreener trading-pair chain filter | Which chain to filter DexScreener results to (defaults to `"base"` if unset). Only meaningful when this project also has a `contracts[chain=base,type=token]` entry or `dexscreenerPairAddresses` — otherwise it has nothing to filter (`validateRegistry` flags this as `dexscreener-chain-id-without-target`). | Chain identifier string | `"base"` |
| `dexscreenerPairAddresses` | Liquidity, Volume 24h, DEX pool list (legacy path) | Specific LP pair addresses to search for directly. Superseded in practice by registering a `contracts[type=token]` entry instead (PR-051's direct token-address lookup is more reliable — it isn't limited to "currently trending" pairs the way this keyword-search-based path is), but still supported for a project with a known pair and no clean token-contract mapping. | `0x` + 40 hex chars, array | `["0xabc...123"]` |
| `blockscoutAddress` | Contract verification (heuristic match) | Primary address to check against Blockscout's bulk "most-recently-verified-on-Base" result. Should match one of `contracts[]`'s addresses when both are set. | `0x` + 40 hex chars | `"0x940181a94a35a4569e4529a3cdfb74e38fd98631"` |
| `baseRpcAddress` | *(reserved — not read by any matcher today)* | Documented, real future use: a direct Base RPC read (e.g. `eth_getBalance`) for a metric not yet built. See docs/PR-051_REGISTRY_COMPLETION_REPORT.md §6/§10. Do not populate speculatively — wait until a real consumer exists. | `0x` + 40 hex chars | *(unset on every current seed project)* |

### Governance

| Field | Purpose | Consumed by | Required? | Format | Example |
| --- | --- | --- | --- | --- | --- |
| `governance` | Real Snapshot governance space, if one exists. Omit entirely rather than guess — `lib/governance` skips a project with no `governance` field rather than fabricating proposal data. | Snapshot (`lib/governance`) | Optional | `{snapshotSpace?, governanceType?, governanceUrl?}` | `{snapshotSpace: "aave.eth", governanceType: "snapshot", governanceUrl: "https://snapshot.org/#/aave.eth"}` |
| `governance.snapshotSpace` | Real, verified Snapshot.org space id. **Always verify with a live query before adding** (see "How to verify an identifier") — a plausible-looking guess (e.g. `"projectname.eth"`) is often wrong or belongs to an unrelated space. | Governance, Proposals, Voting | Required if `governance` is set | Snapshot space id (usually ENS-style) | `"aave.eth"` |
| `governance.governanceType` | Always `"snapshot"` today — the only implemented governance provider. Should be set whenever `snapshotSpace` is. | — | Required if `snapshotSpace` is set | Literal `"snapshot"` | `"snapshot"` |
| `governance.governanceUrl` | Direct link to the space. | — | Optional | `https://` URL | `"https://snapshot.org/#/aave.eth"` |

---

## Registry Validation & Coverage Tools

Two pure, static-analysis modules exist specifically so a bad registry edit
is caught mechanically instead of silently shipping (see
docs/PR-051_REGISTRY_COMPLETION_REPORT.md's own real example: an undetected
`coingeckoId` typo that could never have matched CoinGecko's actual API).
Neither makes a network call — both operate purely on the `Project[]`
already compiled into the app.

### `data/projects/validation.ts` — `validateRegistry(projects)`

Runs every seed project (and, if you want to check a candidate before
adding it, any project list you pass in) through a fixed set of checks and
returns a `RegistryValidationReport`:

```ts
type RegistryValidationReport = {
  issues: ValidationIssue[];
  errors: ValidationIssue[];    // must be empty for the registry to be considered valid
  warnings: ValidationIssue[];  // real, worth a look, never blocking
  valid: boolean;               // errors.length === 0
};
```

What it checks:

- **Duplicates** (error): `id`, `slug`, `coingeckoId`, `defillamaSlug`, `snapshotSpace`, GitHub `owner/repo`, contract addresses (any type), and token-typed contract addresses specifically.
- **Format** (error/warning): GitHub owner/repo/url consistency, CoinGecko/DefiLlama id casing, Snapshot space characters, `0x` + 40-hex address shape (contracts, `blockscoutAddress`, `baseRpcAddress`, `dexscreenerPairAddresses`), every URL field (`websiteUrl`, `github.url`, `social.*`, `governance.governanceUrl`), `contracts[].chain`/`contracts[].type` against the real enums.
- **Missing required data** (error): empty `name`/`shortDescription`/`description`, empty `categories`/`chains`.
- **Orphaned config** (warning): a `dexscreenerChainId` with no pair addresses or token contract to filter; a `blockscoutAddress` that doesn't match any registered contract.
- **Conflicting metadata** (error/warning): `lifecycle.state: "duplicate"`/`"migrated"` without its required target field; `governance.governanceType: "snapshot"` without a `snapshotSpace` (or vice versa); a `contracts[].chain` not present in the project's own `chains`; `verificationLevel.level` at `"verified"`/`"intelligence-ready"` while `verification.status` is `"unverified"`/`"flagged"` (a real signal worth a re-review per "PR-037 — Verification Levels" above, not a hard error).

Run it directly:

```bash
npm run registry:validate
```

This runs `tests/data/projects/validation.test.ts`, which asserts
`report.errors` is empty against the real registry and prints the full
human-readable report (`formatValidationReport`) either way. It also runs
as part of `npm test`/CI like any other test — a broken seed-file edit
fails the build the same way a broken component would.

### `data/projects/coverage.ts` — `computeRegistryCoverage(projects)`

Computes, per project, how many of 8 real coverage dimensions are actually
configured — **not** whether the live provider currently responds (that
requires a network call this pure module never makes), but whether the
registry has given the Provider Layer enough to *try*:

| Dimension | True when |
| --- | --- |
| GitHub | `github.repo` is set (an org-only reference doesn't count — mirrors `matchGithub`'s own rule) |
| CoinGecko | `providerIds.coingeckoId` is set |
| DefiLlama | `providerIds.defillamaSlug` is set |
| DexScreener | a `contracts[chain=base,type=token]` entry exists, or `dexscreenerPairAddresses` is set — mirrors `matchTrading`'s two real paths |
| Snapshot | `governance.snapshotSpace` is set |
| Contracts | `contracts.length > 0` |
| Token Address | at least one `contracts[].type === "token"` entry exists |
| Blockscout | `providerIds.blockscoutAddress` is set, or any `contracts[chain=base]` entry exists — mirrors the PR-051-widened `matchVerifiedContract` |

`computeProjectCoverage(project)` returns one project's `coveragePct`
(0-100, rounded); `computeRegistryCoverage(projects)` returns every
project's coverage plus registry-wide statistics (`averageCoveragePct`,
`highest`, `lowest`, `dimensionAvailabilityPct`); `computeProviderCoverage(report)`
reshapes the same data provider-by-provider (configured/missing count and
coverage % per dimension, plus Base RPC — always 100% today, since
`matchNetwork` only requires `"base"` in `chains`, no separate identifier).

Run it directly:

```bash
npm run registry:coverage
```

This runs `tests/data/projects/coverage.test.ts`, printing both the
per-project report (`formatCoverageReport`) and the provider-centric
summary (`formatProviderCoverageReport`) — reproducible on demand any time
registry data changes, never a stale, hand-maintained snapshot.

---

## Adding a New Project — Checklist

1. **Required fields** — fill in `id`, `slug` (identical to `id`), `name`, `shortDescription`, `description`, `websiteUrl`, `categories` (≥1), `status`, `chains` (≥1), `contracts` (may be `[]`), `social` (may be `{}`), `verification.status`, `providerIds` (may be `{}`).
2. **Optional fields** — leave `logoUrl`, `github`, non-empty `contracts`, any `providerIds` key, `governance`, `lifecycle`, `verificationLevel`, and `qualityScore` out entirely rather than guessing a plausible-looking value. An absent field is an honest "we don't know"; a wrong one is actively worse than that.
3. **How to verify an identifier** (never guess — confirm against the real, live source immediately before writing it):
   - **CoinGecko**: open `coingecko.com/en/coins/<candidate-id>` and read the page's own "API ID" field (shown in the Info panel) — this is what `/coins/markets` actually returns as `id`, and it is **not always the same as the URL slug**. Also confirm the "About" text genuinely describes this project (a ticker or slug can collide with a completely unrelated coin — see Clanker's seed file for a real example that was caught this way).
   - **DefiLlama**: confirm the protocol appears at `defillama.com/protocol/<candidate-slug>` and the TVL figures make sense for this project.
   - **GitHub**: visit `github.com/<owner>` and pick the org's real, pinned/most-starred repo that actually contains the contracts/protocol code — never leave `repo` unset if a specific one can be identified (an org-only reference is functionally inert, see the `github` field reference above).
   - **Snapshot**: query `hub.snapshot.org/graphql` directly for the candidate space id and confirm it returns real, on-topic, recently-created proposals — a space existing with a plausible name is not sufficient confirmation on its own.
   - **Contract addresses**: cross-reference at least two independent sources (e.g. CoinGecko's own "Contract" panel *and* its linked block-explorer page) before adding an entry to `contracts` or `providerIds.blockscoutAddress`.
4. **Accepted data sources**: official project documentation, the project's official GitHub, the project's official website, the relevant chain's official explorer (Basescan/Blockscout), Snapshot's own GraphQL API, CoinGecko, DefiLlama, and the Base ecosystem's own official references. Third-party aggregators, social-media claims, or "looks right" pattern-matching are not sufficient on their own.
5. **Common mistakes** (all real, all caught during PR-050/PR-051):
   - Using a CoinGecko URL slug instead of its real API `id` (Moonwell — see the `coingeckoId` field reference above).
   - Assuming a plausible ticker/slug match is the right project without reading its actual description (Clanker's CoinGecko id collided with an unrelated Solana meme token).
   - Adding a `github` reference with only `owner` set — this can never resolve any live data; always find the specific `repo`.
   - Setting `dexscreenerChainId` without also registering a `contracts[type=token]` entry or `dexscreenerPairAddresses` — the field then has nothing to filter (`validateRegistry` catches this).
   - Letting `github.url` drift out of sync with `github.owner`/`github.repo` after an edit.
   - Guessing a Snapshot space name pattern (`projectname.eth`) instead of confirming it resolves to real proposals for *this* project.
6. **Validation workflow**:
   1. Create `data/projects/seed/<slug>.ts` exporting a single `const <camelCaseSlug>: Project = { ... }`.
   2. Register it in `data/projects/seed/index.ts` (import + append to `SEED_PROJECTS`).
   3. Run `npx tsc --noEmit` to confirm the shape compiles.
   4. Run `npm run registry:validate` — must show zero errors before the change is considered done. Review any warnings; fix or knowingly accept each one.
   5. Run `npm run registry:coverage` to see the new project's coverage breakdown and confirm it matches what you actually configured.
   6. Run `npm run lint`, `npx tsc --noEmit`, and `npm run build` one more time (per this repo's standard PR validation gate).

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

### PR-051 additions (final polish)

- `validateRegistry(projects)` / `formatValidationReport(report)` (`data/projects/validation.ts`) — see "Registry Validation & Coverage Tools" above.
- `computeProjectCoverage(project)` / `computeRegistryCoverage(projects)` / `computeProviderCoverage(report)` / `formatCoverageReport(report)` / `formatProviderCoverageReport(report, projects)` (`data/projects/coverage.ts`) — see "Registry Validation & Coverage Tools" above.

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
