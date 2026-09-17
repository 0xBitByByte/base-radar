"use client";

import type { KeyboardEvent } from "react";
import { Bookmark, Search } from "lucide-react";

import { cn } from "@/lib/utils";

type CommandSearchProps = {
  value: string;
  onChange: (value: string) => void;
  onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
  activeDescendantId: string | undefined;
  /** PR-094.02 — whether the current query text is already a real Saved Search. */
  isSaved: boolean;
  /** Toggles Save/un-save for the current query — a no-op for an empty query (the button is hidden in that case, not just disabled). */
  onToggleSave: () => void;
};

/** The palette's search row — combobox semantics (`aria-expanded`/`aria-controls`/`aria-activedescendant`) drive the listbox in `CommandResults`. Visually identical to the row `SearchBar.tsx` used, just with the palette's own copy. The Save toggle (PR-094.02) only ever renders while there's a real, non-empty query to save — never a control offered with nothing real for it to act on. */
export function CommandSearch({ value, onChange, onKeyDown, activeDescendantId, isSaved, onToggleSave }: CommandSearchProps) {
  const hasQuery = value.trim() !== "";

  return (
    <div className="flex items-center gap-2.5 border-b border-radar-light-border px-4 py-3 dark:border-white/10">
      <Search className="size-4 shrink-0 text-radar-light-muted dark:text-radar-muted" aria-hidden="true" />
      <input
        autoFocus
        role="combobox"
        aria-expanded="true"
        aria-controls="command-palette-listbox"
        aria-activedescendant={activeDescendantId}
        aria-autocomplete="list"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={onKeyDown}
        placeholder="Search or jump to..."
        className="w-full bg-transparent text-sm text-radar-light-text outline-none placeholder:text-radar-light-muted dark:text-radar-white dark:placeholder:text-radar-muted"
      />
      {hasQuery && (
        <button
          type="button"
          onClick={onToggleSave}
          aria-pressed={isSaved}
          aria-label={isSaved ? "Remove from Saved Searches" : "Save this search"}
          title={isSaved ? "Remove from Saved Searches" : "Save this search"}
          className="flex shrink-0 items-center justify-center rounded-lg p-1 text-radar-light-muted outline-none transition-colors hover:bg-radar-light-surface hover:text-radar-primary focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:text-radar-muted dark:hover:bg-white/5 dark:hover:text-radar-accent"
        >
          <Bookmark className={cn("size-4", isSaved && "fill-radar-primary text-radar-primary dark:fill-radar-accent dark:text-radar-accent")} aria-hidden="true" />
        </button>
      )}
      <kbd className="rounded-md border border-radar-light-border px-1.5 py-0.5 text-[10px] font-medium text-radar-light-muted dark:border-white/10 dark:text-radar-muted">
        Esc
      </kbd>
    </div>
  );
}
