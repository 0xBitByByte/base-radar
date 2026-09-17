# Navigation & Clickability — Product Standard

**Status:** 🔒 Frozen v1.0 — interaction foundation for PR-085 onward.

This document answers one question, for every entity in Base Radar:

> **Whenever a user sees a meaningful entity, should they be able to interact with it?**

It governs *interaction and destination*, not visual style or information
order — [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md) documents the actual tokens,
typography, and components in use, and
[INFORMATION_HIERARCHY_STANDARD.md](INFORMATION_HIERARCHY_STANDARD.md)
governs what's shown first/second/third on a given screen. This Standard
is the third leg: once an entity is shown, in its right order, what
happens when a user tries to act on it. It is independent of, and
complementary to, the two Trust/Quality standards
([TRUSTED_PROJECT_FRAMEWORK.md](TRUSTED_PROJECT_FRAMEWORK.md),
[GOOD_PROJECT_EVALUATION_FRAMEWORK.md](GOOD_PROJECT_EVALUATION_FRAMEWORK.md))
and the Universal Project Card Standard's own §17 Interaction Rules, which
this document extends from one component to the whole application.

---

## Executive Summary

Base Radar already has two genuinely good, independently-arrived-at
interaction precedents: `LiveProjectCard`'s whole-card-click pattern
(Universal Project Card Standard §17), and `AlertCard`'s "stretched link"
pattern — a real `<Link>`/`<button>` absolutely-positioned under the
visible content, with the Pin button layered above as an independent,
keyboard-focusable `z-10` control. Both solve the same problem (a card
that's fully clickable without nesting an interactive element inside
another) the same correct way, without having coordinated.

That discipline is not universal. The audit below found a consistent,
previously-undocumented convention that should be made explicit rather
than left implicit — on-chain/explorer entities (Governance proposals,
Whale transactions, Contracts, Transactions) always link externally to a
block explorer via `ExternalLink`, while internal-registry entities
(Projects, Timeline events, Alerts, Notifications, Portfolio holdings)
always link internally via `next/link`. This is a real, working rule; §4
below is the first place it's written down.

It also found five categories of **non-interactive entities that read as
though they should be clickable but are not**: Chains, Wallets,
Categories, Recommendations, and Signals. None of these are bugs — each
is a legitimate current scope boundary (no chain detail page exists, no
wallet profile page exists, Categories are a filter not an entity) — but
today that boundary is silent. A user hovering a chain badge or a
Recommendation card gets no visual signal that nothing will happen. This
Standard's §9 (Dead-End Prevention) and §3 (Clickability Philosophy) make
that boundary an explicit, intentional "Never" rather than an
unacknowledged gap.

---

## Current Navigation Audit

