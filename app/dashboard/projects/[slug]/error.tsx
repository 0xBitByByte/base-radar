"use client";

import { AlertTriangle } from "lucide-react";

import { EmptyState } from "@/components/ui/EmptyState";

/**
 * The Project Profile route's error boundary (PR11 Part 12) — the first
 * framework-level `error.tsx` in this app (every other page-level failure,
 * e.g. `ExplorerErrorState`, is a manual try/catch branch instead). A
 * dedicated per-project page can fail in ways a manual try/catch in
 * `page.tsx` can't fully cover (a render error in a child component, not
 * just a data-fetch rejection), so this is real, additive coverage, not a
 * redundant abstraction. Same visual language as `ExplorerErrorState`.
 */
export default function ProjectProfileError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <EmptyState
        icon={AlertTriangle}
        title="Couldn't load this project"
        description="Something went wrong while loading this project's profile. Please try again."
        action={
          <button
            type="button"
            onClick={reset}
            className="rounded-lg border border-radar-light-border px-3 py-1.5 text-xs font-medium text-radar-light-text outline-none transition-colors hover:bg-radar-light-surface focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:border-white/10 dark:text-radar-white dark:hover:bg-white/5"
          >
            Try again
          </button>
        }
      />
    </div>
  );
}
