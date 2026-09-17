# Deployment & Operations Runbook

PR-097.06 (Production Readiness). This is the one document that answers
"how do I deploy this, and what do I do if it breaks" — everything here
describes real, already-implemented behavior (confirmed by reading the
actual code/config, not aspirational). For the database's own schema and
architecture, see [`DATABASE.md`](DATABASE.md); for the CSP/security
header set, see [`MASTER_ROADMAP.md`](MASTER_ROADMAP.md)'s PR-097.05
section.

## Architecture at a glance

One Fly.io Machine (`fly.toml`'s `primary_region`, no horizontal scaling),
one Fly Volume mounted at `/data`, running the `output: "standalone"`
Next.js build (`next.config.ts`) inside a pinned `node:22.23.1-slim`
container (`Dockerfile`). The database is a single `node:sqlite` file on
that volume — this is a deliberate, documented single-instance tradeoff
(see `DATABASE.md`'s "Release 1 Phase C: Staging Deployment" section),
not an oversight: a Fly Volume attaches to exactly one Machine at a time,
which is what makes one SQLite file safe here at all.

## Deploying

Deploys are **manual only** (`.github/workflows/deploy-staging.yml`,
`workflow_dispatch`) — not automatic on every push to `main`, a
deliberate choice at this stage. To deploy:

1. Confirm `.github/workflows/ci.yml` (Quality Gates: TypeScript, ESLint,
   unit tests, production build, Playwright E2E + visual regression) is
   green on the commit you intend to deploy — the deploy workflow itself
   does not re-run these gates before deploying, so this is a manual
   precondition, not an enforced one.
2. Trigger `Deploy Staging` from the Actions tab (or `gh workflow run
   deploy-staging.yml`). It runs `flyctl deploy --remote-only`, which
   builds `Dockerfile` on Fly's own remote builder and rolls it out.
3. Requires the `FLY_API_TOKEN` repository secret (`flyctl tokens
   create deploy`) — already documented in the workflow file's own
   comment.

**Rollback**: `flyctl releases list` (or `fly releases`) shows every past
deploy's image; `flyctl deploy --image <previous-image-ref>` redeploys a
specific prior release without rebuilding. No custom rollback tooling
exists or is needed beyond Fly's own release history.

## Environment variables

None are required — the app boots and serves traffic with zero
environment variables set (confirmed: `.env.example` documents every
variable as optional with a safe default). The two that matter in a real
deployment:

- `SQLITE_DB_PATH` — set to `/data/backend.db` in `fly.toml`'s `[env]`,
  pointing at the mounted Volume. Not a secret, just a path.
- `ADMIN_WALLET_ADDRESSES` — comma-separated wallet addresses that
  bootstrap into the `ADMIN` role on first sign-in. Not a secret (public
  on-chain addresses, re-verified server-side on every request) — but a
  real deployment with no value set here has no way to reach
  `/dashboard/admin` until an `ADMIN` account uses Role Management to
  promote another account (`lib/admin/roles.ts`).

`NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` is the one variable that changes
runtime behavior beyond configuration: setting it activates the
WalletConnect connector, which as of PR-097.05 is **not yet covered by
this app's Content-Security-Policy** (see `next.config.ts`'s own doc
comment) — enabling it in a real deployment needs that CSP gap closed
first, or the connector will fail to connect under CSP.

## Startup behavior

The database connection is a **lazy singleton** (`lib/backend/sqlite/
db.ts`'s `getDb()`) — nothing opens the SQLite file, creates `/data`, or
runs a migration merely by the process starting. The first request that
touches the database (in practice, Fly's own health check hitting
`/api/health` within its `grace_period: 10s`) triggers connection +
migration on that request. Migrations (`lib/backend/sqlite/migrations.ts`)
are tracked in a `schema_migrations` table and run at most once per
database file — safe to redeploy repeatedly against the same Volume.

**If migration or connection genuinely fails**, `/api/health`'s own
try/catch (`lib/backend/sqlite/health.ts`) reports `{healthy: false}`
with a real 503 rather than throwing an unhandled exception — Fly's
health check (`fly.toml`'s `[[http_service.checks]]`) then correctly
marks the Machine unhealthy (visible in `fly status`) instead of the
container crash-looping.

## Shutdown behavior

No custom shutdown code exists in this app, and none is needed: Next.js's
own standalone server (`node_modules/next/dist/server/lib/start-server.js`,
confirmed by reading its source) already registers real `SIGTERM`/`SIGINT`
handlers — on receiving one, it stops accepting new connections, waits
for in-flight requests to finish, closes the server, then exits with the
signal-correct exit code. Its own source comment states this exists
specifically "so that commands gracefully respect termination signals
(e.g. from Docker)". Every `node:sqlite` write in this app is synchronous
(`DatabaseSync`, not an async driver), so there is no in-flight
asynchronous write that graceful HTTP shutdown alone wouldn't already
cover — a request that hasn't finished when a write happens has, by
construction, already committed that write before the response streams
back.

## Health checks

`GET /api/health` (`lib/backend/sqlite/health.ts`) — the only real
readiness signal this app exposes. Runs a real `SELECT 1` against the
live connection; returns `200 {healthy: true}` or `503
{healthy: false, message}`. Deliberately narrow: no request body, no
account data, safe to expose before authentication exists at all. It does
**not** verify external provider reachability (CoinGecko/DefiLlama/
Blockscout/GitHub/Snapshot/DexScreener) — those already fail gracefully
per-request (rate limiting, circuit breaking — see `lib/providers/
common/`) rather than being something a boot-time readiness check should
gate on.

## Backup / recovery

The database is a single file on a Fly Volume. Fly's own platform
provides automatic daily volume snapshots (a Fly platform default, not
app-level configuration) — this is the current, sufficient backup
posture for a staging deployment holding no data that isn't also
re-derivable (every account's own real state is the only non-reconstructible
data; the Project Registry itself is checked into version control and
re-seeds identically on any redeploy). Restoring from a snapshot is a
`flyctl` volume operation, not something this app's own code participates
in. **Known limitation, already documented in `DATABASE.md`**: single-
instance, single-region — there is no automatic failover if the one
Machine or its Volume becomes unavailable; recovery means provisioning a
new Machine + Volume and restoring the latest snapshot onto it.

## Dependency security

`npm audit --omit=dev` runs on every CI job (`.github/workflows/ci.yml`,
non-blocking — `continue-on-error: true`), scoped to the dependency tree
that actually reaches the deployed server, as distinct from the full
`npm audit` (which also reports devDependency-only findings that never
ship). Non-blocking because a new advisory in a transitive dependency
(e.g. one `next` itself pins) is real information worth surfacing every
run, but isn't always something a code change here can immediately fix —
it must not block merges the way a real test/type/lint failure should.
As of this document, running it found and fixed two transitive,
non-breaking-patch-level issues (`nanoid` via `postcss`,
`baseline-browser-mapping` via `next`/`browserslist`) — see
`docs/MASTER_ROADMAP.md`'s PR-097.06 section for the exact versions and
verification. Check the "Production dependency audit" step's output on
any CI run to see the current, real state.
