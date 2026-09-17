"use client";

import { Suspense, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { Dialog } from "@base-ui/react/dialog";
import { Bookmark, History, Search, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { useCommandPalette } from "@/lib/hooks/useCommandPalette";
import type { SearchableItem } from "@/lib/search/types";
import type { LiveProject } from "@/lib/projects/types";
import { CommandSearch } from "@/components/command/CommandSearch";
import { CommandResults } from "@/components/command/CommandResults";
import { CommandResultsAsync } from "@/components/command/CommandResultsAsync";

type CommandPaletteProps = {
  className?: string;
  /** Universal Project Card, PR-8 — see `app/dashboard/layout.tsx`. */
  liveProjectsPromise: Promise<LiveProject[]>;
};

/**
 * Global Search — a Topbar trigger (⌘K / Ctrl+K) plus a Dialog searching
 * both the static command registry and existing application data
 * (Projects, Timeline, Notifications, Automation, Portfolio, Daily Brief —
 * `lib/hooks/useGlobalSearch.ts`, PR21 Part 2). Pure navigation: it reads
 * `useCommandPalette()` for open/query/selection state and calls
 * `router.push(item.route)` on selection — no provider calls, no engine
 * calls, no new business logic. Mirrors the Base UI
 * `Dialog.Root`/`Trigger`/`Popup` structure `SearchBar.tsx` originally
 * established, including focus trap and return-focus-to-trigger, which Base
 * UI's Dialog provides for free.
 */
export function CommandPalette({ className, liveProjectsPromise }: CommandPaletteProps) {
  const router = useRouter();
  const {
    open,
    query,
    setQuery,
    results,
    selectedIndex,
    setSelectedIndex,
    selectNext,
    selectPrevious,
    openPalette,
    closePalette,
    recentSearches,
    showRecentSearches,
    recordSearch,
    selectRecentSearch,
    savedSearches,
    showSavedSearches,
    isCurrentQuerySaved,
    toggleSaveCurrentQuery,
    selectSavedSearch,
    removeSavedSearch,
  } = useCommandPalette();

  const activeItem = results[selectedIndex] ?? null;
  const activeDescendantId = activeItem ? `command-item-${activeItem.id}` : undefined;

  function navigateTo(item: SearchableItem) {
    recordSearch(query);
    closePalette();
    router.push(item.route);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    // Escape closes via Base UI's own Dialog behavior and Tab is left alone
    // to keep normal browser focus movement, per the PR brief — only
    // Up/Down/Enter are handled here.
    if (event.key === "ArrowDown") {
      event.preventDefault();
      selectNext();
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      selectPrevious();
    } else if (event.key === "Enter") {
      event.preventDefault();
      if (activeItem) navigateTo(activeItem);
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={(next) => (next ? openPalette() : closePalette())}>
      <Dialog.Trigger
        render={
          <button
            type="button"
            className={cn(
              "relative flex items-center gap-2 rounded-xl border border-radar-light-border bg-radar-light-surface px-3 py-2 text-left text-sm text-radar-light-muted outline-none transition-[border-color,box-shadow] duration-200",
              "hover:border-radar-primary/30 focus-visible:border-radar-primary/50 focus-visible:shadow-[0_0_0_4px_rgba(var(--color-radar-primary-rgb),0.1)]",
              "dark:border-radar-border dark:bg-white/5 dark:text-radar-muted dark:focus-visible:shadow-[0_0_0_4px_rgba(var(--color-radar-primary-rgb),0.15)]",
              className
            )}
          />
        }
      >
        <Search className="size-4 shrink-0" aria-hidden="true" />
        <span className="flex-1 truncate">Search or jump to...</span>
        <kbd className="rounded-md border border-radar-light-border bg-radar-light-card px-1.5 py-0.5 text-[10px] font-medium text-radar-light-muted dark:border-white/10 dark:bg-white/5 dark:text-radar-muted">
          ⌘K
        </kbd>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Backdrop
          className={cn(
            "fixed inset-0 z-40 bg-radar-bg/40 backdrop-blur-sm dark:bg-black/60",
            "transition-opacity duration-200 motion-reduce:transition-none",
            "data-[starting-style]:opacity-0 data-[ending-style]:opacity-0"
          )}
        />
        <Dialog.Popup
          className={cn(
            "fixed top-24 left-1/2 z-50 w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 overflow-hidden rounded-2xl border border-radar-light-border bg-radar-light-card shadow-2xl outline-none",
            "dark:border-white/10 dark:bg-radar-card",
            "transition-[opacity,transform] duration-200 motion-reduce:transition-none",
            "data-[starting-style]:scale-95 data-[starting-style]:opacity-0 data-[ending-style]:scale-95 data-[ending-style]:opacity-0"
          )}
        >
          <Dialog.Title className="sr-only">Global Search</Dialog.Title>
          <Dialog.Description className="sr-only">
            Search commands, projects, and activity across Base Radar, then press Enter to navigate.
          </Dialog.Description>

          <CommandSearch
            value={query}
            onChange={setQuery}
            onKeyDown={handleKeyDown}
            activeDescendantId={activeDescendantId}
            isSaved={isCurrentQuerySaved}
            onToggleSave={toggleSaveCurrentQuery}
          />

          {showSavedSearches && (
            <section
              role="group"
              aria-label="Saved Searches"
              className="border-b border-radar-light-border p-2 dark:border-white/10"
            >
              <p className="px-2.5 py-1.5 text-[10.5px] font-semibold tracking-[0.1em] text-radar-light-muted uppercase dark:text-radar-muted/60">
                Saved Searches
              </p>
              {savedSearches.map((saved) => (
                <div key={saved.id} className="group flex w-full items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => selectSavedSearch(saved.query)}
                    className="flex flex-1 items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-sm text-radar-light-text outline-none transition-colors hover:bg-radar-light-surface focus-visible:bg-radar-light-surface dark:text-radar-white dark:hover:bg-white/5 dark:focus-visible:bg-white/5"
                  >
                    <Bookmark className="size-4 shrink-0 text-radar-light-muted dark:text-radar-muted" aria-hidden="true" />
                    <span className="truncate">{saved.query}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => removeSavedSearch(saved.id)}
                    aria-label={`Remove "${saved.query}" from Saved Searches`}
                    className="shrink-0 rounded-lg p-1.5 text-radar-light-muted opacity-0 outline-none transition-colors hover:bg-radar-danger/5 hover:text-radar-danger focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-radar-primary/50 group-hover:opacity-100 dark:text-radar-muted"
                  >
                    <X className="size-3.5" aria-hidden="true" />
                  </button>
                </div>
              ))}
            </section>
          )}

          {showRecentSearches && (
            <section
              role="group"
              aria-label="Recent Searches"
              className="border-b border-radar-light-border p-2 dark:border-white/10"
            >
              <p className="px-2.5 py-1.5 text-[10.5px] font-semibold tracking-[0.1em] text-radar-light-muted uppercase dark:text-radar-muted/60">
                Recent Searches
              </p>
              {recentSearches.map((recentQuery) => (
                <button
                  key={recentQuery}
                  type="button"
                  onClick={() => selectRecentSearch(recentQuery)}
                  className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-sm text-radar-light-text outline-none transition-colors hover:bg-radar-light-surface focus-visible:bg-radar-light-surface dark:text-radar-white dark:hover:bg-white/5 dark:focus-visible:bg-white/5"
                >
                  <History className="size-4 shrink-0 text-radar-light-muted dark:text-radar-muted" aria-hidden="true" />
                  <span className="truncate">{recentQuery}</span>
                </button>
              ))}
            </section>
          )}

          <Suspense
            fallback={
              <CommandResults
                results={results}
                activeItemId={activeItem?.id ?? null}
                onSelect={navigateTo}
                onHover={(itemId) => {
                  const index = results.findIndex((item) => item.id === itemId);
                  if (index !== -1) setSelectedIndex(index);
                }}
              />
            }
          >
            <CommandResultsAsync
              liveProjectsPromise={liveProjectsPromise}
              results={results}
              activeItemId={activeItem?.id ?? null}
              onSelect={navigateTo}
              onHover={(itemId) => {
                const index = results.findIndex((item) => item.id === itemId);
                if (index !== -1) setSelectedIndex(index);
              }}
            />
          </Suspense>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
