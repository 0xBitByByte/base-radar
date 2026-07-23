# Documentation Index

This is the index of every document in `/docs`. Start here — each entry
links to the file and summarizes what it actually covers, so you can find
the right doc without opening several.

For the project overview itself, see the [root README](../README.md). For
contribution mechanics, see [CONTRIBUTING.md](../CONTRIBUTING.md).

## Product & Planning

| Document | Purpose |
| --- | --- |
| [PRODUCT_VISION.md](PRODUCT_VISION.md) | Mission, vision, target users, problems solved, core principles, product pillars, monetization, competitive advantages, and what Base Radar will not become. A business/product document, not a technical one. |
| [MASTER_ROADMAP.md](MASTER_ROADMAP.md) | **The canonical engineering roadmap** — completed milestones, current milestone, planned/future milestones, deferred ideas, design system and architecture evolution, repository standards, and release progress, all in one place. |
| [ROADMAP.md](ROADMAP.md) | Superseded by MASTER_ROADMAP.md above; kept for historical context. The original numbered milestone list with a Mermaid diagram of milestone sequencing. |
| [CHANGELOG.md](CHANGELOG.md) | Release-by-release history of what shipped. |
| [RELEASES.md](RELEASES.md) | Versioning scheme (SemVer, alpha/beta/RC/stable) and the release checklist. |

## Engineering

| Document | Purpose |
| --- | --- |
| [ARCHITECTURE.md](ARCHITECTURE.md) | How the system is layered (UI → Hooks → Services → Providers, plus the standalone Project Registry), how data flows end to end, dashboard structure, theming, routing, and the planned future Intelligence Engine. Includes Mermaid diagrams. |
| [API.md](API.md) | Every current internal function (services, providers, registry, hooks) with signatures and what backs each one — plus per-provider rate-limit/caching notes and planned future interfaces/endpoints. |
| [DATABASE.md](DATABASE.md) | Confirms there is no database today; documents the current file-based Project Registry model and sketches the future PostgreSQL schema, Redis cache, search index, vector database, and analytics database. |
| [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md) | Typography, spacing, border radius, color palette, dark/light theme, buttons, cards, tables, sidebar, navbar, accessibility, animation principles, and reduced motion — documents existing behavior only. |
| [PROJECT_REGISTRY.md](PROJECT_REGISTRY.md) | The `Project` schema, folder/naming conventions, how to add a project, and how provider IDs work. |

## Governance & Process

| Document | Purpose |
| --- | --- |
| [CLAUDE_RULES.md](CLAUDE_RULES.md) | Permanent engineering rules for anyone (human or AI) working in this repo: architecture rules, coding standards, naming conventions, component/provider/documentation rules, and a strict DO NOT list. |
| [GITHUB_LABELS.md](GITHUB_LABELS.md) | Recommended issue/PR label taxonomy. |
| [GITHUB_MILESTONES.md](GITHUB_MILESTONES.md) | Recommended GitHub milestone list, numbered to match ROADMAP.md. |

## Architecture Decision Records (`/DECISIONS`)

| Document | Purpose |
| --- | --- |
| [0001-project-architecture.md](DECISIONS/0001-project-architecture.md) | Why Base Radar is one Next.js app with a strict layered data pipeline and a mock-fallback contract. |
| [0002-provider-layer.md](DECISIONS/0002-provider-layer.md) | Why providers are one-module-per-API, never-throw, cache-windowed, and free-API-first. |
| [0003-project-registry.md](DECISIONS/0003-project-registry.md) | Why the Project Registry is static/file-based, with a conservative fact-inclusion policy. |
| [0004-dashboard-architecture.md](DECISIONS/0004-dashboard-architecture.md) | Why the dashboard is one shared shell + `WidgetCard` grid, fed by one fan-out data call. |

Each ADR follows the same structure: Context, Decision, Alternatives
Considered, Pros, Cons, Future Implications.

## Root-Level Documents (Not in `/docs`)

These live at the repository root, not here, because GitHub and standard
tooling expect them there:

| Document | Purpose |
| --- | --- |
| [README.md](../README.md) | Project overview, features, tech stack, getting started |
| [CONTRIBUTING.md](../CONTRIBUTING.md) | Setup, branch/commit conventions, PR workflow, how to add APIs/widgets/providers/projects |
| [SECURITY.md](../SECURITY.md) | Vulnerability reporting, disclosure policy, API key/env var rules |
| [CODE_OF_CONDUCT.md](../CODE_OF_CONDUCT.md) | Contributor Covenant v2.1 |
| [LICENSE](../LICENSE) | MIT License |

## Keeping This Index Current

Add a row here in the same PR that adds a new file to `/docs` — see
[CLAUDE_RULES.md](CLAUDE_RULES.md#documentation-rules). If a document's
purpose changes significantly, update its one-line summary here too.
