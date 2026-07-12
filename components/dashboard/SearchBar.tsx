"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Dialog } from "@base-ui/react/dialog";
import { ArrowUpRight, Clock, Search, SearchX, TrendingUp } from "lucide-react";

import { cn } from "@/lib/utils";
import { QUICK_ACTIONS, RECENT_SEARCHES, TRENDING_SEARCHES } from "@/constants/dashboard";
import { EmptyState } from "@/components/ui/EmptyState";

type SearchBarProps = {
  className?: string;
};

export function SearchBar({ className }: SearchBarProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const isShortcut = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k";
      if (isShortcut) {
        event.preventDefault();
        setOpen((prev) => !prev);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) setQuery("");
  }

  const normalizedQuery = query.trim().toLowerCase();
  const filteredRecent = useMemo(
    () => RECENT_SEARCHES.filter((item) => item.toLowerCase().includes(normalizedQuery)),
    [normalizedQuery]
  );
  const filteredTrending = useMemo(
    () => TRENDING_SEARCHES.filter((item) => item.toLowerCase().includes(normalizedQuery)),
    [normalizedQuery]
  );
  const filteredActions = useMemo(
    () => QUICK_ACTIONS.filter((item) => item.label.toLowerCase().includes(normalizedQuery)),
    [normalizedQuery]
  );

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
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
        <span className="flex-1 truncate">Search projects, wallets, tokens, narratives...</span>
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
          <Dialog.Title className="sr-only">Search Base Radar</Dialog.Title>
          <Dialog.Description className="sr-only">
            Search projects, wallets, tokens, and narratives, or jump to a section.
          </Dialog.Description>

          <div className="flex items-center gap-2.5 border-b border-radar-light-border px-4 py-3 dark:border-white/10">
            <Search className="size-4 shrink-0 text-radar-light-muted dark:text-radar-muted" aria-hidden="true" />
            <input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search projects, wallets, tokens, narratives..."
              className="w-full bg-transparent text-sm text-radar-light-text outline-none placeholder:text-radar-light-muted dark:text-radar-white dark:placeholder:text-radar-muted"
            />
            <kbd className="rounded-md border border-radar-light-border px-1.5 py-0.5 text-[10px] font-medium text-radar-light-muted dark:border-white/10 dark:text-radar-muted">
              Esc
            </kbd>
          </div>

          <div className="max-h-[60vh] overflow-y-auto p-2">
            {filteredRecent.length > 0 && (
              <section className="mb-1">
                <p className="px-2.5 py-1.5 text-[10.5px] font-semibold tracking-[0.1em] text-radar-light-muted uppercase dark:text-radar-muted/60">
                  Recent Searches
                </p>
                {filteredRecent.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setQuery(item)}
                    className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-sm text-radar-light-text outline-none transition-colors hover:bg-radar-light-surface focus-visible:bg-radar-light-surface dark:text-radar-muted dark:hover:bg-white/5 dark:focus-visible:bg-white/5"
                  >
                    <Clock className="size-4 shrink-0 opacity-60" aria-hidden="true" />
                    {item}
                  </button>
                ))}
              </section>
            )}

            {filteredTrending.length > 0 && (
              <section className="mb-1">
                <p className="px-2.5 py-1.5 text-[10.5px] font-semibold tracking-[0.1em] text-radar-light-muted uppercase dark:text-radar-muted/60">
                  Trending
                </p>
                {filteredTrending.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setQuery(item)}
                    className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-sm text-radar-light-text outline-none transition-colors hover:bg-radar-light-surface focus-visible:bg-radar-light-surface dark:text-radar-muted dark:hover:bg-white/5 dark:focus-visible:bg-white/5"
                  >
                    <TrendingUp className="size-4 shrink-0 text-radar-accent" aria-hidden="true" />
                    {item}
                  </button>
                ))}
              </section>
            )}

            {filteredActions.length > 0 && (
              <section>
                <p className="px-2.5 py-1.5 text-[10.5px] font-semibold tracking-[0.1em] text-radar-light-muted uppercase dark:text-radar-muted/60">
                  Quick Actions
                </p>
                {filteredActions.map((action) => (
                  <Link
                    key={action.href}
                    href={action.href}
                    onClick={() => handleOpenChange(false)}
                    className="flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm text-radar-light-text outline-none transition-colors hover:bg-radar-light-surface focus-visible:bg-radar-light-surface dark:text-radar-muted dark:hover:bg-white/5 dark:focus-visible:bg-white/5"
                  >
                    <action.icon className="size-4 shrink-0 text-radar-primary dark:text-radar-accent" aria-hidden="true" />
                    <span className="flex-1">{action.label}</span>
                    <ArrowUpRight className="size-3.5 shrink-0 opacity-40" aria-hidden="true" />
                  </Link>
                ))}
              </section>
            )}

            {filteredRecent.length === 0 && filteredTrending.length === 0 && filteredActions.length === 0 && (
              <EmptyState
                icon={SearchX}
                title={`No matches for "${query}"`}
                description="Try a different name, category, or keyword."
                className="border-none py-6"
              />
            )}
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