*(Full per-entity findings are in this Standard's accompanying chat
response, per this initiative's established "findings-only, no file
duplication" convention. Summarized here for permanent reference.)*

| Entity | Clickable today? | Destination | Pattern |
| --- | --- | --- | --- |
| Projects (all surfaces: Dashboard, Explorer, rails, collections, Related, Search, Watchlists) | Yes, consistently | `/dashboard/projects/[slug]` | `LiveProjectCard` / `SearchProjectRow`, whole-card click (Universal Card §17) |
| Timeline events | Yes | `event.link` | Real `<Link>` |
| Portfolio holdings | Yes | `/dashboard/projects/[slug]` | Real `<Link>`, two render sites in `PortfolioOverview.tsx` |
| Alerts | Yes | `alert.actionUrl` | Stretched-link pattern (`AlertCard.tsx`) — click + separate read-marking side effect |
| Notifications | Yes | `notification.link` | Real `<Link>` per row (`NotificationItem.tsx`) |
| Governance proposals | Yes | external block explorer / Snapshot | `ExternalLink` (`GovernanceCard.tsx`) |
| Whale transactions | Yes | external block explorer (tx) | `ExternalLink` (`WhaleCard.tsx`) — wallet addresses shown but not linked |
| Contracts | Yes | external block explorer | `ExternalLink` (`ContractCard.tsx`) |
| Collections | Yes | dedicated collection route | `ProjectsCollectionPage.tsx`; inner rows reuse `LiveProjectCard` |
| Chains | **No** | — | `ChainBadge`/`ChainBadgeGroup` — no `Link`/`onClick`, no chain detail route exists |
| Wallets | **No** | — | No wallet entity component or route exists anywhere; `WhaleCard` shows addresses via `CopyButton` only |
| Categories | **No** (filters only) | query-string filter on `/dashboard/projects` | `CategoryRail` — not a distinct entity destination |
| Recommendations | **No** | — | `portfolio/RecommendationCard.tsx`, `brief/RecommendationCard.tsx` — no `Link`/`onClick` in either |
| Signals | **No** | — | `SignalPills.tsx`, `SignalsWidget.tsx` — no `Link`/`onClick` in either |

---

## Industry Research Findings

Research conducted for this Standard, principles extracted only — no
product copied:

- **Bloomberg Terminal:** predictability is the load-bearing property in
  an information-dense interface — the terminal's own UX team describes
  their job as concealing complexity behind consistent, learnable
  pathways rather than removing density itself.
- **Stripe Dashboard:** navigation is organized around user *jobs*
  (Payments, Payouts, Customers, Disputes), not internal system
  architecture — this is what makes a destination predictable before the
  click, not after.
- **Linear, Notion, Vercel:** progressive disclosure as product
  philosophy, not just a UX technique — Vercel's deployment view shows a
  summary immediately, with logs and build detail exactly one click deep;
  Linear's issue list ships with almost no chrome and keyboard-first
  navigation at high row density.
- **Command palettes (Vercel, Figma, Linear):** a searchable, keyboard-
  reachable shortcut past the navigation hierarchy entirely, for users who
  already know their destination — Base Radar's own ⌘K is this same
  pattern, already shipped.
- **Coinbase design system:** a single shared component library across
  every surface (App, Wallet, Base) is what makes interaction behavior
  consistent between them — accessibility (focus states, keyboard
  support) is built into the components themselves, not re-implemented
  per screen.
- **Information scent (NN/g, information-foraging research):** users
  decide whether to click *before* clicking, based on cues — label text,
  visual affordance, surrounding context — that must accurately predict
  the destination; a link whose destination doesn't match its scent is
  the most common cause of a dead-end feeling, even when the link
  technically "worked."
- **Deep-linking / drill-down convention:** the destination's own heading
  should echo the text of the link that was clicked, preserving context
  across the navigation — the same principle Base Radar's Timeline/Alert/
  Notification links already satisfy by name-matching their source entity.

---

## Current vs. Best-Practice Comparison

| Best practice | Base Radar today |
| --- | --- |
| Navigation organized around predictable, job-shaped destinations (Stripe) | Mostly true — Project, Timeline, Alert, Notification, Portfolio all resolve to one obvious destination each |
| Information scent matches destination (NN/g) | Mostly true for linked entities; **silent for the five non-clickable categories** — no visual cue distinguishes "clickable" from "not" today |
| Progressive disclosure, drill-down one click deep (Vercel/Linear) | True for Governance/Whale/Contracts (external link) and Profile page in-page scroll-to (`ProfileKeySignals`) |
| Command palette as a keyboard-reachable shortcut (Vercel/Figma/Linear) | Already shipped — ⌘K |
| Single shared component/interaction pattern across surfaces (Coinbase CDS) | True for Projects (`LiveProjectCard`); **not yet formalized** for the whole-card-click vs. stretched-link choice used elsewhere (`AlertCard`) |
| Predictable "on-chain always external, internal-registry always internal" split | True today, but undocumented until this Standard |

---

## 1. Purpose

This Standard defines, for every entity type in Base Radar, whether it is
interactive, where it goes when interacted with, and how that interaction
must behave — so that a user's expectation, once learned on one entity, is
never violated on another. It is the interaction counterpart to the
Universal Project Card Standard (component-level) and the Information
Hierarchy Standard (order/density-level): together the three answer *what
is shown, in what order, and what happens when you touch it.*

## 2. Navigation Principles

- **Clickable by default.** A meaningful entity — one a user could
  reasonably want to learn more about — is interactive unless it has a
  documented reason not to be (§3).
- **Predictable destination.** The same entity type always resolves to
  the same kind of destination, everywhere it appears (§4).
- **One entity → one destination.** An entity never has two different
  destinations depending on where it's rendered.
- **Progressive drill-down.** Complex entities reveal more detail one
  step at a time (list → card → profile/external record), never all at
  once and never buried more than one extra step past where they're
  already useful.
- **Context preservation.** A user who drills into an entity can always
  get back to where they were, with their place intact — filters,
  scroll position, and selection state are not silently lost.
- **Minimal navigation friction.** No unnecessary confirmation step,
  intermediate page, or modal stands between an entity and its
  destination for a simple, non-destructive read action.
- **No dead ends.** Every interactive-looking element does something;
  every non-interactive element looks non-interactive (§9).
- **Keyboard accessible.** Every interactive entity is reachable and
  operable without a mouse (§6).
- **Mobile friendly.** Every interactive entity has a touch target and
  behavior that works without hover (§7).

## 3. Clickability Philosophy

| Entity | Clickability | Notes |
| --- | --- | --- |
| Projects | **Always** | Universal Card §17 — whole-card click, every surface |
| Categories | **Never** (filter, not an entity) | `CategoryRail` mutates the Projects query string; no dedicated destination exists or is planned at this tier |
| Collections | **Always** | Dedicated route per collection |
| Tokens | **Always**, via the owning Project | No standalone token entity/page exists separately from its project today |
| Protocols | **Always**, via the owning Project | Same as Tokens — protocol and project are the same entity in the current data model |
| Chains | **Sometimes** — not yet, reserved for future | No chain detail page exists; a chain badge is decoration only until one is built (§12) |
| Governance proposals | **Always** | External block explorer / Snapshot link |
| Wallets | **Never**, today | No wallet profile page exists; address shown as copy-only text, deliberately not a link to nowhere |
| Contracts | **Always** | External block explorer link |
| Transactions | **Always** | External block explorer link |
| Metrics (a single number, e.g. TVL value) | **Never** | A metric is a value, not an entity; it isn't independently interactive, though the card/row containing it is |
| Badges (Risk, Trust, Status) | **Sometimes** | Interactive only where the badge is the entry point to a real breakdown that exists (e.g. Risk Badge → Profile risk section); otherwise a static label |
| Charts | **Never**, today | No chart in the current app is itself a navigation target; charts are always inside an already-clickable card |
| Widgets (Dashboard) | **Sometimes** | The widget shell is not clickable; individual rows/entities inside it are, per that entity's own rule |
| Tables | **Sometimes** | The table/row chrome is not clickable; individual entity cells follow that entity's own rule (e.g. a transaction row is clickable via its tx link, a raw numeric cell is not) |
| Timeline events | **Always** | Real `<Link>` to `event.link` |
| Notifications | **Always** | Real `<Link>` to `notification.link`, paired with a read-marking side effect |
| Portfolio assets | **Always**, via the owning Project | `PortfolioOverview` |
| Search results | **Always** | Routed through `CommandItem`; project results additionally render `SearchProjectRow` |
| Recommendations | **Never**, today | No destination exists yet; recorded as a gap, not a design decision (§12) |
| Executive summaries | **Never**, as a block — **Always** for entities referenced inside them | The summary text/container isn't a link; any entity it names (a project, an alert) is clickable via that entity's own normal rule |

## 4. Destination Standards

For every entity marked **Always** or **Sometimes** in §3:

| Entity | Primary destination | Alternative destination | Deep-link behavior | Back-navigation | Context preservation |
| --- | --- | --- | --- | --- | --- |
| Projects | `/dashboard/projects/[slug]` | none | Cmd/Ctrl-click opens in new tab (Universal Card §17) | Browser back returns to prior scroll position | List filters/sort persist in the URL query string where already implemented |
| Collections | Dedicated collection route | none | Standard `next/link` — shareable URL | Browser back | N/A — collection routes are themselves the destination |
| Timeline events | `event.link` (internal) | none | Standard link | Browser back | Timeline scroll position not currently preserved — see §10 |
| Alerts | `alert.actionUrl` | Pin action (independent control, does not navigate) | Standard link, stretched-link surface | Browser back | Read-state persists (side effect of the click) |
| Notifications | `notification.link` | Mark read/unread (independent controls) | Standard link | Browser back | Read-state persists |
| Governance / Whale / Contracts / Transactions | External block explorer, new tab implied by `ExternalLink` affordance | none | External URL, not app-internal | N/A — external tab | N/A |
| Search results (project) | `/dashboard/projects/[slug]` | none | Same as Projects | Palette closes on navigate | Recent-search record is written (`recordSearch()`) |
| Portfolio assets | `/dashboard/projects/[slug]` | none | Same as Projects | Browser back | Portfolio view state not currently preserved — see §10 |

**The on-chain-vs-internal split, made explicit:** any entity whose
authoritative record lives on-chain (Governance, Whale, Contracts,
Transactions) always resolves externally to a block explorer — Base
Radar is not the source of truth for that record. Any entity whose
authoritative record lives in Base Radar's own registry or user state
(Projects, Timeline, Alerts, Notifications, Portfolio) always resolves
internally. This split is a rule now, not an accident of nine
independently-built components.

## 5. Interaction Consistency

Audited against each other, not redesigned:

| Pattern | Component(s) | Consistent? |
| --- | --- | --- |
| Whole-surface click, no nested interactive element | `LiveProjectCard` (Universal Card §17), `AlertCard` (stretched-link) | **Yes** — two independently-built solutions to the same constraint, same correct shape |
| Row click for external record | `GovernanceCard`, `WhaleCard`, `ContractCard` | **Yes** — all three use the same `ExternalLink`-affordance pattern |
| List-item click + independent side-action | `AlertCard` (Pin), `NotificationItem` (mark read/unread) | **Yes** — both separate the navigation surface from the independent action control |
| Project row inside a non-card context | `SearchProjectRow` | **Consistent by design** — deliberately presentational only, with `CommandItem` (not the row itself) owning `role="option"`/keyboard handling/`onSelect`, per this initiative's own PR-8 Engineering decision |
| In-page jump vs. cross-page navigation from the same component | `ProfileKeySignals` | **Inconsistent, but each individually correct** — some signals `<Link>` to another page, others `onClick` scroll-to-section on the same page, with no shared visual distinction between the two — a user cannot tell, before clicking, whether a given signal will leave the page or just scroll it. Documented as a finding, not fixed here. |
| Non-clickable entities that resemble clickable cards | `RecommendationCard` (both `portfolio/` and `brief/` variants), `SignalPills`, `SignalsWidget` | **Inconsistent with the rest of the app's card language** — visually similar to clickable cards elsewhere but carry no `Link`/`onClick`. Documented as a finding (§9), not fixed here. |

## 6. Keyboard Navigation

- **Tab order** follows visual/DOM order; every entity marked clickable
  in §3 is a real tab stop (native `<a>`/`<button>`, never a `div` with a
  synthetic click handler).
- **Arrow-key navigation** is used only inside the ⌘K command palette's
  result list, where `CommandItem` owns `role="option"` and arrow-key
  selection — this is the only surface in the app with list-level
  arrow-key navigation today; no other list (Explorer rows, rails,
  Watchlists) implements it.
- **Command palette (⌘K)** is the app's keyboard-first shortcut layer,
  matching the Vercel/Figma/Linear precedent in §3 of Industry Research
  Findings above.
- **Focus visibility** — every focusable entity must show a visible
  focus ring, per Universal Card §21; this Standard extends that
  requirement to every entity in §3, not just project cards.
- **Escape behavior** inside a Base UI Dialog (the ⌘K palette) is a
  confirmed, real Base UI built-in behavior — not independently verified
  interactively this session (see this initiative's documented browser-
  tool limitation testing ArrowDown/Enter/Escape inside a focus trap).
- **Dialogs / menus / lists** — the palette is currently the only dialog
  in the app that owns its own keyboard model; other lists rely on plain
  Tab order between native links.
- **Accessibility expectation:** an entity that is a real `<a>`/`<button>`
  automatically satisfies keyboard reachability — this is why §3/§4 insist
  on real elements rather than synthetic click handlers, not as an
  accessibility add-on but as the mechanism itself.

## 7. Mobile Navigation

- **Touch targets** — every interactive entity meets the Universal Card
  §21 44×44px minimum; this Standard extends that floor to every entity
  in §3, including the independent side-actions in §5 (Pin, mark-read).
- **Swipe / long-press / bottom sheets** — not currently implemented
  anywhere in the app; no entity today depends on a gesture beyond tap,
  which keeps every interaction in §3 accessible without discoverability
  risk on mobile.
- **Responsive navigation** — the app's mobile layout is confirmed
  (Universal Card §15) to reuse the same `compact`-tier row set rather
  than a different mobile-only interaction model; this Standard's
  destinations (§4) do not change by viewport.
- **Progressive disclosure on mobile** — Vercel's summary-first,
  detail-one-click-deep pattern (Industry Research Findings) is already
  the shape of `ProfileKeySignals`' scroll-to-section behavior and should
  be the reference pattern for any future mobile-specific drill-down, not
  a bottom sheet invented separately for mobile only.

## 8. Information Scent

- **Visual cues** — a real link/button uses native cursor and hover
  affordances by default; this Standard's §9 finding is precisely that
  the five non-clickable categories currently give *no* visual cue either
  way, which is itself a scent failure (neither "clickable" nor
  "obviously static").
- **Hover states** — desktop hover on a clickable entity should signal
  interactivity (matching Universal Card §17's restrained
  elevation/border-shift language) — extended here to every entity in §3
  marked Always/Sometimes, not just project cards.
- **Cursor behavior** — `cursor: pointer` (or the native link/button
  default) on every real interactive element; a non-interactive
  card-shaped element (Recommendations, Signals, §9) must not
  accidentally inherit a pointer cursor from a shared class name, since
  that alone creates false information scent.
- **Badges / labels / icons as scent** — the `ExternalLink` icon already
  used consistently on Governance/Whale/Contracts (§4) is a correct,
  reusable scent pattern: it tells a user *before* the click that the
  destination is external, not just that something is clickable. This
  Standard formalizes it as the required icon for every external
  destination going forward.
- **Context** — per the deep-linking research finding above, a
  destination's own heading should echo the entity a user clicked to get
  there; Timeline, Alerts, and Notifications already satisfy this by
  navigating to the entity's own canonical name/slug.

## 9. Dead-End Prevention

- **Empty states** — already handled per-page today (e.g. `AlertsPageClient`'s
  three empty-state variants); this Standard does not change existing
  empty-state design, only requires that a non-interactive entity look
  non-interactive rather than presenting as an empty dead end after a
  click.
- **Missing pages** — no entity in §3 currently links to a route that
  doesn't exist; the five **Never**-clickable categories (Chains,
  Wallets, Categories-as-entity, Recommendations, Signals) are the
  documented, intentional version of "no destination exists yet" — the
  fix is either building the destination (§12) or ensuring the entity
  never visually implies one exists.
