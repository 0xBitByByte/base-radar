/**
 * Small, pure helpers shared by every alert provider — kept here instead of
 * duplicated in each provider file, same reasoning as "never duplicate
 * project lookup logic": one date-recency check and one id-join, reused by
 * every provider that needs them.
 */

/** `true` when `iso` is a real timestamp within the last `days` days (and not in the future) — the recency signal every stateless, single-snapshot alert type below uses instead of a persisted "have we seen this already" flag. De-duplication across repeated fetches is handled entirely by `lib/alerts/service.ts`'s existing overlay/dismiss mechanism via each alert's stable `id`, never by the provider. */
export function isWithinDays(iso: string | null | undefined, days: number): boolean {
  if (!iso) return false;
  const timestamp = new Date(iso).getTime();
  if (Number.isNaN(timestamp)) return false;
  const diffMs = Date.now() - timestamp;
  return diffMs >= 0 && diffMs <= days * 86_400_000;
}

/** A stable, deterministic alert id from its parts — the SAME id every time the same real-world fact is observed again, so `lib/alerts/service.ts`'s overlay-merge naturally treats repeat fetches of an unchanged fact as "the same alert" (preserving read/pinned/dismissed state) rather than a new one. */
export function makeAlertId(...parts: string[]): string {
  return parts.join(":");
}
