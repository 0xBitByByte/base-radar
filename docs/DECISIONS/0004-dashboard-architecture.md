# 0004 — Dashboard Architecture

## Status

Accepted (implemented)

## Context

The dashboard needed to present ten-plus independent, visually and
structurally different data widgets (Portfolio, Market, Signals, Whale
Activity, Narrative Heatmap, etc.) as one coherent product, while keeping
each widget's data-fetching logic isolated and letting new widgets be added
without re-touching shared layout code. See
[ARCHITECTURE.md](../ARCHITECTURE.md#dashboard-architecture) for the
resulting structure.

## Decision

- A single `DashboardLayout` shell (sidebar, topbar, live status bar, a
  reserved future "Intelligence Rail" region) wraps every dashboard page via
  `app/dashboard/layout.tsx`, so any new page under `app/dashboard/*`
  inherits it automatically.
- Every widget renders inside a shared `WidgetCard` component, giving all
  widgets the same icon-chip, title, "Demo data" badge, action menu, and
  last-updated footer treatment — regardless of what each widget renders
  internally.
- `app/dashboard/page.tsx` is a Server Component that calls one aggregator
  function, `getDashboardData()`, which fans out to every widget's data
  function in parallel via `Promise.all` and returns one object the page
  destructures — no widget fetches its own data independently.
- Client-side interactivity (search, theme toggle, mobile nav) is isolated
  to small `"use client"` leaf components rather than making the page or
  layout a client component.

## Alternatives Considered

- **Each widget fetches its own data independently** (e.g. via
  `React.Suspense` boundaries per widget) — rejected for this stage in
  favor of one fan-out call, keeping `app/dashboard/page.tsx` simple and
  avoiding a waterfall of independent loading states; revisitable once
  per-widget streaming becomes valuable.
- **Bespoke card markup per widget** — rejected because it would make ten
  widgets with unrelated data look like ten different products; the shared
  `WidgetCard` shell was chosen specifically to keep the grid visually
  consistent for free.
- **A client-side dashboard shell** (fetching via `useEffect`/React Query
  on mount) — rejected in favor of Server Components fetching directly via
  `await`, avoiding a client-side loading flash and an extra data-fetching
  library for data that only needs to be current as of page load (the one
  exception, live-updating network status, is handled by the dedicated
  `useLiveNetworkStatus` hook instead).

## Pros

- New widgets are cheap to add: build the component, wrap it in
  `WidgetCard`, add one aggregator function and one line in the page grid.
- Visual consistency is structural, not a matter of discipline — every
  widget gets the last-updated timestamp and "Demo data" badge for free by
  using the shared shell.
- New dashboard pages (Projects Explorer, etc.) inherit the full shell with
  zero additional layout wiring.

## Cons

- `getDashboardData()`'s single `Promise.all` means one slow aggregator
  function delays the whole page's server render, rather than letting fast
  widgets render first — an acceptable tradeoff today given every
  aggregator function already resolves quickly (mock fallback, short
  provider timeouts), but a real constraint if a future widget's data
  source is meaningfully slower.
- The reserved "Intelligence Rail" region exists in the layout but is
  unused by any page today — deliberate reserved space, but dead code from
  a strict reading until a page opts into it.

## Future Implications

Milestone 7 (Project Explorer) and Milestone 10 (AI Research) are expected
to be new pages under `app/dashboard/*` that reuse this same shell and
`WidgetCard` pattern rather than introducing a parallel layout system. The
reserved Intelligence Rail region is the anticipated home for the
cross-cutting output of the future Intelligence Engine (Milestone 6) — see
[ARCHITECTURE.md](../ARCHITECTURE.md#future-intelligence-engine).
