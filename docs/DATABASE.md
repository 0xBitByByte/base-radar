# Database

Base Radar has a real database as of [Release 1: Platform
Foundation](PRODUCT_BIBLE/07_ENGINEERING_ROADMAP.md#release-1-platform-foundation)'s
Phase C (see [Release 1 Phase C: Backend Foundation](#release-1-phase-c-backend-foundation)
below) — but it is not yet the database anything in the running app
actually uses; `lib/backend/registry.ts` still defaults to the local-only
backend, unchanged. This document has three purposes: to record how data
is actually modeled and stored right now (plain TypeScript, in-memory,
file-based, plus the one real SQLite database described below), to
describe that real database precisely, and to sketch the PostgreSQL
schema, caching strategy, and relationships that would be introduced for
everything Phase C did not yet build (Project Registry persistence,
provider caching, analytics, and — until Phase D adds real authentication
— every account-scoped table beyond its bare schema).

Everything under "Future" is **architectural planning only** — none of it
is implemented, and nothing here should be read as scheduled work. It
exists so a future implementation has a documented starting point instead
of starting from zero. This does **not** apply to [Release 1 Phase C:
Backend Foundation](#release-1-phase-c-backend-foundation) below, which
describes real, tested, already-implemented code.

## Current Data Model

There is no database dependency in `package.json` — no Prisma, no `pg`, no
ORM, no query client of any kind. Three independent, unrelated data models
exist today, none backed by a real database:

1. **The Project Registry** (`data/projects/`) — static data, checked into
   version control as TypeScript source files, loaded into memory at build
   time like any other module. This is Base Radar's closest thing to a
   "database" today: it has a schema, a stable identity per row, and query
   helpers — it just has no storage engine, no writes at runtime, and no
   query language beyond plain array methods.
2. **Dashboard data** (`lib/data/`) — not stored anywhere. Each request
   either fetches live data from an external API (cached only at the HTTP
   layer, see [Caching Strategy](#caching-strategy)) or falls back to a
   typed mock constant compiled into the bundle. Nothing here is a
   candidate for a database in its current form; it's transient,
   read-through data, not state Base Radar owns.
3. **Account, Personalization, Preferences, and Sync state** (`lib/account/`,
   `lib/personalization/`, `lib/notifications/preferences.ts`,
   `lib/search/preferences.ts`, `lib/automation/preferences.ts`,
   `lib/sync/`) — real, structured, versioned, per-device state, but still
   persisted to this browser's own `localStorage`, not the real database
   below — nothing in the running app reads or writes this state through a
   server yet. See [Release 1 Phase C: Backend
   Foundation](#release-1-phase-c-backend-foundation) for the real schema
   this state maps onto, and why Phase C stops short of actually moving it
   there.

## Release 1 Phase C: Backend Foundation

Implemented, not planning. `lib/backend/sqlite/` is a real SQLite database
(via Node's own built-in `node:sqlite` — no new production dependency was
added), assembled into a `Backend` (`lib/backend/types.ts`'s contract) as
`sqliteBackend` and registered — but not activated — in `lib/backend/
registry.ts`. `localBackend` remains the active backend; registering
`sqliteBackend` is a deliberately inert act, exactly like `localBackend`'s
own registration always has been (confirmed: nothing in the app calls
`activeBackend()` yet).

**What's real:**
- **`StorageService`** (`lib/backend/sqlite/storage.ts`) — a genuine
  read/write/remove implementation against a `kv_storage` table
  (`key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TEXT NOT NULL`).
  Validates every key (non-empty, ≤512 characters) before it reaches a
  query, and wraps any real database failure in a generic, safe error
  message — never the driver's own error text or file path.
- **`HealthService`** (`lib/backend/sqlite/health.ts`) — runs a real
  `SELECT 1` against the live connection; a closed or unreachable database
  genuinely reports `healthy: false`, never a fabricated `true`. Exposed at
  `GET /api/health` — the first `app/api/` route this codebase has ever
  had, deliberately narrow (GET-only, no request body, no account data).
- **The full account-scoped schema** — `users`, `accounts`, `watchlists`,
  `watchlist_projects`, `personalization_preferences`,
  `sync_operations_log`, `conflicts` — created and migrated (`lib/backend/
  sqlite/migrations.ts`, migration `0001_initial`), with real foreign-key
  and uniqueness constraints (verified in `tests/lib/backend/sqlite/
  db.test.ts` — e.g. a `watchlists` row referencing a nonexistent
  `accounts.id` genuinely fails to insert). See the table-by-table
  rationale below — it hasn't moved, only its status has: this was Phase
  B's planning text, now built as designed.

**Superseded by Phase D below:** this section originally said
`sqliteBackend.services.account`/`.sync` both throw and no row had ever
been written to `users`/`accounts`/etc. That's no longer true — Phase D
(next section) writes real rows to every one of these tables through
`/api/auth/*`, though still not through `sqliteBackend.services.account`/
`.sync` themselves (see Phase D's own note on why).

**Schema, table by table** (unchanged from Phase B's design, now actually
built):

- `users` — the real authenticated identity Release 1 introduces. A row
  exists only once someone actually signs in; a Guest never gets one —
  Guest state stays entirely local, exactly as it does today.
- `accounts` — one row per authenticated identity, the server-side
  counterpart of today's local `Account`: `name`, `username` (unique),
  `email` (nullable), `avatar` (nullable), `created_at`, `updated_at`,
  `last_active_at`, plus `active_watchlist_id` (nullable FK) for
  `PersonalizationState.activeWatchlistId`.
- `watchlists` — one row per `PersonalWatchlist`: `account_id` (FK),
  `name`, `description`, `icon`, `color`, `pinned`, `created_at`,
  `updated_at`, plus `position` (integer) — today's local model has no
  explicit order field; a relational table needs one to preserve
  `reorderWatchlists()`'s real behavior.
- `watchlist_projects` — join table for `PersonalWatchlist.projectIds`:
  `watchlist_id` (FK), `project_id`, composite PK on both columns.
- `personalization_preferences` — one row per account, mapping
  `PersonalizationPreferences` field-for-field. Deliberately excludes
  Notification/Search/Automation preferences — none has a `SyncAdapter`
  today, so none is in scope for this table.
- `sync_operations_log` — a durable, server-side applied-operations
  record, distinct from the Sync Queue itself (which stays client-local
  `localStorage` even after Phase D — nothing about Release 1 moves the
  offline queue server-side). The client's own `SyncOperation.id` as the
  primary key is what makes a retried push idempotent for free.
- `conflicts` — the durable, cross-device counterpart of today's local
  `ConflictRecord`.

## Release 1 Phase D: Real Authentication

Implemented, not planning. Real SIWE (EIP-4361) wallet sign-in —
`lib/auth/siwe.ts` (built on `viem/siwe`, already a dependency; zero new
packages), four real routes (`/api/auth/{challenge,verify,session,
signout}`), and two new tables added in migration `0002_auth_sessions`:

- `auth_challenges` — `nonce` (PK), `address`, `issued_at`, `expires_at`,
  `consumed_at`. A real, single-use, 5-minute-lived challenge per
  sign-in attempt; `consumed_at` is what makes replay genuinely
  impossible, not just discouraged.
- `sessions` — `id` (PK, an opaque random token — never a JWT or other
  self-verifying token), `account_id` (FK), `created_at`, `expires_at`,
  `revoked_at`. A real, 7-day, server-side-revocable session; sign-out
  sets `revoked_at` and every later validation of that id genuinely
  fails, before its natural expiry.

**What's now real that wasn't before:** `users`, `accounts`, `watchlists`,
`watchlist_projects`, `personalization_preferences`, and
`sync_operations_log` all now have real rows, written by
`lib/backend/sqlite/{accounts,bootstrap}.ts` on a real successful sign-in
(and, for a second device with pre-existing local Guest data against an
already-authenticated address, a real row in `conflicts` instead of a
silent overwrite). `sqliteBackend.services.account`/`.sync`
(`lib/backend/sqlite/index.ts`) still throw, unchanged from Phase C — that
contract is zero-parameter (`getAccount(): Promise<Account>`, no id),
which structurally cannot express "which account" in a real multi-user
backend. Rather than bending the contract, `/api/auth/*` calls
purpose-built, explicitly-scoped functions (`findAccountByAddress`,
`createAccountForAddress`, etc.) directly — see the Phase D report's
Contract Readiness note for the full reasoning.

**Identity anchor:** `users.id` is the lowercased wallet address itself —
a verified SIWE signature *is* the identity; there is no separate
generated id a real address points at.

**Guest → Authenticated migration:** reuses the real
`accountSyncAdapter`/`watchlistSyncAdapter`/`preferencesSyncAdapter`
(`lib/sync/adapters/*`) to validate and describe the migrated Watchlists/
Preferences — the same functions a real future Sync Queue drain would
use — rather than a second, one-off serialization format.

## Release 1 Phase C: Staging Deployment

Implemented, not planning. `node:sqlite`-on-local-disk (Phase C's own
choice — see above) is fundamentally incompatible with ephemeral/
serverless hosting (Vercel's own default `SITE_URL` in `constants/
site.ts` was an unconfigured assumption, never an actual decision — its
serverless functions don't offer a persistent, shared filesystem, which
is exactly what a single-file SQLite database needs). Rather than
migrating the database to solve that, this deploys the existing,
unchanged backend to a host that actually offers persistent local disk:

- **Fly.io**, one Machine (`fly.toml`'s `primary_region`, no horizontal
  scaling), one **Fly Volume** mounted at `/data`. `SQLITE_DB_PATH=/data/
  backend.db` (`fly.toml`'s `[env]`) is the only backend-related
  environment variable this introduces — still not a secret, still just
  a path.
- A Fly Volume attaches to exactly one Machine at a time — this is what
  makes a single SQLite file safe here: concurrent multi-writer
  corruption isn't just unlikely, it's structurally impossible with one
  Machine holding the volume.
- `Dockerfile` builds Next.js's `output: "standalone"` bundle
  (`next.config.ts`) on a **pinned** `node:22.23.1-slim` image — pinned,
  not a floating `22`/`lts` tag, because `node:sqlite` is still an
  experimental Node API; the deployed runtime should be the exact version
  already proven in CI and local dev, not "whatever 22.x is current."
- **Zero changes** to `lib/backend/sqlite/*`, `lib/auth/*`, `app/api/*`,
  or the schema — this section is deployment configuration only.

**Known limitation, explicitly accepted for this stage:** single-instance,
single-region. Scaling beyond one Machine (LiteFS for replicated SQLite,
or a network-accessible database) is a real future decision, not
attempted here.

## Project Registry

The registry is one flat entity type, `Project`, with everything else
nested inside it rather than split into separate stores:

```
Project
 ├─ id, slug, name                     identity
 ├─ shortDescription, description      copy
 ├─ logoUrl, websiteUrl                media / links
 ├─ categories: ProjectCategory[]      enum array (embedded)
 ├─ tags: ProjectTag[]                 enum array (embedded)
 ├─ status: ProjectStatus              enum (embedded)
 ├─ chains: Chain[]                    enum array (embedded)
 ├─ contracts: ProjectContract[]       embedded list — { chain, address, type, label? }
 ├─ github?: GithubRepoRef             embedded, optional — { owner, repo?, url }
 ├─ social: SocialLinks                embedded — { twitter?, discord?, telegram?, farcaster? }
 ├─ verification: ProjectVerification  embedded — { status, verifiedAt?, source?, notes? }
 └─ providerIds: ProjectProviderIds    embedded — { coingeckoId?, dexscreenerChainId?,
                                          dexscreenerPairAddresses?, defillamaSlug?,
                                          blockscoutAddress?, baseRpcAddress? }
```

Enumerated fields (`categories`, `tags`, `status`, `chains`, and
`ProjectContract.type`) are constrained by `as const` tuples in
`data/projects/enums.ts` (`ProjectCategory`, `ProjectTag`, `ProjectStatus`,
`Chain`, `ContractType`, `VerificationStatus`) rather than a database enum
type or a foreign key to a lookup table.

"Storage" is one file per project under `data/projects/seed/*.ts`,
aggregated into a single `SEED_PROJECTS: Project[]` array by
`seed/index.ts`. "Querying" is `data/projects/helpers.ts` — plain
`Array.find`/`filter` over that in-memory array (`getProject`,
`getProjectsByCategory`, `getProjectsByTag`,
`getProjectsByVerificationStatus`, `searchProjects`). There is no query
planner, no index, and no need for one yet: the full registry is ~20 rows
and is read, never written, at runtime.

## Caching Strategy

There is no application-level or database-level cache today. Caching that
exists is entirely Next.js's built-in `fetch` data cache, configured
per-provider in `lib/data/providers/*` via `next: { revalidate: <seconds> }`:

| Provider | Revalidate window |
| --- | --- |
| Base RPC (`baseRpc.ts`) | 20s |
| Blockscout (`blockscout.ts`) | 60s |
| DexScreener (`dexscreener.ts`) | 60s |
| CoinGecko (`coingecko.ts`) | 90s |
| DefiLlama (`defillama.ts`) | 120s |
| GitHub (`github.ts`) | 600s |

One documented exception: DefiLlama's `/protocols` endpoint returns a
multi-megabyte payload too large for Next's data cache, so
`defillama.ts` fetches it with `cache: "no-store"` instead of a revalidate
window — it is deliberately never cached.

The Project Registry needs no caching strategy today: it is static data
compiled into the server bundle, not fetched at request time.

**Future**: if a real database is introduced, the two-tier pattern already
in place (fresh-ish live data over a stable fallback) would extend
naturally into a read-through cache in front of Postgres — e.g. a
short-TTL cache (in-memory or Redis) for provider responses keyed by
project + provider, so repeated dashboard renders don't refetch external
APIs more often than each provider's own revalidate window already allows,
and a longer-TTL or event-invalidated cache for registry reads once the
registry itself moves off static files.

## Future Redis Cache

Planning note, not implemented. A dedicated Redis (or equivalent in-memory
store) layer would most likely sit between the Services Layer and the
Providers Layer — the same seam `aggregate.ts` already owns:

```mermaid
flowchart LR
    Agg["Services Layer<br/>lib/data/aggregate.ts"] --> Cache{Redis cache hit?}
    Cache -->|hit| Return[Return cached value]
    Cache -->|miss| Prov["Providers Layer<br/>lib/data/providers/*"]
    Prov --> Ext[External API]
    Ext --> Write[Write-through to Redis]
    Write --> Return
```

Candidate uses, each independent and adoptable on its own:

- **Provider response cache** — keyed by provider + query params, TTL
  matched to (or slightly longer than) each provider's existing
  `revalidate` window, reducing redundant calls across concurrent requests
  and multiple server instances (Next's `fetch` cache is per-instance;
  Redis would be shared across a horizontally scaled deployment).
- **Rate-limit protection** — a shared cache is the natural place to
  enforce a soft rate limit against providers with strict caps (GitHub's
  60 req/hour unauthenticated limit, see [API.md](API.md#github)), since it
  can coordinate across server instances in a way per-instance `fetch`
  caching cannot.
- **Session/derived-data cache** — once accounts or wallet connect exist
  (see the Portfolio milestone in [ROADMAP.md](ROADMAP.md)), short-lived
  per-user computed data would be a natural fit for Redis rather than
  Postgres.

## Indexes

There are no indexes today, because there is no database. The Project
Registry's only "index" is the in-memory array itself; a linear scan over
~20 items has no meaningful cost.

**Future** — once the registry moves to PostgreSQL, the natural indexes
follow directly from the current query helpers:

| Index | Backs |
| --- | --- |
| Unique index on `projects.slug` | `getProject(idOrSlug)` |
| Unique index on `projects.id` (or use `id` as primary key) | `getProject(idOrSlug)` |
| GIN index on `project_categories.category` | `getProjectsByCategory()` |
| GIN index on `project_tags.tag` | `getProjectsByTag()` |
| Index on `project_verifications.status` | `getProjectsByVerificationStatus()` |
| Full-text (`tsvector`) index on `name`, `short_description` | `searchProjects()` |

## Relationships

Today, there are no relationships in the database sense — everything lives
inside a single `Project` object, and "related" data (contracts, GitHub
ref, social links, verification, provider ids) is embedded, not joined.

**Future** — normalizing `Project` into PostgreSQL would turn several of
its embedded arrays/objects into related tables:

```
projects (1) ──< project_contracts        (one project, many contracts)
projects (1) ──< project_categories        (many-to-many via join table)
projects (1) ──< project_tags              (many-to-many via join table)
projects (1) ── project_verification       (one-to-one)
projects (1) ── project_provider_ids       (one-to-one)
projects (1) ──< project_github            (one-to-one, optional)
```

`categories` and `tags` would most likely become proper many-to-many
relationships (`project_categories` / `project_tags` join tables against
small lookup tables mirroring today's `PROJECT_CATEGORIES` /
`PROJECT_TAGS` enums), preserving the "closed vocabulary" property the
current `as const` tuples enforce at the type level.

```mermaid
erDiagram
    PROJECTS ||--o{ PROJECT_CONTRACTS : has
    PROJECTS ||--o{ PROJECT_CATEGORIES : "tagged with"
    PROJECTS ||--o{ PROJECT_TAGS : "tagged with"
    PROJECTS ||--|| PROJECT_VERIFICATION : has
    PROJECTS ||--|| PROJECT_PROVIDER_IDS : has
    PROJECTS ||--o| PROJECT_GITHUB : has

    PROJECTS {
        string id PK
        string slug
        string name
        string status
    }
    PROJECT_CONTRACTS {
        string project_id FK
        string chain
        string address
        string type
    }
    PROJECT_VERIFICATION {
        string project_id FK
        string status
        string verified_at
        string source
    }
    PROJECT_PROVIDER_IDS {
        string project_id FK
        string coingecko_id
        string defillama_slug
        string blockscout_address
    }
```

## Future Search Index

Planning note. `searchProjects()` today is a linear, in-memory substring
match over ~20 rows (see [API.md](API.md#registry-api--dataprojectshelpersts))
— adequate at the current registry size, but not something that scales to
a large registry or to fuzzy/typo-tolerant search, both of which the
planned Projects Explorer milestone (see [ROADMAP.md](ROADMAP.md)) would
need.

Two upgrade paths, in increasing order of capability:

- **PostgreSQL full-text search** (`tsvector`/`tsquery`, already listed
  under [Indexes](#indexes)) — the smallest step up, no new infrastructure
  beyond the planned Postgres database itself. Sufficient for
  keyword-style search over name/description/tags.
- **A dedicated search engine** (e.g. Meilisearch, Typesense, or
  Elasticsearch/OpenSearch) — worth considering only if search needs grow
  beyond what Postgres full-text search comfortably handles (typo
  tolerance, faceted filtering by category/tag/chain at scale, ranking
  tuned independently of the primary datastore).

No decision has been made between these — Postgres full-text search is the
lower-risk default until there's a concrete reason to run a second
datastore just for search.

## Future Vector Database

Planning note, tied to the AI Research pillar in
[PRODUCT_VISION.md](PRODUCT_VISION.md#product-pillars). A vector database
(or a vector extension on Postgres, e.g. `pgvector`) would only become
relevant once Base Radar needs **semantic** rather than keyword matching —
for example:

- Finding projects "similar to X" by embedding `shortDescription` /
  `description` rather than matching on shared tags/categories.
- Powering a natural-language research assistant over the Project
  Registry and Intelligence Engine output (see
  [ARCHITECTURE.md](ARCHITECTURE.md#future-intelligence-engine)).

This is speculative and has no concrete design yet — it is listed here
because it's a predictable next step for the AI Research milestone in
[ROADMAP.md](ROADMAP.md), not because any embedding pipeline exists today.

## Future Analytics Database

Planning note. Every value the dashboard shows today (TVL, gas, KPIs,
signals) is a **current snapshot** — nothing is persisted over time, so
there is no way to answer "what was TVL yesterday" from Base Radar itself
(historical sparklines in `lib/data/mock.ts` are illustrative mock data,
not stored history). A future analytics store would change that:

- **Likely shape**: a time-series-oriented store (e.g. TimescaleDB as a
  Postgres extension, or a dedicated columnar store like ClickHouse if
  volume grows beyond what Postgres comfortably handles) recording periodic
  snapshots of KPI/TVL/signal values keyed by timestamp.
- **Would power**: real historical sparklines (replacing today's mock
  `SparklinePoint[]` data with real series), trend analysis in the
  Intelligence Engine, and the Signals & Alerts milestone's need to detect
  a *change* over time rather than a single point-in-time read.
- **Relationship to caching**: distinct from the Redis cache above — a
  cache stores the *latest* value for a short time; an analytics database
  would durably store *every* observed value for historical analysis.

## Future Tables

Speculative table list, grouped by what part of the product it would
support — grounded in the milestones already named in
[ROADMAP.md](ROADMAP.md) and [PRODUCT_VISION.md](PRODUCT_VISION.md), not
invented beyond them:

**Project Registry (normalized)**
- `projects` — core identity/copy fields, replacing `data/projects/seed/*.ts`
- `project_contracts` — one row per `ProjectContract`
- `project_categories`, `project_tags` — join tables against enum lookup tables
- `project_verifications` — one row per project's `ProjectVerification`
- `project_provider_ids` — one row per project's `ProjectProviderIds`

**Provider Layer / Aggregator (planned milestones)**
- `provider_cache` — durable cache of last-known-good provider responses per
  project, so a registry entry can show a "last known" value instead of
  falling back to generic mock data when a provider is briefly down

**Portfolio (planned milestone)**
- `wallets` — wallet addresses linked to an account, replacing `getPortfolioSummary()`'s mock data
- `wallet_holdings` — cached balance snapshots per wallet

**Signals & Alerts (planned milestones)**
- `signals_history` — persisted signal events, superseding the in-memory-only `Signal[]` shape
- `alert_rules` — user-configured alert conditions
- `alert_deliveries` — sent-alert log, for dedupe and history

**Account, Sync & Personalization** — no longer planning text. This
section used to sketch `users`/`accounts`/`watchlists`/etc. as future
tables; they're real now — see [Release 1 Phase C: Backend
Foundation](#release-1-phase-c-backend-foundation) above for the
implemented schema, which is unchanged from what this section used to
describe.

Everything else below — Project Registry normalization, the provider
cache, Portfolio, and Signals & Alerts tables — remains genuinely
unimplemented. They are listed here strictly as a planning reference for
how today's typed shapes (`Project`, `PortfolioSummary`, `Signal`, etc.)
would map onto relational storage if and when Base Radar needs one.
