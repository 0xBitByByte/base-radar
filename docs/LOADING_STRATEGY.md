# Loading Strategy — Engineering Standard

**Status:** 🔒 Frozen v1.0 — loading-UX foundation for PR-085 onward.

> **Engineering Note:** This document defines the loading standard for
> *future implementation*. It is **not** a mandate to retrofit every
> existing page, skeleton, or Suspense boundary immediately. STEP 4's
> findings describe the current, real state of the app (including several
> genuine gaps); STEP 5's Standard is what new work should conform to and
> existing work should migrate toward opportunistically, not urgently. No
> implementation is authorized by this document — see Constraints below.

This is the sixth and final document in this session's foundation-Standard
series. It sits closest to [PERFORMANCE_AUDIT.md](PERFORMANCE_AUDIT.md),
which audited the same rendering/streaming architecture from a
cost/latency angle — this document audits the *experience* of waiting,
not the cost of it. It also depends on facts [PERFORMANCE_AUDIT.md](PERFORMANCE_AUDIT.md)
already established (the App Router route inventory, the `loading.tsx`/
`error.tsx` count, the `Suspense`/`use()` promise-threading pattern) and
does not re-derive them. It is grounded in
[DESIGN_SYSTEM_LOCK.md](DESIGN_SYSTEM_LOCK.md)'s own component-inventory
audit, which first flagged `WidgetSkeleton`/`MetricItemSkeleton`/
`BrandLoader`/`BrandSpinner` as candidates for a "Standardized" verdict —
this audit re-examines that verdict specifically for `BrandSpinner` and
finds it does not hold (see STEP 4, H6).

**The same measurement caveat as the Performance Audit applies here:** no
Lighthouse run, no live browser timing capture, and no user testing were
performed. Every finding below is either a direct code-reading fact (file:
line) or, in one case, a compiled-build-artifact confirmation (`.nft.json`
trace file). Where a live-browser check was attempted and was
inconclusive due to tooling/timing limits, that is stated explicitly
rather than silently omitted or asserted as confirmed.

---

## Executive Summary

Base Radar's loading architecture has one genuinely strong, well-designed
core: the Project Profile page's fast-path/slow-path split, and the
`tickerPromise`/`liveProjectsPromise` promise-threading pattern it's built
on, correctly let fast content render immediately while slow provider
calls stream in behind `Suspense` — this is real, working, and matches
current Next.js/React streaming guidance closely (see STEP 3).

Beneath that core, this audit found a consistent, previously-undocumented
gap: **most of the app's Suspense fallbacks don't look like loading
states at all.** Of the 15 named `*Async` Suspense boundaries, 8 render
the exact same presentational component used for resolved data — with
placeholder, stale, or "unavailable" values — marked only by a
`data-loading-skeleton` DOM attribute that exists solely for
`SplashScreen`'s internal readiness polling, not as a user-facing or
screen-reader-facing signal. A user watching the page has no way to know
that a value they're looking at might silently change a moment later.
Compounding this, this audit found `BrandSpinner` — the component
`docs/DESIGN_SYSTEM_LOCK.md` currently credits with the app-boot loading
role — is dead code: zero imports, zero JSX usages anywhere.
`SplashScreen` hand-rolls equivalent markup instead. That document is
corrected by reference here (see STEP 4, H6) and should be updated
directly in a future pass.

The two skeleton components that do exist (`WidgetSkeleton`,
`MetricItemSkeleton`) are well-designed where their dimensions are
correctly matched to real content (2 of 4 `WidgetSkeleton` call sites
confirmed exact matches) but produce a real, confirmed layout shift at the
other 2 (a 64px skeleton standing in for up to ~300px of real table
content; a 192px skeleton standing in for an unbounded real list) — and
neither skeleton is announced to assistive technology in any way
(`aria-hidden="true"`, no `role="status"`, no `aria-live`, no `aria-busy`
— confirmed used nowhere in the entire codebase). No focus management
exists anywhere for a skeleton-or-Suspense-to-content transition, across
all 15 boundaries checked, with zero exceptions.

None of this reflects a broken user flow — every page in the app does,
eventually, render its real content correctly. The findings below are
about the quality of the *wait*, not the correctness of the result.

---

## STEP 1/2 — Current Loading Experience (Findings Only)

*(Full per-component evidence — exact file:line citations, literal
fallback JSX for all 15 Suspense boundaries — is in this document's
accompanying chat responses, per this initiative's established
"findings-only, no file duplication" convention. Summarized here for
permanent reference.)*

### Route-level: which pages stream, which block

Reused directly from [PERFORMANCE_AUDIT.md](PERFORMANCE_AUDIT.md), not
re-derived: every `page.tsx` in the app is a Server Component; only 3
routes have their own `loading.tsx` (`/dashboard`, `/dashboard/projects`,
`/dashboard/projects/[slug]`) and only 2 have their own `error.tsx`. Two
deliberate, coexisting rendering strategies exist — synchronous top-level
`await` (so the route's own `loading.tsx` fires), used by `/dashboard`,
`/dashboard/projects`, and `/`; and promise-threading + `use()` + per-leaf
`Suspense` (so fast content renders immediately while slow calls stream
in), used by the dashboard shell and the Project Profile page.

**New finding this audit adds:** the 5 async Explorer sub-routes
(Governance/Whale/Contracts/Pools/AI) have no `loading.tsx` of their own,
but **are structurally covered by `[slug]/loading.tsx`'s automatic
Suspense boundary** — confirmed not just by Next.js's documented
`loading.js` inheritance semantics, but empirically, by reading each
sub-route's compiled build trace (`.next/server/app/dashboard/projects/[slug]/{governance,whale,contracts,pools,ai}/page.js.nft.json`),
which lists `[slug]/loading.tsx` as a real, compiled dependency for all
five. This corrects an assumption this task's own brief anticipated (that
clicking into a sub-Explorer might show nothing) — it does not; it shows
the Profile page's own `BrandLoader` fallback. The one real, confirmed gap
is cosmetic: that fallback's copy — "Preparing project insights…" — is
generic and doesn't reflect which sub-route was actually requested. A live
in-browser capture of this fallback painting mid-navigation was attempted
and was **inconclusive** (local dev data resolves too fast for the tool's
round-trip timing to catch the frame) — the build-artifact confirmation is
the evidence of record, not a screenshot.

