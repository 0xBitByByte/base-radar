# Base Radar — Product Bible

> **Status:** 🚧 In Progress — 11 of 12 chapters complete ([01](01_PRODUCT_STRATEGY.md), [02](02_UX_STRATEGY.md), [03](03_INFORMATION_ARCHITECTURE.md), [04](04_FEATURE_SPECIFICATIONS.md), [05](05_INTELLIGENCE_FRAMEWORK.md), [06](06_DESIGN_SYSTEM.md), [07](07_ENGINEERING_ROADMAP.md), [08](08_COMPETITIVE_ANALYSIS.md), [09](09_PRODUCT_BACKLOG.md), [10](10_RELEASE_PLAN.md), [11](11_ARCHITECTURE_GUARDRAILS.md)); only [12](12_GLOSSARY.md) remains a skeleton
> **Scope:** Product source of truth (vision, strategy, UX, features, design, roadmap)
> **Not this:** Engineering source of truth — for that, see [`docs/ARCHITECTURE.md`](../ARCHITECTURE.md), [`docs/API.md`](../API.md), and [`docs/ROADMAP.md`](../ROADMAP.md), which remain unchanged and authoritative for implementation detail

---

## What this is

The Product Bible is the single, comprehensive reference for what Base Radar *is*, who it's *for*, and where it's *going* — product strategy, UX principles, feature specifications, the intelligence framework, the design system, competitive positioning, and the roadmap that ties them together. It is written for anyone who needs to understand the product as a whole: product, design, engineering, and future contributors.

It complements, rather than replaces, the existing engineering documentation:

| Question | Answer lives in |
| --- | --- |
| *Why* are we building this, and for whom? | This Product Bible |
| *What* does each feature do, from a user's perspective? | This Product Bible |
| *How* is it built — architecture, layers, APIs? | [`docs/ARCHITECTURE.md`](../ARCHITECTURE.md), [`docs/API.md`](../API.md) |
| *When* is each engineering milestone shipping? | [`docs/ROADMAP.md`](../ROADMAP.md) |
| *What* is the product-level plan across releases? | [10_RELEASE_PLAN.md](10_RELEASE_PLAN.md) |

Several existing top-level docs — [`docs/PRODUCT_VISION.md`](../PRODUCT_VISION.md), [`docs/DESIGN_SYSTEM.md`](../DESIGN_SYSTEM.md), [`docs/DESIGN_SYSTEM_V1.md`](../DESIGN_SYSTEM_V1.md) — predate this structure and hold real content already. They are inputs to be consolidated into the relevant chapter below during population, not duplicated; each relevant chapter cross-links to its predecessor doc until that consolidation happens.

## How to use this

Each chapter is self-contained but ordered — reading 01 → 12 in sequence builds understanding from *why* to *what* to *how it's specified* to *where it's going*. Every chapter carries:

- A **status badge** (🚧 Skeleton today; 📝 Draft, ✅ Complete, or 🔄 Needs Review once populated)
- **Previous / Next** links for linear reading
- A **Related Documents** section for jumping directly to a connected chapter or engineering doc

## Table of Contents

| # | Chapter | Covers | Status |
| --- | --- | --- | --- |
| 01 | [Product Strategy](01_PRODUCT_STRATEGY.md) | Executive summary, mission, vision, target users, principles & philosophy, problem & solution, positioning, success metrics | ✅ Complete |
| 02 | [UX Strategy](02_UX_STRATEGY.md) | UX philosophy, 12 core UX principles, information consumption model, per-surface UX philosophy (Dashboard/Search/Project/Portfolio/Watchlist/Governance), AI experience, navigation, states, accessibility, UX writing | ✅ Complete |
| 03 | [Information Architecture](03_INFORMATION_ARCHITECTURE.md) | Product hierarchy, canonical entity types, navigation structure, information ownership, intelligence hierarchy, taxonomy | ✅ Complete |
| 04 | [Feature Specifications](04_FEATURE_SPECIFICATIONS.md) | Feature design principles and per-surface specifications (Dashboard, Search, Projects, AI Intelligence, Portfolio, Watchlists, Governance, Notifications, Settings), feature lifecycle | ✅ Complete |
| 05 | [Intelligence Framework](05_INTELLIGENCE_FRAMEWORK.md) | Intelligence philosophy and design principles, intelligence pipeline, confidence/trust/recommendation/evidence/explainability frameworks | ✅ Complete |
| 06 | [Design System](06_DESIGN_SYSTEM.md) | Design philosophy and principles, visual hierarchy, color/typography/iconography/motion philosophy, AI presentation, trust by design | ✅ Complete |
| 07 | [Engineering Roadmap](07_ENGINEERING_ROADMAP.md) | Roadmap philosophy and principles, nine sequenced releases (Platform Foundation through Developer Platform & Ecosystem), dependency model, engineering decision framework | ✅ Complete |
| 08 | [Competitive Analysis](08_COMPETITIVE_ANALYSIS.md) | Ten-product competitive landscape (CoinGecko, DexScreener, DeFiLlama, Arkham, Token Terminal, Messari, Nansen, Dune, CryptoRank, RootData), feature comparison matrix, differentiation strategy | ✅ Complete |
| 09 | [Product Backlog](09_PRODUCT_BACKLOG.md) | Prioritization method, Now/Next/Later buckets, 48 ideas across 12 areas, intake process, graduation criteria | ✅ Complete |
| 10 | [Release Plan](10_RELEASE_PLAN.md) | Release philosophy and principles, release types, release lifecycle, readiness, communication, rollout philosophy, post-release evaluation, versioning philosophy | ✅ Complete |
| 11 | [Architecture Guardrails](11_ARCHITECTURE_GUARDRAILS.md) | Architecture philosophy and principles, architectural layers, dependency rules, ownership principles, intelligence and design preservation, review checklist | ✅ Complete |
| 12 | [Glossary](12_GLOSSARY.md) | Definitions of terms used across the product and documentation | 🚧 Skeleton |

## Navigation

**Start here** → [01. Product Strategy](01_PRODUCT_STRATEGY.md)

---

*This is the root of the Base Radar Product Bible. Every chapter links back here via its breadcrumb.*
