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
| [TRUSTED_PROJECT_FRAMEWORK.md](TRUSTED_PROJECT_FRAMEWORK.md) | **Frozen Product Standard, source of truth beginning PR-085** — objective, measurable criteria for Project Registry eligibility, verification, ongoing maintenance, delisting, scam/fake-project prevention, and transparency requirements ("should this project be listed?"). Grounded in a real codebase audit plus researched industry practice (CoinGecko, CoinMarketCap, DefiLlama, Messari, Coinbase, Base.org, Token Terminal, Arkham Intelligence). |
| [GOOD_PROJECT_EVALUATION_FRAMEWORK.md](GOOD_PROJECT_EVALUATION_FRAMEWORK.md) | **Frozen Product Standard** — objective, measurable framework for evaluating the quality of an already-listed project ("how good is this project?"), independent of the Trusted Project Framework above. Defines 16 Evaluation Dimensions, Healthy/Risky/Trustworthy project definitions, an Evidence Hierarchy, an Unknown Data Policy, and explicit Anti-Bias Principles (follower count, hype, celebrity endorsements, etc. must never influence a quality score). Source of truth for future Health Score, Confidence Score, AI Grade, Risk Rating, and Executive Ranking work. |
| [INFORMATION_HIERARCHY_STANDARD.md](INFORMATION_HIERARCHY_STANDARD.md) | **Frozen Product Standard** — the universal Executive Information Order (what every screen shows first/second/third), a measurable Five-Second Rule, Progressive Disclosure tiers, per-surface density guidance, and a Cross-Page Consistency audit. Grounded in a real per-page audit (a confirmed, concrete finding: the Project Profile page's own zone order contradicts the Universal Project Card Standard's own §1 question order) plus researched principles from Bloomberg Terminal, Stripe, Linear, and Vercel. |
| [NAVIGATION_CLICKABILITY_STANDARD.md](NAVIGATION_CLICKABILITY_STANDARD.md) | **Frozen Product Standard** — the app-wide Clickability Philosophy (Always/Sometimes/Never, per entity type), Destination Standards, Interaction/Keyboard/Mobile consistency rules, Information Scent, and Dead-End Prevention. Grounded in a real per-entity audit (confirmed: Chains, Wallets, Categories, Recommendations, and Signals all read as interactive but have no destination today) plus researched principles from Bloomberg Terminal, Stripe, Linear, Vercel, Coinbase, and information-scent/foraging research. |
| [EXECUTIVE_PROJECT_DISCOVERY_STANDARD.md](EXECUTIVE_PROJECT_DISCOVERY_STANDARD.md) | **Frozen Product Standard** — the executive question order, Five-Second Rule, and field-priority tiers a project *discovery* card must satisfy, across all 13 surfaces that render project identity. Grounded in a full per-surface audit (confirmed: 8 of 13 surfaces show zero Trust/Risk/Momentum signal; Category Rank is dead on every live surface; the Projects Directory blocks entirely behind one static loading message) plus researched principles from DexScreener, CoinGecko, DeFiLlama, Messari, Token Terminal, Arkham, and DeBank. Extends, and stays fully consistent with, the Universal Project Card, Information Hierarchy, Navigation & Clickability, Design System Lock, Performance Audit, and Loading Strategy Standards. |

## Engineering

