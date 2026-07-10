import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Splits `items` into what's directly visible and what collapses behind a
 * "+N" indicator — one visible slot is reserved for that indicator
 * whenever there's overflow, so truncation is honest (a "+N" always
 * appears alongside fewer real items, never silently in their place).
 * Shared by every chip/badge group in Explorer that needs "show what
 * fits, then +N" (`ChainBadgeGroup`, `ProjectCategoryChips`) — the single
 * place this counting logic lives.
 */
export function splitOverflow<T>(items: T[], max: number): { visible: T[]; hidden: T[] } {
  if (items.length <= max) return { visible: items, hidden: [] };
  // At least one real item always shows, even when `max` itself is 1 — an
  // overflow indicator standing in for literally everything (0 real items)
  // would be worse than honest truncation, not better.
  const visibleCount = Math.max(1, max - 1);
  return { visible: items.slice(0, visibleCount), hidden: items.slice(visibleCount) };
}

/**
 * Sorts `items` by a display key (defaulting to the item itself) using
 * locale-aware alphabetical comparison — the one place "alphabetical"
 * ordering is decided for anything that needs it (category/tag chips, the
 * Filter Bar's category list), so every consumer sorts identically instead
 * of each screen writing its own `.sort()`.
 */
export function sortAlphabetically<T>(items: T[], key: (item: T) => string = (item) => String(item)): T[] {
  return [...items].sort((a, b) => key(a).localeCompare(key(b)));
}

/**
 * The literal (non-Tailwind-class) colour for each trend direction — for
 * anything that needs a real CSS color string rather than a class, e.g. a
 * `Sparkline`'s `stroke`/`fill` props or any other inline SVG color. Each
 * value is the CSS custom property every `text-radar-success`/
 * `text-radar-danger`/`text-radar-muted` utility already resolves to, so
 * there is exactly one place (`app/globals.css`) each brand colour is ever
 * defined — this just points at it instead of re-hardcoding the hex.
 * Shared by `KPIRow` and `PortfolioWidget`, the two surfaces that pass a
 * literal trend color into `Sparkline`.
 */
export const TREND_COLOR_VAR: Record<"up" | "down" | "flat", string> = {
  up: "var(--color-radar-success)",
  down: "var(--color-radar-danger)",
  flat: "var(--color-radar-muted)",
};
