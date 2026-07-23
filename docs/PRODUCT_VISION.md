# Product Vision

This document describes Base Radar as a **product** — why it exists, who it
serves, and where it's going. It intentionally avoids implementation detail;
for that, see [ARCHITECTURE.md](ARCHITECTURE.md) (planned) and
[PROJECT_REGISTRY.md](PROJECT_REGISTRY.md).

## Mission

To give everyone building on, investing in, or exploring the Base ecosystem
a single, trustworthy place to understand what's happening — in real time,
without needing to stitch together a dozen explorers, trackers, and Discord
servers to get the full picture.

## Vision

Base Radar becomes the default intelligence layer for Base — the first tab
people open to answer "what's happening on Base right now," and the
reference registry that other builders point to when they need canonical,
verified data about a Base ecosystem project.

## Target Users

- **Traders and researchers** who need a fast, reliable read on Base market
  activity, narratives, and momentum without noise.
- **Builders and founders** shipping on Base who want visibility into the
  ecosystem they're launching into, and a way to get their project
  discovered accurately.
- **Investors and analysts** evaluating Base-native projects who need
  consistent, verifiable metadata rather than scattered, self-reported claims.
- **Curious newcomers** to Base who want a guided, credible entry point into
  the ecosystem instead of a wall of unfamiliar protocols and jargon.

## Problems Solved

- **Fragmentation** — Base ecosystem information is scattered across
  explorers, DEX aggregators, Discords, and X threads. Base Radar brings the
  signal into one view.
- **Unverified information** — many project directories are self-reported
  and unmoderated, so bad or stale data spreads unchecked. Base Radar treats
  verification as a first-class product concept, not an afterthought.
- **Noise over signal** — most dashboards show everything with equal weight.
  Base Radar is designed to surface what actually matters right now.
- **No canonical source of truth** — there is no single, trusted registry of
  "what exists" on Base. Base Radar is building one.

## Why Base Radar Exists

Base is one of the fastest-growing ecosystems in crypto, but the tooling
around it hasn't kept pace with its growth. Existing tools tend to be
general-purpose (covering every chain shallowly) or narrowly scoped (a
single explorer, a single DEX). Base deserves a product built specifically
for it — one that understands its narratives, its builders, and its pace,
and that treats accuracy and craft as differentiators rather than
afterthoughts.

## Core Principles

- **Accuracy over completeness.** It is better to show less data that is
  verifiably correct than more data that might be wrong. Confidence is
  always communicated, never assumed.
- **Transparency about sourcing.** Users should always be able to tell
  whether they're looking at live data or a fallback, and where a data point
  came from.
- **Free and open by default.** Base Radar is built on free, publicly
  available data sources wherever possible, keeping the core product
  accessible to everyone.
- **Craft as a feature.** A polished, considered experience is treated as
  core to the product, not a coat of paint applied at the end.
- **Ecosystem-first, not extractive.** Base Radar exists to make the Base
  ecosystem easier to navigate and to help good projects get discovered —
  not to gatekeep information behind paywalls that harm the ecosystem it
  serves.

## Product Pillars

1. **Intelligence Dashboard** — a real-time view of network health, market
   activity, and ecosystem narratives.
2. **Project Registry** — a canonical, verified directory of Base ecosystem
   projects that other pillars and, eventually, other builders can rely on.
3. **Signals & Discovery** — surfacing what's moving, what's new, and what
   deserves attention before it's obvious.
4. **Research Tools** — deeper, structured views for people evaluating
   specific projects, categories, or narratives (including the emerging
   AI-agent space on Base).
5. **Portfolio Awareness** — connecting a user's own on-chain footprint to
   the broader ecosystem view, so the dashboard is personal as well as
   informational.

## Community

Base Radar is building more than a dashboard — it's building an open
community around the Base ecosystem. The product and the community around
it are meant to reinforce each other: the dashboard surfaces what's
happening on Base, and the community is where that surfaces into
conversation, feedback, and shared discovery.

The official channels are:

