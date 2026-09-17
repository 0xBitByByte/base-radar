# Performance Audit

**Status:** Research and audit only. No code was changed to produce this
document. It is a factual record of the current architecture as of this
session, ranked findings, and a roadmap of *recommendations* — none of
which are authorized for implementation by this document itself.

This audit sits alongside, not inside, the four Product Standards produced
earlier in this initiative ([TRUSTED_PROJECT_FRAMEWORK.md](TRUSTED_PROJECT_FRAMEWORK.md),
[GOOD_PROJECT_EVALUATION_FRAMEWORK.md](GOOD_PROJECT_EVALUATION_FRAMEWORK.md),
[INFORMATION_HIERARCHY_STANDARD.md](INFORMATION_HIERARCHY_STANDARD.md),
[NAVIGATION_CLICKABILITY_STANDARD.md](NAVIGATION_CLICKABILITY_STANDARD.md),
[DESIGN_SYSTEM_LOCK.md](DESIGN_SYSTEM_LOCK.md)) — those govern product/UX
decisions; this governs engineering/runtime ones. It is grounded in
[ARCHITECTURE.md](ARCHITECTURE.md) and [API.md](API.md), which describe the
same provider/service layers from a structural rather than performance
angle. [LOADING_STRATEGY.md](LOADING_STRATEGY.md) picks up where this
document leaves off on the rendering/streaming architecture specifically —
that document audits the *experience* of waiting (skeletons, spinners,
Suspense-fallback quality), not the cost of it.
[REGISTRY_PIPELINE_INVESTIGATION.md](REGISTRY_PIPELINE_INVESTIGATION.md)
goes one level deeper still, into `getLiveProjects()` itself — the single
function this document's own H1 finding and the Loading Strategy's own
PR-085.02D investigation both eventually trace every page's data
dependency back to.

