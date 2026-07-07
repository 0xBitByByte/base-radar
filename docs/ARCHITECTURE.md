# Architecture

This document explains how Base Radar is put together as a system: the
layers it's built from, how data moves through it, and how the major
subsystems (dashboard, theming, routing, Project Registry) fit together. It
describes the system the way an engineer joining the project would want it
explained — not a line-by-line tour of the code.

For product framing, see [PRODUCT_VISION.md](PRODUCT_VISION.md). For the
Project Registry's schema in detail, see [PROJECT_REGISTRY.md](PROJECT_REGISTRY.md).

## Overall Architecture

Base Radar is a single Next.js App Router application. There is no separate
backend service — "backend" logic lives inside the Next.js server (Server
Components and plain async functions), and "frontend" logic lives in Client
Components. Everything ships from one codebase, one deploy.

The system is organized as a strict layered pipeline for data, and a
conventional component tree for UI:

```
 ┌─────────────────────────────────────────────────────────┐
 │                        UI Layer                          │
 │   app/ (routes)  →  components/ (dashboard, landing, ui) │
 └───────────────────────────┬───────────────────────────────┘
                              │ reads typed data, never fetches directly
 ┌───────────────────────────▼───────────────────────────────┐
 │                       Hooks Layer                          │
 │              lib/hooks/  (client-side polling)             │
 └───────────────────────────┬───────────────────────────────┘
                              │
 ┌───────────────────────────▼───────────────────────────────┐
 │                      Services Layer                        │
 │              lib/data/aggregate.ts (the aggregator)         │
 └───────────────────────────┬───────────────────────────────┘
                              │
 ┌───────────────────────────▼───────────────────────────────┐
 │                      Providers Layer                       │
 │      lib/data/providers/*  (one module per external API)   │
 └───────────────────────────┬───────────────────────────────┘
                              │
 ┌───────────────────────────▼───────────────────────────────┐
 │           External APIs (CoinGecko, DexScreener,            │
 │        DefiLlama, Blockscout, Base RPC, GitHub)              │
 └─────────────────────────────────────────────────────────────┘

 ┌─────────────────────────────────────────────────────────┐
 │                    Project Registry                       │
 │         data/projects/  (static, versioned, typed)         │
 └─────────────────────────────────────────────────────────┘
```

The Project Registry sits beside this pipeline rather than inside it: it is
static, curated data, not a live provider response. It is designed to be
*joined* with the live pipeline later (registry entries already carry
provider identifiers for this purpose), but today the two are independent.

```mermaid
flowchart TD
    subgraph UI["UI Layer"]
        A["app/ (routes)"] --> B["components/ (dashboard, landing, ui)"]
    end
    subgraph Hooks["Hooks Layer"]
        C["lib/hooks/ (client-side polling)"]
    end
    subgraph Services["Services Layer"]
        D["lib/data/aggregate.ts"]
    end
    subgraph Providers["Providers Layer"]
        E["lib/data/providers/*"]
    end
    subgraph External["External APIs"]
        F["CoinGecko · DexScreener · DefiLlama<br/>Blockscout · Base RPC · GitHub"]
    end
    subgraph Registry["Project Registry"]
        G["data/projects/ (static, versioned, typed)"]
    end

    B -->|"reads typed data, never fetches directly"| C
    C --> D
    D --> E
    E --> F
    B -.->|"future join"| G
```

## Folder Structure

```
app/                     Routes (App Router) — pages and layouts only
  page.tsx                 Landing page route
  layout.tsx                Root layout: fonts, ThemeProvider
  dashboard/
    page.tsx                Dashboard route — fetches data, renders widgets
    layout.tsx               Dashboard shell layout — fetches the live ticker
  globals.css               Tailwind v4 theme tokens, light/dark variables

components/
  landing/                 Landing-page-only components (Hero, background)
  layout/                   Shared chrome used by the landing page (Navbar, Footer)
  dashboard/                Dashboard shell + all widgets
  ui/                       Generic, reusable primitives (cards, buttons, tooltips)

constants/                 Static config/content (nav links, dashboard nav groups, mock stat content)

data/projects/             The Project Registry (see below)

lib/
  data/
    types.ts                 Shared data contracts for every widget
    mock.ts                  Typed mock baseline for every contract
    aggregate.ts              The services layer — one function per widget's data need
    providers/                One module per external API (the providers layer)
  hooks/                     Client-side hooks that own polling/refresh lifecycles
  utils.ts                   Small shared helpers (e.g. `cn` for class names)

docs/                       Project documentation (this file included)
public/                     Static assets
```