### The 15 named Suspense boundaries — what each fallback actually shows

| Boundary | Fallback type | Visible loading signal? |
| --- | --- | --- |
| `LiveStatusBarAsync` | `WidgetSkeleton` (pulse) | Yes, but see H2 — mismatched on mobile |
| `CommandResultsAsync` | Same `CommandResults` component, degraded (no `liveProjectById`) | No pulse/spinner; content-degraded fallback |
| `ProfileCommitsAsync` | `MetricItemSkeleton` (pulse) | Yes — confirmed accurate size match |
| `ProfileContractDetailsAsync` | Same `ContractsList` component, `data-loading-skeleton` marker only | No pulse/spinner |
| `ProfileContributorsAsync` | Plain "Loading…" text, `data-loading-skeleton` marker | Yes — the one text-based signal found |
| `ProfileDeveloperTileAsync` | Same `ScorecardCardView`, marker only | No pulse/spinner |
| `ProfileHeaderExplorerTooltipAsync` | Same `ProfileIconLink`, **no marker at all** | None |
| `ProfileNetworkChainStatsAsync` | Same `ChainStatsFallback`, marker only | No pulse/spinner |
| `ProfileSourcesBlockscoutAsync` | `BlockscoutCheckingFallback` ("Checking…"), marker | Yes — text-based signal |
| `ProfileTimelineAsync` | `WidgetSkeleton` (pulse) | Yes, but see H2 — unbounded real content |
| `ProfileTransfersAsync` | `WidgetSkeleton` (pulse) | Yes, but see H2 — real content up to ~300px vs. 64px skeleton |
| `ProfileTrustContractsTileAsync` | Same `TrustTileView`, marker only | No pulse/spinner |
| `ProfileTvlChangeTilesAsync` | `MetricItem` missing `emphasize` prop, **no marker at all** | None — see H7 |
| `ProfileTvlChartAsync` | `WidgetSkeleton` (pulse) | Yes — confirmed accurate size match |
| `ProfileVerifiedContractsStatAsync` | Same `VerifiedContractsFallback`, marker only | No pulse/spinner |

**8 of 15 give no visible loading signal at all** (they render the real,
resolved-shaped component with placeholder data); 5 use a genuine pulse
skeleton (2 confirmed size-accurate, 2 confirmed size-mismatched, 1 not
independently measured); 2 use plain loading text.

### Skeleton sizing — confirmed matches and mismatches

- **Confirmed accurate:** `ProfileTvlChartAsync`'s `h-12` skeleton exactly
  matches `ProfileChart`'s own `compact ? 48 : 220` height logic (48px =
  `h-12`). `ProfileCommitsAsync`'s `MetricItemSkeleton` (with matching
  padding/border classes passed explicitly) closely matches the real
  `MetricItem` it stands in for.
- **Confirmed mismatched:** `ProfileTransfersAsync`'s `h-16` (64px)
  skeleton stands in for `RecentTransactions`, whose real rendered content
  (a label line plus a bordered table with up to 5 rows) runs roughly
  250-300px when transfers exist — a large, real layout shift.
  `ProfileTimelineAsync`'s `h-48` (192px) skeleton stands in for
  `ProfileTimeline`'s unbounded, multi-group event list — likely to exceed
  192px for any project with meaningful activity (not pixel-measured live,
  but structurally near-certain per the component's own grouped-list
  shape). `LiveStatusBarAsync`'s skeleton has no responsive qualifier,
  while the real bar it replaces is `hidden ... sm:flex` — meaning on
  mobile the skeleton paints a ~40px bar that's replaced by literally
  nothing (0 height) once real content resolves, a shift that doesn't
  happen on desktop.
- **A distinct, worse case:** `ProfileTvlChangeTilesAsync`'s fallback
  (`&lt;MetricItem bare label="TVL 7d Change" /&gt;`) omits the `emphasize`
  prop the real render always passes — a real typography/size jump (14px →
  20px value text, plus a label-casing change) the instant real data
  lands, and this fallback carries none of the `data-loading-skeleton`/
  `animate-pulse`/`aria-hidden` markers the other content-degraded
  fallbacks at least have.

### Spinners — full inventory

9 real `animate-spin` usages exist outside the skeleton/`BrandLoader`/
`BrandSpinner` systems, all `lucide-react` icons (`Loader2`/`RefreshCw`),
all driven by `useTransition()`'s `isPending` or an explicit sync-status
flag — never a data-fetch loading state in the traditional sense. 5 of 9
correctly pair the spin animation with `motion-reduce:animate-none`
(`Topbar.tsx`, `IntelligenceBrief.tsx`, `SyncStatusCard.tsx` ×2); the other
4 (`ProjectsSortSelect.tsx`, `ProjectsQuickFilters.tsx`,
`ProjectsSearchInput.tsx`, `ProjectsFilterBar.tsx` — all client-side
navigation-transition indicators) do not.

### `BrandLoader` vs. `BrandSpinner` — a confirmed doc/reality gap

