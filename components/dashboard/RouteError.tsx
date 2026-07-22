"use client";

import { AlertTriangle } from "lucide-react";
import Link from "next/link";

import { EmptyState } from "@/components/ui/EmptyState";

type RouteErrorProps = {
  reset: () => void;
};

/**
 * The shared `error.tsx` boundary for every `/dashboard/*` route that
 * doesn't define a more specific one (Next.js resolves the nearest
 * ancestor `error.tsx`, so this single component covers all of them).
 * Same visual language as `ProjectProfileError` — a dedicated failure
 * message, never the raw error — plus a way back to the Dashboard, since
 * unlike a single project profile, a general route failure shouldn't
 * assume "try again" is always the right next step.
 */
export function RouteError({ reset }: RouteErrorProps) {
  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <EmptyState
        icon={AlertTriangle}
        title="Something went wrong"
        description="This page ran into a problem loading. You can try again, or head back to your Dashboard."
        action={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={reset}
              className="rounded-lg border border-radar-light-border px-3 py-1.5 text-xs font-medium text-radar-light-text outline-none transition-colors hover:bg-radar-light-surface focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:border-white/10 dark:text-radar-white dark:hover:bg-white/5"
            >
              Try again
            </button>
            <Link
              href="/dashboard"
              className="rounded-lg border border-radar-light-border px-3 py-1.5 text-xs font-medium text-radar-light-text outline-none transition-colors hover:bg-radar-light-surface focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:border-white/10 dark:text-radar-white dark:hover:bg-white/5"
            >
              Back to Dashboard
            </Link>
          </div>
        }
      />
    </div>
  );
}