- **Archived / discovery-only / delisted projects** — governed by the
  Universal Project Card Standard's own §18 Card States (Discovery,
  Deprecated, Delisted); this Standard defers to that section rather than
  redefining it.
- **Deleted content** — an Alert or Notification whose `actionUrl`/`link`
  points at content that no longer exists is not currently guarded
  against; recorded as a finding, not fixed here (§12).
- **Unavailable providers** — when an external block explorer link would
  be malformed because `explorerUrl` isn't resolvable for a given chain,
  the current components (`GovernanceCard`, `WhaleCard`, `ContractCard`)
  were not verified this session to guard against a broken external
  link; recorded as a finding, not fixed here (§12).
- **Unknown entities** — an entity type not covered by §3 at all (e.g. a
  future new on-chain primitive) should default to **Never** clickable
  until it's explicitly added to §3 — never silently inherit a generic
  "clickable card" style without a real destination behind it.

## 10. Cross-Application Consistency

Audited across pages, not redesigned:

| Page | Entities present | Consistent with the rest of the app? |
| --- | --- | --- |
| Dashboard | Projects, Recommendations (via widgets), Signals | Projects: yes. Recommendations/Signals: **no** — visually card-like, but non-interactive (§5, §9) |
| Projects Directory / Explorer | Projects, Categories (filter), Collections | Yes — Categories correctly present as filter chrome, not entity cards |
| Project Profile | Governance, Whale, Contracts, Related Projects, Key Signals | Yes for external entities; `ProfileKeySignals`' mixed link/scroll behavior is the one documented inconsistency (§5) |
| Watchlists | Projects | Yes |
| Alerts | Alerts | Yes — stretched-link pattern is the app's cleanest precedent |
| Timeline | Timeline events | Yes |
| Portfolio | Portfolio assets, Recommendations | Assets: yes. Recommendations: **no** (§5, §9) |
| Notifications | Notifications | Yes |
| Search (⌘K) | Projects, other `SearchableItem` result types | Yes — `CommandItem` owns interaction uniformly across all result types |
| Collections | Projects | Yes — reuses `LiveProjectCard` |