The rule of thumb: **`app/` decides what renders where, `components/`
decides how it looks, `lib/` decides where data comes from, `data/`
decides what's canonically true.**

## How Data Flows

Every widget on the dashboard follows the same round trip, whether or not a
live provider actually responds:

```
 Widget (Server Component)
        │
        │ await getX() from lib/data/aggregate.ts
        ▼
 Aggregator function
        │
        │ calls one or more providers, in parallel where possible
        ▼
 Provider module(s)
        │
        │ fetch() against a public API, or resolve to null on failure
        ▼
 Aggregator merges live results onto the typed mock baseline
        │
        │ returns { ...data, source: "live" | "mock" }
        ▼
 Widget renders the data, and can show its source honestly
```

```mermaid
sequenceDiagram
    participant Widget as Widget (Server Component)
    participant Agg as Aggregator (aggregate.ts)
    participant Prov as Provider(s)
    participant Ext as External API

    Widget->>Agg: await getX()
    Agg->>Prov: call provider function(s)
    Prov->>Ext: fetch()
    alt API responds
        Ext-->>Prov: data
        Prov-->>Agg: typed result
        Agg-->>Widget: { ...live data, source: "live" }
    else API fails or times out
        Ext-->>Prov: error / timeout
        Prov-->>Agg: null
        Agg-->>Widget: { ...mock data, source: "mock" }
    end
```

Two properties make this resilient:

- **Providers never throw.** A failed or slow request resolves to `null`;
  the caller decides what to do next. A single flaky API can never crash a
  page render.
- **Every result is tagged with its source.** The `WithSource<T>` type
  (`{ ...T, source: "live" | "mock" }`) travels all the way to the UI, so the
  dashboard can be honest about whether a given number is real-time or a
  fallback — instead of silently presenting mock data as live.

`app/dashboard/page.tsx` calls a single `getDashboardData()` function that
fans out to every aggregator function in parallel and returns one object the
page renders from. `app/dashboard/layout.tsx` separately fetches the live
ticker, since the status bar it powers is shell chrome rather than page
content.

## UI Layer

The UI layer is plain React composition, split by ownership rather than by
technical concern:

- **`components/landing/`** — only used by the marketing page (`app/page.tsx`).
- **`components/layout/`** — chrome shared across the marketing site (navbar, footer).
- **`components/dashboard/`** — the dashboard shell (sidebar, topbar, mobile
  nav) and every widget. Widgets are presentational: they receive already-
  resolved, typed data as props and render it. They do not fetch data
  themselves.
- **`components/ui/`** — generic primitives with no domain knowledge
  (`GlassCard`, `Tooltip`, `Sparkline`, `AnimatedNumber`, `EmptyState`,
  shadcn-derived `button`/`skeleton`), reused by both the landing page and
  the dashboard.

Dashboard pages are Server Components by default (so data fetching can use
plain `await`); components that need interactivity (search, theme toggle,
mobile nav, animated counters) are explicitly marked `"use client"` and kept
as small, focused leaves in the tree rather than large client subtrees.

## Hooks Layer

`lib/hooks/` is a thin layer that exists specifically for **client-side,
time-based** data needs — the one category of data access that Server
Components can't handle, because it requires an interval running in the
browser after the page has loaded.

- **`useLiveNetworkStatus`** — polls Base network status on an interval so
  the topbar's network badge can update without a full page reload.
- **`useNowTick`** — re-renders a component once a second so relative
  timestamps ("Updated 12s ago") stay fresh without re-fetching anything.

