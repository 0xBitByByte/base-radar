# 0003 — Project Registry

## Status

Accepted (implemented)

## Context

Base Radar needed a canonical, trustworthy list of Base ecosystem projects
to power future discovery and research features, without fabricating facts
(contract addresses, social links) that could mislead users, and without
building a database before there was a clear need for one. See
[PROJECT_REGISTRY.md](../PROJECT_REGISTRY.md) for the full schema and
contribution guide this decision produced.

## Decision

- Model the registry as static, version-controlled TypeScript
  (`data/projects/`), not a database — one file per project under
  `data/projects/seed/<slug>.ts`, aggregated by `seed/index.ts`.
- Define enums (`ProjectCategory`, `ProjectTag`, `ProjectStatus`,
  `VerificationStatus`, `Chain`, `ContractType`) as `as const` tuples rather
  than TypeScript `enum`, so values are plain, JSON-serializable strings.
- Adopt a conservative fact-inclusion policy: `contracts` defaults to `[]`
  unless an address is a canonical, publicly-published deployment (the
  sole current exception being USDC's official Base contract); Discord/
  Telegram links are omitted entirely (they expire); Twitter/GitHub are
  populated best-effort.
- Give every entry an honest `verification.status` (`verified` /
  `community` / `unverified` / `flagged`) rather than presenting all
  entries as equally trustworthy.
- Carry a `providerIds` block on every project so a future integration can
  join registry entries to live provider data without changing the schema.

## Alternatives Considered

- **A real database from day one** (Postgres, etc.) — rejected as
  premature: the registry is read-only, versioned, reviewed-via-PR data at
  this stage; a database adds infrastructure and migration overhead with
  no current write path to justify it. See
  [DATABASE.md](../DATABASE.md#future-tables) for the planned normalized
  schema this would become if/when needed.
- **One large array file instead of one-file-per-project** — rejected
  because it doesn't scale cleanly: PRs adding a project would produce
  noisy diffs against a shared file, and it gives a worse answer to "how do
  I add a project."
- **Guessing/including contract addresses for every project** — rejected
  as actively harmful: a wrong address in an entry that claims to be
  "verified" is worse than an empty `contracts: []` with a documented
  reason.
- **TypeScript `enum`** — rejected in favor of `as const` tuples for
  JSON-serializability and runtime iterability (e.g. rendering a filter
  list) without extra glue code.

## Pros

- Zero infrastructure required; reviewable via normal PR diffs.
- Conservative, honest data policy protects the registry's credibility as
  it grows — a deliberate product differentiator (see
  [PRODUCT_VISION.md](../PRODUCT_VISION.md#competitive-advantages)).
- `providerIds` means the eventual live-data join (Milestone 5) requires no
  schema migration — the hook is already in place.

## Cons

- No runtime writes, no user-submitted projects without a PR — acceptable
  today, a real limitation once community submissions are desired.
- Query helpers (`getProjectsByCategory`, `searchProjects`, etc.) are
  linear scans — fine at ~20 entries, would need indexing (or a real
  database) at meaningfully larger scale (see
  [DATABASE.md](../DATABASE.md#indexes)).

## Future Implications

Milestone 7 (Project Explorer) is the first feature expected to read this
registry directly rather than through the dashboard's curated widgets.
Milestone 5 (Provider Layer) is expected to be the first to *write*
derived, cached data alongside (not into) registry entries, most likely via
the `provider_cache` table sketched in
[DATABASE.md](../DATABASE.md#future-tables) rather than by mutating the
static seed files.
