# 0006 — Watchlist Ownership Consolidation

## Status

Accepted (implemented)

## Context

The repository contained two live Watchlist systems: a legacy flat list and
the newer Personalization-owned multi-watchlist workspace. The audit directs
engineering to retain the latter and preserve the legacy system's project
star behavior.

## Decision

`lib/personalization/` and `components/watchlists/` are the sole owners of
Watchlist membership. Project stars read and toggle the active Watchlist
(falling back to the first pinned or available list). Existing legacy project
IDs are unioned into that membership list once on the client. The singular
legacy route permanently redirects to `/dashboard/watchlists`.

## Consequences

All Watchlist-scoped surfaces use one membership source. The old browser
storage remains untouched for rollback, but is no longer read after its
one-time migration marker is recorded.
