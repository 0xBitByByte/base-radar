# Design System

This document describes the design system as it exists in the codebase
today: the tokens, components, and interaction patterns actually in use
across the landing page and dashboard. It is a record of current behavior,
not a spec for how things should look — nothing here should be read as a
proposal to change anything.

For layer/module architecture, see [ARCHITECTURE.md](ARCHITECTURE.md).

## Typography

The app uses [Geist Sans and Geist Mono](../app/layout.tsx), loaded via
`next/font/google` and exposed as CSS variables (`--font-geist-sans`,
`--font-geist-mono`). All body and UI text renders in Geist Sans; no
monospace text is currently rendered anywhere in the UI.

Type sizes follow Tailwind's default scale, used consistently by role
rather than by page:

| Role | Classes seen in code | Example |
| --- | --- | --- |
| Hero headline | `text-4xl` → `text-7xl` (responsive) | Landing page H1 |
| Section title | `text-3xl sm:text-4xl` | `SectionTitle` |
| Widget/card title | `text-sm font-semibold` | `WidgetCard` title |
| Body / description | `text-sm`, `text-base sm:text-lg` | Hero subtext, card subtitles |
| Small / meta text | `text-xs`, `text-[10px]`–`text-[11px]` | Timestamps, badges, kbd hints |
| Eyebrow / label | `text-xs font-semibold uppercase tracking-[0.2em]` | `SectionTitle` eyebrow, sidebar section labels |

Font weight is used to establish hierarchy rather than size alone:
`font-semibold` for titles and emphasis, `font-medium` for interactive
labels and nav items, `font-bold` reserved for the wordmark ("BASE RADAR")
and stat values. Letter-spacing (`tracking-[0.1em]`–`tracking-[0.2em]` with
`uppercase`) marks section labels and eyebrows as structural, not content.

## Spacing

There is no custom spacing scale — the app uses Tailwind's default 4px-based
scale directly (`gap-1`, `gap-1.5`, `gap-2`, `gap-2.5`, `gap-3`, `px-4`,
`px-6`, `py-3`, etc.). In practice, a few conventions repeat everywhere:

