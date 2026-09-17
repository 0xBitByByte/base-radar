# Design System Lock — Product Standard

**Status:** 🔒 Frozen v1.0 — visual and interaction foundation for PR-085 onward.

This document answers one question, for every reusable UI pattern in Base
Radar:

> **What is the one canonical way to build this, and where does today's
> code disagree with itself about the answer?**

It is the fourth and last of this session's foundation Standards, and sits
at a different layer than the other three: [INFORMATION_HIERARCHY_STANDARD.md](INFORMATION_HIERARCHY_STANDARD.md)
governs *order* (what's shown first/second/third),
[NAVIGATION_CLICKABILITY_STANDARD.md](NAVIGATION_CLICKABILITY_STANDARD.md)
governs *interaction* (what happens when you touch something), and the
Universal Project Card Standard governs one specific, already-solved
component. This Standard governs the *visual system itself* — the tokens,
primitives, and component inventory everything else is built from. It
supersedes nothing in [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md), which remains
the living record of current tokens/behavior; this Standard is the
governance layer on top of it — the rules for when a new pattern reuses
what exists versus earns a new primitive.

---

## Executive Summary

Base Radar's design system is stronger at the primitive-import layer than
at the component-composition layer. Every dialog in the app builds on the
same Base UI `Dialog`; every tooltip goes through one shared wrapper;
`EmptyState` is imported by 36 files with a genuinely good, self-propagating
"variant object" convention; skeleton loading uses exactly one shared
`animate-pulse` treatment. These are real, working consolidations, not
aspirational — the discipline exists today and this Standard's job is to
extend it, not invent it.

The gap is one layer up: **shape is often correctly shared, but the actual
class strings implementing that shape are independently copy-pasted
dozens of times instead of composed from a single component.** The
clearest single example: `ProjectCard.tsx` reimplements `WidgetCard`'s
gradient/shadow/hover recipe byte-for-byte rather than importing it. The
same pattern repeats for buttons (three unofficial systems, 106 hand-rolled
`<button>` elements across 67 files), badges (two parallel pill-color
systems at two different sizes), and cards (at least 6 independent
container recipes outside the two documented primitives).

This audit also found `docs/DESIGN_SYSTEM.md` itself describing two
components that don't exist in the codebase (`components/ui/button.tsx`,
`SectionTitle`) and one factual claim that no longer holds (no `<table>`
element renders anywhere — two now do). This Standard corrects none of
that documentation directly — see §12 — but treats it as evidence that
without an explicit governance layer, even the *description* of the design
system drifts from its implementation, not just the implementation from
itself.

Cross-page, the outer page shell (`max-w-[1600px]`, consistent padding) is
genuinely uniform. Inside it, section spacing, page-title typography, and
responsive breakpoint ladders each vary across 4-5 independently-chosen
values with no shared token — while card-title typography and card padding
are the two areas that are already, quietly, perfectly consistent
everywhere. §3 (Component Inventory) and §11 (Consistency Audit) below are
the permanent record of both halves of this picture.

---

## Current Design System Audit

*(Full per-pattern findings — Buttons, Badges, Cards, Dialogs, Tooltips,
Empty States, Loading States, Tables/Lists, Section Headers, Icons — are in
this Standard's accompanying chat response, per this initiative's
established "findings-only, no file duplication" convention. Summarized
here for permanent reference; the complete evidence table is §3, Component
Inventory.)*

| Pattern | Canonical primitive exists? | Real consolidation | Real duplication |
| --- | --- | --- | --- |
| Buttons | Partially (`GradientButton`, landing-only) | — | 106 hand-rolled `<button>`s, 3 unofficial copy-pasted systems |
| Badges | Yes (`GlowBadge`) | 9 components compose it correctly | 7 components duplicate a second pill system instead |
| Cards | Yes (`GlassCard`, `WidgetCard`) | 24 correct consumers combined | `ProjectCard` clones `WidgetCard`; 6 more independent recipes |
| Dialogs | Yes (Base UI `Dialog`/`Menu`) | 100% of modals on one primitive | Panel chrome duplicated across 9 files |
| Tooltips | Yes (`Tooltip`/`RichTooltip`) | 24 correct consumers | 6 places bypass it via native `title=` |
| Empty states | Yes (`EmptyState`) | 36 consumers, self-propagating variant convention | Only the inner action-button style (ties to Buttons) |
| Loading/skeletons | Yes (`WidgetSkeleton`/`MetricItemSkeleton`) | Exactly 1 shared pulse treatment app-wide | None found |
| Tables/lists/rows | No | — | 2 real `<table>`s + 4+ non-interoperating row-shape families |
| Section headers | Documented but not real (`SectionTitle`) | `QuickViewSectionLabel` (Profile-subtree only) | 7 landing files copy-paste one string; 3 non-interoperating treatments total |
| Icons | Yes (`lucide-react` + `size-N`) | 164 files, fully consistent | None found |

---

## Industry Research Findings

Research conducted for this Standard, principles extracted only — no
product's visual design copied:

