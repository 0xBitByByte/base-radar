"use client";

import type { KeyboardEvent } from "react";
import { Search } from "lucide-react";

type CommandSearchProps = {
  value: string;
  onChange: (value: string) => void;
  onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
  activeDescendantId: string | undefined;
};

/** The palette's search row — combobox semantics (`aria-expanded`/`aria-controls`/`aria-activedescendant`) drive the listbox in `CommandResults`. Visually identical to the row `SearchBar.tsx` used, just with the palette's own copy. */
export function CommandSearch({ value, onChange, onKeyDown, activeDescendantId }: CommandSearchProps) {
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
      <kbd className="rounded-md border border-radar-light-border px-1.5 py-0.5 text-[10px] font-medium text-radar-light-muted dark:border-white/10 dark:text-radar-muted">
        Esc
      </kbd>
    </div>
  );
}