- **Card padding**: `p-5 sm:p-6` (`WidgetCard`), `p-6 sm:p-8` (`GlassCard` on the landing page).
- **Icon-to-label gap**: `gap-1.5`–`gap-2.5` for inline icon+text pairs (nav items, badges, buttons).
- **Section rhythm**: `gap-4`–`gap-8` between stacked blocks on a page (e.g. the dashboard page's widget grid uses `gap-5`).
- **Sidebar item padding**: consistent `px-3 py-2`-scale hit targets for nav rows.

## Border Radius

Radius follows a single CSS custom-property scale defined in
`app/globals.css`, all derived from one `--radius` base (`0.625rem`):

| Token | Formula | Used for |
| --- | --- | --- |
| `--radius-sm` | `radius * 0.6` | shadcn-derived small controls |
| `--radius-md` | `radius * 0.8` | shadcn-derived `Button` sizes (`xs`/`sm`) |
| `--radius-lg` | `radius` (base) | shadcn-derived default controls |
| `--radius-xl` | `radius * 1.4` | — |
| `--radius-2xl` | `radius * 1.8` | — |
| `--radius-3xl` | `radius * 2.2` | — |
| `--radius-4xl` | `radius * 2.6` | — |

Alongside this scale, components also reach directly for Tailwind's radius
utilities rather than the custom properties above: `rounded-lg`/`rounded-xl`
for buttons and inputs, `rounded-2xl` for `WidgetCard`, `rounded-3xl` for
the landing page's `GlassCard`, and `rounded-full` for badges, avatars, and
the theme-toggle switch. In practice, larger surfaces get more rounding
(cards > buttons > badges/pills, which go fully round).

## Cards

Two card primitives cover all card usage:

- **`GlassCard`** (`components/ui/GlassCard.tsx`) — used only on the landing
  page. `rounded-3xl`, translucent dark background
  (`bg-radar-card/60 backdrop-blur-xl`), a hairline `border-white/10`, and
  an optional `glow` prop that adds a soft outer box-shadow in the primary
  brand color.
- **`WidgetCard`** (`components/dashboard/WidgetCard.tsx`) — used by every
  dashboard widget. Fixed anatomy: accent-colored icon chip → title/subtitle
  → optional "Demo data" badge → overflow action menu, then widget content,
  then an optional "Updated Xs ago" footer line. This consistent shell is
  what makes ten visually different widgets read as one system.

`WidgetCard` accent colors are a small closed set (`primary`, `success`,
`purple`, `orange`, `danger`, `accent`), each rendered as a `10%`-opacity
tinted icon chip — the same accent vocabulary as `GlowBadge`.

## Buttons

There are two distinct button systems in the codebase, used in different
contexts:

- **`GradientButton`** (`components/ui/GradientButton.tsx`) — landing-page
  and marketing CTAs only ("Explore Dashboard," "Launch App"). Two variants:
  `primary` (gradient fill, brand-colored glow shadow) and `secondary`
  (translucent outline). Built on Framer Motion (`whileHover`/`whileTap`
  spring), not plain CSS transitions.
- **`Button`** (`components/ui/button.tsx`) — a shadcn/Base UI-derived
  primitive (`@base-ui/react/button`) with `default` / `outline` /
  `secondary` / `ghost` / `destructive` / `link` variants and `xs`–`lg` plus
  icon sizes, driven by `class-variance-authority`. This is the general-
  purpose button primitive available to the design system, though most
  dashboard chrome today uses plain `<button>` elements styled ad hoc
  (topbar actions, sidebar toggles, menu triggers) rather than importing
  `Button` directly.

Every interactive element — both button systems and the ad hoc buttons —
carries a `focus-visible:ring-2` treatment for keyboard focus, in the
relevant accent color.

## Sidebar

The dashboard sidebar (`components/dashboard/Sidebar.tsx`) is a fixed
264px-wide column, visible at `lg` breakpoint and above (`hidden lg:flex`);
below that, navigation moves to `MobileSidebar`, a slide-in drawer using the
same `SidebarNav` content component so desktop and mobile never drift out of
sync.

Anatomy, top to bottom:

1. **Logo** — links to `/dashboard`.
2. **Grouped navigation** — sections from `DASHBOARD_NAV_GROUPS` (Overview,
   Discover, Research, Portfolio), each under an uppercase, tracked-out
   section label, followed by a "System" group for Settings.
3. **Active state** — determined by exact match for `/dashboard`, prefix
   match for everything else (`SidebarNav`'s `isActive`).
4. **Footer block** — theme toggle, a "← Website" link back to the landing
   page (with a tooltip), a row of social icon buttons (GitHub, Discord, X,
   Documentation, Telegram — currently placeholder `href="#"` links), and
   the app version string.

## Navbar

The marketing navbar (`components/layout/Navbar.tsx`) is a `sticky top-0`
header that changes appearance on scroll: transparent/blurred at the top
(`bg-radar-bg/40`), then gains a solid backdrop, border, and drop shadow
once `window.scrollY > 8` (`scrolled` state, toggled via a passive scroll
listener). Desktop shows inline nav links plus a `GradientButton` ("Launch
App"); below `md`, the links collapse into a hamburger-triggered drawer
animated open/closed with Framer Motion (`AnimatePresence` height/opacity
transition).

## Tables

There is no dedicated table component in the codebase today, and no widget
currently renders a `<table>` element. `@tanstack/react-table` is listed as
a dependency but is not yet imported or used anywhere in `components/` or
`app/`. Data that might otherwise be tabular (portfolio holdings, watchlist
items) is instead rendered as stacked list rows inside a `WidgetCard`.

## Forms

There is no dedicated form system, form component, or input-validation
pattern in the codebase. The only text input in the entire app is the plain
`<input>` inside the command palette (`components/dashboard/SearchBar.tsx`)
— unlabeled beyond its placeholder, filtering an in-memory list on every
keystroke, with no submission, no validation state, and no error styling.
The "Connect Wallet" and other topbar actions are inert buttons with no
associated form.

## Colors

Color is defined in two coexisting systems in `app/globals.css`:

1. **The `radar-*` palette** — the app's actual brand palette, defined as
   Tailwind v4 `@theme` tokens and used directly in components
   (`bg-radar-primary`, `text-radar-accent`, etc.):

   | Token | Value | Role |
   | --- | --- | --- |
   | `radar-bg` | `#061224` | Dark-mode page background |
   | `radar-surface` | `#0b1731` | Dark-mode raised surface |
   | `radar-card` | `#101c38` | Dark-mode card background |
   | `radar-primary` | `#0052ff` | Primary brand blue |
   | `radar-accent` | `#00d4ff` | Cyan accent |
   | `radar-success` | `#00e676` | Positive/success state |
   | `radar-warning` | `#ffc857` | Warning state |
   | `radar-danger` | `#ff5a6f` | Negative/error state |
   | `radar-white` | `#f7fafc` | Dark-mode primary text |
   | `radar-muted` | `#93a4c5` | Dark-mode secondary text |
   | `radar-purple` | `#a78bfa` | Secondary accent (AI/research context) |
   | `radar-orange` | `#ff8a3d` | Secondary accent (alerts/whale context) |
   | `radar-light-bg` / `-card` / `-surface` / `-border` / `-text` / `-muted` | see below | Light-mode counterparts |

2. **The shadcn/Base UI token set** (`--background`, `--card`, `--primary`,
   `--border`, `--sidebar-*`, `--chart-*`, defined as OKLCH values) — the
   default palette that ships with the shadcn "base-nova" style and backs
   primitives like `Button` and `Skeleton`. These are largely neutral
   grayscale tokens and are independent of the `radar-*` brand palette.

Semantic accent colors (`success`/`warning`/`danger`/`purple`/`orange`) are
reused consistently for meaning across the app: green for positive
trend/health, amber for warnings, red for negative/danger, purple for
AI-related content, orange for whale/alert-style highlights.

## Dark Theme

Dark is the **default and primary** theme — the root layout sets
`defaultTheme="dark"` and disables OS-based auto-switching
(`enableSystem={false}`), so the app always opens in dark mode unless the
user explicitly switches. Dark mode uses the `radar-bg`/`radar-surface`/
`radar-card` navy backgrounds with `radar-white`/`radar-muted` text, plus a
grid-pattern background overlay in the dashboard shell
(`DashboardLayout`'s fixed, low-opacity grid + radial glow behind content).

## Light Theme

Light mode was deliberately designed as a "premium," warm-neutral theme
rather than a stark inverse of dark mode — the code comment on the palette
tokens is explicit: *"Premium light-theme surfaces — warm neutrals, never
stark white."* It uses `radar-light-bg` (`#f7f8fa`), `radar-light-card`
(`#ffffff`), `radar-light-surface` (`#f2f4f7`), `radar-light-border`
(`#e4e7ec`), `radar-light-text` (`#1e293b`), and `radar-light-muted`
(`#64748b`). Every dashboard component pairs a light-mode class with a
`dark:` override rather than relying on a single shared neutral, so light
and dark surfaces can be tuned independently.

## Hover Behavior

Hover treatments are consistent by element type:

- **Cards** (`WidgetCard`) lift slightly (`whileHover={{ y: -3 }}`) and gain
  a colored border/shadow (`hover:border-radar-primary/30 hover:shadow-lg`).
- **Buttons** (`GradientButton`) lift and scale via a Framer Motion spring
  (`whileHover={{ y: -2, scale: 1.02 }}`), plus a brighter glow shadow.
- **Icon-only buttons** (topbar actions, sidebar toggle, menu triggers) get
  a subtle background tint (`hover:bg-slate-900/5` / `dark:hover:bg-white/5`)
  with no movement.
- **Sidebar social icons** scale up on hover (`hover:scale-110`) and pick up
  a brand-colored glow matching that platform's own color (e.g. Discord's
  `#5865F2`), with the scale effect explicitly disabled under reduced
  motion (`motion-reduce:hover:scale-100`).
- **Nav links** transition text color only (`text-radar-muted` →
  `text-radar-white`/`text-radar-light-text`), no background change.

## Animations

### Animation Principles

Distilled from how animation is actually used across the codebase, not
written down elsewhere as a formal spec:

1. **Motion confirms, it doesn't decorate.** Entrance animations mark
   content as newly rendered; hover motion confirms an element is
   interactive; count-up numbers confirm a value just loaded. Nothing
   animates purely for spectacle.
2. **Short and physical.** Durations cluster around `0.15`–`0.6s`, and
   interactive elements use spring physics (`type: "spring"`) rather than
   linear/eased timing, so motion feels responsive rather than decorative.
3. **Reduced motion is a first-class state, not an afterthought** — see
   [Reduced Motion](#reduced-motion): every animation path has a defined
   reduced-motion behavior, not just a global disable switch.

Animation is built on **Framer Motion** throughout, not CSS keyframes,
with two recurring patterns:

- **Entrance animations** — `initial`/`animate` (or `whileInView` for
  below-the-fold content) fading and sliding content up
  (`opacity: 0, y: 16` → `opacity: 1, y: 0`), often staggered across
  siblings via `staggerChildren` (the landing page hero).
- **Count-up numbers** — `AnimatedNumber` animates from `0` to the target
  value using Framer Motion's imperative `animate()` function driving React
  state, seeded with the real value on first render so server and client
  markup match before the animation starts.

Base UI primitives (`Tooltip`, `Menu`, `Dialog`) use CSS transitions instead
of Framer Motion, keyed off Base UI's `data-[starting-style]` /
`data-[ending-style]` attributes for enter/exit states
(`transition-[opacity,transform] duration-150`–`200`).

A live "pulse" indicator (`animate-ping`, a plain Tailwind/CSS animation)
marks live-status dots in the network badge, live badges, and glowing
badge dots — the one animation in the app that isn't Framer Motion or a
Base UI transition.

## Accessibility

Recurring accessibility patterns observed across components:

- **Focus rings**: every interactive element (`button`, `a`, custom
  triggers) has an explicit `focus-visible:ring-2` in an accent color, with
  `ring-offset` colors matched to light/dark background so the ring stays
  visible on either theme.
- **`aria-label`** is set on every icon-only control (menu triggers, mobile
  nav toggle, social links, theme toggle, notification bell, etc.), since
  none of them have visible text.
- **`aria-hidden="true"`** on decorative icons that sit next to real text,
  so screen readers aren't read the icon glyph twice.
- **`aria-expanded`** on the mobile nav hamburger button, reflecting drawer
  open/closed state.
- **Semantic landmarks**: `<nav aria-label="Primary">` (navbar),
  `<nav aria-label="Main">` (sidebar), `<nav aria-label="Breadcrumb">`
  (topbar).
- **Screen-reader-only content**: the command palette's `Dialog.Title` and
  `Dialog.Description` are visually hidden (`sr-only`) but present for
  assistive tech, since the dialog has no visible heading.

## Reduced Motion

Reduced motion is respected at two levels, applied consistently rather than
per-animation:

- **Framer Motion animations** are wrapped in `<MotionConfig
  reducedMotion="user">` at the root of the landing page (`Hero`) and the
  dashboard shell (`DashboardLayout`), which tells Framer Motion to honor
  the OS-level `prefers-reduced-motion` setting for every animation inside,
  without each component needing its own check. `AnimatedNumber` additionally
  checks `useReducedMotion()` directly and skips the count-up entirely,
  rendering the final value immediately.
- **CSS transitions** use Tailwind's `motion-reduce:` variant to disable
  specific transform/scale effects (e.g. `motion-reduce:transition-none` on
  tooltip/menu/dialog popups, `motion-reduce:hover:scale-100` on sidebar
  social icons), rather than disabling animation globally at the CSS layer.

## Component Philosophy

A few conventions recur strongly enough to describe as the system's
underlying philosophy, even though they're not written down anywhere else
in the code:

- **Composition over configuration.** Primitives like `GlassCard`,
  `GlowBadge`, and `WidgetCard` expose a handful of props (`glow`, `color`,
  `accent`) rather than many style knobs — most visual variation comes from
  passing `className` and composing children, not from prop explosion.
- **One shell, many widgets.** `WidgetCard` is the clearest expression of
  this: ten widgets with completely different data shapes still read as one
  coherent product because they share a single card shell, icon-chip
  vocabulary, and footer treatment.
- **Semantic tokens, not raw values.** Components reference `radar-*`
  color names and the shared radius scale rather than hex codes or
  arbitrary pixel values, so the two themes can vary independently of
  component code (see [Dark Theme](#dark-theme) / [Light Theme](#light-theme)).
- **Honesty in the UI, not just the data layer.** The "Demo data" badge on
  `WidgetCard` and the source-tagging described in
  [ARCHITECTURE.md](ARCHITECTURE.md#how-data-flows) reflect the same
  principle at the component level: the UI should never present a fallback
  as if it were live.
- **Base UI for behavior, Tailwind for looks.** Interactive primitives with
  real accessibility complexity (tooltip, menu, dialog, switch, progress)
  are built on `@base-ui/react`, which supplies keyboard handling, focus
  management, and ARIA wiring; almost all visual styling on top is Tailwind
  utility classes, not custom CSS.
