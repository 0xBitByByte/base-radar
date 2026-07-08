"use client";

import { useEffect, useRef } from "react";
import { Search, X } from "lucide-react";

import { cn } from "@/lib/utils";

type ExplorerSearchProps = {
  value: string;
  onChange: (value: string) => void;
  className?: string;
};

/**
 * The persistent inline Search Bar — docs/explorer/03 §5. Matches project
 * name, category, tag, and description keywords (components/explorer/search.ts).
 * No suggestions, no recent searches, no search history — all explicitly
 * out of scope for PR1.
 */
export function ExplorerSearch({ value, onChange, className }: ExplorerSearchProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const isTyping = target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || target?.isContentEditable;
      if (event.key === "/" && !isTyping) {
        event.preventDefault();
        inputRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <div
      className={cn(
        "relative flex items-center gap-2 rounded-xl border border-radar-light-border bg-radar-light-surface px-3 py-2 transition-colors",
        "focus-within:border-radar-primary/50 focus-within:ring-2 focus-within:ring-radar-primary/30",
        "dark:border-white/10 dark:bg-white/5",
        className
      )}
    >
      <Search className="size-4 shrink-0 text-radar-light-muted dark:text-radar-muted" aria-hidden="true" />
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Search projects by name, category, or tag"
        aria-label="Search projects"
        className="min-w-0 flex-1 bg-transparent text-sm text-radar-light-text outline-none placeholder:text-radar-light-muted dark:text-radar-white dark:placeholder:text-radar-muted"
      />
      {value ? (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Clear search"
          className="flex size-5 shrink-0 items-center justify-center rounded-md text-radar-light-muted outline-none transition-colors hover:bg-radar-light-border/50 focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:text-radar-muted dark:hover:bg-white/10"
        >
          <X className="size-3.5" aria-hidden="true" />
        </button>
      ) : (
        <kbd className="hidden shrink-0 rounded-md border border-radar-light-border bg-radar-light-card px-1.5 py-0.5 text-[10px] font-medium text-radar-light-muted sm:inline-block dark:border-white/10 dark:bg-white/5 dark:text-radar-muted">
          /
        </kbd>
      )}
    </div>
  );
}
