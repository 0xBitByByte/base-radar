/**
 * Small, generic, pure utilities shared across the intelligence engine's
 * other modules. Nothing here does I/O or knows about a specific provider
 * or the Project Registry.
 */

/** Lowercases and trims for loose, order-independent string comparison. */
export function normalizeName(value: string): string {
  return value.trim().toLowerCase();
}

/**
 * Best-effort slugification for matching a project's display name against
 * a provider-issued slug (e.g. DefiLlama's protocol slug). This is a
 * heuristic, not a guarantee — see `sources.ts`'s DefiLlama matching,
 * which tracks results produced this way as a `"fuzzy"` match rather than
 * `"exact"`.
 */
export function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Clamps and rounds a score into `[min, max]` (defaults to a 0-100 scale). */
export function clampScore(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, Math.round(value)));
}

export function sumBy<T>(items: T[], select: (item: T) => number): number {
  return items.reduce((sum, item) => sum + select(item), 0);
}

/** Formats a number with an explicit `+` sign when positive, for readable factor breakdowns. */
export function formatSigned(value: number): string {
  return value > 0 ? `+${value}` : `${value}`;
}
