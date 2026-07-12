# Base Radar Design System v1.0

This document is the official UI reference for Base Radar as of PR8. It supersedes
`docs/DESIGN_SYSTEM.md` (written pre-PR8, before the branding registry, KPI pipeline,
tooltip system, and badge system existed) wherever the two disagree. Every new screen,
component, or primitive (Project Profile, Token Profile, Compare, Portfolio, Wallet,
Watchlist, Alerts, AI Research, Categories, Narratives, Signals, etc.) must conform to
what's described here rather than introducing a parallel pattern.

## Colour Tokens

All real design tokens live in `app/globals.css` under the `@theme { --color-radar-*: ... }`
block. Never hardcode a hex value in a component when one of these already covers it.

**Dark (default) surfaces:**
| Token | Value | Use |
|---|---|---|
| `radar-bg` | `#061224` | App background |
| `radar-surface` | `#0b1731` | Secondary surface |
| `radar-card` | `#101c38` | Card background |
| `radar-white` | `#f7fafc` | Primary text on dark |
| `radar-muted` | `#93a4c5` | Secondary text on dark |

**Light theme surfaces:**
| Token | Value | Use |
|---|---|---|
| `radar-light-bg` | `#f7f8fa` | App background |
| `radar-light-card` | `#ffffff` | Card background |
| `radar-light-surface` | `#f2f4f7` | Secondary surface, hover fills |
| `radar-light-border` | `#e4e7ec` | Borders |
| `radar-light-text` | `#1e293b` | Primary text on light |
| `radar-light-muted` | `#64748b` | Secondary text on light |

**Semantic:**
| Token | Value | Use |
|---|---|---|
| `radar-primary` | `#0052ff` | Base blue — brand, focus rings, primary actions |
| `radar-accent` | `#00d4ff` | Secondary accent |
| `radar-success` | `#00e676` | Positive trend/status |
| `radar-warning` | `#ffc857` | Caution status |
| `radar-danger` | `#ff5a6f` | Negative trend/status |
| `radar-purple` | `#a78bfa` | Category/tag accent |
| `radar-orange` | `#ff8a3d` | Category/tag accent |