The rule this layer enforces: **components never import from
`lib/data/providers/*` directly for anything that needs to refresh on an
interval.** They call a hook, and the hook owns the polling lifecycle
(setup, teardown, cancellation). Everything that only needs to be fetched
once per page load is fetched directly in a Server Component instead — the
hooks layer is deliberately reserved for the polling case, not used as a
general data-fetching abstraction.

## Services Layer

`lib/data/aggregate.ts` is the single module every UI component is expected
to import data from. It is the only place that:

- Knows which provider(s) back a given widget.
- Decides how to merge a live response onto the mock baseline (e.g. patch
  individual KPI values as each provider resolves, rather than
  all-or-nothing).
- Decides what a widget does when a data category simply isn't available
  from any free provider yet (portfolio balances and whale-transfer
  indexing are documented, intentional mock-only cases, not bugs).

This indirection means swapping a provider, adding a paid one later, or
changing how two providers are blended only ever means editing a single
function body in `aggregate.ts` — no widget changes.

## Providers Layer

`lib/data/providers/` holds one module per external API, each responsible
only for talking to that API and shaping its response into a plain,
typed result:

| Module | API |
| --- | --- |
| `baseRpc.ts` | Base mainnet public JSON-RPC |
| `blockscout.ts` | Blockscout (Base explorer) REST API |
| `coingecko.ts` | CoinGecko public market data API |
| `defillama.ts` | DefiLlama protocol/TVL API |
| `dexscreener.ts` | DexScreener public API |
| `github.ts` | GitHub REST API |

Every provider function follows the same contract: return the parsed data,
or `null` if anything goes wrong — never throw, never leak a raw fetch
error upward. Providers know nothing about each other and nothing about how
their data will be combined; that decision belongs entirely to the services
layer above them.

## Project Registry

`data/projects/` is a static, strongly-typed, version-controlled dataset —
architecturally distinct from the live pipeline above:

```
 data/projects/
   enums.ts     Categories, tags, status, chains, verification levels, contract types
   types.ts     The `Project` schema
   helpers.ts    Query functions (getProject, searchProjects, getProjectsByCategory, ...)
   index.ts      Public barrel export
   seed/
     index.ts     Aggregates every seed file into one array
     <slug>.ts     One file per project
```

Each project carries identity and branding data, verification metadata, and
a `providerIds` block (CoinGecko id, DexScreener chain, DefiLlama slug,
Blockscout address, etc.) — lookup keys that a future integration can use
to join a registry entry with live data from the providers layer above,
without changing the registry's shape. Nothing in `data/projects/` performs
network requests; it is deliberately inert, canonical data.

## Dashboard Architecture

The dashboard is a shell plus a grid of independent widgets:

```
 DashboardLayout
   ├── Sidebar / MobileSidebar        (navigation)
   ├── Topbar                          (breadcrumb, search, network status, user menu)
   ├── LiveStatusBar                   (persistent live ticker strip)
   └── main
        └── DashboardPage
             ├── WelcomeHeader
             ├── IntelligenceBrief
             ├── KPIRow
             └── Widget grid: Portfolio · Market · Trending ·
                 AI Projects · Whale Activity · Signals ·
                 Narrative Heatmap · Project Spotlight ·
                 Activity Feed · Watchlist
```

Every widget is wrapped in a shared `WidgetCard`, giving all of them the
same last-updated timestamp treatment and action menu regardless of what
they render internally. This keeps the grid visually consistent even though
each widget's data shape and content are unrelated. The layout also reserves
(but does not yet populate) a right-hand "Intelligence Rail" region for
future desktop-only content, without requiring another layout change when
that ships.

## Theming

Theming is handled by `next-themes` at the root layout, using the standard
`class`-based strategy: a `dark` class is toggled on `<html>`, and Tailwind's
`dark:` variant reacts to it everywhere.

Color values themselves are defined once, as CSS custom properties in
`app/globals.css`, under a Tailwind v4 `@theme` block — a `radar-*` palette
(background, surface, card, primary, accent, success/warning/danger, muted,
plus explicit `radar-light-*` counterparts) sitting alongside the
shadcn-derived base tokens (`--color-primary`, `--color-card`, etc.) that
`components/ui/button.tsx` and other shadcn-derived primitives rely on.
Components reference semantic token names (`bg-radar-bg`,
`text-radar-light-text`) rather than raw hex values, so the light and dark
palettes can evolve independently of component code. `ThemeToggle` reads and
writes the active theme; a `useSyncExternalStore`-based mount check avoids
hydration mismatches between the server's default render and the client's
resolved theme.

