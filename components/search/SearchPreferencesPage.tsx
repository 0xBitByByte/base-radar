"use client";

import { Bookmark, RotateCcw, Trash2, X } from "lucide-react";
import { Switch } from "@base-ui/react/switch";

import { useRecentSearches } from "@/lib/hooks/useRecentSearches";
import { useSavedSearches } from "@/lib/hooks/useSavedSearches";
import { useSearchPreferences } from "@/lib/hooks/useSearchPreferences";
import { GLASS_TILE_SURFACE } from "@/components/ui/glassStyles";
import { PAGE_HEADER_GROUP_CLASS, PAGE_HEADER_TITLE_CLASS, PAGE_HEADER_SUBTITLE_CLASS } from "@/components/dashboard/pageHeaderStyles";
import { cn } from "@/lib/utils";

const SWITCH_ROOT_CLASS =
  "relative flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full bg-radar-light-border outline-none transition-colors data-[checked]:bg-radar-primary focus-visible:ring-2 focus-visible:ring-radar-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-radar-light-bg dark:bg-white/10 dark:data-[checked]:bg-radar-primary dark:focus-visible:ring-offset-radar-bg";
const SWITCH_THUMB_CLASS =
  "block size-4 translate-x-1 rounded-full bg-radar-light-card shadow transition-transform data-[checked]:translate-x-6 dark:bg-radar-bg";

/**
 * `/dashboard/settings/search` — the same card/section chrome
 * `AutomationPreferencesPage.tsx`/`NotificationPreferencesPage.tsx`
 * established. Reads/writes `lib/search/preferences.ts` via
 * `useSearchPreferences`, and reads/clears Recent Searches via
 * `useRecentSearches()` (PR-094.01 — the same hook `CommandPalette.tsx`
 * uses, so clearing history here also enqueues a real Sync operation when
 * authenticated, exactly like recording a search does).
 *
 * PR-094.02 adds a real Saved Searches management list via
 * `useSavedSearches()` — unlike Recent Searches, there's no bulk "clear"
 * here (each entry was an explicit, individual user action, so removal
 * stays individual too), and no Cloud Sync wiring in this pass (see
 * `lib/search/savedSearches.ts`'s own doc comment for why).
 */
