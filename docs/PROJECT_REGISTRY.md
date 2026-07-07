# Project Registry

The Project Registry is the canonical, statically-defined list of Base ecosystem
projects that powers Base Radar. It contains **metadata only** — no prices, TVL,
volume, or other live market data. Live data is layered on top of this registry
by provider modules that consume the identifiers stored here.

## Folder structure

```
data/projects/
  enums.ts        Shared string-literal enums (categories, tags, status, chains, ...)
  types.ts        The `Project` type and its supporting sub-types
  helpers.ts       Read/query helpers (getProject, searchProjects, ...)
  index.ts         Public barrel export — import from here
  seed/
    index.ts       Aggregates every seed file into SEED_PROJECTS
    <slug>.ts       One file per project (e.g. aerodrome-finance.ts)
```

Consumers should import from `@/data/projects` (the barrel), not from the
individual files inside it. The barrel re-exports the enums, the `Project`
type, the helper functions, and the full list as `PROJECTS`.

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
| `categories`    | `ProjectCategory[]`      | See enums below. A project may have more than one. |
| `tags`          | `ProjectTag[]`           | Free-form-but-controlled descriptors.              |
| `status`        | `ProjectStatus`          | Lifecycle state (`live`, `beta`, ...).             |
| `chains`        | `Chain[]`                | Every chain the project is deployed on.            |
| `contracts`     | `ProjectContract[]`      | See "Contracts" policy below — usually empty.      |
| `github`        | `GithubRepoRef?`         | Optional org/repo reference.                       |
| `social`        | `SocialLinks`            | Optional handles (see "Social links" policy).       |
| `verification`  | `ProjectVerification`    | How confident the registry is in this entry.       |
| `providerIds`   | `ProjectProviderIds`     | Lookup keys for future live-data providers.        |

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

The six enums are: `ProjectCategory`, `ProjectTag`, `ProjectStatus`,
`VerificationStatus`, `Chain`, `ContractType`. See the doc comments in
`enums.ts` for the meaning of each individual value.

### Verification status

`verification.status` describes how much the **registry** vouches for the
metadata itself — it is unrelated to on-chain "verified contract" status.

- `verified` — Base Radar reviewed the entry directly against primary sources.
- `community` — sourced from a Base ecosystem directory/listing, not independently confirmed by Base Radar.
- `unverified` — recently added or self-reported, not yet reviewed.
- `flagged` — a known issue exists with this entry; kept for transparency rather than deleted.

## Naming conventions

- **File name**: kebab-case, matches `id`/`slug` — `data/projects/seed/aerodrome-finance.ts`.
- **Export name**: camelCase version of the file name — `export const aerodromeFinance`.
- **`id` and `slug`**: kebab-case, identical to the file name, and stable forever once shipped (other parts of the app may reference a project by this string).

## How to add a project

1. Create `data/projects/seed/<slug>.ts` exporting a single `const <camelCaseSlug>: Project = { ... }`.
2. Fill in every required field. Leave optional fields (`logoUrl`, `github`, `contracts`, provider IDs) out entirely rather than guessing.
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

## Explicitly out of scope for this layer

- Fetching from CoinGecko, DexScreener, DefiLlama, Blockscout, GitHub, or Base RPC.
- Live prices, TVL, volume, or any other time-varying market data.
- Any UI components or dashboard wiring.

These are intentionally deferred to a future provider layer that will consume
`providerIds` from this registry.
