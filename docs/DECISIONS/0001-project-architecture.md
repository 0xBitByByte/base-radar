# 0001 — Project Architecture

## Status

Accepted (implemented)

## Context

Base Radar needed an architecture that could support a marketing landing
page and a data-heavy dashboard from one codebase, without a separate
backend service, while staying resilient to unreliable free third-party
APIs and remaining approachable for a small/solo contributor base. See
[ARCHITECTURE.md](../ARCHITECTURE.md) for the resulting system as built.

## Decision

Build Base Radar as a single Next.js App Router application with a strict
layered pipeline for data:

```
UI (app/, components/) → Hooks (lib/hooks/) → Services (lib/data/aggregate.ts) → Providers (lib/data/providers/*)
```

plus a standalone Project Registry (`data/projects/`) that sits beside this
pipeline rather than inside it. Every services-layer function returns a
mock-backed fallback tagged with its data source (`WithSource<T>`), so a
failing external API degrades a field instead of breaking a page. See
[ARCHITECTURE.md](../ARCHITECTURE.md#how-data-flows) for the full
mechanism.

## Alternatives Considered

- **Separate backend service** (e.g. a standalone API server) — rejected
  for this stage: it would add deployment/operational complexity with no
  concrete benefit yet, given the app has no persistence needs beyond
  static data and read-through external APIs.
- **Direct provider calls from components** (no services layer) — rejected
  because it would couple every widget to a specific provider's shape,
  making it impossible to swap or blend providers without touching UI
  code.
- **Throwing on provider failure, with error boundaries in the UI** —
  rejected in favor of the mock-fallback pattern: a dashboard that always
  renders *something* is more valuable for this product than one that
  shows error states when a free API rate-limits or times out.

## Pros

- A single deploy, one codebase, minimal operational surface.
- Provider failures degrade gracefully instead of crashing a page.
- Clear seams for future growth: a new page, provider, or data need has an
  obvious place to live without restructuring existing code (see
  [ARCHITECTURE.md](../ARCHITECTURE.md#future-expansion)).

## Cons

- The mock-fallback pattern means a user can be shown non-live data without
  a loud error — mitigated by the `source: "live" | "mock"` tag and the
  "Demo data" badge in `WidgetCard`, but it does trade strict correctness
  for resilience.
- A single Next.js app means scaling the dashboard's data needs and the
  landing page's traffic happen together, not independently.

## Future Implications

This architecture is the foundation every later milestone builds on (see
[ROADMAP.md](../ROADMAP.md)). The Provider Layer (Milestone 5) and
Intelligence Engine (Milestone 6) milestones are designed to extend this
same pipeline rather than replace it — see
[ARCHITECTURE.md](../ARCHITECTURE.md#future-intelligence-engine).
