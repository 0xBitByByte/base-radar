# Roadmap

Base Radar ships in milestones rather than on a fixed calendar — each
milestone is a coherent, independently useful slice of the product. This
document tracks what's shipped, what's underway, and what's planned.

For the product reasoning behind these milestones, see
[PRODUCT_VISION.md](PRODUCT_VISION.md#long-term-roadmap). For release-by-release
detail, see [CHANGELOG.md](CHANGELOG.md).

## Status Legend

| Status | Meaning |
| --- | --- |
| ✅ Completed | Shipped and merged |
| 🚧 In Progress | Actively being built |
| 📋 Planned | Scoped, not yet started |

## Completed Milestones

| Milestone | Status | Summary |
| --- | --- | --- |
| Project Setup | ✅ Completed | Next.js App Router project scaffolded with TypeScript, Tailwind CSS v4, ESLint, and the base-nova/Base UI component conventions the rest of the app builds on. |
| Landing Page | ✅ Completed | Marketing homepage — animated hero, live network stat cards, trust indicators, navbar, and footer. |
| Landing Polish | ✅ Completed | Landing page wired into the product: hero CTA and navbar both launch the dashboard, and a "← Website" link ties the dashboard back to the homepage. |
| Dashboard Shell | ✅ Completed | Sidebar, topbar, command palette, and the first full set of dashboard widgets (Portfolio, Market, Trending, AI Projects, Whale Activity, Signals, Project Spotlight, Activity Feed), backed by a typed data layer with mock fallback. |
| Dashboard Polish | ✅ Completed | Premium light theme, AI Intelligence Brief, Live Status Bar, richer KPI cards, consistent widget chrome (last-updated + action menu), Narrative Heatmap, Watchlist, and reserved layout space for a future Intelligence Rail. |
| Navigation | ✅ Completed | Unified navigation between the marketing site and the dashboard, so links, logos, and CTAs consistently connect the two experiences. |
| Documentation | ✅ Completed | Project documentation foundation: README, Product Vision, Architecture, and this Roadmap. |
| Project Registry | ✅ Completed | Canonical, strongly-typed registry of ~20 verified Base ecosystem projects — schema, enums, seed data, query helpers, and a barrel export — ready for a future provider layer to join against. |

## Future Milestones

| Milestone | Status | Summary |
| --- | --- | --- |
| Provider Layer | 📋 Planned | Extend live-provider integration so Project Registry entries (not just dashboard widgets) can be enriched with real market and on-chain data, using the `providerIds` already defined on every project. |
| Aggregator | 📋 Planned | A general-purpose aggregation layer that joins the Project Registry with live provider data, building on the merge-with-fallback pattern already proven in the dashboard's data layer. |
| Projects Explorer | 📋 Planned | A browsable, filterable, searchable view over the full Project Registry. |
| Project Details | 📋 Planned | A dedicated detail page per project, combining registry metadata with live data from the Provider Layer. |
| AI Research | 📋 Planned | Dedicated research tooling for the AI-agent segment of the Base ecosystem. |
| Portfolio | 📋 Planned | Wallet-connected, real portfolio tracking to replace the current mock Portfolio widget. |
| Signals | 📋 Planned | Configurable, rules-based detection of notable market and on-chain activity, beyond today's curated Signals widget. |
| Alerts | 📋 Planned | User-configurable notifications built on top of Signals. |
| Public Launch | 📋 Planned | Hardening, polish, and readiness work for a public release. |

## Notes

- No future milestone is currently **In Progress** — Project Registry and
  Documentation are the most recently completed work, and the next
  milestone to start has not yet been decided.
- Milestone order above reflects logical dependency (e.g. Provider Layer and
  Aggregator precede Projects Explorer and Project Details), not a committed
  schedule.