The two real inconsistencies found (`ProfileKeySignals`' unmarked
link-vs-scroll split, and Recommendations/Signals' non-interactive card
styling) are the only cross-page findings from this audit; every other
entity type behaves consistently everywhere it appears.

## 11. Accessibility

- **Keyboard navigation** — see §6; every entity in §3 marked
  Always/Sometimes must be a real, tabbable element.
- **Focus management** — a navigation action must not strand focus (e.g.
  clicking a Timeline event and later returning should not leave focus
  on a removed DOM node); not independently verified this session,
  recorded as a verification gap for implementation time, not a known
  defect.
- **Screen readers** — every link's accessible name must describe the
  destination entity, never generic text ("click here," "view more"
  alone) — extending Universal Card §21's rule to every entity in §3.
- **Touch targets** — see §7; 44×44px minimum for every interactive
  element, including independent side-actions (Pin, mark-read).
- **ARIA usage** — reserved for genuinely non-native interaction
  patterns (the ⌘K palette's `role="option"` list); a plain link/button
  needs no additional ARIA role and should not be given one redundantly.
- **Semantic elements** — real `<a>`/`<button>` always, per §6 — this is
  the single rule that makes every other accessibility property in this
  section follow automatically rather than needing separate
  implementation.
- **Visible focus** — see §6; no `outline: none` without a replacement,
  per Universal Card §21.
- **Reduced motion** — any hover/transition affordance added per §8 must
  respect `prefers-reduced-motion`, per Universal Card §21 — the
  interaction must still be perceivable, never fully removed.

## 12. Future Enhancements

Recorded for future consideration only — no implementation authorized by
this Standard:

1. **Chain detail pages.** Chains are rendered in badge form everywhere
   (§3) but have no destination. Building one would move Chains from
   **Never** to **Always** in §3 and requires its own scoping (what would
   a chain page show that isn't already on a per-project basis?).
2. **Wallet profile pages.** Same shape of gap as Chains — `WhaleCard`
   already has the address data (`fromAddress`/`toAddress`); a wallet
   page would be additive, not a data-availability blocker.
3. **Recommendation and Signal destinations.** Both currently read as
   actionable but go nowhere (§3, §9) — the most user-visible gap found
   in this audit, since these are framed with action-oriented language
   ("Recommendation") without any action actually being possible.
4. **Visual distinction between in-page scroll and cross-page navigation**
   in `ProfileKeySignals` (§5), so a user can tell which behavior a given
   signal will trigger before clicking it.
5. **List-level keyboard navigation** (arrow keys) outside the ⌘K
   palette — Explorer rows, rails, and Watchlists currently rely on plain
   Tab order only (§6).
6. **Context preservation for Timeline scroll position and Portfolio view
   state** (§4) — neither is currently preserved across a drill-down and
   back-navigation.
7. **Guarded external links** — verifying `explorerUrl` resolves before
   rendering a Governance/Whale/Contract link, rather than assuming it
   always does (§9).
8. **Swipe / long-press / bottom-sheet mobile gestures** (§7) — not
   needed today since no interaction requires them, but worth reserving
   as a pattern if a future mobile-specific feature needs progressive
   disclosure beyond tap.

---

## Provenance

Every codebase claim in this document is drawn from a direct,
current-session reading of `TimelineItem.tsx`, `PortfolioOverview.tsx`,
`AlertCard.tsx`, `NotificationItem.tsx`, `GovernanceCard.tsx`,
`WhaleCard.tsx`, `ContractCard.tsx`, `ProjectsCollectionPage.tsx`,
`CategoryRail.tsx`, `ChainBadge.tsx`, `ChainBadgeGroup.tsx`,
`RecentTransactions.tsx`, `ProfileKeySignals.tsx`, `SignalPills.tsx`,
`SignalsWidget.tsx`, `components/portfolio/RecommendationCard.tsx`,
`components/brief/RecommendationCard.tsx`, the `app/dashboard/` route
tree (including the confirmed intentional `watchlist` → `watchlists`
permanent redirect), the Universal Project Card Standard (`docs/planning/`),
and `docs/INFORMATION_HIERARCHY_STANDARD.md`. Every industry-practice
claim is drawn from research conducted for this Standard (Bloomberg
Terminal, TradingView, Arkham Intelligence, DefiLlama, Token Terminal,
Messari, Coinbase, Stripe Dashboard, Linear, Notion, Vercel, and
published information-scent/information-foraging research) — see the
corresponding chat responses this document was delivered alongside for
full source citations. Neither category is asserted from unverified
memory.
