"use client";

import { Sparkles } from "lucide-react";

import { useSmartCollections } from "@/lib/hooks/useSmartCollections";
import type { SmartCollectionResult } from "@/lib/smart-collections/types";
import { SmartCollectionCard } from "@/components/collections/SmartCollectionCard";

/**
 * PR-090.04 (Smart Collections) — the index. `serverResults` are the 7
 * already-evaluated, server-computed collections (`app/dashboard/collections/page.tsx`
 * awaited `getLiveProjects()`/`getRawWhaleEvents()` once); `useSmartCollections`
 * adds the 3 client-only ones and returns all ten in a fixed, stable order —
 * never a second server fetch, never a re-derivation of what's already real.
 */
export function SmartCollectionsIndexView({ serverResults }: { serverResults: SmartCollectionResult[] }) {
  const results = useSmartCollections(serverResults);

  return (
    <div className="flex flex-col gap-6">
      <header>
        <div className="flex items-center gap-2">
          <Sparkles className="size-5 text-radar-primary dark:text-radar-accent" aria-hidden="true" />
          <h1 className="text-2xl font-semibold text-radar-light-text dark:text-radar-white">Smart Collections</h1>
        </div>
        <p className="mt-1 max-w-2xl text-sm text-radar-light-muted dark:text-radar-muted">
          Discover projects through Base Radar&apos;s own intelligence, grouped by what actually matters — AI Grade, Risk, Confidence, real on-chain and GitHub activity. Smart Collections are evaluated from the latest available Base Radar
          intelligence, not continuously monitored.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3" role="list" aria-label="Smart Collections">
        {results.map((result) => (
          <SmartCollectionCard key={result.id} result={result} />
        ))}
      </div>
    </div>
  );
}