| Document | Purpose |
| --- | --- |
| [ARCHITECTURE.md](ARCHITECTURE.md) | How the system is layered (UI → Hooks → Services → Providers, plus the standalone Project Registry), how data flows end to end, dashboard structure, theming, routing, and the planned future Intelligence Engine. Includes Mermaid diagrams. |
| [API.md](API.md) | Every current internal function (services, providers, registry, hooks) with signatures and what backs each one — plus per-provider rate-limit/caching notes and planned future interfaces/endpoints. |
| [PERFORMANCE_AUDIT.md](PERFORMANCE_AUDIT.md) | **Research/audit only, no implementation authorized.** Full rendering, data-fetching, caching, client/server boundary, and bundle-composition audit — ranked findings (Critical/High/Medium/Low, each with evidence and estimated impact/complexity/risk) and a phased roadmap of recommendations. Grounded in three real codebase audits; explicitly marks Core Web Vitals and bundle sizes as not measured. |
| [LOADING_STRATEGY.md](LOADING_STRATEGY.md) | **Frozen Engineering Standard — defines the loading standard for future implementation, not a retrofit mandate.** Full skeleton/spinner/Suspense-fallback/accessibility audit (confirmed: `BrandSpinner` is dead code despite DESIGN_SYSTEM_LOCK.md crediting it as standardized; 8 of 15 Suspense fallbacks give no visible loading signal) plus a Loading Philosophy, Route/Skeleton/Spinner/Streaming/Component/Progressive-Rendering standards, and an accessibility standard. |
| [REGISTRY_PIPELINE_INVESTIGATION.md](REGISTRY_PIPELINE_INVESTIGATION.md) | **Research only, no implementation authorized.** A complete, function-by-function investigation of `getLiveProjects()` — the one call every page depends on for project data — with a real dependency-graph waterfall, ranked bottlenecks, a cache audit, and grouped optimization opportunities (Safe/Needs Architecture/Needs Product Decision/Future). Central finding, backed by a complete enumeration of both branches: every expensive stage in the pipeline is real provider network I/O; every CPU-bound stage (health/confidence/risk/merge/dedupe/match/classify) is pure and cheap, with zero exceptions found. |
| [DATABASE.md](DATABASE.md) | Confirms there is no database today; documents the current file-based Project Registry model and sketches the future PostgreSQL schema, Redis cache, search index, vector database, and analytics database. |
| [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md) | Typography, spacing, border radius, color palette, dark/light theme, buttons, cards, tables, sidebar, navbar, accessibility, animation principles, and reduced motion — documents existing behavior only. |
| [DESIGN_SYSTEM_LOCK.md](DESIGN_SYSTEM_LOCK.md) | **Frozen Product Standard** — the governance layer on top of DESIGN_SYSTEM.md: Design Principles, a full Component Inventory (canonical vs. duplicate implementation per pattern), Layout/Typography/Color/Motion/Accessibility/Responsive standards, and a cross-page Consistency Audit. Grounded in two real codebase audits (confirmed: three parallel button "systems" and 106 hand-rolled `<button>` elements; two documented components — `Button`, `SectionTitle` — that don't actually exist in the codebase) plus researched principles from Stripe, Vercel, GitHub Primer, Linear, Bloomberg Terminal, Coinbase, and DefiLlama/Token Terminal/Messari. |
| [PROJECT_REGISTRY.md](PROJECT_REGISTRY.md) | The `Project` schema, folder/naming conventions, how to add a project, and how provider IDs work. |

## Governance & Process

| Document | Purpose |
| --- | --- |
| [CLAUDE_RULES.md](CLAUDE_RULES.md) | Permanent engineering rules for anyone (human or AI) working in this repo: architecture rules, coding standards, naming conventions, component/provider/documentation rules, and a strict DO NOT list. |
| [CLAUDE_PR_WORKFLOW.md](CLAUDE_PR_WORKFLOW.md) | Permanent PR execution process: Read → Analyze → Plan → wait for approval → Implement → Verify; when an Engineering Note is required and how one is written/recorded; validation and reporting requirements; Product Owner approval gates; Definition of Done and roadmap-completion rules. Distilled from the Universal Project Card initiative (PR-1–PR-10). |
| [CLAUDE_EFFICIENCY_STANDARD.md](CLAUDE_EFFICIENCY_STANDARD.md) | Permanent rules for minimizing Claude's tool-call/investigation/validation overhead without reducing engineering quality — batching, evidence reuse, when Product Owner interruption is (and isn't) warranted. Complements, never relaxes, CLAUDE_PR_WORKFLOW.md. |
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
