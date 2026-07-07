# Contributing to Base Radar

Thanks for your interest in contributing to Base Radar. This guide covers
everything you need to get set up, understand the conventions, and land a
change.

## Project Overview

Base Radar is an open-source intelligence dashboard for the Base ecosystem
— a single Next.js application (landing page + dashboard) backed by a
typed, fallback-safe data layer and a canonical Project Registry. See
[README.md](README.md) for a feature overview and
[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for how the system fits
together before making non-trivial changes.

## Development Setup

**Prerequisites**: Node.js (see `package.json` engines/tooling — no
specific version is pinned today; use a current LTS release) and npm.

```bash
git clone https://github.com/0xbitbybyte/base-radar.git
cd base-radar
npm install
npm run dev
```

The landing page is served at `http://localhost:3000`, the dashboard at
`http://localhost:3000/dashboard`.

Other scripts:

```bash
npm run build   # production build
npm run start   # run the production build
npm run lint     # ESLint
```

## Branch Naming

Use a `type/short-description` format, matching the change's intent:

| Prefix | Use for |
| --- | --- |
| `feat/` | New features |
| `fix/` | Bug fixes |
| `docs/` | Documentation-only changes |
| `refactor/` | Internal restructuring with no behavior change |
| `chore/` | Tooling, dependency, or config changes |

Example: `feat/watchlist-persistence`, `fix/kpi-gwei-rounding`.

## Commit Message Convention

This repository's history follows [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <short summary>
```

Examples already in history: `feat(navigation): unify marketing site and
dashboard navigation`, `feat(landing): build Base Radar landing page v1`,
`chore: ignore Claude local settings`. Common types: `feat`, `fix`, `docs`,
`refactor`, `chore`, `style`, `test`. Keep the summary imperative and under
~72 characters; add a body if the "why" isn't obvious from the diff alone.

## Pull Request Workflow

1. Fork the repository (or branch directly, if you have write access) and
   create a branch following the naming convention above.
2. Make your change, following the code style and folder conventions below.
3. Run the full validation suite locally (see [Testing Requirements](#testing-requirements))
   and confirm it passes.
4. Open a pull request using the template in
   [.github/PULL_REQUEST_TEMPLATE.md](.github/PULL_REQUEST_TEMPLATE.md) —
   fill in the summary, type of change, and checklist honestly.
5. Keep PRs focused: one feature, fix, or doc update per PR. Unrelated
   cleanups should be their own PR, per [docs/CLAUDE_RULES.md](docs/CLAUDE_RULES.md).

## Code Style

- TypeScript in strict mode; avoid `any` — the codebase has none today.
- ESLint (`eslint-config-next`) is the source of truth for lint rules; run
  `npm run lint` before opening a PR.
- Follow existing patterns rather than introducing new ones: semantic
  `radar-*` color tokens over raw hex values, the shared `WidgetCard` /
  `GlassCard` shells over new one-off card markup, Server Components by
  default with `"use client"` only where interactivity requires it.
- No code comments explaining *what* code does — only comments that explain
  a non-obvious *why* (see the existing codebase for examples).

## Folder Conventions

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md#folder-structure) for the
full breakdown. In short:

```
app/          Routes only (App Router)
components/   landing/, layout/, dashboard/, ui/ — grouped by ownership
constants/    Static config/content
data/projects/ The Project Registry
lib/data/     Types, mock fallback, aggregator, providers
lib/hooks/    Client-side polling hooks
docs/         Documentation
```

Do not rename or restructure these folders without discussing it first —
folder structure is treated as an architectural decision, not a style
choice (see [docs/CLAUDE_RULES.md](docs/CLAUDE_RULES.md)).

## Testing Requirements

There is no automated test suite in this repository yet (no `test` script
in `package.json`). Until one exists, the required validation bar for
every change that touches code is:

```bash
npx tsc --noEmit
npm run lint
npm run build
```

All three must pass with no errors before a PR is opened. If you add a
testing framework or test files, document the new `npm test` workflow here
and in [docs/CLAUDE_RULES.md](docs/CLAUDE_RULES.md) as part of the same PR.

## Documentation Requirements

If your change affects behavior described in `/docs`, update the relevant
file in the same PR — documentation drift is treated as a bug. In
particular:

- New or changed widgets → [docs/DESIGN_SYSTEM.md](docs/DESIGN_SYSTEM.md) and [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- New or changed providers → [docs/API.md](docs/API.md)
- New or changed registry fields/projects → [docs/PROJECT_REGISTRY.md](docs/PROJECT_REGISTRY.md)
- Shipped milestones → [docs/CHANGELOG.md](docs/CHANGELOG.md) and [docs/ROADMAP.md](docs/ROADMAP.md)

See [docs/README.md](docs/README.md) for the full documentation index.

## How to Add a New API (Provider)

See [How to Add a New Provider](#how-to-add-a-new-provider) below — "API"
and "provider" refer to the same thing in this codebase: an external data
source integrated under `lib/data/providers/`.

## How to Add a New Widget

1. Add any new shared data shape to `lib/data/types.ts`.
2. Add a mock baseline for it in `lib/data/mock.ts`.
3. Add an aggregator function in `lib/data/aggregate.ts` that resolves to
   `WithSource<T>`, wired to a provider or curated data as appropriate — see
   [docs/API.md](docs/API.md#current-helper-functions).
4. Build the widget component under `components/dashboard/`, wrapped in the
   shared `WidgetCard` for visual consistency.
5. Add it to `app/dashboard/page.tsx`'s widget grid and to
   `getDashboardData()`'s return shape.
6. Validate with `tsc`/`lint`/`build`.

## How to Add a New Provider

1. Create a new module in `lib/data/providers/` following the existing
   contract: exported `async` functions that return typed data or `null` —
   never throw.
2. Set an appropriate `next: { revalidate }` window on any `fetch` call
   (see [docs/DATABASE.md](docs/DATABASE.md#caching-strategy) for current
   windows per provider).
3. Wire it into the relevant function(s) in `lib/data/aggregate.ts` — no
   widget should need to change.
4. Document it in [docs/API.md](docs/API.md#providers-api--libdataprovidersts).
5. Prefer free, publicly documented APIs — see
   [docs/CLAUDE_RULES.md](docs/CLAUDE_RULES.md).

## How to Add a New Project

Follow [docs/PROJECT_REGISTRY.md](docs/PROJECT_REGISTRY.md#how-to-add-a-project)
in full — it covers the file/export naming convention, the conservative
policy on contract addresses and social links, and how to register the new
project in `data/projects/seed/index.ts`.

## How to Report Bugs

Open an issue using the
[bug report template](.github/ISSUE_TEMPLATE/bug_report.md), including
expected vs. actual behavior, reproduction steps, screenshots if visual,
and your environment (OS, Node version, browser). See
[SECURITY.md](SECURITY.md) instead if the bug is a security vulnerability
— do not open a public issue for those.
