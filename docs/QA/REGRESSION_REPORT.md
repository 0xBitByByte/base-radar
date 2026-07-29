# PR-066 Regression Report

## Bug identified and verified in this PR (fix deferred to PR-068)

### `RecentTransactions` duplicate/missing React key

- **File**: [`components/explorer/RecentTransactions.tsx`](../../components/explorer/RecentTransactions.tsx)
- **Symptom**: React console error "Each child in a list should have a unique key prop", reproducible on every load of a high-volume token's Project Profile page (confirmed live on `/dashboard/projects/usd-coin`).
- **Root cause**: the list is keyed by `transfer.txHash` alone (line 45). Blockscout's `/tokens/{address}/transfers` endpoint can return multiple distinct transfer log entries that share the same transaction hash (e.g. a swap or batched transfer emitting more than one `Transfer` event in a single tx). The mapper (`lib/providers/blockscout/mapper.ts`) never captures a log index to disambiguate these, so React sees duplicate keys whenever this occurs.
- **Recommended fix (not applied in this PR)**: key by `` `${transfer.txHash}-${index}` `` instead, using the array index as a tie-breaker — the same pattern already used elsewhere in the codebase (`ChainListTooltip.tsx`, `FeaturedEcosystem.tsx`, `KeyMetrics.tsx`).
- **Verification**: the warning was reliably reproduced in a fresh browser tab. A candidate fix using the above key pattern was prototyped during this QA pass and confirmed to eliminate the warning (verified via both Fast Refresh and a full hard reload), then **reverted** so this PR stays documentation-only. The warning is present again on this branch — root cause determined, fix scheduled for PR-068 (see `KNOWN_ISSUES.md`).

## Systems re-verified this pass

| System | Status | Evidence |
|---|---|---|
| Dashboard | OK | Loads clean, all widgets render |
| Projects Directory + 11 Collections | OK | All load with correct titles/content |
| Project Profile | OK | Verified on Aave (data-rich) and USD Coin (high-volume token); USD Coin reproduces the known `RecentTransactions` duplicate-key warning — see above, fix deferred to PR-068 |
| Watchlists | OK | `/dashboard/watchlist` → `/dashboard/watchlists` redirect confirmed |
| Alerts | OK | Loads clean |
| Automation | OK | Loads clean, settings page loads clean |
| Notifications | OK | Loads clean, settings page loads clean |
| Portfolio | OK | Loads clean (widget hydration issue documented separately, not a regression — pre-existing) |
| Timeline | OK | Loads clean |
| Search / Personalization settings | OK | Loads clean |
| Navigation (Sidebar client-side routing) | OK | Confirmed via real `<Link>` click, not just direct URL navigation |
| Loading system (`loading.tsx` + `BrandLoader`) | OK | Architecture re-confirmed correct in the PR-065 investigation earlier this session; not re-litigated here |
| Error handling (invalid slug) | OK | Renders proper 404, not a crash |
| Build pipeline | OK | tsc / lint / test / build all pass |

## Known, pre-existing issues NOT introduced by this PR

See `KNOWN_ISSUES.md` for full detail — both are hydration-mismatch bugs in `formatRelativeTime()` (`lib/data/format.ts`), pre-dating PR-066, explicitly deferred to a dedicated follow-up per standing instruction from the PR-065 review.

## Testing-tool artifacts (not product bugs)

Two apparent "stuck on loading" states were observed during this pass on `/dashboard/projects/aave` and `/dashboard/watchlist`. Both were conclusively traced to **dev-server/browser-tab congestion caused by this session's own rapid, overlapping navigation calls** — not application defects. Each was reproduced cleanly (correct render, zero console errors) in a freshly-opened browser tab immediately afterward. This matches an established pattern from earlier in this session (see prior PR-065 investigation notes). No code changes were made in response to these.

Additionally, sidebar-link clicks via the browser tool's synthetic mouse-click sometimes failed to trigger navigation, while a real user click (verified via programmatic `element.click()`, which exercises the identical React `onClick`/`next/link` code path) navigated correctly with zero console errors. This is a **browser-automation tooling quirk**, not a product bug — real users clicking the sidebar are not affected.
