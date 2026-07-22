# 0005 — Settings Navigation Destination

## Status

Accepted (implemented)

## Context

Sprint A.1 removes six sidebar entries whose destinations do not exist. Its
route-existence check also found that the standalone Settings sidebar item
pointed to `/dashboard/settings`, while the application currently exposes
only nested settings routes. The repository audit identifies a top-level
Settings landing page as a separate, low-priority item to confirm before
building.

## Decision

Point the sidebar Settings item to
`/dashboard/settings/notifications`, the established general-purpose
preferences entry point, until a dedicated Settings landing page is
intentionally designed and delivered.

## Alternatives Considered

- **Build a Settings landing page now** — rejected as outside Sprint A.1 and
  the audit's requested confirmation step.
- **Keep `/dashboard/settings` as the sidebar target** — rejected because it
  leaves a live 404 in the primary navigation.

## Consequences

All sidebar navigation targets resolve to existing routes. A future Settings
landing page may replace this destination when its scope and design are
confirmed.