- **Stripe:** a small, closed token set (22 colors, 16 type tokens, 6
  radii, 8 spacing values) drives 21 components — the discipline is in the
  *ceiling* on how many tokens exist, not the components themselves; a
  dense 8px-based spacing grid reflects a precision-oriented, financial-data
  UI, matching Base Radar's own information-density goals.
- **Vercel:** a 200-step gray scale where every border/divider/disabled
  state lives on its own deliberate step, and an explicit "border-first"
  shadow philosophy — static elements get a 1px border, true box-shadow is
  reserved for elements that need to visually float above the plane. This
  is a useful, extractable rule for Base Radar's own card-elevation
  question (§6).
- **Linear:** dark-first as a foundational choice, not a toggle — near-black
  surfaces, one functional accent color, hairline borders, tight tracking.
  Base Radar's own dark-as-default posture (confirmed in `DESIGN_SYSTEM.md`)
  is the same instinct, independently arrived at.
- **GitHub Primer:** design tokens defined once and consumed identically by
  design tooling and code — the token-as-single-source-of-truth principle,
  distinct from Base Radar's current state where a design decision (e.g. a
  button's padding) is re-decided in code independently at each of 106
  call sites rather than read from one place.
- **Notion / general skeleton-state research:** skeleton states are for
  container-based components only (tiles, structured lists, cards) — never
  toasts, menus, or modals. This matches Base Radar's own real, current
  practice: `WidgetSkeleton`/`MetricItemSkeleton` are used exclusively for
  card/metric containers, never dialogs or menus.