- **[Discord](https://discord.gg/yRBnkhjCd6)** — the primary hub for
  community discussion, support, and direct feedback on the product.
- **[Telegram](https://t.me/+3yysanqJlDE1Y2Y1)** — a lighter-weight chat for
  quicker updates and conversation.
- **[X (Twitter)](https://x.com/TheBaseRadar)** — announcements, ecosystem
  commentary, and public updates.

These are the same official links surfaced throughout the product itself
(dashboard sidebar, landing page footer) and centralized in
`constants/site.ts` — see [CLAUDE_RULES.md](CLAUDE_RULES.md#documentation-rules)
for why this repository treats a single source of truth for links as a
hard rule rather than a convention.

## Long-Term Roadmap

> For the canonical, numbered engineering roadmap (completed, current, and
> planned milestones), see [MASTER_ROADMAP.md](MASTER_ROADMAP.md). The
> summary below is product framing only.

Base Radar's roadmap is milestone-based rather than date-based, reflecting
that quality and correctness take priority over shipping speed.

- **Foundation** *(shipped — Milestones 1–3)* — landing experience,
  dashboard shell, and unified navigation that establish the product's
  identity and information architecture.
- **Project Intelligence Platform** *(shipped — Milestone 4)* — the
  canonical Project Registry and the data foundation it depends on, built
  to be reliable enough for every later pillar to stand on.
- **Live Aggregation** *(next — Milestones 5–6)* — deepening the connection
  between the Registry and real-time data providers, so registry entries
  carry live market and developer-activity context.
- **Discovery & Explorer** *(planned — Milestone 7)* — a fully browsable,
  searchable view into the Project Registry for anyone evaluating the
  ecosystem.
- **Research & Signals** *(planned — Milestones 8, 10)* — dedicated tooling
  for narrative tracking, AI-agent research, and early-signal detection.
- **Personalization** *(planned — Milestone 9)* — wallet-aware portfolio
  intelligence and user-configurable alerts.

See [docs/ROADMAP.md](ROADMAP.md) for the numbered milestone breakdown this
maps to.

## Future Monetization

Base Radar's core intelligence dashboard and Project Registry are intended
to remain free, since broad, unrestricted access is part of the product's
value to the ecosystem. Monetization, when introduced, is expected to layer
on top of that free core rather than gate it, potentially through:

- **Pro tooling** for professional researchers and funds — deeper analytics,
  historical data, and export/API access.
- **Project tooling** — optional paid tools for project teams to manage and
  enrich their own Registry presence (beyond the free, verified baseline
  every project gets).
- **API access** — commercial access to Base Radar's aggregated and
  verified data for third-party builders.
- **Ecosystem partnerships** — collaborations with Base-aligned
  organizations that align with the mission rather than compromise it.

No monetization model has been finalized. Any future model will be
evaluated against the core principles above, particularly "ecosystem-first,
not extractive."

## Competitive Advantages

- **Base-native focus.** Purpose-built for one ecosystem instead of a
  shallow, multi-chain afterthought.
- **Verification as a product feature.** Explicit, honest confidence levels
  on registry data, rather than presenting everything as equally reliable.
- **Free-data-first architecture.** Demonstrated ability to deliver real
  value from free, public data sources, keeping the core product
  accessible rather than paywalled from day one.
- **Design and craft.** A dashboard experience built with the same care as
  a professional trading or analytics product, not a template.
- **Registry as infrastructure.** The Project Registry is designed to become
  a dependency for other tools and pillars, not just a list — a durable
  advantage that compounds as it grows.

## What Base Radar Will NOT Become

- **Not a general multi-chain tracker.** Base Radar's value comes from
  depth on Base, not breadth across every chain.
- **Not a pay-to-play listing service.** Verification status will never be
  for sale; a project cannot buy its way to "verified."
- **Not a trading or custody platform.** Base Radar is an intelligence and
  information product — it will not hold user funds or execute trades on a
  user's behalf.
- **Not an anonymous data aggregator with no accountability.** Every piece
  of registry data is expected to be traceable to a source and a
  confidence level — Base Radar will not become a firehose of unverified,
  unattributed information.
- **Not a walled garden.** The core dashboard and registry are not intended
  to become paywalled in a way that excludes the ecosystem it serves.
