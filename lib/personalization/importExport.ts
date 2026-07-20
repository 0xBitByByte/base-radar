/**
 * Watchlist import/export (PR22 Part 3) — JSON-only, presentation-layer
 * utilities on top of `lib/personalization/storage.ts`'s existing
 * `PersonalWatchlist` model. Framework-agnostic (no React, no DOM) so it
 * stays testable and reusable — the actual file download/upload mechanics
 * live in `components/personalization/PersonalizationPreferencesPage.tsx`.
 *
 * Export only ever reads the current state, never mutates it. Import is a
 * two-step, confirmation-gated flow by design: `validateWatchlistImport`
 * only parses and sanitizes a raw file's contents — it never writes to
 * storage. The caller shows the user what was found (including every
 * recovered issue) and only calls `lib/personalization/storage.ts`'s
 * `importWatchlists()` once they explicitly confirm. Nothing is ever
 * overwritten: `importWatchlists()` is purely additive, and a name that
 * collides with an existing watchlist is disambiguated, never replaced.
 */

import { getProject } from "@/data/projects/helpers";
import { WATCHLIST_COLORS, WATCHLIST_ICONS } from "@/lib/personalization/types";
import type { PersonalWatchlist, WatchlistColorKey, WatchlistIconKey } from "@/lib/personalization/types";

const WATCHLIST_EXPORT_SCHEMA = "base-radar-watchlists";
const WATCHLIST_EXPORT_VERSION = 1;

export type WatchlistExportPayload = {
  schema: typeof WATCHLIST_EXPORT_SCHEMA;
  version: number;
  exportedAt: string;
  watchlists: PersonalWatchlist[];
};

/** Serializes the current watchlists into a stable, versioned JSON envelope — pretty-printed so an exported file is human-readable/diffable. */
export function exportWatchlistsToJson(watchlists: PersonalWatchlist[]): string {
  const payload: WatchlistExportPayload = {
    schema: WATCHLIST_EXPORT_SCHEMA,
    version: WATCHLIST_EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    watchlists,
  };
  return JSON.stringify(payload, null, 2);
}

/** The shape `lib/personalization/storage.ts`'s `importWatchlists()` accepts — deliberately missing `id`/`updatedAt`/`pinned`: a fresh id and timestamp are always assigned at import time, and an imported watchlist never inherits "pinned" (a deliberate, local choice the user makes after reviewing what came in, not something a file should silently set). */
export type SanitizedImportWatchlist = {
  name: string;
  description: string;
  icon: WatchlistIconKey;
  color: WatchlistColorKey;
  projectIds: string[];
  createdAt: string;
};

export type WatchlistImportResult =
  | { valid: true; watchlists: SanitizedImportWatchlist[]; issues: string[] }
  | { valid: false; issues: string[] };

function isValidDateString(value: unknown): value is string {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}

/**
 * Parses and validates a raw JSON string against the export schema. Rejects
 * the whole file only when it's not JSON, doesn't match the envelope shape,
 * or recovers zero usable watchlists — every other problem (an invalid
 * icon/color, a project reference no longer in the registry, a corrupted
 * date, a duplicate name within the file) is recovered field-by-field, with
 * a human-readable entry pushed to `issues` for each one, the same
 * "recover what you can, report what you couldn't" shape every other
 * storage/preferences module in this app already follows.
 */
export function validateWatchlistImport(raw: string): WatchlistImportResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { valid: false, issues: ["This file is not valid JSON."] };
  }

  if (typeof parsed !== "object" || parsed === null || !Array.isArray((parsed as { watchlists?: unknown }).watchlists)) {
    return { valid: false, issues: ["This file doesn't match the Base Radar watchlist export format."] };
  }

  const rawList = (parsed as { watchlists: unknown[] }).watchlists;
  const issues: string[] = [];
  const seenNames = new Set<string>();
  const sanitized: SanitizedImportWatchlist[] = [];

  rawList.forEach((entry, index) => {
    const label = `Entry ${index + 1}`;
    if (typeof entry !== "object" || entry === null) {
      issues.push(`${label}: not a valid watchlist object — skipped.`);
      return;
    }
    const candidate = entry as Partial<PersonalWatchlist>;

    if (typeof candidate.name !== "string" || candidate.name.trim() === "") {
      issues.push(`${label}: missing name — skipped.`);
      return;
    }
    const name = candidate.name.trim();
    const normalizedName = name.toLowerCase();
    if (seenNames.has(normalizedName)) {
      issues.push(`"${name}": duplicate name in the file — skipped.`);
      return;
    }

    const icon: WatchlistIconKey = (WATCHLIST_ICONS as readonly string[]).includes(candidate.icon ?? "")
      ? (candidate.icon as WatchlistIconKey)
      : "star";
    if (candidate.icon !== icon) issues.push(`"${name}": invalid icon — defaulted to "star".`);

    const color: WatchlistColorKey = (WATCHLIST_COLORS as readonly string[]).includes(candidate.color ?? "")
      ? (candidate.color as WatchlistColorKey)
      : "primary";
    if (candidate.color !== color) issues.push(`"${name}": invalid color — defaulted to "primary".`);

    const rawProjectIds = Array.isArray(candidate.projectIds) ? candidate.projectIds : [];
    const projectIds = rawProjectIds.filter((id): id is string => typeof id === "string" && getProject(id) !== undefined);
    const droppedProjectCount = rawProjectIds.length - projectIds.length;
    if (droppedProjectCount > 0) {
      issues.push(
        `"${name}": ${droppedProjectCount} project reference${droppedProjectCount === 1 ? "" : "s"} no longer exist in the registry — dropped.`
      );
    }

    const createdAt = isValidDateString(candidate.createdAt) ? candidate.createdAt : new Date().toISOString();
    if (!isValidDateString(candidate.createdAt)) {
      issues.push(`"${name}": corrupted or missing created date — reset to now.`);
    }

    seenNames.add(normalizedName);
    sanitized.push({
      name,
      description: typeof candidate.description === "string" ? candidate.description : "",
      icon,
      color,
      projectIds,
      createdAt,
    });
  });

  if (sanitized.length === 0) {
    return { valid: false, issues: [...issues, "No valid watchlists were found in this file."] };
  }

  return { valid: true, watchlists: sanitized, issues };
}