`BrandLoader` is used correctly and exclusively at its 3 real call sites
(the app's 3 `loading.tsx` files). **`BrandSpinner` has zero JSX usages
and zero imports anywhere in the codebase** — confirmed by exhaustive
grep. `SplashScreen.tsx`, the one place `BrandSpinner`'s own doc comment
names as its intended `"lg"`-tier use case, hand-rolls equivalent
glow+logo markup instead of importing it. `docs/DESIGN_SYSTEM_LOCK.md`'s
own Component Inventory (§3 there) currently states Loading States are
"Standardized" with `BrandSpinner` credited for "app-boot" and consumed by
`SplashScreen` — this audit found that claim does not hold against the
current code and should be corrected in a future pass to that document
(not authorized by this document — see Constraints).

### Accessibility — loading-state announcements

`role="status"`/`aria-label` are present and structurally correct on
`BrandLoader` and (nominally) `BrandSpinner`. `WidgetSkeleton` and
`MetricItemSkeleton` are both `aria-hidden="true"` with no
`role="status"`/`aria-live`/`aria-busy` anywhere near any of their 5 total
call sites — a screen-reader user gets zero indication that a Profile
widget is loading. `aria-busy` is confirmed used **nowhere** in the entire
codebase. `SplashScreen`'s own `role="status"` region is nested inside an
ancestor `&lt;motion.div aria-hidden="true"&gt;` — an `aria-hidden`
ancestor removes all descendants from the accessibility tree regardless of
their own role, so the app-boot loading announcement never actually
reaches assistive technology despite the correct-looking markup being
present in the JSX. `prefers-reduced-motion` handling is otherwise
consistent and correct across `WidgetSkeleton`, `MetricItemSkeleton`,
`BrandLoader`, and `BrandSpinner` (all use `motion-reduce:animate-none` or
equivalent JS-level branching).

### Focus management

No `.focus()`, `tabIndex={-1}`, or `scrollIntoView` call tied to a
loading→content transition was found anywhere — checked across all 15
`*Async` components and their parents, with zero exceptions. Content swaps
in place with no programmatic focus handling.

### Component-family loading behavior

`WidgetCard` and `LiveProjectCard` both have no internal loading state by
design — both assume fully-resolved data by the time they render, with
loading handled entirely upstream (page-level `await`/`Promise.all`, or an
ancestor `Suspense` boundary). `EmptyState` is confirmed used exclusively
for the genuinely-empty case — no call site misuses it for "still
loading." Of 11 Base UI `Dialog`-based components, only `CommandPalette`
has any internal async gap (its results list, via the promise-threading
pattern) — the other 10 read exclusively from synchronous, already-hydrated
client stores, so no loading state is needed or present. Neither
`NotificationDrawer` nor `MobileSidebar` has an async gap. Chart loading
treatment is inconsistent across the 4 real consumers:
`ProfileVolumeTrendPanel` has the most complete treatment (an explicit
"Loading volume history…" text on mount, plus an opacity-dim during period
switches); `ProfilePriceChart` has only the opacity-dim, no mount-time
signal; `ProfileTvlChartAsync` relies entirely on its ancestor `Suspense`/
`WidgetSkeleton`; `ProfileHeader`'s compact chart has no async gap at all.
No tooltip anywhere in the app ever shows async/loading content — the one
candidate case (`ProfileHeaderExplorerTooltipAsync`) resolves via its
ancestor `Suspense` boundary before the `Tooltip` itself ever mounts.

---

## STEP 3 — Industry Research Findings

Research conducted for this Standard, principles extracted only:

- **2026 loading-indicator timing consensus** (commonly cited across
  current UX research): 0-300ms — show nothing; 300ms-1s — a subtle
  spinner if the final layout is unknown; 1s-10s — a skeleton screen that
  maps to the incoming content's real shape. Generic, undifferentiated
  spinners for content loading are now considered a UX anti-pattern in
  favor of shape-matched skeletons specifically because skeletons
  communicate structural stability, not just "something is happening."
- **Skeleton accessibility guidance:** hide skeleton placeholder shapes
  from screen readers with `aria-hidden="true"`, but provide the loading
  signal separately via `aria-busy="true"` on the containing region — Base
  Radar's own skeletons correctly do the first half of this and are
  missing the second half entirely (STEP 4, H3).
- **Next.js official guidance (current):** `loading.tsx` automatically
  wraps a route segment (and every nested child segment without its own
  `loading.tsx`) in a `Suspense` boundary — exactly the mechanism this
  audit confirmed via build-artifact tracing for the 5 Explorer sub-routes.
  For finer-grained control, prefer explicit `Suspense` boundaries placed
  close to the actual dynamic/slow data access, splitting by data source
  so fast sections render immediately and slow sections stream in
  independently — the same shape Base Radar's own Project Profile page
  already implements.
- **Optimistic UI (React's `useOptimistic`, current guidance):**
  immediately show the expected outcome of a user action while the real
  request is in flight, reconciling with the actual result once it
  resolves. Not currently used anywhere in Base Radar (not identified in
  this audit's scope, and not required by anything found) — recorded as a
  future-consideration pattern, not a current gap, since none of the
  audited interactions are the kind (form submission, toggle) this pattern
  targets.
- **Loading-indicator selection guidance:** match the indicator to the
  situation — spinners for brief, layout-unknown waits; skeletons for
  content with a known shape; progress bars for measurable, multi-step
  operations; optimistic UI for instant-feeling user-initiated actions.
  Global, page-blocking spinners are specifically called out as harmful to
  both perceived performance and interaction responsiveness — localized,
  progressive feedback is preferred.

---

## STEP 4 — Findings

Ranked by severity. **User Impact/Complexity/Risk are qualitative
engineering judgments made for this audit, not measurements.** No
Critical-severity findings were identified — nothing in this audit
represents a broken flow, blocked interaction, or incorrect final result;
every finding concerns the quality of the wait, not the correctness of
what's eventually shown.

### High

**H1 — 8 of 15 Suspense fallbacks give no visible loading signal**
- **Description:** these boundaries render the same presentational
  component used for resolved data, with placeholder/stale/"unavailable"
  values, marked only by a `data-loading-skeleton` DOM attribute that
  exists for `SplashScreen`'s internal polling, not for users.
- **Evidence:** `ProfileContractDetailsAsync` (`ProfileContracts.tsx:65-73`),
  `ProfileDeveloperTileAsync` (`ProjectHealthScorecard.tsx:361-374`),
  `ProfileNetworkChainStatsAsync` (`ProfileMetrics.tsx:112-120`),
  `ProfileTrustContractsTileAsync` (`ProfileTrustCenter.tsx:211-219`),
  `ProfileVerifiedContractsStatAsync` (`ProfileMetrics.tsx:93-104`),
  `ProfileHeaderExplorerTooltipAsync` (`ProfileHeader.tsx:946`),
  `CommandResultsAsync` (`CommandPalette.tsx:146-157`).
- **Current implementation:** a `data-loading-skeleton="true"` marker
  (where present at all) with no visual or ARIA distinction from resolved
  content.
- **User impact:** a value on screen may silently change a moment after
  the user has already read it, with no warning it was provisional.
- **Severity:** High. **Complexity to address:** Low-Medium (per boundary
  — wrap each in a genuine skeleton or a visibly-distinct "checking…"
  treatment, matching the pattern `ProfileSourcesBlockscoutAsync`/
  `ProfileContributorsAsync` already use correctly). **Risk:** Low.

**H2 — Confirmed skeleton/content size mismatches**
- **Description:** `WidgetSkeleton`'s dimensions don't match the real
  content at 2 of its 4 call sites (plus a mobile-only mismatch at a
  third).
- **Evidence:** `ProfileTransfersAsync` (`ProfileMetrics.tsx:123-124`,
  `h-16` vs. `RecentTransactions.tsx:33-48`'s real ~250-300px table);
  `ProfileTimelineAsync` (`ProfileActivityFeed.tsx:65`, `h-48` vs.
  `ProfileTimeline.tsx:194-223`'s unbounded grouped list);
  `LiveStatusBarAsync` (`DashboardLayout.tsx:66` vs. `LiveStatusBar.tsx:46`'s
  `hidden ... sm:flex`).
- **User impact:** a visible, jarring content shift the instant real data
  streams in — precisely the failure mode skeleton screens exist to
  prevent.
- **Severity:** High. **Complexity:** Low (adjust the passed `className`
  height/add a responsive variant). **Risk:** Low.

**H3 — No screen-reader announcement for any skeleton-based loading state**
- **Description:** `WidgetSkeleton`/`MetricItemSkeleton` are
  `aria-hidden="true"` with no `role="status"`/`aria-live`/`aria-busy`
  anywhere near their 5 combined call sites; `aria-busy` is confirmed
  unused anywhere in the codebase.
- **Evidence:** `WidgetSkeleton.tsx:17`, `MetricItemSkeleton.tsx:15`
  (both `aria-hidden="true"`), repo-wide `aria-busy` grep returning zero
  matches.
- **User impact:** a screen-reader user receives no indication that a
  Profile widget is loading — the region is simply silent until content
  (or its degraded fallback, per H1) appears.
- **Severity:** High. **Complexity:** Low (add `aria-busy="true"` to each
  skeleton's containing region, or a paired visually-hidden `role="status"`
  text). **Risk:** Low.

**H4 — `SplashScreen`'s loading announcement never reaches assistive technology**
- **Description:** its `role="status"`/`aria-label="Loading"` region is
  nested inside an ancestor `aria-hidden="true"` element, which removes
  the entire subtree from the accessibility tree regardless of the
  descendant's own role.
- **Evidence:** `SplashScreen.tsx:210` (ancestor `aria-hidden="true"`),
  `:227` (nested `role="status"`).
- **User impact:** the app-boot loading state is invisible to
  screen-reader users despite correct-looking markup in the source.
- **Severity:** High (the markup exists and looks correct, making this an
  easy-to-miss regression risk for anyone reviewing the code without
  testing it). **Complexity:** Low (move the `aria-hidden` boundary so it
  doesn't wrap the status region). **Risk:** Low.

**H5 — No focus management for any loading→content transition**
- **Description:** confirmed across all 15 named `*Async` boundaries and
  their parents — zero `.focus()`, `tabIndex={-1}`, or `scrollIntoView`
  calls tied to a Suspense resolution anywhere.
- **User impact:** for a keyboard/screen-reader user who tabs to a
  still-loading region, focus is never moved or announced when that
  region's real content replaces the fallback — a silent DOM swap under
  an existing focus point.
- **Severity:** High as a systemic gap (affects every streamed boundary
  equally); the practical per-instance impact varies by how likely a user
  is to be focused on that specific region during its loading window.
  **Complexity:** Medium (would need a consistent, codebase-wide pattern,
  not a per-component fix). **Risk:** Medium (focus-management changes
  interacting with 15 different boundaries need careful, individual
  verification).

**H6 — `BrandSpinner` is dead code, contradicting `DESIGN_SYSTEM_LOCK.md`'s own claims**
- **Description:** zero imports, zero JSX usages anywhere in the
  codebase; `SplashScreen` hand-rolls equivalent markup instead of
  importing it.
- **Evidence:** exhaustive repo-wide grep for `BrandSpinner` imports and
  JSX tags, both returning zero results outside the component's own
  self-reference; `docs/DESIGN_SYSTEM_LOCK.md`'s Component Inventory
  table crediting it with the app-boot role.
- **User impact:** none directly (the visual result at app-boot is
  unaffected, since `SplashScreen` renders equivalent markup) — the impact
  is entirely on engineering accuracy: a maintainer reading
  `DESIGN_SYSTEM_LOCK.md` would reasonably believe `BrandSpinner` is live,
  standardized code.
- **Severity:** High as a documentation-accuracy issue (this is the third
  such gap found across this session's audits, after the `Button`/
  `SectionTitle` gaps in `DESIGN_SYSTEM_LOCK.md` itself), Low as a runtime
  concern. **Complexity:** Low (either wire `SplashScreen` to actually
  import `BrandSpinner`, or correct the doc's claim — both are small).
  **Risk:** Low.

**H7 — `ProfileTvlChangeTilesAsync`'s fallback has a real, unmarked prop mismatch**
- **Description:** the Suspense fallback omits the `emphasize` prop the
  real render always passes, producing a visible typography/size jump
  when real data lands, with no `data-loading-skeleton`/`animate-pulse`/
  `aria-hidden` marker distinguishing it from resolved content at all —
  worse than the other 7 members of the H1 group, which at least carry
  the DOM marker.
- **Evidence:** `ProfileTokenAndPrice.tsx:209-218` (fallback, no
  `emphasize`) vs. `ProfileTvlChangeTilesAsync.tsx:25-26` (real render,
  `emphasize` always passed).
- **User impact:** a specific, visible layout/typography jump for two TVL
  metric tiles, indistinguishable from H1's broader pattern but with an
  additional, sharper size discontinuity.
- **Severity:** High. **Complexity:** Low (add the missing prop to the
  fallback, or generalize the fix alongside H1). **Risk:** Low.

### Medium

**M1 — Inconsistent `motion-reduce` handling across spinner call sites**
- **Description:** 4 of 9 `animate-spin` usages (`ProjectsSortSelect`,
  `ProjectsQuickFilters`, `ProjectsSearchInput`, `ProjectsFilterBar`) lack
  `motion-reduce:animate-none`, while the other 5 correctly include it.
- **User impact:** a reduced-motion user sees a spinning icon in exactly
  the 4 places the app's own established convention says it shouldn't.
- **Severity:** Medium. **Complexity:** Low (add the missing modifier to
  4 call sites). **Risk:** Low.

**M2 — Chart loading treatment is inconsistent across 4 consumers**
- **Description:** `ProfileVolumeTrendPanel` (mount-time text + period-
  switch dim), `ProfilePriceChart` (period-switch dim only),
  `ProfileTvlChartAsync` (ancestor-Suspense-only), `ProfileHeader`'s
  compact chart (no async gap) each handle loading differently, despite
  all four rendering through the same `ProfileChart` primitive.
- **User impact:** the same visual chart component behaves differently
  depending on which page context it's in — no user-facing harm on its
  own, but a real inconsistency worth resolving as chart usage grows.
- **Severity:** Medium. **Complexity:** Medium (would need a shared
  pattern, not four independent fixes). **Risk:** Low.

**M3 — Explorer sub-route interstitial copy is generic**
- **Description:** navigating from Profile into Governance/Whale/
  Contracts/Pools/AI shows the Profile page's own `[slug]/loading.tsx`
  fallback ("Preparing project insights…"), not a destination-specific
  message.
- **User impact:** minor — the loading state is real and functional
  (confirmed via build-artifact tracing), just not perfectly worded for
  its actual destination.
- **Severity:** Medium. **Complexity:** Low (each sub-route could add its
  own thin `loading.tsx` reusing `BrandLoader` with a destination-specific
  `label`). **Risk:** Low.

**M4 — `SyncQueueDialog`'s retry action has no in-flight indicator**
- **Description:** the "Retry Sync" button's `disabled` state reflects
  only offline/empty-queue conditions, not whether a retry is currently in
  progress.
- **Evidence:** `SyncQueueDialog.tsx:96-106`.
- **User impact:** a user could plausibly click "Retry Sync" multiple
  times during one in-flight retry, with no visual feedback distinguishing
  "retrying" from "idle."
- **Severity:** Medium. **Complexity:** Low. **Risk:** Low.

**M5 — `CommandPalette`'s loading pattern is a third, unstandardized kind**
- **Description:** its fallback is a content-degraded render of the real
  component (missing enrichment data) — different in kind from both the
  pulse-skeleton pattern and the "same component, marker only" pattern
  used elsewhere.
- **User impact:** none directly (arguably the best UX of the three
  patterns, since results remain usable throughout) — flagged because it's
  a third pattern with no explicit standard behind it, not because it's
  wrong.
- **Severity:** Medium (as a standardization gap, not a defect).
  **Complexity:** N/A. **Risk:** N/A.

### Low

**L1 — `data-loading-skeleton` is not an accessibility attribute despite its name suggesting one**
- **Why it matters:** naming/documentation clarity only — a future
  contributor could reasonably assume this attribute carries ARIA
  significance; it does not (it exists solely for `SplashScreen`'s
  readiness-polling `isPageReady()` check).
- **Severity/Complexity/Risk:** all Low.

**L2 — `animate-ping` "live" dot is unrelated to loading, noted for completeness**
- **Evidence:** `LiveStatusBar.tsx:76` — a live-status indicator, not a
  loading indicator.
- **Severity/Complexity/Risk:** all Low; not a defect.

---

## STEP 5 — Standard Loading Strategy

### Loading Philosophy

- **Perceived performance over raw speed.** A wait that looks
  intentional, structured, and honest about its own progress reads as
  faster than an equally-long wait that looks broken or silent. This
  Standard optimizes for that perception, not just for reducing actual
  latency (which is [PERFORMANCE_AUDIT.md](PERFORMANCE_AUDIT.md)'s job).
- **Progressive disclosure.** Show what's ready the instant it's ready;
  never hold fast content hostage to a slower sibling. This is already
  Base Radar's real, working instinct on the Project Profile page (STEP
  1/2) — this Standard generalizes it as a rule, not just a pattern.
- **Executive-first rendering.** Matches
  [INFORMATION_HIERARCHY_STANDARD.md](INFORMATION_HIERARCHY_STANDARD.md)'s
  own Executive Information Order — when content streams in progressively,
  it should stream in that same order (identity/trust before secondary
  metrics), not arrival-order-of-whichever-provider-responded-first.
- **Meaningful first paint.** The first thing a user sees should never be
  a blank screen when a branded loader, skeleton, or partial content could
  be shown instead — and it should never be a value the user can't yet
  trust without some visible signal that it's provisional (the core
  problem H1/H7 describe).
- **Honesty about state.** A loading state should look like a loading
  state. This Standard treats "renders the resolved-content component with
  placeholder data and no visual signal" (H1) as a violation of this
  principle, not an acceptable shortcut — it borrows directly from
  [DESIGN_SYSTEM_LOCK.md](DESIGN_SYSTEM_LOCK.md)'s own "Honest
  presentation" principle and the codebase's own established "Not
  Assessed"/"Not Available" empty-data vocabulary, extended here to mean a
  *loading* value must be as clearly marked as an *absent* one already is.

### Route Loading Standard

- **`loading.tsx`** is required for any route segment that performs a
  genuine, synchronous `await` before first paint (matching the pattern
  already used correctly for `/dashboard`, `/dashboard/projects`, and
  `/dashboard/projects/[slug]`) — a segment that inherits a parent's
  `loading.tsx` and is itself synchronous/instant needs no file of its own
  (this is already correctly the case for most routes today).
- **A segment with a genuinely different loading context than its parent**
  (per M3's finding — the 5 Explorer sub-routes) should have its own thin
  `loading.tsx`, reusing `BrandLoader` with a destination-appropriate
  `label`, rather than silently inheriting a differently-worded parent
  fallback.
- **`error.tsx`** should exist at any segment boundary where a distinct,
  actionable recovery message is possible (e.g., "this project's data
  couldn't load" vs. a generic app-wide error) — the existing 2 (`/dashboard`,
  `/dashboard/projects/[slug]`) are the right precedent to extend from,
  not to leave as the permanent ceiling.
- **`Suspense` usage:** prefer boundaries placed close to the actual slow
  data access (per STEP 3's Next.js guidance), splitting by data source so
  independently-resolving pieces don't block each other — exactly the
  Project Profile page's own existing pattern.
- **Streaming expectation:** any provider call plausibly taking longer
  than ~1s (per STEP 3's timing consensus) should stream behind its own
  `Suspense` boundary with a genuine skeleton fallback, not block a
  synchronous `await` at the page level, unless that page's `loading.tsx`
  firing correctly depends on the synchronous await (as documented for
  `/dashboard`/`/dashboard/projects` — a deliberate, still-valid exception,
  not a violation of this rule).

### Skeleton Standard

- **Required** for any Suspense boundary whose real content has a
  reasonably predictable shape and size (a metric tile, a chart, a card) —
  this is the majority case, and is where `WidgetSkeleton`/
  `MetricItemSkeleton` should be used going forward, correcting H1's
  pattern of reusing the resolved component instead.
- **Unnecessary** where the real content's shape is genuinely unknowable
  in advance (e.g., a variable-length list with no reasonable min/max) —
  in that narrow case, a `BrandLoader`-style branded indicator or a
  clearly-labeled loading state (matching `ProfileSourcesBlockscoutAsync`'s
  "Checking…" pattern) is preferable to a skeleton that will always be
  wrong-sized.
- **Skeleton hierarchy:** `WidgetSkeleton` for card/section-level
  placeholders sized via `className` to genuinely match their real
  content's real dimensions (correcting H2 — a skeleton's size is not
  advisory, it is the whole point); `MetricItemSkeleton` for the specific
  label+value metric-tile shape. No third skeleton primitive should be
  introduced without first checking these two can't be sized/composed to
  fit (matching [DESIGN_SYSTEM_LOCK.md](DESIGN_SYSTEM_LOCK.md)'s own
  "reuse before creation" principle).
- **Animation policy:** `animate-pulse`, with `motion-reduce:animate-none`
  — already correct in both existing skeleton components, and the
  required baseline for any future one.
- **Accessibility (correcting H3):** a skeleton's individual placeholder
  shapes stay `aria-hidden="true"` (they carry no real information), but
  the *containing region* must carry `aria-busy="true"` (or an
  accompanying visually-hidden `role="status"` text) so the loading state
  itself is announced — the skeleton hides its shapes from screen readers,
  it must not hide the fact that loading is happening.

### Spinner Standard

- **`BrandLoader`** — reserved exclusively for full-route `loading.tsx`
  fallbacks (its 3 current, correct usages). Not for inline/component-level
  loading.
- **`BrandSpinner`** — per its own documented tiers, reserved for
  full-region loading contexts smaller than a full route (its `"xl"` tier)
  and the app-boot splash specifically (its `"lg"` tier). Correcting H6:
  going forward, `SplashScreen` should actually import and render
  `BrandSpinner` rather than hand-rolling equivalent markup, so the
  component's own documentation becomes true rather than aspirational —
  or, if `SplashScreen`'s bespoke treatment is intentionally preferred,
  `BrandSpinner`'s doc comment and `DESIGN_SYSTEM_LOCK.md`'s Component
  Inventory should both be corrected to stop claiming it's used there.
  Either resolution is acceptable; leaving the current silent mismatch is
  not.
- **Generic spinners** (`lucide-react`'s `Loader2`/`RefreshCw` with
  `animate-spin`) — reserved for `useTransition()`-driven, brief,
  layout-stable interaction feedback (a filter applying, a refresh
  in-flight) where the surrounding layout does not change, per the
  existing, correct majority pattern. Every such usage must pair
  `animate-spin` with `motion-reduce:animate-none` (correcting M1's 4
  missing instances).
- **Prohibited:** a generic spinner standing in for a content region whose
  shape is knowable (that's the Skeleton Standard's job instead); a
  spinner with no `motion-reduce` pairing; introducing a fourth loading-
  indicator family without first exhausting `BrandLoader`/`BrandSpinner`/
  skeleton/generic-spinner's existing scopes.

### Streaming Standard

- **What should stream:** any single provider call whose latency is
  meaningfully variable and not required for the page's Executive-first
  content (per the Loading Philosophy above) — GitHub commit activity,
  DefiLlama TVL history, and Blockscout transfer/contract data are the
  existing, correct precedent on the Project Profile page.
- **What should never block:** a slow, non-essential provider call should
  never sit in the same synchronous `await`/`Promise.all` as content
  required for first paint — matching the Profile page's fast-path/
  slow-path split, and explicitly the opposite of what would happen if a
  new widget's slow fetch were added directly into `/dashboard`'s existing
  10-call `Promise.all` without a Suspense boundary of its own.
  Deliberately synchronous, blocking pages (`/dashboard`, `/dashboard/projects`)
  remain an accepted exception where `loading.tsx` firing correctly is
  the explicit design goal — not itself a violation of this rule, but
  should not be the default choice for new routes without the same
  reasoning applying.
- **Preferred Suspense placement:** as close to the actual dynamic data
  access as possible (per STEP 3's Next.js guidance), never at a page's
  root wrapping content that doesn't need to wait.
- **Nested boundaries:** acceptable and already in real use (e.g.
  `ProfileMetrics` nests multiple independent `*Async` boundaries) —
  each nested boundary should resolve independently and never depend on a
  sibling boundary's own resolution.
- **Async Server Component strategy:** the `use(promise)` +
  small-leaf-Client-Component pattern already used for all 15 named
  boundaries is the standard going forward — a Server Component should
  kick off a promise unawaited and thread it down; the actual `use()`
  unwrap stays in a small, focused Client Component, never a large one.

### Component Loading Standard

- **Widgets** (`WidgetCard` consumers): loading is the page's
  responsibility (route-level `await`/`Promise.all` or an ancestor
  `Suspense`), not the widget's — `WidgetCard` itself should remain a pure
  presentational shell with no internal loading branch, matching its
  current, correct design.
- **Charts:** every `ProfileChart` consumer should follow
  `ProfileVolumeTrendPanel`'s more complete treatment (a genuine mount-time
  loading signal, plus an `isPending`-driven opacity/dim treatment for
  period switches) rather than each independently choosing a subset —
  correcting M2's inconsistency by standardizing on the more complete
  existing pattern, not inventing a new one.
- **Dialogs/Drawers:** a dialog whose content is entirely synchronous
  client-store data (the current, correct case for 10 of 11 audited
  dialogs) needs no loading state. A dialog with a genuine async gap on
  open (`CommandPalette`'s pattern) should use the same content-degraded-
  fallback approach already established there, or a skeleton matching the
  Skeleton Standard above — not a third, novel pattern.
- **Tables:** `RecentTransactions`' pattern (no internal loading branch,
  fed fully-resolved data by an ancestor Suspense boundary with a
  correctly-sized skeleton fallback) is the standard — correcting the
  skeleton-sizing half of that pattern per H2, not its overall shape.
- **Project cards** (`LiveProjectCard`): correctly assumes fully-resolved
  `LiveProject` data; the Universal Project Card Standard's own §19 Empty
  Data Philosophy vocabulary remains the correct handling for permanently-
  absent fields — this Standard does not introduce a separate "loading"
  variant of the card, since the card's own architecture (a Server
  Component reading already-resolved props) makes that unnecessary by
  construction.
- **Search:** `CommandPalette`'s existing pattern is the standard (§ above,
  M5) — explicitly ratified here rather than left as an implicit,
  unstandardized third pattern.
- **Explorer:** the 5 sub-routes' reliance on `[slug]/loading.tsx`'s
  inherited fallback is structurally correct (confirmed via build-artifact
  tracing) and should continue; only the fallback's copy should become
  destination-specific per the Route Loading Standard above.

### Progressive Rendering Standard

Prioritized rendering order for any page that streams content
progressively — directly derived from
[INFORMATION_HIERARCHY_STANDARD.md](INFORMATION_HIERARCHY_STANDARD.md)'s
own Executive Information Order, extended here to govern *arrival* order,
not just display order:

1. **Navigation** — the dashboard shell (Sidebar/Topbar) never waits on
   page content; this is already true today (the shell mounts
   independently of any route's data).
2. **Page title / identity** — the first content-specific thing a user
   should see.
3. **Executive summary / trust signal** — matching
   [INFORMATION_HIERARCHY_STANDARD.md](INFORMATION_HIERARCHY_STANDARD.md)'s
   §3 Executive Information Order (Identity → Trust → Health →
   Recommendation before raw metrics).
4. **KPIs / primary metrics** — the headline numbers a user came for.
5. **Primary content** — the page's main body (e.g. the Profile page's
   Overview/Market zones).
6. **Secondary content** — supporting detail, matching the Information
   Hierarchy Standard's Medium/Low priority tiers.
7. **Heavy analytics** — charts, historical data, anything backed by a
   genuinely slow provider call (GitHub commit activity, DefiLlama TVL
   history) — last by design, exactly matching the Project Profile page's
   own existing slow-path list.

**Reasoning:** this order is not new — it is
[INFORMATION_HIERARCHY_STANDARD.md](INFORMATION_HIERARCHY_STANDARD.md)'s
own display-order rule, restated as an *arrival*-order rule for streamed
content specifically. A page that displays content in executive-first
order but *streams* it in a different order (e.g., a slow chart arriving
before a fast KPI due to network variance rather than design) would
violate this Standard even if its final, fully-loaded state looks correct
— each Suspense boundary's priority should be chosen deliberately, not
left to incidental provider-response timing.

### Accessibility

- **ARIA requirements:** every loading region needs `aria-busy="true"` (or
  an equivalent `role="status"` announcement) on its container —
  correcting H3/H4's finding that this exists nowhere today. Decorative
  skeleton shapes themselves stay `aria-hidden="true"`, per the Skeleton
  Standard above — the two are not in tension; the container announces,
  the shapes stay silent.
- **Reduced motion:** every animated loading indicator (skeleton pulse,
  `BrandLoader`/`BrandSpinner` animation, generic spinner) must pair its
  animation with `motion-reduce:animate-none` or an equivalent JS-level
  branch — already correct for `WidgetSkeleton`/`MetricItemSkeleton`/
  `BrandLoader`/`BrandSpinner`, and required going forward for the 4
  generic-spinner sites M1 found missing it.
- **Announcing loading state:** a loading state must be announced once,
  clearly, and not repeatedly re-announced on every re-render — this
  audit did not find evidence of over-announcement (since `aria-live`/
  `aria-busy` are essentially unused today), but this is the standard to
  hold any future implementation to.
- **Focus management:** correcting H5 — a loading→content transition
  should not silently relocate a user's focus, but should also not leave
  focus stranded on a removed fallback element. Where a fallback element
  itself was focusable (rare today, since fallbacks are mostly
  non-interactive), the equivalent element in the resolved content should
  be the next natural tab stop, achieved by DOM position consistency
  rather than an explicit `.focus()` call in the common case.
- **Keyboard behavior:** a loading region should never trap keyboard focus
  (no loading state audited in this session does) and should never be
  itself a tab stop unless it's genuinely interactive (matching Universal
  Card §17's "a card in the pure Loading state is inert" rule, extended
  here as a general principle).

---

## STEP 6 — Future Enhancements

Kept strictly separate, per the requested structure — none of the four
categories below authorize implementation.

### Immediate Improvements
- Add `aria-busy="true"` (or equivalent `role="status"`) to
  `WidgetSkeleton`/`MetricItemSkeleton`'s containing regions (H3).
- Fix `SplashScreen`'s `aria-hidden` ancestor so its `role="status"`
  region actually reaches assistive technology (H4).
- Add the missing `motion-reduce:animate-none` to the 4 spinner sites
  found without it (M1).
- Add the missing `emphasize` prop to `ProfileTvlChangeTilesAsync`'s
  fallback (H7).
- Resize `WidgetSkeleton`'s 3 mismatched call sites to genuinely match
  their real content (H2).
- Correct `docs/DESIGN_SYSTEM_LOCK.md`'s `BrandSpinner`/`SplashScreen`
  claims (H6).
- Give `SyncQueueDialog`'s retry action a real in-flight indicator (M4).

### Future Improvements
- Replace the 8 no-signal Suspense fallbacks (H1) with genuine skeletons
  or clearly-labeled "checking…" states, matching the pattern
  `ProfileSourcesBlockscoutAsync` already gets right.
- Standardize chart loading treatment across all 4 `ProfileChart`
  consumers on `ProfileVolumeTrendPanel`'s more complete pattern (M2).
- Give the 5 Explorer sub-routes their own destination-specific
  `loading.tsx` copy (M3).
- Design and implement a consistent focus-management approach for
  loading→content transitions (H5) — flagged as Future rather than
  Immediate specifically because it needs a considered, codebase-wide
  pattern, not a per-instance patch.

### Nice-to-have Enhancements
- Explore `useOptimistic` for any future user-initiated action (a toggle,
  a form submission) that would benefit from instant-feeling feedback —
  not currently needed by anything audited in this session, recorded for
  when such an interaction is added.
- A formal, shared `&lt;LoadingRegion aria-busy&gt;` wrapper component, if
  the ARIA fix above (Immediate Improvements) proves repetitive enough
  across many call sites to justify one.

### Technical Debt
- The `data-loading-skeleton` attribute's name implies accessibility
  relevance it doesn't have (L1) — a naming/documentation clarity item,
  independent of whether its underlying `SplashScreen`-polling mechanism
  ever changes.
- `docs/DESIGN_SYSTEM_LOCK.md`'s Component Inventory (§3) currently
  asserts a "Standardized" verdict for Loading States that this audit's
  `BrandSpinner` finding (H6) does not fully support — the verdict itself
  should be revisited once H6 is resolved either direction.

---

## Provenance

Every codebase claim in this document is drawn from two direct,
current-session background audits — one covering every skeleton, spinner,
and branded-loader component and call site, plus loading-state
accessibility and focus-management behavior across all 15 named Suspense
boundaries (`WidgetSkeleton`, `MetricItemSkeleton`, `BrandLoader`,
`BrandSpinner`, `SplashScreen`, and an exhaustive `animate-spin`/
`animate-pulse`/`aria-busy`/`aria-live` grep); one covering component-family
loading behavior for `WidgetCard`, `LiveProjectCard`, `EmptyState`, all 11
Base UI `Dialog`-based components, both drawers, all 4 `ProfileChart`
consumers, both real `&lt;table&gt;` elements, `Tooltip`/`RichTooltip`, and
the 5 Explorer sub-routes' interstitial-loading behavior (confirmed via
direct reading of compiled `.next/server/**/page.js.nft.json` build-trace
files, not documentation alone) — together with facts reused directly from
[PERFORMANCE_AUDIT.md](PERFORMANCE_AUDIT.md) (App Router route inventory,
`loading.tsx`/`error.tsx` count, the promise-threading/`use()` pattern) and
[DESIGN_SYSTEM_LOCK.md](DESIGN_SYSTEM_LOCK.md) (the Component Inventory
verdict this audit re-examines for `BrandSpinner`). Every industry-practice
claim is drawn from research conducted for this Standard (current
skeleton/perceived-performance UX guidance, React's `useOptimistic`,
current Next.js `Suspense`/`loading.js` guidance) — see the corresponding
chat responses this document was delivered alongside for full source
citations. Neither category is asserted from unverified memory. One
live-browser verification attempt (the Explorer sub-route fallback
painting mid-navigation) was inconclusive due to tooling/timing limits and
is reported as such rather than as a confirmed observation.