- **Bloomberg Terminal:** a dark, dense interface where color is
  strategically reserved (bright blue/orange plus price-semantic red/green)
  rather than spread across many accent hues — echoed by Base Radar's own
  existing "semantic tokens, not raw values" philosophy in
  `docs/DESIGN_SYSTEM.md`, but not consistently enforced at the badge layer
  (§3, Pattern 2's two parallel color systems).
- **Coinbase:** a single brand "voltage" color used sparingly on primary
  CTAs only, everything else neutral — notably, Coinbase's own primary blue
  (`#0052ff`) is the exact same hex as Base Radar's `radar-primary`, a
  coincidence of both building on the Base ecosystem's brand color, not
  something copied for this research.
- **DefiLlama / Token Terminal / Messari:** dense, information-forward
  dashboards built from a small number of repeating card/row shapes at
  scale — the pattern this Standard's §3 audit found Base Radar has
  *informally* arrived at (4+ near-identical row recipes) without yet
  *formally* consolidating into one shared component.

---

## Current vs. Best-Practice Comparison

| Best practice | Base Radar today |
| --- | --- |
| One closed token set drives every component (Stripe) | True for color/radius (`radar-*`, `--radius-*` scales are real and used); **not true for spacing** — no custom scale exists, each page/component independently picks a `gap-*` value |
| Design tokens are the single source of truth, consumed identically everywhere (GitHub Primer) | Partially — `radar-*` colors are consistently referenced by name, but three visual "systems" (buttons, badges, cards, §3) are re-decided per file rather than composed from one token-driven component |
| Skeleton states reserved for container components only (Notion/industry research) | True — Base Radar's own `WidgetSkeleton`/`MetricItemSkeleton` usage already matches this |
| Border-first elevation, box-shadow reserved for floating elements (Vercel) | Partially — `WidgetCard`/`ProjectCard`'s hover state already does add a real shadow only on hover, consistent with this; the 6+ other card recipes (§3) don't share the same rule explicitly |
| Dark-first as a foundational choice (Linear) | True — already Base Radar's real, current default |
| Color reserved for meaning, spread sparingly (Bloomberg) | True in principle (`docs/DESIGN_SYSTEM.md`'s own stated philosophy) but not enforced at the badge-color layer, where two parallel systems exist |
| Dense, repeating card/row shapes at scale (DefiLlama/Token Terminal/Messari) | The *shapes* already repeat naturally across the app; they are not yet *formally shared* as one component (§3, Pattern 8) |

---

## 1. Purpose

A Design System exists so that every new screen in Base Radar is built
from decisions that have already been made, not re-made. Its goals:

- **Consistency** — the same visual pattern looks and behaves the same
  everywhere it appears, so a user's learned expectation from one screen
  transfers to the next.
- **Predictability** — a developer building a new feature can predict,
  before writing code, which component solves their need, rather than
  discovering after the fact that four others already tried.
- **Reuse** — a new requirement is met by composing an existing primitive
  first; a new primitive is the last resort, not the first instinct (§3
  makes the cost of skipping this step legible — most of this audit's
  findings are exactly what happens when reuse loses to convenience).
- **Accessibility** — accessibility properties (focus rings, ARIA, touch
  targets) live in the primitive, not the call site, so every consumer
  inherits them for free rather than re-implementing them correctly each
  time (§9).
- **Scalability** — the system can absorb new features without the
  component count growing linearly with the feature count.
- **Maintainability** — a visual change (a new radius, a new hover
  treatment) is made once, in one file, and every consumer picks it up —
  not hunted down across dozens of independently-styled call sites.

## 2. Design Principles

- **Reuse before creation.** Before writing a new visual pattern, check
  whether an existing primitive already solves it — even partially. §3's
  worst findings (`ProjectCard` cloning `WidgetCard`, three parallel button
  systems) are every one of them a case where this check was skipped, not
  a case where no primitive existed.
- **One problem → one component.** A badge is a badge; there should be one
  component answering "how do I render a status pill," not two
  (`GlowBadge` and the second, independently-duplicated pill family in §3
  Pattern 2).
- **Composition over duplication.** Extend an existing component with a
  new prop/variant before copy-pasting its class string into a new file —
  the discipline `QuickViewSectionLabel`'s own doc comment already
  demonstrates when it explains *why* it didn't reuse the (non-existent)
  `SectionTitle`.
- **Consistent interaction.** The same gesture (hover, click, keyboard
  focus) produces the same visual response on every component of the same
  kind — governed jointly with [NAVIGATION_CLICKABILITY_STANDARD.md](NAVIGATION_CLICKABILITY_STANDARD.md)'s
  own Interaction Consistency section.
- **Dark-first.** Dark is the default, not an inversion of a light-first
  design — already true today (`DESIGN_SYSTEM.md`'s Dark Theme section)
  and this Standard does not change that posture.
- **Accessibility by default.** A primitive that is accessible makes every
  consumer accessible for free; a call site that reimplements a primitive
  by hand (a native `title=` tooltip, a `div` styled as a button) loses
  that guarantee silently (§3 Patterns 1, 5).
- **Responsive by default.** A component's responsive behavior is part of
  its definition, not re-decided by each page that uses it — the goal §11
  measures against, since today it mostly is re-decided per page.
- **Honest presentation.** Matches `docs/DESIGN_SYSTEM.md`'s own documented
  "Honesty in the UI" principle (the "Demo data" badge, source-tagging) —
  extended here to mean the design system's own documentation should be
  honest about what exists, which §3's two doc/reality gaps show it
  currently is not.
- **High information density.** Base Radar's card padding (`p-5 sm:p-6`)
  and compact type scale already lean dense, matching the Bloomberg/
  DefiLlama/Token Terminal research precedent — a principle to preserve,
  not loosen, as new components are added.
- **Executive-first.** Governed primarily by
  [INFORMATION_HIERARCHY_STANDARD.md](INFORMATION_HIERARCHY_STANDARD.md);
  restated here only as the reason a new component should default to its
  most information-dense, "compact" form before an expanded one.

## 3. Component Inventory

*(Full per-file evidence — exact class strings, line numbers, complete
consumer lists — is in this Standard's accompanying chat response and the
two audit reports it was compiled from. This table is the permanent,
canonical record of standardization status per pattern; it does not
recommend or authorize any implementation change.)*

| Component category | Canonical component | Existing consumers | Duplicate implementations | Standardization status |
| --- | --- | --- | --- | --- |
| Project Cards | `LiveProjectCard` (Universal Card Standard) | All Project surfaces app-wide | None found | **Standardized** |
| Metric Cards | `MetricItem`, `ExpandableMetricCard` | Explorer/Profile metric displays | `MetricCardGroup` composes correctly | **Standardized** |
| Dashboard Widgets | `WidgetCard` | 18 widget files | `ProjectCard` (Explorer) clones it independently | **Partially standardized** |
| Explorer Cards | `WhaleCard`/`PairCard`/`GovernanceCard`/`ContractCard` | Explorer list views | Byte-identical `<li>` recipe duplicated 7× rather than shared | **Shape consistent, component not shared** |
| Tables | None | `ExplorerTable`, `RecentTransactions` | Two independent `<table>` implementations; `@tanstack/react-table` unused | **Not standardized** |
| Rows | None | 4+ row-shape families (small-card, hover-row, table-row, stat-strip) | Non-interoperating; `TimelineItem`/`AutomationItem` share a recipe, `NotificationItem` nearly does | **Not standardized** |
| Lists | `EmptyState` (for the empty case) | 36 files | None for the populated case — see Rows above | **Standardized (empty only)** |
| Section Headers | None real (`SectionTitle` is documented but does not exist) | Landing `<h2>` ×7, `DashboardSectionLabel`, `QuickViewSectionLabel` | 3 non-interoperating treatments | **Not standardized; documentation inaccurate** |
| Buttons | `GradientButton` (landing-only); documented `Button` does not exist | 3 landing files | 106 hand-rolled `<button>`s, 3 unofficial copy-pasted systems | **Not standardized; documentation inaccurate** |
| Badges | `GlowBadge` | 9 components | 7 components duplicate a second pill system at a different size | **Partially standardized** |
| Status Indicators | `ProjectStatusBadge` | Universal Card consumers | Composes `GlowBadge` correctly | **Standardized** |
| Risk Indicators | `RiskBadge` | Universal Card consumers | Composes `GlowBadge` correctly | **Standardized** |
| Trust Indicators | `TrustIndicators` | Universal Card consumers | Composes `GlowBadge`/`VerificationBadge`/`ScoreBadge` correctly | **Standardized** |
| Dialogs | Base UI `Dialog` | 11 files | Panel chrome (rounded-2xl/shadow-2xl/positioning) duplicated per file | **Primitive standardized; chrome not** |
| Tooltips | `Tooltip` + `RichTooltip` | 24 files | 6 places bypass via native `title=` | **Mostly standardized** |
| Empty States | `EmptyState` | 36 files | Inner action-button style only (see Buttons) | **Standardized** |
| Loading States | `BrandLoader` (route-level), `BrandSpinner` (app-boot) | Documented, intentional split | None — deliberate, not accidental | **Standardized** |
| Skeletons | `WidgetSkeleton`, `MetricItemSkeleton` | Profile's streamed widgets, `SplashScreen` | None — one shared `animate-pulse` treatment app-wide | **Standardized** |
| Search Results | `CommandItem` + `SearchProjectRow` | ⌘K palette | None — established in the Universal Card initiative's PR-8 | **Standardized** |
| Navigation | `Sidebar`/`MobileSidebar`/`SidebarNav` | App shell | Desktop/mobile share one `SidebarNav` content component | **Standardized** |
| Forms | None | One unlabeled `<input>` (command palette search) | N/A — no form system exists because no form exists yet | **Not applicable today** |
| Charts | Ad hoc per widget (`ProfilePriceChart`, `ProfileVolumeTrendPanel`, sparklines) | Profile page, `KPIRow` watermark | No shared chart primitive found | **Not standardized** |
| Icons | `lucide-react` + `size-N` | 164 files | None found | **Standardized** |
| Typography | Role-based scale (`DESIGN_SYSTEM.md`'s table) | App-wide | Page-title size/weight diverges from the documented rule on 6+ pages (§11) | **Documented but not enforced** |
| Spacing primitives | None — Tailwind's default 4px scale directly | App-wide | 4 different section-root `gap-*` values in use, no shared token | **Not standardized** |
| Layout containers | `DashboardLayout` (`max-w-[1600px]` shell) | Every dashboard route | None — genuinely consistent | **Standardized** |

## 4. Layout System

- **Page layout:** every dashboard route renders inside `DashboardLayout`'s
  shared shell (`mx-auto flex max-w-[1600px]`, `main` padding
  `px-4 py-8 sm:px-6 lg:px-10`) — this outer container is the one layout
  property that is already, genuinely consistent app-wide and should
  remain the fixed constant any future page-layout guidance builds from.
- **Section spacing:** currently 4 different top-level values in real use
  (`gap-5`/`6`/`8`/`10`, §11) — this Standard records the split, it does
  not declare a winner (§12).
- **Grid behavior:** at minimum 5 non-shared responsive breakpoint ladders
  exist for content grids inside the shared shell (§11's table) — no two
  unrelated pages currently share an identical ramp.
- **Container widths:** the outer shell width is fixed and consistent;
  inner content never independently overrides `max-w-[1600px]`, except the
  Command Palette's own deliberately-different `max-w-xl` popup, which is
  not a page layout at all.
- **Sidebar layout:** `Sidebar` (`lg`+, 264px fixed) and `MobileSidebar`
  (drawer, below `lg`) share one `SidebarNav` content component — a
  genuinely consistent, correctly-composed pattern already in place.
- **Widget layout:** `WidgetCard`'s fixed anatomy (icon chip → title/
  subtitle → optional "Demo data" badge → overflow menu → content →
  optional footer) is the one place a full component contract is already
  enforced consistently across 18 consumers.
- **Card spacing:** `p-5 sm:p-6` is genuinely consistent between
  `WidgetCard` and `ProfileSectionCard` — the one padding value that
  already crosses component-family lines cleanly.
- **Responsive breakpoints:** Tailwind's default `sm`/`md`/`lg`/`xl`/`2xl`
  scale is used throughout; no custom breakpoint has been introduced. The
  inconsistency (§11) is in which subset of these five each grid chooses,
  not in the breakpoint values themselves.
- **Scrolling behavior:** `RecentTransactions`' table uses a horizontal
  `overflow-x-auto` on a `min-w-[560px]` table — the one explicit
  horizontal-scroll pattern found; no other audited surface needs one.
- **Sticky elements:** the marketing `Navbar` is `sticky top-0`; no
  dashboard-side sticky element was found in this audit (the dashboard
  sidebar is fixed-position, not scroll-sticky).

## 5. Typography System

Roles as currently documented in `docs/DESIGN_SYSTEM.md`, cross-checked
against real usage in this audit:

| Role | Documented class | Real, consistent usage found? |
| --- | --- | --- |
| Display / Hero headline | `text-4xl` → `text-7xl` responsive | Landing page only — not applicable to dashboard |
| Section title | `text-3xl sm:text-4xl` | Landing-page `<h2>`s only, copy-pasted 7×, no component behind it (§3) |
| Page title (dashboard) | Not previously documented as its own role | **Not consistent** — splits into a `text-2xl`/`text-xl` size tier and a `font-semibold`/`font-bold` weight tier across 12 areas (§11) |
| Card title | `text-sm font-semibold` (`WidgetCard`) | **Fully consistent** — the cleanest typography finding in this audit |
| Section heading (within a page) | Not previously documented as its own role | Mostly `text-sm font-semibold` + icon; Dashboard/Projects Directory labels use `font-bold`/no-icon variants instead |
| Metric | Numeric values, various sizes by context | Not independently audited this session — no inconsistency found or ruled out |
| Supporting text / Body | `text-sm`, `text-base sm:text-lg` | Consistent by role, matches documentation |
| Caption / Small / Metadata | `text-xs`, `text-[10px]`–`text-[11px]` | Consistent by role, matches documentation |
| Badge text | `text-xs` (`GlowBadge`) vs. `text-[10.5px]` (the second badge family, §3 Pattern 2) | **Not consistent** — two sizes for the same conceptual role |
| Button text | Varies per hand-rolled button (§3 Pattern 1) | **Not consistent** — no shared button means no shared button-text rule either |

**Usage rule going forward (descriptive, not yet enforced):** font *weight*
establishes hierarchy per `docs/DESIGN_SYSTEM.md`'s own already-stated
rule — `font-semibold` for titles, `font-medium` for interactive labels,
`font-bold` reserved for the wordmark and stat values. §11 documents where
real code currently violates this rule; this Standard does not change the
rule, it records the violation.

## 6. Color System

Semantic roles, cross-referencing `docs/DESIGN_SYSTEM.md`'s real, defined
`radar-*` tokens (§ Colors there) rather than restating them:

| Semantic role | Token | When it should communicate meaning | When it should not |
| --- | --- | --- | --- |
| Primary | `radar-primary` | Primary actions, brand identity, active/selected state | Decorative accents with no functional meaning |
| Secondary / Accent | `radar-accent` | Secondary emphasis, AI/research-adjacent content (shared role with `radar-purple`) | Interchangeably with Primary — the two should stay visually distinct |
| Success | `radar-success` | Positive trend, healthy status, confirmation | Any non-status decorative use |
| Warning | `radar-warning` | Caution states, moderate risk, attention-needed | Interchangeably with Danger — reserved for a genuine middle tier |
| Danger | `radar-danger` | Negative trend, high risk, error, destructive action | Emphasis alone, without an actual risk/error/negative meaning behind it |
| Information | `radar-accent` (no separate info token exists) | Neutral informative callouts | — |
| Neutral / Muted | `radar-muted` / `radar-light-muted` | Secondary/supporting text, de-emphasized metadata | Primary content — muted text must never be the only carrier of a critical value |
| Background | `radar-bg` / `radar-light-bg` | Page background only | Card or surface backgrounds (use Background vs. Border below) |
| Border | `radar-border` / `radar-light-border` | Card/control outlines, dividers | Should never be the only signal of interactive vs. static (pair with cursor/hover per Navigation Standard §8) |
| Interactive | `radar-primary` (hover/focus states) | Hover, focus-visible rings, active/pressed | — |
| Highlight | `radar-primary/[0.03]` (e.g. unread-notification background) | Drawing attention to a specific, temporary state (unread, newly changed) | Permanent decoration |
| Accent (AI context) | `radar-purple` | AI/intelligence-related content specifically | Generic secondary emphasis unrelated to AI |
| Accent (whale/alert context) | `radar-orange` | Whale-activity and alert-severity contexts specifically | Generic warning (that's `radar-warning`'s role) |

**The governing rule, restated from `docs/DESIGN_SYSTEM.md`'s own stated
philosophy and reinforced by this audit's Bloomberg research finding:**
color is reserved for meaning, never decoration, and every colored badge
must carry a text label alongside its color (matching Universal Card §21).
§3 Pattern 2's two parallel badge-color systems are the one place this
audit found color-role duplication (two independently-maintained color
lookup tables for what should be one semantic mapping) rather than
color-role misuse.

## 7. Component Behavior Standards

| State | Standard, where a real precedent already exists |
| --- | --- |
| Hover | Cards lift (`whileHover={{y:-3}}`) + border/shadow shift, matching `WidgetCard`'s real behavior; buttons use `transition-colors`; icon-only controls get a background tint with no movement — three distinct, real, already-consistent-by-element-type treatments per `docs/DESIGN_SYSTEM.md`'s own Hover Behavior section |
| Focus | `focus-visible:ring-2` in an accent color on every real interactive element — genuinely consistent where a native `<button>`/`<a>` is used (§9 depends on this remaining true as new components are added) |
| Pressed | No dedicated "pressed"/active visual state was found audited separately from hover in this session — not confirmed present or absent |
| Disabled | Ad hoc `disabled:` Tailwind modifiers appear per call site (e.g. `SyncQueueDialog`) rather than from a shared button component, since no shared button component exists (§3) |
| Loading | `WidgetSkeleton`/`MetricItemSkeleton` for container-level loading; `BrandLoader` for route-level — both real, both consistent (§3) |
| Empty | `EmptyState` — real, consistent, 36 consumers (§3) |
| Selected | `WatchlistCard`/sidebar `SidebarNav`'s active-state treatment — not independently cross-checked against every other selectable surface this session |
| Expanded / Collapsed | `CollapsibleSection`'s `framer-motion` `AnimatePresence` height/opacity transition is the one real, documented expand/collapse pattern found; not confirmed whether other expandable surfaces (e.g. `ExpandableMetricCard`) share its exact timing |
| Error | `RouteError`/`ExplorerErrorState`/`app/dashboard/projects/[slug]/error.tsx` each compose `EmptyState`-shaped chrome with their own outline-secondary button (§3 Pattern 1) — consistent in shape, inconsistent in the button beneath it |
| Success | No dedicated "success" state component was found in this audit (distinct from the `Success` semantic color used in badges/scores) |

## 8. Responsive Standards

- **Desktop / Tablet / Mobile:** the outer shell is responsive and
  consistent (§4); inner grids are not — §11's breakpoint-ladder table is
  the authoritative record.
- **High-density layouts:** the app already defaults dense (compact card
  padding, `text-sm`/`text-xs` type scale throughout dashboard chrome) —
  matching the Bloomberg/Stripe research precedent in §Industry Research
  Findings; no evidence found of a page that abandons density on desktop.
- **Touch targets:** governed jointly with
  [NAVIGATION_CLICKABILITY_STANDARD.md](NAVIGATION_CLICKABILITY_STANDARD.md)
  §7 — not independently re-audited here.
- **Overflow handling:** `RecentTransactions`' `overflow-x-auto` is the one
  explicit horizontal-overflow pattern found (§4); no other surface in this
  audit needed one.
- **Truncation:** `truncate` appears consistently on name/label text across
  cards and rows (`ProjectRow`, `SearchProjectRow`, card titles) — a real,
  working convention, not independently found to be inconsistent.
- **Progressive disclosure:** the Universal Project Card's `compact`/
  `detailed`/`micro` tiers remain the one place progressive disclosure is
  formally specified (§13/§14 of that Standard); no equivalent formal tiering
  exists yet for non-project components (badges, dialogs, etc.).

## 9. Accessibility Standards

- **Keyboard navigation:** governed jointly with
  [NAVIGATION_CLICKABILITY_STANDARD.md](NAVIGATION_CLICKABILITY_STANDARD.md)
  §6 — real, native `<a>`/`<button>` elements are keyboard-reachable by
  construction; §3 Pattern 1's finding (106 hand-rolled `<button>`s, not
  `div`s with click handlers) means this property already holds broadly,
  even without a shared `Button` component, because every one of them is a
  real `<button>` element.
- **Focus visibility:** `focus-visible:ring-2` is genuinely consistent
  wherever a real interactive element exists (§7) — the risk is only in a
  future component that skips this because no shared primitive enforces it
  automatically.
- **Contrast:** not independently re-verified this session; carried
  forward as an open item from the Universal Card Standard's own §21.
- **ARIA:** reserved for genuinely non-native patterns (Base UI `Dialog`/
  `Menu`/`Tooltip` already wire this correctly, per `docs/DESIGN_SYSTEM.md`'s
  own Accessibility section); `aria-label` on every icon-only control was
  confirmed consistent in this audit (icon inventory, §3 Pattern 10).
- **Screen readers:** Base UI primitives supply this automatically for
  Dialog/Menu/Tooltip; the 6 native-`title=` tooltip fallbacks (§3 Pattern
  5) are the one place this guarantee is not inherited from a shared
  primitive.
- **Touch targets:** governed jointly with the Navigation Standard; not
  independently re-measured per component in this audit.
- **Reduced motion:** genuinely well-handled at the root level —
  `MotionConfig reducedMotion="user"` wraps both the landing page and
  dashboard shell, plus targeted `motion-reduce:` Tailwind variants — this
  is one of the more mature parts of the current system, per
  `docs/DESIGN_SYSTEM.md`'s own Reduced Motion section, confirmed still
  accurate in this audit.
- **Semantic HTML:** real `<nav aria-label>` landmarks exist for Navbar/
  Sidebar/Breadcrumb per `docs/DESIGN_SYSTEM.md`; the two real `<table>`
  elements found in this audit (§3 Pattern 8) use proper `<table>`/
  `aria-label` markup, not a styled `<div>` grid impersonating a table.
- **Error communication:** `EmptyState`-shaped error surfaces (§7) inherit
  its accessibility properties; not independently verified whether error
  text is announced to assistive tech on render (e.g. via `role="alert"`).

## 10. Motion Standards

- **When motion should be used:** to confirm state, not decorate — matching
  `docs/DESIGN_SYSTEM.md`'s own stated Animation Principles ("motion
  confirms, it doesn't decorate"), which this audit found still accurately
  describes the 3 areas (Dashboard, Projects Directory, Profile) that use
  `framer-motion` at all.
- **When motion should be reduced:** governed by the root-level
  `MotionConfig`/`motion-reduce:` handling already in place (§9) — no
  change needed, this already works.
- **When motion should be avoided:** the 9 of 12 audited areas with zero
  `framer-motion` usage (Watchlists, Alerts, Notifications, Timeline,
  Portfolio, Brief, Command Palette, and all 5 Explorer sub-pages) are not
  a gap by default — motion should be added only where it would confirm a
  real state change, not to make these areas "match" the other 3.
- **Transitions:** plain CSS `transition-colors`/`transition-[border-color,box-shadow] duration-200` is the real, dominant vocabulary outside the 3 `framer-motion` areas — already a consistent baseline.
- **Dialogs:** Base UI's `data-[starting-style]`/`data-[ending-style]`
  transitions, consistently `duration-150`–`200` — §11 found one real, small
  mismatch (`WidgetCard`'s menu at 150ms vs. `CommandPalette`'s structurally
  identical popup at 200ms) worth noting as a future single-token fix (§12),
  not a systemic problem.
- **Lists:** `CollapsibleSection`'s `AnimatePresence` expand/collapse
  (`duration:0.2`) is the one real list-motion pattern found.
- **Cards:** `WidgetCard`/`KPIRow`/`ProjectCard`'s `whileHover`/`whileInView`
  entrance-and-hover pattern (`duration:0.25`, `easeOut`) is real and
  consistent among the 3 areas that use it.
- **Charts:** not independently audited for motion this session.
- **Navigation:** `Navbar`'s scroll-triggered backdrop change and mobile
  drawer's `AnimatePresence` height/opacity transition are the two real
  navigation-motion patterns found, both on the landing/marketing side.
- **Loading:** `BrandLoader`/`BrandSpinner`'s CSS `@keyframes` (§3) are
  deliberately plain CSS, not `framer-motion` — a real, documented,
  intentional exception to the "Framer Motion throughout" default.
- **Micro-interactions:** the `animate-ping` live-status pulse dot is the
  one plain-CSS-keyframe micro-interaction found outside the loader family,
  per `docs/DESIGN_SYSTEM.md`'s own Animations section, confirmed still
  accurate.

## 11. Consistency Audit

Compared, not redesigned — full source-level detail is in the accompanying
chat response and the two background audits it was compiled from.

| Area | Section-root spacing | Page-title typography | Motion present? | `loading.tsx`? |
| --- | --- | --- | --- | --- |
| Dashboard | `gap-8` | `text-2xl font-semibold` (+ responsive step) | Yes | Yes |
| Projects Directory | `gap-10` | `text-2xl font-semibold` | Yes | Yes |
| Projects Collection routes | `gap-8` | `text-2xl font-semibold` | Shared with Directory | No (falls back to Directory's) |
| Project Profile | `gap-6` | `text-2xl font-bold` | Yes | Yes |
| Watchlists | `gap-6` | `text-xl font-semibold` | No | No |
| Alerts | `gap-5` | `text-xl font-bold` | No | No |
| Notifications | `gap-6` | `text-xl font-semibold` | No | No |
| Timeline | `gap-6` | `text-xl font-semibold` | No | No |
| Portfolio | `gap-6` | `text-xl font-semibold` | No | No |
| Daily Brief | `gap-6` | `text-xl font-semibold` | No | No |
| Governance/Whale/Contracts/Pools/AI (5 routes) | `gap-6` | `text-xl font-bold` (all 5, self-consistent) | No | No (real gap — these make live network calls) |
| Search / Command Palette | N/A (overlay) | N/A | Base UI transitions only | Internal Suspense fallback only |

**Shared patterns confirmed genuinely consistent app-wide:** the outer
`max-w-[1600px]` page shell; card-title typography (`text-sm font-semibold`);
card padding (`p-5 sm:p-6`, shared by `WidgetCard` and `ProfileSectionCard`
specifically); `EmptyState` usage; skeleton/pulse treatment; icon sizing;
focus-ring treatment; reduced-motion handling.

**Real inconsistencies found, not redesigned here:** 4 distinct section-root
spacing values; page-title typography split on both size and weight, with
`font-bold` used on 6 of 12 areas against the codebase's own documented
`font-semibold` rule; 5+ non-shared responsive breakpoint ladders; motion
present on only 3 of 12 areas (itself not necessarily wrong, per §10, but
unexplained by any written rule); only 3 of 12+ routes have a `loading.tsx`,
leaving the 5 async Explorer sub-pages with a real, structural loading-state
gap; only 2 routes have an `error.tsx`.

**Legacy components:** none identified in this audit beyond what the
Universal Project Card Standard's own §4/EN-002/EN-003 already documented
(`components/explorer/ProjectCard.tsx`/`ProjectRow.tsx`/`ExplorerGrid`/
`ExplorerTable` chain, previously flagged as unreachable dead code in that
initiative) — this Standard does not re-open that finding, only cross-
references it, since `ExplorerTable.tsx` is also the source of one of the
two real `<table>` elements found in §3 Pattern 8.

**Out-of-scope exceptions:** the landing/marketing page (`Hero`, `Navbar`,
`GlassCard`, `GradientButton`, the 7 `text-3xl` section titles) is
intentionally a separate visual register from the dashboard app shell —
already documented as such in `docs/DESIGN_SYSTEM.md` ("`GlassCard` — used
only on the landing page") — and this Standard does not treat the
landing/dashboard split itself as an inconsistency to resolve.

## 12. Future Enhancements

Recorded for future consideration only — no implementation authorized by
this Standard:

1. **A real `Button` component**, replacing the 106 hand-rolled instances
   and correcting `docs/DESIGN_SYSTEM.md`'s current description of one that
   doesn't exist (§3 Pattern 1) — the single highest-leverage gap found in
   this entire audit, since it would also resolve the empty-state
   action-button duplication (§3 Pattern 6) and the error-state button
   duplication (§7) as a side effect.
2. **Reconciling the two parallel badge-color systems** (`GlowBadge` vs.
   the second, independently-duplicated pill family, §3 Pattern 2) into
   one shared component and one color-lookup table.
3. **A shared `Row`/`ListItem` primitive** consolidating the 4+
   non-interoperating row-shape families found in §3 Pattern 8 —
   particularly `TimelineItem`/`AutomationItem`/`NotificationItem`, which
   are already near-identical.
4. **A real `SectionTitle` component**, or removing the references to one
   that doesn't exist from `docs/DESIGN_SYSTEM.md` and the
   `QuickViewSectionLabel` code comment (§3 Pattern 9) — a documentation-
   accuracy fix as much as a component gap.
5. **A shared `DialogPanel` wrapper** for the 9 independently-duplicated
   `Dialog.Popup` chrome recipes (§3 Pattern 4), since the underlying
   primitive choice is already 100% consistent.
6. **`loading.tsx` for the 5 async Explorer sub-pages** (Governance/Whale/
   Contracts/Pools/AI) — the one loading-state finding in this audit that
   is a genuine functional gap, not just a stylistic inconsistency, since
   these routes make real network calls with no fallback UI today (§11).
7. **A single section-root spacing token**, resolving the 4-value spread
   found in §11 — likely `gap-6`, since it is already the modal/most common
   value across 8 of 12 audited areas.
8. **Reconciling page-title typography** to one size/weight rule, correcting
   the 6-area `font-bold` deviation from `docs/DESIGN_SYSTEM.md`'s own
   documented `font-semibold` convention (§5, §11).
9. **Correcting `docs/DESIGN_SYSTEM.md`'s Tables section**, which currently
   states no `<table>` element renders anywhere — two now do (§3 Pattern 8)
   — and its description of `components/ui/button.tsx`, which does not
   exist (§3 Pattern 1).
10. **A single duration token for Base UI popup transitions**, resolving
    the small `150ms`/`200ms`/`240ms` spread found in §10.
11. **A shared chart primitive**, if and when a second/third chart
    implementation is added beyond the current ad hoc per-widget approach
    (§3, Charts row) — recorded now since this audit found no shared
    primitive, not because a second chart is currently planned.

---

## Deliverables

This document, together with its accompanying chat responses (STEP 2
findings and this cover message), constitutes the full set of deliverables
requested: Executive Summary, Current Design System Audit, Industry
Research Findings, Current vs. Best-Practice comparison, the Design System
Product Standard itself (§1–§11), Component Inventory (§3), and Future
Enhancements (§12).

---

## Provenance

Every codebase claim in this document is drawn from two direct,
current-session background audits — one covering shared UI component
duplication (`GradientButton`, `GlowBadge`, `GlassCard`, `WidgetCard`,
Base UI `Dialog`/`Menu`/`Tooltip`, `EmptyState`, `WidgetSkeleton`/
`MetricItemSkeleton`, `ExplorerTable`, `RecentTransactions`, and dozens of
per-file duplicate class-string comparisons across `components/` and
`app/`), one covering cross-page spacing/typography/responsive/motion/
loading-state consistency (Dashboard, Projects Directory, Project Profile,
Watchlists, Search, Alerts, Notifications, Timeline, Portfolio, Daily
Brief, the 5 Explorer sub-page routes, and Collection pages, plus a direct
reading of `app/globals.css` for the real token values) — together with a
direct reading of `docs/DESIGN_SYSTEM.md` in full and the three prior
frozen Standards it cross-references. Every industry-practice claim is
drawn from research conducted for this Standard (Stripe, Vercel, GitHub
Primer, Linear, Notion/skeleton-state research, Bloomberg Terminal,
Coinbase, DefiLlama/Token Terminal/Messari) — see the corresponding chat
responses this document was delivered alongside for full source citations.
Neither category is asserted from unverified memory.