export function SearchPreferencesPage() {
  const { preferences, setPreferences, resetPreferences } = useSearchPreferences();
  const { recentSearches, clearSearchHistory } = useRecentSearches();
  const { savedSearches, deleteSavedSearch } = useSavedSearches();

  return (
    <div className="flex flex-col gap-6">
      <div className={PAGE_HEADER_GROUP_CLASS}>
        <h1 className={PAGE_HEADER_TITLE_CLASS}>Search Preferences</h1>
        <p className={PAGE_HEADER_SUBTITLE_CLASS}>
          Control how Global Search and the Command Palette behave, and manage your search history.
        </p>
      </div>

      <section aria-labelledby="search-preferences-keyboard-heading" className="flex flex-col gap-3">
        <h2
          id="search-preferences-keyboard-heading"
          className="text-sm font-semibold text-radar-light-text dark:text-radar-white"
        >
          Keyboard
        </h2>
        <div className={cn("flex items-center justify-between gap-3 p-4", GLASS_TILE_SURFACE)}>
          <span className="text-sm font-medium text-radar-light-text dark:text-radar-white">Open with ⌘K / Ctrl+K</span>
          <Switch.Root
            checked={preferences.enableKeyboardShortcut}
            onCheckedChange={(checked) => setPreferences({ enableKeyboardShortcut: checked })}
            aria-label={
              preferences.enableKeyboardShortcut
                ? 'Disable the "⌘K / Ctrl+K" shortcut'
                : 'Enable the "⌘K / Ctrl+K" shortcut'
            }
            className={SWITCH_ROOT_CLASS}
          >
            <Switch.Thumb className={SWITCH_THUMB_CLASS} />
          </Switch.Root>
        </div>
        {!preferences.enableKeyboardShortcut && (
          <p className="text-xs text-radar-light-muted dark:text-radar-muted">
            The keyboard shortcut is off — Global Search still opens from the search button in the Topbar.
          </p>
        )}
      </section>

      <section aria-labelledby="search-preferences-recent-heading" className="flex flex-col gap-3">
        <h2
          id="search-preferences-recent-heading"
          className="text-sm font-semibold text-radar-light-text dark:text-radar-white"
        >
          Recent Searches
        </h2>
        <div className={cn("flex flex-col divide-y divide-radar-light-border dark:divide-white/10", GLASS_TILE_SURFACE)}>
          <div className="flex items-center justify-between gap-3 p-4">
            <span className="text-sm font-medium text-radar-light-text dark:text-radar-white">Enable Recent Searches</span>
            <Switch.Root
              checked={preferences.enableRecentSearches}
              onCheckedChange={(checked) => setPreferences({ enableRecentSearches: checked })}
              aria-label={
                preferences.enableRecentSearches ? "Hide the Recent Searches section" : "Show the Recent Searches section"
              }
              className={SWITCH_ROOT_CLASS}
            >
              <Switch.Thumb className={SWITCH_THUMB_CLASS} />
            </Switch.Root>
          </div>

          <div className="flex items-center justify-between gap-3 p-4">
            <span className="text-sm font-medium text-radar-light-text dark:text-radar-white">Enable Search History</span>
            <Switch.Root
              checked={preferences.enableSearchHistory}
              onCheckedChange={(checked) => setPreferences({ enableSearchHistory: checked })}
              aria-label={preferences.enableSearchHistory ? "Stop recording searches" : "Start recording searches"}
              className={SWITCH_ROOT_CLASS}
            >
              <Switch.Thumb className={SWITCH_THUMB_CLASS} />
            </Switch.Root>
          </div>

          <div className="flex items-center justify-between gap-3 p-4">
            <label htmlFor="max-recent-searches" className="text-sm font-medium text-radar-light-text dark:text-radar-white">
              Maximum Recent Searches
            </label>
            <input
              id="max-recent-searches"
              type="number"
              min={1}
              max={50}
              value={preferences.maxRecentSearches}
              onChange={(event) => setPreferences({ maxRecentSearches: Number(event.target.value) })}
              className="w-20 rounded-lg border border-radar-light-border bg-transparent px-2.5 py-1.5 text-right text-sm text-radar-light-text outline-none focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:border-white/10 dark:text-radar-white"
            />
          </div>

          <div className="flex items-center justify-between gap-3 p-4">
            <span className="flex flex-col">
              <span className="text-sm font-medium text-radar-light-text dark:text-radar-white">Clear Search History</span>
              <span className="text-xs text-radar-light-muted dark:text-radar-muted">
                {recentSearches.length === 0
                  ? "No searches saved yet."
                  : `${recentSearches.length} saved ${recentSearches.length === 1 ? "search" : "searches"}.`}
              </span>
            </span>
            <button
              type="button"
              onClick={() => clearSearchHistory()}
              disabled={recentSearches.length === 0}
              className="flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-radar-light-muted outline-none transition-colors hover:bg-radar-light-surface focus-visible:ring-2 focus-visible:ring-radar-primary/50 disabled:pointer-events-none disabled:opacity-40 dark:text-radar-muted dark:hover:bg-white/5"
            >
              <Trash2 className="size-3.5" aria-hidden="true" />
              Clear
            </button>
          </div>
        </div>
      </section>

      <section aria-labelledby="search-preferences-saved-heading" className="flex flex-col gap-3">
        <h2
          id="search-preferences-saved-heading"
          className="text-sm font-semibold text-radar-light-text dark:text-radar-white"
        >
          Saved Searches
        </h2>
        <p className="text-xs text-radar-light-muted dark:text-radar-muted">
          Searches you&apos;ve explicitly saved from Global Search — never auto-recorded, and never cleared automatically.
        </p>
        <div className={cn("flex flex-col", GLASS_TILE_SURFACE)}>
          {savedSearches.length === 0 ? (
            <p className="p-4 text-xs text-radar-light-muted dark:text-radar-muted">
              No saved searches yet. Use the bookmark icon in Global Search (⌘K / Ctrl+K) to save one.
            </p>
          ) : (
            <ul className="flex flex-col divide-y divide-radar-light-border dark:divide-white/10">
              {savedSearches.map((saved) => (
                <li key={saved.id} className="flex items-center justify-between gap-3 p-4">
                  <span className="flex min-w-0 items-center gap-2.5">
                    <Bookmark className="size-4 shrink-0 text-radar-light-muted dark:text-radar-muted" aria-hidden="true" />
                    <span className="truncate text-sm font-medium text-radar-light-text dark:text-radar-white">{saved.query}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => deleteSavedSearch(saved.id)}
                    aria-label={`Remove "${saved.query}" from Saved Searches`}
                    className="flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-radar-light-muted outline-none transition-colors hover:bg-radar-danger/5 hover:text-radar-danger focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:text-radar-muted"
                  >
                    <X className="size-3.5" aria-hidden="true" />
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section>
        <button
          type="button"
          onClick={() => resetPreferences()}
          className="flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-radar-light-muted outline-none transition-colors hover:bg-radar-light-surface focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:text-radar-muted dark:hover:bg-white/5"
        >
          <RotateCcw className="size-3.5" aria-hidden="true" />
          Reset preferences to defaults
        </button>
      </section>
    </div>
  );
}