**An explicit, load-bearing caveat before anything else:** this audit is
based entirely on static code reading (file paths, line numbers, and the
codebase's own doc comments where they state a "measured" timing). **No
Lighthouse run, no synthetic monitoring, no live request instrumentation,
and no bundle analyzer were executed as part of this audit.** Every timing
figure quoted below (e.g. "measured at 1-2s," "observed 4-25s") is a
first-party claim already present in the codebase's own comments, cited as
such — not a number this audit independently reproduced. Real Core Web
Vitals (LCP, TTFB, FCP, INP) were not measured and are explicitly marked
**Not Measured** wherever the requested audit topic touches them.

---

## Executive Summary

Base Radar's data-fetching architecture shows real, deliberate engineering
discipline in several places: every provider call routes through a single
never-throw contract with retry/timeout/rate-limit handling
(`lib/providers/common/utilities.ts`); the Project Profile page has a
genuinely well-designed fast-path/slow-path split, computing Health/Risk/
Confidence from fast data and streaming slower GitHub/DefiLlama/Blockscout
data in behind `Suspense`; and the dashboard/project-directory pages
deliberately choose synchronous rendering specifically so their
`loading.tsx` fallback fires correctly — a documented, reasoned tradeoff,
not an oversight.

The audit also found two genuine architectural gaps that outrank everything
else in severity: **the Explorer sub-pages (Governance/Whale/Contracts/
Pools) have no pagination or virtualization at all** — the full fetched,
filtered, and sorted list renders unbounded in one page load — and **the
Project Profile route computes full project intelligence twice in a single
request**, once for the page itself (deliberately bypassing the shared
cache to stay fast) and once more, for every other registry project, just
to compute one category rank — a cost the code's own comment already
measures at 1-2 seconds.

Beneath those two, this audit found a consistent pattern: individually
cheap operations that are not memoized and therefore repeat on every
render (10+ separate filter/sort passes over the same project array on
`/dashboard/projects`, a doc comment that claims "one pass" where the code
does ten), and a client/server boundary that is mostly well-drawn but has
a few concrete, named leaks (a dialog subtree that's code-split in one
call site and statically bundled in another for the exact same route; a
shared card component whose bundle cost silently depends on which parent
imports it). None of these findings were fabricated or extrapolated beyond
what the code shows — where a claim from this session's own prior context
did not hold up against a fresh reading of the code, that discrepancy is
recorded explicitly rather than silently carried forward (see the
Discrepancies subsection below).

### Discrepancies found against this session's own prior assumptions

Two claims repeated earlier in this initiative did not survive a fresh
read of the current code and are corrected here, in the interest of the
same anti-fabrication discipline this whole audit is held to:

1. `components/command/SearchBar.tsx` **no longer exists** — it was a
   predecessor to today's `CommandSearch.tsx`/`CommandPalette.tsx`. The
   undebounced-keystroke-search behavior it was cited for is real, but
   lives in `CommandSearch.tsx` today.
2. `getMembershipProjectIds()` allocating a fresh array reference "every
   call" is only true in the edge case where zero watchlists exist. In the
   normal case (≥1 watchlist — guaranteed by `buildDefaultState()`), it
   returns a stable reference. This is narrower than a prior "confirmed
   bug" characterization implied.

---

## STEP 1/2 — Architecture As Read (Findings Only)

*(Full evidence — exact file:line citations for every claim below — is in
this document's accompanying chat responses, per this initiative's
established "findings-only, no file duplication" convention. Summarized
here for permanent reference.)*

### Rendering architecture

Every `page.tsx` in the app (36 files) is a Server Component — no
exceptions. Two coexisting, both-deliberate rendering strategies are in
use:

| Strategy | Where | Why (per the code's own comments) |
| --- | --- | --- |
| Synchronous top-level `await`, no inner `Suspense` | `/dashboard` (10-call `Promise.all`), `/dashboard/projects`, `/` | So the route's own `loading.tsx` actually fires — a nested `Suspense` boundary catches its own suspension locally and never bubbles up to trigger the route-level fallback |
| Promise-threading + `use()` + per-leaf `Suspense` | Dashboard shell (`tickerPromise`, `liveProjectsPromise`), Project Profile page (13 separate promises) | Lets fast content (Health/Risk/Confidence, page chrome) render immediately while genuinely slow provider calls (GitHub commit activity, DefiLlama TVL history — comment-documented at 4-25s) stream in independently |

Only 3 of the app's 30+ routes have their own `loading.tsx` (`/dashboard`,
`/dashboard/projects`, `/dashboard/projects/[slug]`); only 2 have their own
`error.tsx`. Every other route inherits from its nearest ancestor. The
5 async Explorer sub-pages (Governance/Whale/Contracts/Pools/AI) make real,
awaited network calls with no `loading.tsx` of their own. The root
marketing segment (`/`, `/about`, `/contact`, `/legal/*`) has no
`loading.tsx`/`error.tsx` in its ancestor chain at all.

**A documented, first-party tradeoff on the Project Profile page,** quoted
because it is load-bearing: Health/Risk/Confidence/AI Insight/Executive
Summary are computed once from fast-path data only (`buildProjectIntelligence(..., {extended:false})`)
and never recomputed once the slower commit-activity/TVL data streams in —
meaning a project's Health score, as first rendered, never reflects that
project's own commit activity or TVL trend, by design.

### Client/Server component boundary

143 files carry a genuine `"use client"` directive (a naive grep finds 146
— 3 are false positives where the string appears only in a doc comment,
including `LiveProjectCard.tsx`, which is genuinely a Server Component
despite referencing the pattern in prose). Of the 143, 142 have a real,
identifiable reason (interactive state, a client-only library like
`framer-motion`/`@base-ui/react`/`recharts`, or a framework requirement
like `error.tsx`). Exactly **one** file — `components/command/CommandResults.tsx`
— has no client-requiring code of its own and is redundant given its
parent (`CommandResultsAsync.tsx`) and grandchild (`CommandItem.tsx`)
already establish the boundary. This has zero practical bundle effect
today since the tree is client either way, but is the one clean example of
an unnecessary boundary found in this audit.

A more consequential, route-dependent version of the same issue:
`LiveProjectCard.tsx` (Server Component, no directive) contributes zero
client JS when composed from a Server Component parent (`AIProjectsWidget`,
`ProjectSpotlight`, `ProjectRail`, `ProjectsDirectory`, `ProfileRelatedProjects`),
but its full module — including otherwise-server-only children
(`TrustIndicators`, `RiskBadge`, `ProjectStatusBadge`, `ChainBadgeGroup`) —
ships as client JS when the same component is statically imported directly
into a Client Component file (`WatchlistWidget.tsx`, `WatchlistEditor.tsx`,
`WatchlistsWorkspace.tsx`), because Next.js's client/server boundary is
determined by module-graph reachability from a `"use client"` entry point,
not by whether the individual leaf declares its own directive.

### Data provider architecture and caching

Caching happens at three genuinely distinct, non-overlapping layers, and
the codebase's own comments explain why each exists independently:

1. **Provider-layer TTL cache** (`lib/providers/common/cache.ts`) — a
   hand-rolled, process-lifetime, in-memory `Map` with in-flight
   deduplication, deliberately independent of Next.js's fetch cache "so
   this layer works anywhere it's imported, not only inside a Next.js
   request." TTLs range from 20s (Base RPC) to 600s (GitHub). Every
   `client.ts` fetch explicitly sets `cache: "no-store"` to opt out of
   Next's own fetch cache, since this layer owns freshness itself.
2. **React `cache()`** — used in exactly 2 files (`lib/projects/service.ts`'s
   `getLiveProjects`, and `lib/data/aggregate.ts`'s 15 exported dashboard
   aggregate functions). Request-scoped, per-argument memoization only.
3. **Next.js `unstable_cache()`** — **zero usages anywhere in the
   codebase.** Confirmed by exhaustive grep.

**A structural gap found in this layering:** `runDiscoveryPipelineAgainstRegistry()`
(the Discovery pipeline's 8-provider fan-out) carries no `cache()` boundary
of its own — it only benefits from request-scoped memoization because its
one current caller (`lib/projects/service.ts`) happens to be `cache()`-
wrapped. If a second call site were added that called it directly, it
would re-run the full 8-provider discovery fan-out uncached. Not currently
exercised (only one caller exists today), but a real latent gap.

**A real, confirmed double-computation on the Project Profile route:** the
page's own fast-path call (`buildProjectIntelligence(registryProject, undefined, {extended:false})`,
`app/dashboard/projects/[slug]/page.tsx:235`) bypasses `getLiveProjects()`/
`cache()` entirely. Later in the same request, when category-rank data is
needed, the page separately calls `getLiveProjects()` — which internally
rebuilds `ProjectIntelligence` (Health, Confidence, AI Rating) for **every**
registry project, including the one whose intelligence was already built
at line 235. The page's own comment states this second call is "measured
at 1-2s on its own... purely to rank this project among its peers."

**`buildCollections()`'s doc-comment discrepancy:** the function's comment
claims "one pass over `projects`"; the implementation performs 9 separate
`.filter()` calls plus one more grouping loop — 10 full O(n) passes, not
one. `loadProjectsPageData()` (the caller, used by `/dashboard/projects`)
adds roughly 12 more filter/sort passes for its 5 leaderboards and 2
"smart view" lists. None of this transformation-layer work is memoized
beyond the underlying `getLiveProjects()` cache — it re-runs on every
render of that route.

### Dashboard widgets

The dashboard page's one `Promise.all` genuinely covers 10 of its data
needs in parallel; most widgets render purely from props with no
independent fetch. Two real exceptions: `MarketWidgetLive` re-polls the
same network-status data client-side every 45s on top of the initial
server fetch, and 6 separate widgets (`AIIntelligenceWidget`, `BriefWidget`,
`PortfolioIntelligenceWidget`, `NotificationWidget`, `AutomationWidget`,
`TimelineWidget`) each independently mount the same composite
`usePersonalizedDashboard()` hook. That hook's underlying stores are
themselves reference-equality-cached (each getter only recomputes when its
own upstream reference actually changed), so 6 mounts means 6× the
subscription/`useMemo` overhead, not 6× the actual computation.

### Search / Command Palette

Filtering is a flat, unindexed, weighted-substring scan
(`lib/search/globalSearch.ts`) re-run synchronously on every keystroke,
with no debounce anywhere in the call chain. The in-memory list it scans
is small today — a ~20-project static registry plus a handful of commands/
alerts/timeline entries, well under 100 items total — so the practical cost
is currently negligible. This is a real scaling risk, not a current
performance problem: the registry is expected to grow substantially (a
codebase comment elsewhere references a "~1,000-project catalog" as the
long-run target for the combined registry+discovery output).

### Explorer pages

The Governance/Whale/Contracts/Pools sub-Explorers all share one shape:
fetch the full list once, then `.filter()`/`.sort()` in-memory driven by
`searchParams` — with **no pagination and no virtualization** on any of
the four (confirmed by grep across all four `page.tsx` files and their
`*ExplorerList.tsx` renderers — no `slice()`, no page-size constant, no
`react-window`/`react-virtual` import or dependency anywhere in the repo).
The main Projects Directory, by contrast, does implement real (in-memory)
pagination via `paginateLiveProjects()`. `ExplorerTable.tsx`/`ExplorerGrid.tsx`
— a separate, older table/grid component family — appear to be dead code:
zero JSX usages of either were found anywhere in the live route tree.

### Charts

`recharts` is the only charting library in the app, and `ProfileChart.tsx`
is the only component that imports it directly — narrowly scoped to the
Project Profile page's four chart consumers. No downsampling or
decimation step exists between a provider's raw time-series response and
the chart component; for a multi-year-old project's "ALL" period view,
CoinGecko's `days=max` response (typically daily granularity) can hand the
chart several hundred to roughly 1,000+ raw points with zero
pre-aggregation.

### Hydration boundaries

20 separate hooks built on `useSyncExternalStore` over `localStorage`-backed
module singletons (Watchlists, Alerts, Notifications, Automation, Portfolio,
Timeline, Sync status, Account, and more) all supply an explicit
`getServerSnapshot` that differs from the real client value — a
correct, deliberate pattern that avoids a hard hydration-mismatch error,
at the cost of every one of these values rendering as empty/placeholder on
first client paint and swapping to real data a tick after hydration
commits, on every hard page load. This is not hypothetical: the codebase's
own `useRelativeTime.ts` doc comment describes a real, previously-shipped
regression from exactly this class of pattern (a stuck placeholder inside
a streamed Suspense boundary, fixed in a documented prior PR).

### Bundle composition

`package.json` lists 11 runtime dependencies — a genuinely small surface.
`@tanstack/react-table` is confirmed still unused (not in `package.json`,
not in the lockfile, zero source imports; the `node_modules/@tanstack/`
directory that exists is empty, a leftover). No duplicate libraries were
found in any category (dates, charts, animation). One dependency-hygiene
item: `shadcn` (a codegen CLI with zero runtime imports) is listed under
`dependencies` rather than `devDependencies`.

`next/dynamic` is used in exactly one file, two call sites
(`components/account/AccountMenu.tsx`, deferring `AccountProfileDialog`
and `SyncStatusCard` until first click). `React.lazy` is used nowhere.
**A confirmed inconsistency:** `SyncStatusCard` is deferred via
`next/dynamic({ssr:false})` from `AccountMenu.tsx`, but `Topbar.tsx` (part
of the dashboard shell mounted on every route) also renders it via a plain
static import — so the ~535-line dialog subtree (`SyncStatusCard` + its 3
nested dialogs) is in every dashboard route's initial bundle regardless of
the deferral in `AccountMenu.tsx`, which only prevents a second, redundant
reference.

`framer-motion` is imported at the true application root
(`app/layout.tsx` → `SplashScreen.tsx`, mounted on every route including
the marketing pages), plus two further, independent touchpoints inside the
dashboard shell (`DashboardLayout.tsx`'s `MotionConfig`,
`app/dashboard/template.tsx`'s per-navigation transition) — three stacked,
independent instantiations across the app's two root-adjacent layout
files. The Command Palette's full subtree (search index, results list,
project rows) is statically imported into `Topbar.tsx` and is not
code-split, despite being an overlay opened only on ⌘K.

No bundle analyzer was run as part of this audit — every claim above is a
structural/import-graph fact (what is statically reachable from where),
not a measured byte count.

---

## STEP 3 — Industry Research Findings

Research conducted for this audit, principles extracted only:

- **Next.js / Vercel (official current guidance):** streaming and
  `Suspense` let the server send parts of a page as they're ready, with
  `loading.tsx`/manual `Suspense` boundaries defining where a static shell
  ends and dynamic streaming begins; HTTP/2 delivers content in document
  order, so the most important above-the-fold data should be in the first
  Suspense boundary encountered. Partial Prerendering (PPR) — prerendering
  a route's static shell at build time and streaming dynamic content into
  it at request time — remains an experimental, opt-in feature as of this
  research (`experimental.ppr` in `next.config`), not yet the default.
  Next.js 16.2 stabilized `use cache`/`cacheLife`/`cacheTag`/`updateTag`,
  removing the `unstable_` prefix — Base Radar's own `unstable_cache()`
  non-usage means this stabilization doesn't require any migration, but is
  relevant context for any future adoption.
- **React / Vercel on `cache()` and deduplication:** React's `cache()`
  deduplicates requests within a single render pass — exactly the
  mechanism Base Radar's own `lib/data/aggregate.ts` comment describes
  using it for. `cacheSignal` (a newer React API) lets code know when a
  `cache()` lifetime has ended, to cancel in-flight work no longer needed
  after render completes — not currently used anywhere in Base Radar,
  relevant only if a future provider call needs cancellation semantics.
- **Google Web Vitals / Chrome (2026 current guidance):** thresholds are
  LCP ≤ 2,500ms, INP ≤ 200ms, CLS ≤ 0.1, all at the 75th percentile,
  required simultaneously. Commonly cited real-world techniques: splitting
  large dashboard modules into asynchronously-loaded components (directly
  relevant to this audit's Explorer-pagination and code-splitting
  findings), and edge/CDN delivery. Base Radar's own Core Web Vitals were
  **not measured** in this audit.
- **Shopify Hydrogen:** combines streaming SSR (fast first render) with
  React Server Components (efficient post-render updates) and built-in
  caching/data-fetch policies — architecturally the same combination of
  primitives Base Radar's own Project Profile page already uses
  (streaming + RSC + a custom caching layer), independently arrived at
  rather than copied.
- **Stripe Engineering / Linear Engineering:** no specific, citable public
  posts on streaming/server-rendering architecture were found via search
  for this audit — noted honestly rather than fabricating a finding to
  fill the requested source list.

---

## STEP 4 — Performance Findings

Findings are ranked by severity. **Estimated Impact/Complexity/Risk are
qualitative engineering judgments made for this audit, not measurements** —
marked as such throughout.

### Critical

**C1 — Explorer sub-pages have no pagination or virtualization**
- **Description:** the Governance, Whale, Contracts, and Pools Explorer
  routes (all under `app/dashboard/projects/[slug]/`) each fetch their full
  dataset once, filter/sort it in-memory, and render every matching item in
  one unbounded list.
- **Evidence:** confirmed via grep across all four `page.tsx` files and
  their `*ExplorerList.tsx` renderers — no `slice()`, no page-size
  constant, no windowing logic; `package.json` has no virtualization
  dependency (`react-window`/`react-virtual`/`react-virtuoso`).
- **Current implementation:** e.g. `governance/page.tsx` — one
  `fetchEvents()` call, then `.filter()`/`.sort()` from `searchParams`,
  rendered via `GovernanceExplorerList`'s plain `.map()` over the full
  result.
- **Why it matters:** for a project with a large proposal/whale-event/pool
  count, the entire set is fetched, transformed, and mounted into the DOM
  in one pass — a real, unbounded render-cost and memory footprint that
  scales linearly with that project's on-chain activity, with no ceiling.
- **Estimated impact:** High for any project with a large event count;
  currently masked by the app's relatively small, curated registry.
- **Estimated complexity:** Medium — the main Directory's own
  `paginateLiveProjects()` pattern is a directly reusable precedent.
- **Estimated risk:** Low — additive, doesn't touch existing data-fetch
  contracts.

**C2 — Project Profile page computes full project intelligence twice per request**
- **Description:** the page's fast-path call to `buildProjectIntelligence()`
  bypasses the shared `cache()`-wrapped `getLiveProjects()` path entirely;
  a second, later call to `getLiveProjects()` (for category-rank
  comparison) rebuilds Health/Confidence/AI Rating for every registry
  project, including the one already computed moments earlier.
- **Evidence:** `app/dashboard/projects/[slug]/page.tsx:235` (fast-path
  call, not cache-routed) and `:429` (the `getLiveProjects()` call for
  rank), with the page's own comment at lines 418-427 stating the rank
  call is "measured at 1-2s on its own."
- **Current implementation:** two independent computation paths for
  overlapping data within one request.
- **Why it matters:** this is a self-documented, already-measured 1-2s
  cost on a route the app's own architecture otherwise goes out of its way
  to make fast (the entire fast-path/slow-path streaming split exists
  specifically to minimize this page's time-to-first-paint).
- **Estimated impact:** High — directly, measurably adds to this route's
  server response time, on every single project-profile page load.
- **Estimated complexity:** Medium-High — would require either restructuring
  how category rank is computed (e.g. a lighter-weight ranking-only query
  that doesn't rebuild full intelligence) or routing the fast-path call
  through the same cache the rank calculation uses.
- **Estimated risk:** Medium — touches the page's core data-fetch sequence,
  which the existing doc comments show was already tuned carefully once.

### High

**H1 — `buildCollections()`/`loadProjectsPageData()` perform ~20 unmemoized full-array passes per render**
- **Description:** `buildCollections()` does 10 full passes (9 filters + 1
  grouping loop) despite its own comment claiming one pass;
  `loadProjectsPageData()` adds roughly 12 more filter/sort passes for
  leaderboards and smart views — none of this transformation work is
  memoized beyond the base `getLiveProjects()` cache.
- **Evidence:** `lib/projects/collections.ts:105-119` (comment vs.
  implementation mismatch), `components/projects/loadProjectsData.ts:53-95`.
- **Current implementation:** plain, unmemoized functions re-run on every
  render of `/dashboard/projects`.
- **Why it matters:** this route's core rendering cost scales with
  registry size × number of derived views, recomputed on every request
  even though the underlying data (`projects`) is already cached.
- **Estimated impact:** Medium today (small registry), rising directly
  with registry growth.
- **Estimated complexity:** Low — wrapping the existing pure functions in
  `cache()` or restructuring `buildCollections()` into genuinely one pass
  with multiple accumulators are both straightforward, additive changes.
- **Estimated risk:** Low.

**H2 — Chart data has no downsampling**
- **Description:** `ProfileChart.tsx` receives raw provider time-series
  data with no decimation step; a multi-year "ALL" period can pass several
  hundred to ~1,000+ raw points directly into `recharts`.
- **Evidence:** `ProfileChart.tsx:76` (`data` passed straight into
  `AreaChart`), `app/dashboard/projects/[slug]/actions.ts:18-24`
  (`ALL: "max"` period mapping to CoinGecko's `days=max`).
- **Current implementation:** no `.filter()`/sampling/aggregation between
  the provider result and the chart render.
- **Why it matters:** `recharts` (an SVG-based charting library) renders
  every data point as real DOM/SVG nodes — an unbounded point count
  directly affects render cost and interaction smoothness for older
  projects with long price histories.
- **Estimated impact:** Medium — bounded by CoinGecko's own response size
  (not unbounded), but real for older/high-history projects.
- **Estimated complexity:** Low — a simple point-reduction (e.g. every
  Nth point, or a min/max/avg bucketing pass) at the data-fetch boundary.
- **Estimated risk:** Low.

**H3 — `SyncStatusCard`'s code-splitting is undermined by a second static import**
- **Description:** `AccountMenu.tsx` defers `SyncStatusCard` via
  `next/dynamic({ssr:false})`, but `Topbar.tsx` (mounted on every
  dashboard route) statically imports the same component, putting its full
  ~535-line dialog subtree in every dashboard route's initial bundle
  regardless.
- **Evidence:** `components/account/AccountMenu.tsx:22-29` (dynamic
  import) vs. `components/dashboard/Topbar.tsx:19` (static import),
  `AccountMenu.tsx`'s own doc comment (lines 13-21) stating the explicit
  goal of the dynamic wrapper is deferring this "out of every dashboard
  route's initial JS" — a goal the static import in `Topbar.tsx` defeats.
- **Current implementation:** two import paths to the same component, one
  deferred, one not; the non-deferred one wins since it's the one actually
  reachable from the always-mounted shell.
- **Why it matters:** the deferral effort in `AccountMenu.tsx` currently
  provides zero actual bundle-size benefit, since the code it's deferring
  is already unconditionally present via `Topbar.tsx`.
- **Estimated impact:** Medium — a real, currently-inert code-splitting
  investment; fixing it would be a genuine (if modest, given the small
  overall dependency surface) bundle-size win.
- **Estimated complexity:** Low — align `Topbar.tsx`'s import with
  `AccountMenu.tsx`'s dynamic pattern.
- **Estimated risk:** Low.

**H4 — 20 hooks show an empty/placeholder flash on every hard page load**
- **Description:** every `useSyncExternalStore`-backed hook reading
  `localStorage`-backed state renders its documented `getServerSnapshot`
  placeholder on first client paint, then swaps to real data once
  hydration completes and the store's subscribe mechanism fires.
- **Evidence:** 20 hooks under `lib/hooks/` confirmed via grep for
  `getServerSnapshot`/`SERVER_SNAPSHOT`, e.g. `useWatchlists.ts:34-41`,
  `useNotifications.ts:61-70`; `useRelativeTime.ts:7-22`'s own doc comment
  describing a real, previously-shipped regression from this exact class
  of pattern.
- **Current implementation:** correct with respect to avoiding a
  hydration-mismatch *error*, but does not avoid a visible content flash.
- **Why it matters:** a user with real watchlists/alerts/notifications sees
  the Sidebar's badge counts (and every other affected surface) briefly
  show zero/empty before the real numbers appear — a real, if brief, UX
  regression on every hard load, and a pattern that has already caused one
  documented bug elsewhere in the codebase.
- **Estimated impact:** Medium — cosmetic but real; severity depends on
  how perceptible the flash is in practice (not independently measured
  this session — no browser timing capture was performed).
- **Estimated complexity:** Medium — would likely require either
  server-side reading of a cookie-mirrored preference/watchlist snapshot,
  or accepting the flash as a known tradeoff of the localStorage-first
  architecture.
- **Estimated risk:** Medium — touches a pattern used in 20 places
  consistently; any fix needs to preserve that consistency.

**H5 — Command Palette search is undebounced and unindexed**
- **Description:** every keystroke in the ⌘K search input synchronously
  re-runs a flat, unindexed weighted-substring scan over the full
  in-memory item list.
- **Evidence:** `components/command/CommandSearch.tsx:18-30` (`onChange`
  fires synchronously, no debounce), `lib/search/globalSearch.ts:213-231`
  (flat `.map()`/`.filter()`/`.sort()` scan, no trie/index).
- **Current implementation:** works fine today because the scanned list is
  small (well under 100 items, given the ~20-project static registry).
- **Why it matters:** this is a scaling risk, not a current problem — the
  codebase's own comments reference a long-run "~1,000-project catalog"
  target, at which point an unindexed per-keystroke scan becomes a real
  interaction-latency concern.
- **Estimated impact:** Low today, rising directly with catalog size.
- **Estimated complexity:** Low — a simple debounce is trivial; a real
  search index is a larger, separate undertaking only justified once the
  catalog is meaningfully larger.
- **Estimated risk:** Low.

### Medium

**M1 — `framer-motion` mounted three times across root-adjacent layout files**
- **Description:** `SplashScreen.tsx` (true app root, every route),
  `DashboardLayout.tsx`'s `MotionConfig`, and `app/dashboard/template.tsx`'s
  per-navigation transition each independently pull in `framer-motion`
  usage in a component mounted unconditionally on broad swaths of the app.
- **Evidence:** `app/layout.tsx:7,85` → `SplashScreen.tsx:4`;
  `components/dashboard/DashboardLayout.tsx:4,43`;
  `app/dashboard/template.tsx:5`.
- **Why it matters:** none of these three is individually wrong (each
  serves a distinct, real animation purpose), but together they mean
  `framer-motion` — a library commonly flagged for bundle weight — is
  guaranteed to load on literally every route in the app, including
  static marketing pages, via `SplashScreen` alone.
- **Estimated impact:** Low-Medium — not measured in real KB this
  session.
- **Estimated complexity:** Low for `SplashScreen` specifically (it's a
  one-shot boot animation, a plausible candidate for a lighter, non-
  framer-motion implementation) — Medium if reworking all three.
- **Estimated risk:** Low.

**M2 — Command Palette subtree is not code-split**
- **Description:** the full Command Palette (search index, results list,
  project rows) is statically imported into `Topbar.tsx`, mounted on every
  dashboard route, despite being an overlay opened only on ⌘K.
- **Evidence:** `components/dashboard/Topbar.tsx:16` (static import of
  `CommandPalette`), no `next/dynamic` wrapper found anywhere in that
  chain.
- **Why it matters:** unlike `AccountProfileDialog`/`SyncStatusCard` (which
  at least have a `next/dynamic` attempt, even if undermined by H3), the
  Command Palette has no deferral attempt at all, despite fitting the same
  "opened rarely, on explicit user action" profile.
- **Estimated impact:** Low-Medium — not measured in real KB.
- **Estimated complexity:** Low — same `next/dynamic({ssr:false})` pattern
  already used elsewhere in the codebase.
- **Estimated risk:** Low.

**M3 — `LiveProjectCard`'s bundle contribution is route-dependent**
- **Description:** the same Server Component ships zero client JS on
  Explorer/Dashboard-widget routes, but non-zero client JS (dragging in
  otherwise-server-only children) on Watchlists routes, purely based on
  which parent imports it.
- **Evidence:** `components/projects/LiveProjectCard.tsx` (no directive)
  imported by both Server Component parents (`AIProjectsWidget.tsx`,
  `ProjectRail.tsx`, etc.) and Client Component parents
  (`WatchlistWidget.tsx`, `WatchlistEditor.tsx`, `WatchlistsWorkspace.tsx`).
- **Why it matters:** this is a structural fact worth knowing before
  adding more fields to `LiveProjectCard` (per the Universal Project Card
  Standard's own evolution rules) — a field added there has a
  route-dependent bundle cost that isn't obvious from reading the
  component in isolation.
- **Estimated impact:** Low today (the component itself is small);
  compounds as the component grows.
- **Estimated complexity:** N/A — this is an architectural characteristic
  to be aware of, not a defect with an obvious single fix.
- **Estimated risk:** N/A.

**M4 — `/dashboard` and `/dashboard/projects` fully block on their entire data set**
- **Description:** both routes deliberately await their complete data
  requirement (a 10-call `Promise.all`, or the full collections/leaderboards
  build) before any paint, specifically so `loading.tsx` fires correctly.
- **Evidence:** `app/dashboard/page.tsx:41-54`'s own doc comment explains
  the reasoning directly.
- **Why it matters:** this is a real, documented, deliberate tradeoff —
  included here not as an unexamined defect but as a measured architectural
  choice worth the Product Owner's awareness: these two routes' perceived
  load time is bound by their single slowest constituent call, with no
  partial/progressive rendering.
- **Estimated impact:** Not Measured — real-world effect depends on actual
  provider latencies at request time, which this audit did not capture.
- **Estimated complexity:** Medium-High to change (would require adopting
  the promise-threading/`Suspense` pattern already used elsewhere,
  trading away the current `loading.tsx`-firing guarantee unless PPR or
  an equivalent mechanism is adopted).
- **Estimated risk:** Medium — a deliberate, already-reasoned-through
  tradeoff; changing it without addressing the `loading.tsx` mechanism it
  depends on would be a regression, not an improvement.

### Low

**L1 — `CommandResults.tsx` carries a redundant `"use client"` directive**
- **Evidence:** `components/command/CommandResults.tsx:1`, no client-
  requiring code in the file itself, parent and grandchild already
  establish the boundary.
- **Why it matters:** code hygiene only — zero functional bundle effect
  confirmed, since the module tree is client either way.
- **Estimated impact / complexity / risk:** all Low.

**L2 — `shadcn` listed under `dependencies` rather than `devDependencies`**
- **Evidence:** `package.json` — zero source imports found anywhere for
  `shadcn` (it's the codegen CLI, confirmed via `components.json`).
- **Why it matters:** manifest hygiene only — no runtime/bundle impact,
  since nothing imports it.
- **Estimated impact / complexity / risk:** all Low.

**L3 — No bundle analyzer has ever been run**
- **Why it matters:** every bundle-related finding in this audit (H3, M1,
  M2, M3) is a structural/import-graph fact, not a measured byte count —
  without a baseline measurement, the real-world magnitude of any of these
  findings is unknown.
- **Estimated impact / complexity / risk:** Low complexity/risk to add
  (`@next/bundle-analyzer` is a standard, additive dev-only tool); the
  *value* of doing so is realized only once its output is read and acted
  on.

---

## STEP 5 — Performance Roadmap (Recommendations Only — Not Authorized for Implementation)

This roadmap organizes the findings above into phases by impact/risk
ratio. **No item in this roadmap is approved for implementation by this
document.** Publishing this roadmap is the deliverable; implementing any
item requires separate, explicit Product Owner approval per
[CLAUDE_PR_WORKFLOW.md](CLAUDE_PR_WORKFLOW.md)'s existing process.

### Phase 1 — High Impact / Low Risk

| Recommendation | Addresses | Expected benefit | Complexity | Risk | Dependencies |
| --- | --- | --- | --- | --- | --- |
| Run a bundle analyzer baseline (`@next/bundle-analyzer` or equivalent) before any bundle-related change | L3 | Turns every structural bundle finding (H3, M1, M2, M3) into a measured, prioritizable one | Low | Low | None |
| Align `Topbar.tsx`'s `SyncStatusCard` import with `AccountMenu.tsx`'s existing `next/dynamic` pattern | H3 | Recovers the code-splitting benefit already attempted but currently defeated | Low | Low | Bundle baseline (above), to confirm the win |
| Code-split the Command Palette via `next/dynamic({ssr:false})`, matching the existing `AccountMenu.tsx` precedent | M2 | Removes an always-loaded, rarely-opened overlay from every dashboard route's initial bundle | Low | Low | Bundle baseline |
| Debounce the Command Palette search input | H5 | Removes unnecessary re-scans on rapid typing, ahead of catalog growth | Low | Low | None |
| Wrap `buildCollections()`/`loadProjectsPageData()`'s derived views in `cache()`, or restructure `buildCollections()` into genuinely one pass | H1 | Removes ~20 redundant O(n) passes per `/dashboard/projects` render | Low | Low | None |
| Add a point-reduction/downsampling step to chart data at the fetch boundary | H2 | Bounds `recharts`' render cost for long-history projects | Low | Low | None |
| Move `shadcn` to `devDependencies` | L2 | Manifest hygiene | Low | Low | None |
| Remove the redundant `"use client"` on `CommandResults.tsx` | L1 | Code hygiene | Low | Low | None |

### Phase 2 — Architecture Improvements

| Recommendation | Addresses | Expected benefit | Complexity | Risk | Dependencies |
| --- | --- | --- | --- | --- | --- |
| Add pagination and/or virtualization to the Governance/Whale/Contracts/Pools Explorer routes | C1 | Removes the one unbounded-render risk found in this audit | Medium | Low | The main Directory's `paginateLiveProjects()` is a directly reusable precedent |
| Restructure the Project Profile page's category-rank computation to avoid a full second `ProjectIntelligence` rebuild | C2 | Removes a self-documented, already-measured 1-2s cost from every Profile page load | Medium-High | Medium | Requires care not to regress the page's existing, carefully-tuned fast-path/slow-path split |
| Add a `cache()` (or equivalent) boundary directly to `runDiscoveryPipelineAgainstRegistry()` | Discovery pipeline structural gap (§STEP 2) | Closes a latent gap before a second call site could exercise it uncached | Low | Low | None |
| Consolidate `framer-motion`'s three root-adjacent touchpoints, starting with replacing `SplashScreen`'s boot animation with a lighter mechanism | M1 | Reduces the guaranteed-on-every-route cost of one commonly-flagged-heavy dependency | Medium | Low | Bundle baseline, to confirm real benefit before investing |
| Add `loading.tsx` to the 5 async Explorer sub-pages | Loading-state gap (also flagged in NAVIGATION_CLICKABILITY_STANDARD.md/DESIGN_SYSTEM_LOCK.md) | Gives real, awaited network calls a visible loading state where none exists today | Low | Low | None — already independently recommended in two earlier Standards this session |

### Phase 3 — Progressive Enhancements

| Recommendation | Addresses | Expected benefit | Complexity | Risk | Dependencies |
| --- | --- | --- | --- | --- | --- |
| Evaluate adopting Partial Prerendering (PPR) for `/dashboard`/`/dashboard/projects` once it graduates from experimental | M4 | Could let these two routes ship a static shell instantly while streaming their dynamic data, without losing the `loading.tsx`-firing guarantee the current synchronous design depends on | High | Medium | Next.js's own PPR stabilization (currently experimental, per STEP 3 research) |
| Investigate server-side mirroring (e.g. a cookie-synced snapshot) for the highest-visibility `useSyncExternalStore` values (Sidebar's watchlist/alert counts specifically) | H4 | Reduces or eliminates the empty→real flash on the most visible, always-rendered surface | Medium-High | Medium | Would need to preserve the existing, consistent 20-hook pattern for everything not worth this investment |
| Build a real search index (trie/inverted index) for the Command Palette | H5 (long-run) | Only justified once the catalog is meaningfully larger than today's ~20 projects | Medium | Low | Catalog growth — not yet justified at current scale |

---

## STEP 6 — Future Enhancements

Kept strictly separate per the requested structure — none of the four
categories below authorize implementation.

### Immediate Improvements
(Everything in Phase 1 above — low-complexity, low-risk, addresses a
confirmed finding directly.)

### Future Improvements
(Everything in Phase 2 above — real architectural work, confirmed
findings, but requiring more design care before implementation.)

### Nice-to-have Optimizations
- PPR adoption once stable (Phase 3).
- A real search index for the Command Palette, once catalog growth
  justifies it (Phase 3).
- Server-mirrored hydration values for the highest-visibility
  `useSyncExternalStore` reads (Phase 3).

### Technical Debt
- `ExplorerTable.tsx`/`ExplorerGrid.tsx` and their supporting files appear
  to be dead code (zero live route usages found) — a deletion candidate,
  not a performance fix; already adjacent to the Universal Project Card
  Standard's own EN-002/EN-003 findings about this same component family.
- `buildCollections()`'s doc comment ("one pass") should be corrected to
  match its real 10-pass implementation, independent of whether the
  10-pass structure itself is ever changed.
- The category-rank computation's 1-2s cost (C2) is itself a form of
  technical debt in the sense that the page's own comments already
  identify and measure it as a known, accepted cost — this audit does not
  discover it so much as formally rank and cross-reference it.

---

## Provenance

Every codebase claim in this document is drawn from three direct,
current-session background audits — one covering rendering architecture,
data-provider caching, and the LiveProject/Registry/Discovery/Intelligence
pipelines (App Router structure, `"use client"` inventory by mechanism,
`Suspense`/streaming boundaries, `lib/providers/common/cache.ts`, React
`cache()`/`unstable_cache()` usage, `lib/projects/collections.ts`); one
covering per-page/feature fetch and render behavior (Dashboard,
Search/Command Palette, Project Profile, Explorer, Watchlists, Alerts,
Portfolio, Timeline, Notifications, Daily Brief, Charts); and one covering
client-component classification, dynamic imports, `package.json`'s full
dependency list, and hydration-boundary behavior across 143 `"use client"`
files. Every industry-practice claim is drawn from research conducted for
this audit (official Next.js/Vercel guidance on streaming/PPR/caching,
React's `cache()`/`cacheSignal`, 2026 Core Web Vitals thresholds, Shopify
Hydrogen's engineering blog) — see the corresponding chat responses this
document was delivered alongside for full source citations. Neither
category is asserted from unverified memory. Real Core Web Vitals (LCP,
TTFB, FCP, INP) and real bundle sizes were **not measured** in this audit
and are explicitly marked as such everywhere they are referenced.
