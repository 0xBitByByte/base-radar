# Known Issues (as of PR-067)

Issues below are real, confirmed defects that were **deliberately not fixed** in this QA pass, so that PR-066/PR-067 stay focused on QA and documentation only, with fixes tracked for a dedicated follow-up PR.

## 1. Duplicate React Keys in RecentTransactions

- **Severity**: Medium
- **Status**: Verified
- **Root Cause**: Blockscout's token transfer endpoint may return multiple transfer log entries sharing the same transaction hash (e.g. a swap or batched transfer emitting more than one `Transfer` event in a single tx). `RecentTransactions` ([`components/explorer/RecentTransactions.tsx:45`](../../components/explorer/RecentTransactions.tsx)) currently keys list items using only `transfer.txHash`, producing duplicate React keys whenever this occurs. Reproduced live on `/dashboard/projects/usd-coin` (a high-volume token, where this collision is common).
- **Impact**:
  - React warning in console ("Each child in a list should have a unique key prop").
  - Potential rendering instability for affected transfer lists (React may reuse/misassign DOM state across list items when keys collide).
- **Recommended Fix**: Use a stable unique key composed of `txHash + logIndex`, or `txHash + transfer index` if a log index is unavailable from the current Blockscout mapper (`lib/providers/blockscout/mapper.ts` does not currently capture one). A fix using the array index as the tie-breaker was prototyped and verified working during the PR-066 QA pass, then reverted so this PR stays documentation-only — implementation is scheduled for PR-068.

## 2. Hydration mismatch via `formatRelativeTime()` — multiple call sites

- **Severity**: Medium (causes a visible React "Recoverable Error" / full subtree re-render in dev; degrades to a silent client-side re-render in production, not a hard crash).
- **Root cause**: [`lib/data/format.ts`](../../lib/data/format.ts)'s `formatRelativeTime()` is computed independently at SSR time and again at client hydration time with no snapshot mechanism. If real wall-clock time elapses between the two (even a few seconds), the two computed strings differ (e.g. "1m ago" vs "just now"), which React treats as a hydration mismatch.
- **Confirmed call sites**:
  1. [`components/dashboard/IntelligenceBrief.tsx:181-182`](../../components/dashboard/IntelligenceBrief.tsx) — reproduced live this session; Next.js's own dev error overlay caught it as a "Recoverable Error" originating at this exact line, rendered from `app/dashboard/page.tsx`.
  2. [`components/dashboard/WidgetCard.tsx:136`](../../components/dashboard/WidgetCard.tsx) — the shared `Updated {formatRelativeTime(lastUpdated)}` footer used by up to 11 dashboard widgets that pass a `lastUpdated` prop (`PortfolioWidget`, `MarketWidget`, `TrendingWidget`, `AIProjectsWidget`, `AIIntelligenceWidget`, `NarrativeHeatmap`, `ProjectSpotlight`, `ActivityFeed`, `WatchlistWidget`, `WhaleActivityWidget`, `SignalsWidget`) — same underlying bug class, not yet independently reproduced for each widget but sharing the identical root cause.
  3. [`components/explorer/RecentTransactions.tsx:56`](../../components/explorer/RecentTransactions.tsx) — same function used here too; not confirmed to actually trigger a mismatch (would require this component to be server-rendered with client-visible timestamps at a real time boundary), flagged as a third potential site worth checking in the same follow-up.
- **Recommendation**: fix `formatRelativeTime()` once, at the source (e.g. render a stable server-computed string on first paint via `suppressHydrationWarning`, or compute the relative time client-only inside a `useEffect`/mount-gated render) — this fixes all call sites simultaneously rather than patching each widget individually. **Recommended as the first item in the dedicated follow-up PR after PR-066**, consistent with the prior explicit instruction not to fix this as part of PR-065 or PR-066.

## 3. `metadataBase` not set in root metadata

- **Severity**: Low (cosmetic build warning only, no functional or visual impact).
- **Detail**: `next build` emits: `metadataBase property in metadata export is not set for resolving social open graph or twitter images, using "http://localhost:3000"`. Open Graph/Twitter card image URLs will resolve against `localhost` unless a real production `metadataBase` is set before deploying.
- **Recommendation**: set `metadataBase: new URL("https://<production-domain>")` in the root `app/layout.tsx` metadata export before Beta/production deploy. Not a PR-066 blocker since it has zero effect on local functionality, but should be resolved before the first production deploy.

## Investigated and ruled out (not product bugs)

- Two "stuck on Loading ecosystem intelligence…" states during this QA pass, on `/dashboard/projects/aave` and `/dashboard/watchlist` — both confirmed to be dev-server/browser-tab request congestion from this session's own rapid back-to-back navigation testing, not application defects. Reproduced cleanly in a fresh tab both times.
- Sidebar `<Link>` clicks occasionally not registering via the browser automation tool's synthetic mouse click — confirmed to be a browser-automation tooling quirk (a real DOM `.click()` on the identical link navigated correctly with zero console errors). Not a defect real users would encounter.
