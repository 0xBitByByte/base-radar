import { sortAlphabetically, splitOverflow } from "@/lib/utils";

/** "Aerodrome Finance" -> "AE" — `ProjectLogo`'s fallback-initials rule, previously copy-pasted at every logo call site (card header, table row, Quick View header). */
export function getProjectInitials(name: string): string {
  return name.slice(0, 2).toUpperCase();
}

/**
 * Combines a project's categories and tags into one taxonomy list, sorts
 * it alphabetically (never backend/registry order), then splits into
 * what's directly visible vs. what collapses behind a "+N" — the single
 * function `ProjectCategoryChips` (and any future consumer, e.g. Project
 * Profile) calls, so category display never grows a second, slightly
 * different implementation elsewhere. `formatLabel` is passed in rather
 * than imported here so this stays a plain data helper, not dependent on
 * a specific display component's formatting.
 */
export function getDisplayCategories(
  categories: string[],
  tags: string[],
  max: number,
  formatLabel: (value: string) => string
): { visible: string[]; hidden: string[] } {
  const sorted = sortAlphabetically([...categories, ...tags], formatLabel);
  return splitOverflow(sorted, max);
}