For trend-colored elements (sparklines, deltas), use `TREND_COLOR_VAR` from
`lib/utils.ts` — it maps `"up" | "down" | "flat"` to `var(--color-radar-success|danger|muted)`
string form (needed by SVG `stroke`/`fill` props, which can't take Tailwind classes). For
trend-colored **text classes**, use the local `TREND_COLOR` `Record<Trend, string>` pattern
already established in `KPIRow.tsx` (`text-radar-success` / `text-radar-danger` / muted).

**Do not** reintroduce `slate-*`, `gray-*`, or any other Tailwind default neutral palette —
use the `radar-light-*` tokens instead. Per-chain brand marks (`components/branding/ChainIcons.tsx`)
and per-social-platform brand hovers (`lib/branding/socials.ts`'s `hoverClassName`) are the
only sanctioned exception: they render a specific third party's official brand color, which
by definition isn't part of Base Radar's own palette.

The `--background`/`--foreground`/`--border`/`--ring`/`--radius*` shadcn-origin variables
in `:root`/`.dark` are retained only because they're load-bearing for the global
`@layer base` rule and every `rounded-*` utility class app-wide — they are not part of
Base Radar's own token vocabulary and should never be referenced directly by new components
(reach for `radar-*` tokens instead).

## Typography Scale

No custom font-size scale — Tailwind's default scale plus a small set of established
arbitrary values for dense UI:

- `text-[9px]` / `text-[10px]` / `text-[10.5px]` / `text-[11px]` — table headers, badges, micro-labels
- `text-xs` — secondary metadata, captions, most badge/pill text
- `text-sm` — body copy, widget values, nav labels
- `text-base` / `text-lg` — section headings
- `text-2xl` / `text-3xl` — KPI hero numbers only (via `KpiValueDisplay`, never a bare `<p>`)

Weight: `font-medium` for interactive/secondary text, `font-semibold` for values and
emphasis, `font-bold` reserved for the wordmark and page titles.

## Spacing System

Tailwind's default spacing scale (`gap-1` … `gap-6`, `p-3`/`p-4`, etc.) — no custom
spacing tokens. Card interior padding is `p-4`; tight metric rows use `gap-0.5`/`gap-1`;
card grids use `gap-3` (KPI row) or `gap-5` (Explorer grid).

## Radius System

`--radius-sm` through `--radius-4xl` in `app/globals.css` (`calc(var(--radius) * N)`,
base `--radius: 0.625rem`) back every `rounded-*` utility. In practice:

- `rounded-lg` — buttons, small controls, icon hit-targets
- `rounded-xl` — nav items, inputs
- `rounded-2xl` — cards (`WidgetCard`, KPI cards)
- `rounded-full` — avatars, pills, badges, progress tracks

`GlassCard.tsx`'s `rounded-3xl` is a documented, marketing-page-only exception (landing
`Hero.tsx`) — do not carry it into product surfaces.

## Icon Sizing

Lucide icons and brand marks follow a consistent scale by context:

- `size-3` / `size-3.5` — inline glyphs next to small text (trend arrows, chevrons)
- `size-4` — the default: nav icons, social icons, table icons (most common size)
- `size-[18px]` — sidebar nav icons specifically
- `size-5` — widget card header icons
- `size-8` / `size-9` / `size-10` — icon **containers** (avatar-style wrapper `span`s), not the icon itself

## Cards

`WidgetCard` (`components/dashboard/WidgetCard.tsx`) is the one card shell for dashboard
widgets — header icon, title, subtitle, source badge, `lastUpdated`, action menu. KPI
cards (`KPIRow.tsx`) use the same visual language (border, radius, backdrop-blur, hover
lift) inline since they're a denser grid cell, not a `WidgetCard` consumer. `GlassCard` is
marketing-only. Don't create a new card shell — extend `WidgetCard` with an optional prop
if a new widget needs different chrome.

## Buttons

`components/ui/GradientButton.tsx` is the one CTA button component (`variant="primary"` /
`"secondary"`, plus a `whileHover`/`whileTap` lift wrapped in `MotionConfig reducedMotion="user"`
at every call site — Navbar, Hero, ProjectSpotlight — so the motion respects
`prefers-reduced-motion` automatically).

**`primary`'s gradient (`from-[#1565ff] to-[#22c8ff]`) is a deliberate, static brand treatment —
it does not re-tint between light and dark theme, unlike every other primary-accent surface
in the app.** This is intentional, not an oversight: the CTA gradient is the one fixed piece
of brand identity a user should recognize as "the same button" regardless of which theme
they're in, the same way a product's primary logo mark doesn't invert per theme. `secondary`
(bordered, surface-tinted) *is* fully theme-aware, since it's chrome, not brand identity. If a
future revision wants the primary gradient to re-tint per theme instead, replace the two
hardcoded hex stops with `from-radar-primary to-radar-accent` (already used elsewhere, e.g.
`Hero.tsx`'s headline gradient) — but that is a deliberate design change, not a bug fix.

## Tables

There is exactly one `<table>` element in the app: `components/explorer/ExplorerTable.tsx`.
Column typography is normalized (uniform `text-xs` value cells, wrapped headers fixed).
Any future tabular surface should reuse this component or, if genuinely different data
shape, follow its typography/spacing conventions rather than hand-rolling new table CSS.

## Tooltips

`components/ui/Tooltip.tsx` (Base UI `Tooltip.Root` under the hood) is the only rich-content
hover/focus tooltip in the app — used for KPI descriptions, badge explanations, chain lists
(`ChainListTooltip`), and truncated header text. Native `title=` attributes are reserved for
a narrow, deliberate exception: an accessible-name/truncation fallback on a handful of
already-reviewed spots (`TokenLogo`, `QuickViewHeader`, `ProjectRow`, `ProjectCardHeader`)
where the truncated text itself is the tooltip content and a full `Tooltip` would be
redundant chrome. Never add a new native `title=` as a substitute for the shared `Tooltip`.

## Badges

Five canonical badge implementations — do not create a sixth:

- `GlowBadge` — generic pill badge with a glow treatment (categories, tags)
- `VerificationBadge` — project verification status (always shows all statuses, one highlighted)
- `ScoreBadge` — Health/Confidence scores, with a `bare` variant for dense table cells
- `ChainBadge` / `ChainBadgeGroup` — single/multi-chain display, Base-first ordering via `getSortedChains`/`getDisplayChains`
- `ProviderBadge` — data source/provider indicator

## KPI Formatting

Every KPI-style value — a headline number with count-up animation — goes through the same
pipeline: `AnimatedNumber` (count-up + reduced-motion fallback) rendering a `*Parts`
formatter's output via `KpiValueDisplay` (hero digit + secondary $/decimal/suffix styling).
Formatters live in `lib/data/format.ts`:

- `formatCurrency` / `formatCompactCurrency` (+ `formatCompactCurrencyParts`)
- `formatNumber` / `formatCompactNumber` (+ `formatCompactNumberParts`)
- `formatPercent` — signed percentage deltas (e.g. `+3.2%`)
- `formatGwei` (+ `formatGweiParts`)

`KPIRow` and `PortfolioWidget` both use this pipeline and share identical hierarchy,
typography, and animation. A plain small metric row inside a widget body (e.g.
`MarketWidget`'s stat pairs, `WhaleActivityWidget`'s per-event amount) is a deliberately
smaller, non-hero display and is not required to route through `AnimatedNumber` — only
the widget's own single headline value is a "KPI" in this sense.

**Known, reviewed exceptions** (do not treat as bugs): `ProjectSpotlight`'s price display
uses a bare `.toFixed(4)` because no shared formatter currently offers 4-decimal precision;
`PortfolioWidget`'s per-asset allocation uses `.toFixed(0)}%` because it's an unsigned 0–100
percentage, a different shape than `formatPercent`'s signed-delta format; `Timestamp`'s exact
ISO tooltip uses `.toLocaleString()` because no shared "full date/time" helper exists yet.
`lib/data/aggregate.ts`'s inline number formatting builds pre-composed feed/description
strings at the data layer, not UI-layer number rendering — out of scope for this component
system.

## Chain Display

Never render a chain name as plain text or an inline `<svg>`. Use `ChainBadge` (single) or
`ChainBadgeGroup` (multi, with overflow via `splitOverflow`) — both draw from the
`lib/branding/chains.ts` registry (id, label, color, `Icon`, plus future-ready
`chainId`/`nativeCurrency`/`layer`/`ecosystem`/`explorerUrl` metadata). Multi-chain lists
order Base first via `getSortedChains`/`getDisplayChains`. `ChainListTooltip` is the shared
hover surface for showing the full chain list when a badge group truncates.

## Branding Registry

`lib/branding/` is the single source of truth for all third-party identity: `types.ts`,
`chains.ts`, `providers.ts`, `socials.ts`, `projects.ts`, `tokens.ts`, plus an `index.ts`
barrel. Rendering primitives: `ProjectLogo`, `TokenLogo`, `ChainBadge`, `ChainBadgeGroup`,
`ProviderBadge`, and the shared `buildSocialNavLinks(neutralHoverClassName)` helper
(`lib/branding/socials.ts`) that both `Sidebar` and `Footer` call for their social-icon row.
Never inline a new brand SVG or duplicate a registry entry — add to the registry instead.

## Animation Durations

- **150–300ms** — the standard range for hover/transition micro-interactions
  (`ProgressBar`'s indicator: `duration-300`; card border/shadow hovers: `duration-200`).
  Nothing should sit outside this range without a documented reason.
- KPI card entrance: framer-motion, `duration: 0.25` (250ms) with a `delay: index * 0.03`
  stagger.
- `AnimatedNumber` count-up: framer-motion `animate()`, respects `useReducedMotion` (jumps
  straight to the final value with motion disabled).
- Icon-hover scale/glow effects always pair with `motion-reduce:hover:scale-100` (or
  equivalent) so reduced-motion users get the state change without the animation.

## Responsive Rules

Explorer's card grid (`ExplorerGridLayout`) and the Dashboard's widget grid
(`app/dashboard/page.tsx`) intentionally use **different** column progressions:
Explorer is `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`; Dashboard is
`grid-cols-1 sm:grid-cols-2 xl:grid-cols-3` (no `lg` step). This is deliberate, not
inconsistent: Explorer's cards are compact project tiles that comfortably support a third
column at `lg`, while Dashboard's widgets (sparkline + metric grid + activity feed) need
the extra width `lg` alone doesn't provide. If this tradeoff is ever revisited, change both
grids together — see the comment in `ExplorerGridLayout.tsx`.

## Accessibility Rules

- Every interactive element gets `focus-visible:ring-2 focus-visible:ring-radar-primary/50`
  (plus a theme-appropriate `ring-offset` color) — never suppress the default focus ring
  without replacing it.
- Icon-only controls (social links, action buttons) require `aria-label`.
- Every hover-only animation (`scale`, count-up, shimmer) has a `motion-reduce:` fallback
  or respects `useReducedMotion`.
- Truncated text that relies on a native `title=` fallback (see Tooltips) still needs
  the underlying text as the element's accessible name.

## Reusable Primitives

`Tooltip`, `Sparkline`, `AnimatedNumber`, `KpiValueDisplay`, `ProgressBar`, `EmptyState`,
`WidgetCard`, `GradientButton` (the real, radar-token-based button — not the removed
shadcn `components/ui/button.tsx`, which had zero consumers and has been deleted).

## Do's

- Reuse an existing formatter, badge, tooltip, or logo primitive before writing new markup.
- Add new registry entries (`lib/branding/*`) rather than inlining brand assets.
- Extend a shared component with an optional prop when it's *almost* right for a new need.
- Keep new hover/transition timing inside 150–300ms unless there's a documented reason.

## Don'ts

- Don't hardcode a hex color or a `slate-*`/`gray-*` Tailwind class — use `radar-*` tokens.
- Don't add a second `<table>`, card shell, button component, tooltip implementation, or
  badge type when an existing one covers the need.
- Don't render a chain, provider, or social icon as inline `<svg>` or plain text.
- Don't bypass `AnimatedNumber`/`KpiValueDisplay` for a new headline KPI-style number.
- Don't use a native `title=` attribute as a substitute for the shared `Tooltip`.
