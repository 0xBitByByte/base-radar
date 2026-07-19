"use client";

import { useSyncExternalStore } from "react";
import { RotateCcw, Trash2 } from "lucide-react";
import { Switch } from "@base-ui/react/switch";

import { useSearchPreferences } from "@/lib/hooks/useSearchPreferences";
import { clearSearchHistory, getRecentSearches, subscribeToRecentSearches } from "@/lib/search/storage";

const SWITCH_ROOT_CLASS =
  "relative flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full bg-radar-light-border outline-none transition-colors data-[checked]:bg-radar-primary focus-visible:ring-2 focus-visible:ring-radar-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-radar-light-bg dark:bg-white/10 dark:data-[checked]:bg-radar-primary dark:focus-visible:ring-offset-radar-bg";
const SWITCH_THUMB_CLASS =
  "block size-4 translate-x-1 rounded-full bg-radar-light-card shadow transition-transform data-[checked]:translate-x-6 dark:bg-radar-bg";

const EMPTY_RECENT_SEARCHES: string[] = [];
function getServerSnapshot(): string[] {
  return EMPTY_RECENT_SEARCHES;
}

/**
 * `/dashboard/settings/search` — the same card/section chrome
 * `AutomationPreferencesPage.tsx`/`NotificationPreferencesPage.tsx`
 * established. Reads/writes `lib/search/preferences.ts` via
 * `useSearchPreferences`, and reads/clears `lib/search/storage.ts`'s
 * Recent Searches list directly — a small, self-contained subscription,
 * not worth a dedicated hook file for one read-only list on one page.
 */
export function SearchPreferencesPage() {
  const { preferences, setPreferences, resetPreferences } = useSearchPreferences();
  const recentSearches = useSyncExternalStore(subscribeToRecentSearches, getRecentSearches, getServerSnapshot);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold text-radar-light-text dark:text-radar-white">Search Preferences</h1>
        <p className="text-sm leading-relaxed text-radar-light-muted dark:text-radar-muted">
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
        <div className="flex items-center justify-between gap-3 rounded-xl border border-radar-light-border bg-radar-light-card p-4 dark:border-white/10 dark:bg-white/[0.02]">
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
        <div className="flex flex-col divide-y divide-radar-light-border rounded-xl border border-radar-light-border bg-radar-light-card dark:divide-white/10 dark:border-white/10 dark:bg-white/[0.02]">
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
