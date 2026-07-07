# Base Radar

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js&logoColor=white)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](#license)
[![Built for Base](https://img.shields.io/badge/Built%20for-Base-0052FF?logo=coinbase&logoColor=white)](https://base.org)

Base Radar is an intelligence dashboard for the Base ecosystem. It brings
on-chain activity, project data, market signals, and developer activity
together in a single, real-time view — so builders, traders, and researchers
can see what's happening on Base without piecing it together from a dozen
different tools.

## Why Base Radar?

Base Radar is an open-source intelligence platform focused entirely on the
Base ecosystem. Rather than building yet another single-purpose price
tracker, it aggregates data from multiple verified, free data providers —
network, market, and developer activity — into one cohesive, professionally
designed dashboard. The goal is a single, trustworthy pane of glass for
anyone building on, trading on, or researching Base.

## Features

- **Marketing landing page** — animated hero with live network stat cards, trust indicators, and a call to action into the dashboard.
- **Dashboard shell** — collapsible grouped sidebar navigation, topbar with breadcrumbs and network status, mobile drawer navigation, and a command palette (`⌘K` / `Ctrl K`) with quick actions, recent, and trending searches.
- **AI Intelligence Brief** — an auto-generated summary of the most notable signals across TVL, gas, whale activity, launches, and momentum.
- **Live Status Bar** — a persistent strip showing block height, gas price, ETH/BTC price, and daily transaction count.
- **KPI row** — headline stats for TVL, gas, active projects, DEX volume, AI project count, and transaction volume.
- **Widgets** — Portfolio, Market Overview, Trending Narratives, AI Projects, Whale Activity, Signals, Narrative Heatmap, Project Spotlight, Activity Feed, and Watchlist, each rendered in a consistent card with a last-updated timestamp and action menu.
- **Live data with graceful fallback** — every widget is backed by a typed mock baseline that's transparently upgraded with live data from free-tier providers whenever they respond, and each response reports whether it served `"live"` or `"mock"` data.
- **Project Registry** — a canonical, strongly-typed registry of ~20 verified Base ecosystem projects (identity, branding, socials, contracts, provider IDs) that other layers of the app can query — see [Documentation](#documentation) below.
- **Light/dark theme** — a premium theme system (via `next-themes`) with smooth transition animations, toggleable from the sidebar.
- **Unified navigation** — the landing page and dashboard share consistent navigation, with the hero, navbar, and sidebar all linking into `/dashboard`.

## Screenshots

| Landing Page | Dashboard |
| --- | --- |
| _Screenshot coming soon_ | _Screenshot coming soon_ |

| Projects Explorer (Coming Soon) | AI Research (Coming Soon) |
| --- | --- |
| _Not yet implemented_ | _Not yet implemented_ |

<!-- ![Landing page](./docs/screenshots/landing.png) -->
<!-- ![Dashboard](./docs/screenshots/dashboard.png) -->
<!-- ![Projects Explorer](./docs/screenshots/projects-explorer.png) -->
<!-- ![AI Research](./docs/screenshots/ai-research.png) -->

## Project Status

**✅ Active Development**

| | |
| --- | --- |
| **Current Milestone** | Milestone 5 — Project Intelligence Platform |
| **Version** | `0.1.0` |

Base Radar is under active development and follows a milestone-based
roadmap. See [Roadmap](#roadmap) below and [docs/CHANGELOG.md](docs/CHANGELOG.md)
for what's shipped so far.

## Tech Stack

- [Next.js](https://nextjs.org) — App Router, React Server Components
- [TypeScript](https://www.typescriptlang.org) — strict mode
- [Tailwind CSS](https://tailwindcss.com) — utility-first styling
- [Framer Motion](https://www.framer.com/motion/) — animation
- [Base UI](https://base-ui.com) — unstyled, accessible component primitives
- [next-themes](https://github.com/pacocoursey/next-themes) — light/dark theme management

Also in use: React 19, TanStack Query and Table, Recharts, Lucide icons, and Sonner for toasts.

## Project Structure

```
app/                  Next.js App Router routes (landing page, dashboard)
components/
  landing/            Hero and landing-page-only components
  layout/              Shared navbar/footer
  dashboard/           Sidebar, topbar, widgets, and dashboard layout
  ui/                  Reusable primitives (cards, buttons, tooltips, etc.)
constants/             Static site and dashboard configuration/content
data/projects/         Canonical Project Registry (schema, enums, seed data, helpers)
lib/
  data/                Live data types, providers, and the aggregation layer
  hooks/               Shared React hooks
docs/                  Project documentation
public/                Static assets
```

## Data Sources

Base Radar prioritizes verified, open-source, and free APIs whenever
possible. The dashboard's data layer (`lib/data`) already integrates with
each provider below — every call degrades gracefully to typed mock data if
a provider is slow or unavailable, so a widget never breaks, but may not
always be showing live data.

| Provider | Used for |
| --- | --- |
| [CoinGecko](https://www.coingecko.com/en/api/documentation) | Base ecosystem market data, major asset prices, AI-project screening |
| [DexScreener](https://docs.dexscreener.com/api/reference) | Trending pairs, momentum/new-listing signals, swap activity |
| [DefiLlama](https://defillama.com/docs/api) | Base chain TVL, stablecoin market cap, protocol rankings |
| [Blockscout](https://docs.blockscout.com/devs/apis/rest) | Chain stats, recently verified contracts |
| [Base RPC](https://docs.base.org/base-chain/tools/node-providers) | Live network status — gas price, block height, TPS |
| [GitHub](https://docs.github.com/en/rest) | Repository stats and release activity for known Base protocols |

Not every provider is used by every widget, and integrations vary in depth —
some fields (like wallet balances and whale-transfer indexing) are not
available through free tiers and remain mock data by design until a suitable
provider is integrated.

## Getting Started

### Installation

```bash
npm install
```

### Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the landing page, and [http://localhost:3000/dashboard](http://localhost:3000/dashboard) for the dashboard.

### Other scripts

```bash
npm run build   # production build
npm run start   # run the production build
npm run lint     # run ESLint
```

## Documentation

All project documentation lives in [`/docs`](docs):

| Document | Description |
| --- | --- |
| [Project Registry](docs/PROJECT_REGISTRY.md) | Schema, folder structure, naming conventions, and how to add a project |
| [Changelog](docs/CHANGELOG.md) | Release history |
| [Product Vision](docs/PRODUCT_VISION.md) | _(Planned)_ |
| [Roadmap](docs/ROADMAP.md) | _(Planned)_ |
| [Architecture](docs/ARCHITECTURE.md) | _(Planned)_ |
| [Design System](docs/DESIGN_SYSTEM.md) | _(Planned)_ |
| [API](docs/API.md) | _(Planned)_ |
| [Database](docs/DATABASE.md) | _(Planned)_ |
| [Claude Rules](docs/CLAUDE_RULES.md) | _(Planned)_ |
| [docs/README.md](docs/README.md) | _(Planned)_ |

## Roadmap

**Shipped (v0.1.0)**
- Landing page
- Dashboard shell
- Unified navigation between landing page and dashboard
- Project Registry foundation
- Documentation foundation

**Up next**
- Wallet connect, to power a real Portfolio and Watchlist instead of mock data
- Narrative/category classification service to replace curated narrative data
- Deeper provider coverage for widgets that are still mock-only (whale-transfer indexing, portfolio balances)

See [docs/CHANGELOG.md](docs/CHANGELOG.md) for release history.

## Upcoming

The following milestones are **planned work** and are not yet implemented:

- **Provider Layer** — expanded, first-class provider integrations beyond the current dashboard data layer
- **Aggregator Engine** — a more general aggregation service sitting on top of the Project Registry and live providers
- **Projects Explorer** — a browsable, searchable view over the Project Registry
- **AI Research Center** — dedicated research tooling for AI-native Base projects
- **Portfolio Intelligence** — wallet-connected, real portfolio tracking and analysis
- **Signals & Alerts** — configurable, notification-driven market and on-chain signals

## Contributing

1. Fork the repository and create a feature branch.
2. Make your changes, following the existing code style and conventions.
3. Before opening a pull request, make sure the project builds cleanly:
   ```bash
   npx tsc --noEmit
   npm run lint
   npm run build
   ```
4. Open a pull request describing what changed and why.

## License

MIT — see [LICENSE](LICENSE) _(to be added)_.