## Routing

Routing is Next.js App Router, file-based, with exactly two route trees
today:

```
/              → app/page.tsx            Landing page
/dashboard     → app/dashboard/page.tsx  Dashboard (wrapped by app/dashboard/layout.tsx)
```

`app/layout.tsx` is the root layout for the whole app (fonts, `ThemeProvider`).
`app/dashboard/layout.tsx` is a nested layout scoped to `/dashboard`: it
fetches the live ticker once per request and wraps every dashboard page in
`DashboardLayout`, so any future page added under `app/dashboard/*` (e.g. a
Projects Explorer) automatically inherits the sidebar, topbar, and status
bar without repeating that wiring.

## Future Expansion

The architecture is deliberately shaped so the following can be added
without restructuring what already exists:

- **New dashboard pages** (Projects Explorer, AI Research Center, Signals &
  Alerts) — each is just a new folder under `app/dashboard/`, inheriting the
  shell for free via the nested layout.
- **Joining the Project Registry to live data** — registry entries already
  carry the provider identifiers needed; this becomes a new aggregator
  function that reads from both `data/projects` and `lib/data/providers`,
  with no change to either.
- **New providers** (e.g. a paid whale-transfer or wallet-balance API) —
  added as a new module in `lib/data/providers/`, wired into `aggregate.ts`,
  invisible to every widget.
- **A general aggregator/service layer** beyond today's per-widget
  functions — `aggregate.ts` is already the single seam where this would
  grow, so widgets remain unaffected.
- **Wallet connect** — would introduce a new, genuinely client-side data
  source (the connected wallet) that the Portfolio and Watchlist widgets are
  already shaped to accept in place of their current mock data.

## Future Intelligence Engine

[docs/ROADMAP.md](ROADMAP.md) names an "Intelligence Engine" milestone
sitting between the current per-widget Services Layer and the future
Projects Explorer/Research pillars described in
[PRODUCT_VISION.md](PRODUCT_VISION.md#product-pillars). This section
describes, at a planning level, what that would extend rather than
replace.

Today, `getIntelligenceBrief()` in `lib/data/aggregate.ts` is the closest
thing to an "intelligence" function in the codebase: it composes four other
aggregator results (`getKpis`, `getMarketOverview`, `getWelcomeStats`,
`getSignals`) into a handful of human-readable points. It is a fixed,
hand-written composition — not a general engine.

A future Intelligence Engine would generalize that composition step into
its own layer:

```mermaid
flowchart TD
    Prov["Providers Layer<br/>lib/data/providers/*"] --> Eng["Intelligence Engine (planned)"]
    Reg["Project Registry<br/>data/projects/"] --> Eng
    Eng --> Brief["Intelligence Brief"]
    Eng --> Signals["Signals & Alerts"]
    Eng --> Spotlight["Project Spotlight / Research views"]
```

Planning notes (not implemented, no timeline):

- It would sit **above** the Services Layer, not replace it — individual
  aggregator functions would remain the source of truth for a single
  widget's data; the engine's job would be cross-cutting synthesis (e.g.
  "this project's TVL growth plus its GitHub activity plus its narrative
  category together suggest X").
- It is the natural home for the "narrative/category classification"
  gap already called out in [docs/API.md](API.md#future-provider-interfaces)
  — today `getTrendingNarratives()` and `getNarrativeHeatmap()` return
  curated mock data specifically because no such classification exists yet.
- It would be the first consumer that reads **both** the Project Registry
  and the live Providers Layer in the same function, using the
  `providerIds` already defined on every `Project` — the join point
  [docs/ARCHITECTURE.md](#project-registry) already anticipates.
- Signals & Alerts (see [docs/ROADMAP.md](ROADMAP.md)) would likely be
  built as a consumer of this engine rather than a standalone
  DexScreener-only function like today's `getSignals()`.
