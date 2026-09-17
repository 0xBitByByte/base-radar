/**
 * PR-086.02 — the shared "premium glass" surface recipe: translucent
 * gradient background, backdrop blur, a hairline edge, a soft inset top
 * highlight (the classic "light catching glass" cue), and a deep, diffuse
 * elevation shadow. Root-caused why the first pass of this still read as
 * flat: `--color-radar-light-bg` (`#f4f8fc`) and `--color-radar-light-card`/
 * `-surface` (`#f8fbff`/`#ffffff`) are within a few percent lightness of
 * each other, so a *white* border/highlight is close to invisible against
 * this palette's near-white page background — a bright edge only reads on a
 * darker surface. In light mode the border below is brand-tinted
 * (`radar-primary`) instead of white for exactly that reason; dark mode
 * keeps the white edge, which does show up against `--color-radar-bg`
 * (`#071321`). Background opacity also dropped further (60/35 -> 42/22) so
 * more of the page's ambient glow (`DashboardLayout.tsx`'s blurred
 * primary/accent blobs, added in this same PR to give blur something to
 * blur) actually bleeds through instead of two near-white layers stacking
 * into one slightly-less-white layer.
 */
const GLASS_SURFACE_BASE =
  "rounded-2xl border border-radar-primary/[0.18] bg-gradient-to-b from-radar-light-card/[0.42] to-radar-light-surface/20 shadow-[0_10px_36px_-10px_rgba(16,34,58,0.24),inset_0_1px_0_0_rgba(255,255,255,0.65)] backdrop-blur-2xl dark:border-white/10 dark:bg-gradient-to-b dark:from-radar-elevated/40 dark:to-radar-card/30 dark:shadow-[0_10px_36px_-10px_rgba(0,0,0,0.55),inset_0_1px_0_0_rgba(255,255,255,0.07)]";

/**
 * `GLASS_SURFACE_BASE` plus the interactive hover treatment `WidgetCard.tsx`
 * and `ProjectCard.tsx` share (both are hoverable/clickable cards) —
 * brighter border, stronger elevation, a touch of brand-color glow. Kept
 * separate from `GLASS_SURFACE_BASE` so non-interactive glass shells
 * (`ProfileSectionCard`) can reuse the same surface without inheriting a
 * hover state that doesn't apply to them.
 */
export const GLASS_CARD_SURFACE = `${GLASS_SURFACE_BASE} transition-[border-color,box-shadow] duration-200 hover:border-radar-primary/50 hover:shadow-[0_12px_40px_-12px_rgba(16,34,58,0.22),0_0_50px_-15px_rgba(var(--color-radar-primary-rgb),0.18),inset_0_1px_0_0_rgba(255,255,255,0.6)] dark:hover:border-white/25 dark:hover:shadow-[0_12px_40px_-12px_rgba(0,0,0,0.6),0_0_50px_-15px_rgba(var(--color-radar-primary-rgb),0.22),inset_0_1px_0_0_rgba(255,255,255,0.1)]`;

/**
 * The same glass surface for non-interactive shells — `ProfileSectionCard`
 * wraps large, static reading sections (Health & Trust, Why It Matters, ...),
 * so it gets the same bg/border/blur/shadow language without the
 * hover-brightened border/glow — a hover-lift on a section that fills most
 * of the viewport would read as the "visual gimmick" this PR explicitly
 * warns against, not a polish.
 */
export const GLASS_SURFACE_STATIC = `${GLASS_SURFACE_BASE} transition-shadow duration-200 hover:shadow-[0_12px_40px_-12px_rgba(16,34,58,0.22),inset_0_1px_0_0_rgba(255,255,255,0.6)] dark:hover:shadow-[0_12px_40px_-12px_rgba(0,0,0,0.6),inset_0_1px_0_0_rgba(255,255,255,0.1)]`;

/**
 * PR-086.03 — a lighter-weight glass surface for small, densely-packed
 * tiles (`MetricItem`, `PairCard`, list rows) where `GLASS_SURFACE_BASE`'s
 * `rounded-2xl` + heavier shadow would look oversized at `p-3` scale and
 * repeated blur on many simultaneous small tiles adds real paint cost for
 * no visual benefit. Same border/gradient/highlight language as the full
 * surface (so it still reads as the same glass system, not a third
 * variant), scaled down: `rounded-xl`, `backdrop-blur-lg` instead of `2xl`,
 * a single soft shadow instead of the full elevation stack. No hover baked
 * in — each tile-scale consumer already has its own hover treatment
 * (`PairCard`'s lift, `MetricItem`'s callers don't hover at all).
 */
export const GLASS_TILE_SURFACE =
  "rounded-xl border border-radar-primary/[0.16] bg-gradient-to-b from-radar-light-card/45 to-radar-light-surface/25 shadow-[0_4px_16px_-8px_rgba(16,34,58,0.18),inset_0_1px_0_0_rgba(255,255,255,0.55)] backdrop-blur-lg dark:border-white/10 dark:bg-gradient-to-b dark:from-radar-elevated/40 dark:to-radar-card/30 dark:shadow-[0_4px_16px_-8px_rgba(0,0,0,0.4),inset_0_1px_0_0_rgba(255,255,255,0.06)]";

/**
 * PR-086.01 — the full-viewport modal scrim `MobileSidebar.tsx` and
 * `PortfolioWidget.tsx` each hardcoded independently, byte-for-byte
 * identical. Both mount it via Base UI's `Dialog.Backdrop`; this constant
 * is the shared `className` value, not a component, so each call site keeps
 * its own `Dialog.Backdrop` usage unchanged.
 *
 * PR-086.02 — blur strengthened (`sm` -> `md`) and opacity raised slightly
 * so the glass dialog floating above it reads with clearly more depth,
 * per this PR's explicit "glass dialog should clearly appear above the
 * page" goal.
 */
export const GLASS_MODAL_SCRIM = "fixed inset-0 z-40 bg-radar-bg/50 backdrop-blur-md dark:bg-black/70";
