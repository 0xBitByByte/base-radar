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

/**
 * V3-NOTIFICATION-001 — today's UTC date as `YYYY-MM-DD`. The stable anchor
 * for anything whose real-world trigger is a *live, continuously-moving*
 * value (a price % change, a TVL % change, a rolling commit count, "the
 * moment this cache last rebuilt") rather than a discrete, already-fixed
 * fact. Several independent id/timestamp schemes across this codebase
 * (`lib/alerts/providers/{coingecko,defillama,github}.ts`,
 * `lib/brief/storage.ts`, `lib/portfolio/storage.ts`) previously stamped
 * `new Date().toISOString()` — the exact rebuild moment, not any real event
 * time — directly into a value used as (or to derive) a stable id. Since a
 * browser refresh re-evaluates every module-scope cache from scratch, that
 * moment differs on every single reload, which broke every downstream
 * consumer keying persisted state off that id (most visibly,
 * `lib/notifications/storage.ts`'s read-state overlay — see the
 * V3-NOTIFICATION-001 report for the full trace). A day-bucket keeps such
 * an id stable across any number of refreshes within the same day, while a
 * genuinely new day still produces a genuinely new id, so a real new signal
 * tomorrow is never silently suppressed.
 */
export function dayBucket(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Midnight UTC today, as a real ISO timestamp — the same day-bucket
 * `dayBucket()` anchors to, shaped as a valid timestamp field. Used in
 * place of `new Date().toISOString()` by the same call sites `dayBucket()`
 * documents: without this, even a stabilized id would keep re-sorting to
 * "just now" and showing a fake, ever-changing recency on every reload.
 */
export function startOfTodayIso(): string {
  return `${dayBucket()}T00:00:00.000Z`;
}

/**
 * V4-FUTURE-001 — the one real browser-download trigger this app uses: a
 * `Blob` + `URL.createObjectURL` + a synthetic anchor click, cleaned up
 * immediately after. Extracted from `PersonalizationPreferencesPage.tsx`'s
 * own `downloadJson` (that file's local copy now calls this instead) once
 * Chat Export and Historical Report Export needed the identical pattern —
 * "no new implementation style," per those features' own briefs. No
 * network request, no data leaves the tab.
 */
export function downloadTextFile(filename: string, content: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
