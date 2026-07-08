/** Display-only formatting helpers for Explorer — never a data transformation. */

/** "base-native" -> "Base Native". Purely cosmetic; the underlying enum value is untouched. */
export function formatLabel(value: string): string {
  return value
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
