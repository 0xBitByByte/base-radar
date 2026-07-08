"use client";

import { useRouter } from "next/navigation";
import { AlertTriangle } from "lucide-react";

import { EmptyState } from "@/components/ui/EmptyState";

/**
 * The one genuine page-level failure state — docs/explorer/03 §19. Every
 * per-project data gap is already an ordinary "unavailable" value inside
 * `ProjectIntelligence` itself; this only renders if building intelligence
 * for the registry failed outright.
 */
export function ExplorerErrorState() {
  const router = useRouter();

  return (
    <EmptyState
      icon={AlertTriangle}
      title="Couldn't load the Project Registry"
      description="Something went wrong while building intelligence for the registry. Please try again."
      action={
        <button
          type="button"
          onClick={() => router.refresh()}
          className="rounded-lg border border-radar-light-border px-3 py-1.5 text-xs font-medium text-radar-light-text outline-none transition-colors hover:bg-radar-light-surface focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:border-white/10 dark:text-radar-white dark:hover:bg-white/5"
        >
          Try again
        </button>
      }
    />
  );
}
