# Explorer — Product Requirements Document

**Status**: Draft
**Milestone**: Milestone 7 — Project Explorer (see [docs/ROADMAP.md](../ROADMAP.md#milestone-7--project-explorer))
**Scope of this document**: Product requirements only. No component design, no
wireframes, no technical implementation. Those belong in later documents in
this same `docs/explorer/` series (e.g. an information-architecture or
technical-design doc), once this PRD is agreed.

> A note on numbering: this document refers to the milestone by the name
> and number already recorded in [docs/ROADMAP.md](../ROADMAP.md) —
> **Milestone 7, Project Explorer** — which follows Milestone 5 (Provider
> Layer) and Milestone 6 (Intelligence Engine, already shipped).

---

## 1. Vision

The Explorer is the primary discovery experience for the Base ecosystem
inside Base Radar — the single place anyone can browse, filter, search, and
evaluate every project in the [Project Registry](../PROJECT_REGISTRY.md),
enriched with live data through the [Provider Layer](../API.md) and
synthesized by the [Project Intelligence Engine](../ARCHITECTURE.md#future-intelligence-engine).

Where today's dashboard shows a curated handful of widgets, the Explorer is
the registry's front door: every project Base Radar knows about, in one
browsable surface, with an honest picture of how much to trust what's shown
for each one.

This directly advances the "Discovery & Explorer" pillar already named in
[docs/PRODUCT_VISION.md](../PRODUCT_VISION.md#product-pillars) and the
Project Explorer milestone in [docs/ROADMAP.md](../ROADMAP.md#milestone-7--project-explorer).

## 2. Goals

- Make every project in the Project Registry browsable, filterable, and
  searchable — not just the handful the dashboard's curated widgets surface.
- Present each project's live signals (market, trading, TVL, GitHub
  activity, chain/network status) by consuming the Project Intelligence
  Engine's `ProjectIntelligence` model, never a raw provider response.
- Make data provenance, confidence, and freshness visible for every
  project, rather than presenting all information as equally certain.
- Establish the first UI surface that reads the Project Registry directly,
  creating the foundation later milestones (Signals, AI Research, Portfolio)
  can build on.

## 3. Non-Goals

Explicitly out of scope for the Explorer, for this milestone:

- **No trading, swapping, or wallet-connect functionality.** The Explorer is
  an information surface, not a transaction surface.
- **No user accounts, saved searches, or personalized views.** Portfolio and
  watchlist personalization are separate, later milestones (Milestone 9,
  per [docs/ROADMAP.md](../ROADMAP.md)).
- **No community-submitted or self-serve project submission flow.** Adding
  projects to the registry remains a PR-reviewed process, per
  [docs/PROJECT_REGISTRY.md](../PROJECT_REGISTRY.md#how-to-add-a-project).
- **No dedicated per-project detail page.** A full Project Details view is
  explicitly bucketed under the AI Research milestone
  (Milestone 10, per [docs/ROADMAP.md](../ROADMAP.md)), not this one. The
  Explorer's unit of detail is a project card/row, not a dedicated route.
- **No real-time/push updates.** Data is presented as of a snapshot, using
  the Intelligence Engine's own `Freshness` model — not a live-updating feed.
- **No new provider integrations, Project Registry schema changes, or
  Intelligence Engine changes.** This milestone consumes those layers as
  they exist today.
- **No UI, components, or code of any kind.** This document is a product
  requirements artifact, not an implementation.

## 4. Target Users

Inherited directly from [docs/PRODUCT_VISION.md](../PRODUCT_VISION.md#target-users),
framed here around discovery specifically:

- **Traders and researchers** who need to quickly scan the ecosystem for
  momentum, TVL movement, or trading activity across many projects at once.
- **Builders and founders** who want to see how their project is
  represented alongside the rest of the ecosystem, and how discovery works
  for projects like theirs.
- **Investors and analysts** who need to compare multiple projects'
  verifiable metadata and live metrics side by side.
- **Curious newcomers** who don't yet know what exists on Base and need a
  credible, browsable starting point rather than a search engine.

## 5. User Personas

Lightweight, directional personas — not exhaustive user research.

**Dana, the DeFi Researcher**
Tracks TVL and yield opportunities across several chains professionally.
Wants to filter Base projects by category (`lending`, `yield`, `dex`) and
sort by TVL or 24h change without reading five different explorers. Cares
whether a number is live or stale, and whether a project is independently
verified or just self-reported.

**Ravi, the Builder**
Shipping a new project on Base. Wants to see how discovery works for
projects at his stage — will an early-stage, `unverified`-status project
still show up and be findable? Cares about the registry's verification
policy being fair and transparent, not just for his own project's sake.

**Alex, the Newcomer**
Just heard about Base and wants to understand what's actually happening
on it beyond price charts. Doesn't know DeFi jargon well. Needs
categories/tags that are self-explanatory and a way to browse without
already knowing what to search for.

**Priya, the Analyst**
Evaluating several Base projects for a report or investment thesis. Needs
to compare GitHub activity, TVL, and market data across projects, and
needs to know explicitly when a data point is a heuristic (e.g. a
confidence or health score) rather than an authoritative third-party
metric.

## 6. Problems Being Solved

- **The Project Registry exists but has no browsing surface.** ~20 (and
  growing) projects are already modeled in `data/projects/`, but today
  they're only ever consumed internally by the dashboard's curated
  widgets — there is no page where a user can see the registry itself.
- **Fragmentation**, per [docs/PRODUCT_VISION.md](../PRODUCT_VISION.md#problems-solved):
  ecosystem information is scattered across explorers, DEX aggregators,
  Discords, and X threads.
- **Unverified information presented as fact.** Many project directories
  elsewhere don't distinguish reviewed data from self-reported claims. The
  registry already models this distinction (`verification.status`); the
  Explorer must be the first place that distinction is actually visible.
- **No single place to see registry data alongside live signals.** The
  registry is static; live data lives in the Provider Layer. Nothing today
  presents the two joined together for browsing — that's precisely what the
  Intelligence Engine was built to produce, and precisely what the Explorer
  is the first consumer of.

## 7. Jobs to Be Done

- "When I hear about a new Base project, I want to check whether it's
  verified and see real metrics for it, so I can decide how much to trust
  it before looking deeper."
- "When I'm researching an ecosystem category (e.g. lending or DeFi
  yield), I want to filter to that category and sort by a live metric, so
  I can find the highest-signal options quickly."
- "When I don't know what exists on Base yet, I want to browse by category
  or tag, so I can discover projects without already knowing their names."
- "When I'm comparing projects, I want to see each one's data confidence
  and freshness, so I don't mistake a stale or low-confidence number for a
  reliable one."
- "When a project has little or no live data available, I want that to be
  obvious, not hidden behind a number that looks authoritative."

## 8. MVP Scope

Grounded in what the Project Registry, Provider Layer, and Intelligence
Engine already support today — this milestone is about exposing existing
capability through a browsing surface, not extending those layers.

**In scope:**

- A browsable view over every project returned by the Project Registry.
- Filtering by the attributes the registry already models: category, tag,
  verification status, and chain.
- Full-text search across name, description, tags, and categories (the
  registry already supports this kind of matching).
- A per-project summary (card or row) showing:
  - Identity: name, short description, logo, categories, tags, status.
  - Market, Trading, and TVL signals from the Intelligence Engine, where
    available.
  - GitHub activity, where available.
  - Chain/network context, where available.
  - The Intelligence Engine's Health, Confidence, and Freshness — always
    shown, never hidden, including when data is unavailable.
- Sorting by attributes the Intelligence Engine already computes (e.g.
  name, TVL, market cap, health score).
- Honest empty/unavailable states — a project with no live signals should
  read as "no live data available," not as a broken or empty card,
  consistent with the "Demo data" badge precedent already established in
  the dashboard.

**Explicitly not in MVP** (see Non-Goals and Future Scope):

- A dedicated per-project details route.
- Saved filters, personalization, or comparison tooling.
- Pagination/infinite-scroll infrastructure (unnecessary at the registry's
  current size of ~20 projects).

## 9. Future Scope

Directionally named, not committed — sequenced against the milestones
already in [docs/ROADMAP.md](../ROADMAP.md):

- **Project Details** — a dedicated deep-dive view per project, under the
  AI Research milestone (Milestone 10).
- **Signals integration** — surfacing the Signals milestone's (Milestone 8)
  output alongside Explorer listings.
- **Comparison view** — side-by-side comparison of multiple projects'
  Intelligence Engine data.
- **Personalization** — saved filters, watchlist stars, and other
  Portfolio-milestone (Milestone 9) touches once accounts/wallet connect
  exist.
- **Semantic/fuzzy search** — already anticipated architecturally in
  [docs/DATABASE.md](../DATABASE.md#future-search-index) and
  [docs/DATABASE.md](../DATABASE.md#future-vector-database); not required
  at the registry's current scale.
- **Pagination or virtualization** — only relevant once the registry grows
  well beyond what fits comfortably in a single client-side list.

## 10. Functional Requirements

Expressed as capabilities, not implementation:

1. Users can view a list of all projects in the Project Registry.
2. Users can filter the list by category, tag, verification status, and
   chain, individually or in combination.
3. Users can search the list by free-text query matching project name,
   description, tags, and categories.
4. Users can sort the list by at least: name, TVL, market cap, and health
   score.
5. Each project's summary displays its registry identity fields (name,
   description, logo, website, categories, tags, status).
6. Each project's summary displays its Intelligence Engine data (Market,
   Trading, TVL, GitHub, Chain, Health) when available, and clearly
   indicates when a given signal is unavailable rather than omitting it
   silently.
7. Each project's summary displays its Confidence and Freshness, so a user
   can judge how much to trust what they're looking at without needing to
   inspect anything further.
8. Each project's summary displays which data is registry-sourced (always
   present) versus provider-sourced (may be unavailable), consistent with
   the Intelligence Engine's `Sources` attribution.
9. The system communicates a project's verification status
   (`verified`/`community`/`unverified`/`flagged`) plainly, per
   [docs/PROJECT_REGISTRY.md](../PROJECT_REGISTRY.md#verification-status).
10. The experience degrades gracefully for any project with partial or no
    live data — this must be a first-class, designed-for state, not an
    edge case.

## 11. Non-Functional Requirements

- **Data efficiency**: the Explorer must consume the Intelligence Engine's
  batch entry point (building intelligence for every project via one
  shared round of Provider Layer calls) rather than issuing a separate
  full fetch per project, to respect free-tier provider rate limits (see
  [docs/API.md](../API.md#provider-layer)).
- **Consistency**: the Explorer must read as part of the same product as
  the existing dashboard — same design system, same theming, same
  component conventions — per [docs/DESIGN_SYSTEM.md](../DESIGN_SYSTEM.md)
  and [docs/CLAUDE_RULES.md](../CLAUDE_RULES.md#component-rules).
- **Accessibility**: keyboard navigability, visible focus states, and
  screen-reader-appropriate labeling for filters, search, and sort
  controls, consistent with existing accessibility patterns documented in
  [docs/DESIGN_SYSTEM.md](../DESIGN_SYSTEM.md#accessibility).
- **Responsiveness**: usable at desktop, tablet, and mobile widths,
  consistent with the rest of the product.
- **Theming**: correct in both dark and light themes.
- **Honesty over polish**: a heuristic score (Health, Confidence) must
  never be presented in a way that implies it is an authoritative
  third-party rating — this is a hard requirement, not a style preference,
  consistent with this project's established documentation and design
  philosophy.
- **No new infrastructure required**: the MVP must be servable entirely
  from the existing Project Registry, Provider Layer, and Intelligence
  Engine — no database, no new backend service.

## 12. Success Metrics

Metrics available without new analytics infrastructure (none exists in
this codebase today — see Assumptions):

- Every project in the registry renders in the Explorer without error,
  regardless of how much live data is available for it.
- Every rendered project shows a Confidence and Freshness value — zero
  projects silently omit them.
- Zero instances of a raw provider response shape reaching the UI (the
  Intelligence Engine's own architectural guarantee, carried through).
- Page load performs within the constraints of the Provider Layer's
  existing cache windows (no user-facing request should force a
  synchronous, uncached fetch across all six providers).

Metrics that require real usage data (aspirational, not measurable until
after launch and only if analytics are introduced later — not assumed or
scoped here):

- Time for a user to find a specific project via filter/search versus
  scrolling.
- Filter and sort usage distribution, to inform which facets matter most.

## 13. Risks

- **Sparse data coverage.** Many registry projects have few or no
  `providerIds` configured today, and even where configured, DefiLlama
  matching is a documented best-effort ("fuzzy") match and Blockscout
  contract verification is almost never resolvable with the current
  Provider Layer's public API (see
  [docs/ARCHITECTURE.md](../ARCHITECTURE.md#future-intelligence-engine)).
  The Explorer will show a meaningful number of "unavailable" states at
  launch — the design must treat this as an expected first-class state, not
  an edge case to hide.
- **Rate-limit exposure.** Building intelligence for every registry
  project on every Explorer page load fans out to all six providers;
  without care, concurrent users could approach free-tier limits (GitHub's
  60 req/hour unauthenticated cap being the tightest). Mitigation already
  exists at the Provider Layer (caching, rate-limiting) but the Explorer's
  request pattern must not defeat it.
- **Heuristic scores misread as authoritative.** Health and Confidence are
  transparent, documented heuristics, not third-party ratings. If not
  labeled clearly, users may over-trust them.
- **Registry scale is currently small.** ~20 projects today means some
  Explorer capabilities (pagination, heavy filtering UX) may feel
  over-built relative to current content volume; MVP scope deliberately
  avoids over-investing here.

## 14. Assumptions

- The Project Registry will continue to grow via the existing PR-reviewed
  process described in
  [docs/PROJECT_REGISTRY.md](../PROJECT_REGISTRY.md#how-to-add-a-project).
- The Provider Layer's six free-tier integrations remain available and
  within their documented rate limits; no paid provider is assumed.
- No user accounts or authentication exist at this milestone, so the
  Explorer is assumed to be a fully public, unauthenticated experience.
- No analytics/telemetry infrastructure exists in the application today;
  usage-based success metrics are aspirational only, not commitments.
- The Explorer is additive — it does not replace or require changes to
  the existing dashboard, landing page, or any other current surface.

## 15. Constraints

- **No database.** The Project Registry is static, file-based data (see
  [docs/DATABASE.md](../DATABASE.md)); the Explorer cannot support
  user-generated content, saved lists, or any write operation without a
  future persistence layer that does not exist yet.
- **No test suite.** No automated test runner exists in this repository
  today (see [CONTRIBUTING.md](../../CONTRIBUTING.md#testing-requirements));
  validation for any future implementation would rely on the same
  `tsc`/`lint`/`build` bar used elsewhere in this project until one exists.
- **Existing architecture must be respected.** Per
  [docs/ARCHITECTURE.md](../ARCHITECTURE.md) and
  [docs/CLAUDE_RULES.md](../CLAUDE_RULES.md), any future implementation
  must consume the Intelligence Engine's public entry point rather than
  reaching into the Provider Layer or Project Registry directly, and must
  not modify those layers to suit the Explorer.
- **This document does not authorize implementation.** Per this
  milestone's explicit scope, no UI, component, or routing work is
  authorized by this PRD alone.

## 16. Glossary

| Term | Meaning |
| --- | --- |
| **Project Registry** | The static, version-controlled dataset of Base ecosystem projects (`data/projects/`). See [docs/PROJECT_REGISTRY.md](../PROJECT_REGISTRY.md). |
| **Provider Layer** | The set of six free-tier data integrations (CoinGecko, DexScreener, DefiLlama, Blockscout, GitHub, Base RPC) at `lib/providers/`. See [docs/API.md](../API.md). |
| **Project Intelligence Engine** | The layer that joins the Project Registry with the Provider Layer into one normalized `ProjectIntelligence` model per project. See [docs/ARCHITECTURE.md](../ARCHITECTURE.md#future-intelligence-engine). |
| **ProjectIntelligence** | The Intelligence Engine's output model for a single project: Identity, Market, Trading, TVL, Contracts, GitHub, Chain, Community, Health, Sources, Confidence, Freshness, and Metadata. |
| **Verification Status** | The registry's own editorial trust signal for a project's metadata: `verified`, `community`, `unverified`, or `flagged`. See [docs/PROJECT_REGISTRY.md](../PROJECT_REGISTRY.md#verification-status). |
| **Confidence** | The Intelligence Engine's computed trust score for a given `ProjectIntelligence` record, based on verification status and live-source match quality. |
| **Freshness** | The Intelligence Engine's computed recency classification for a project's live data, based on provider fetch timestamps. |
| **Health** | The Intelligence Engine's transparent, heuristic composite score summarizing how "alive" a project looks — not a third-party metric. |
| **Source Attribution** | The Intelligence Engine's per-provider record of whether live data was found for a project, and why, when it wasn't. |
| **Match Quality** | Whether a project was joined to live provider data by an exact identifier (`exact`) or a best-effort heuristic (`fuzzy`). |
| **MVP** | Minimum viable product — the smallest complete version of the Explorer worth shipping, as scoped in Section 8. |
| **JTBD** | Jobs to be done — the user-centered "when I ___, I want to ___, so I can ___" framing used in Section 7. |
