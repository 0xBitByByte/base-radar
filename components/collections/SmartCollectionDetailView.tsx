"use client";

import Link from "next/link";
import { AlertTriangle, ArrowLeft, Sparkles } from "lucide-react";

import { useSmartCollections } from "@/lib/hooks/useSmartCollections";
import type { SmartCollectionId, SmartCollectionResult } from "@/lib/smart-collections/types";
import { SmartCollectionMatchRow } from "@/components/collections/SmartCollectionMatchRow";
import { GLASS_CARD_SURFACE } from "@/components/ui/glassStyles";
import { EmptyState } from "@/components/ui/EmptyState";
import { RelativeTime } from "@/components/shared/RelativeTime";
import { cn } from "@/lib/utils";

/**
 * PR-090.04 (Smart Collections) — one expanded collection. `collectionId`
 * is already validated by the route (`app/dashboard/collections/[id]/page.tsx`
 * calls `notFound()` for anything outside `SMART_COLLECTION_IDS`), so this
 * component can assume the id is real; `useSmartCollections` still returns
 * all ten, and this picks the one the route asked for.
 */
export function SmartCollectionDetailView({ collectionId, serverResults }: { collectionId: SmartCollectionId; serverResults: SmartCollectionResult[] }) {
  const results = useSmartCollections(serverResults);
  const result = results.find((r) => r.id === collectionId) ?? serverResults.find((r) => r.id === collectionId);
  if (!result) return null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <Link
          href="/dashboard/collections"
          className="flex w-fit items-center gap-1.5 text-xs font-medium text-radar-light-muted outline-none transition-colors hover:text-radar-light-text focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:text-radar-muted dark:hover:text-radar-white"
        >
          <ArrowLeft className="size-3.5" aria-hidden="true" />
          All Smart Collections
        </Link>

        <div className="flex flex-wrap items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-radar-primary/10 text-radar-primary dark:bg-radar-accent/10 dark:text-radar-accent">
            <Sparkles className="size-5" aria-hidden="true" />
          </span>
          <div className="flex min-w-0 flex-col gap-0.5">
            <h1 className="text-2xl font-semibold tracking-tight text-radar-light-text dark:text-radar-white">{result.name}</h1>
            <p className="text-sm text-radar-light-muted dark:text-radar-muted">{result.description}</p>
          </div>
        </div>

        {result.status === "ready" && (
          <p className="text-xs text-radar-light-muted dark:text-radar-muted">
            {result.matches.length} project{result.matches.length === 1 ? "" : "s"} match right now
            {result.averageConfidence !== null && ` · ${result.averageConfidence}% average confidence`} · Evaluated <RelativeTime iso={result.lastEvaluatedAt} />
          </p>
        )}
      </div>

      <section className={cn("flex flex-col gap-4 p-6", GLASS_CARD_SURFACE)}>
        {result.status === "checking" && (
          <div className="flex flex-col gap-2" role="status" aria-label={`Checking ${result.name}`}>
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-20 animate-pulse rounded-xl bg-radar-light-surface dark:bg-white/5" />
            ))}
          </div>
        )}

        {result.status === "unavailable" && (
          <EmptyState icon={AlertTriangle} title="Can't evaluate right now" description="This collection needs the Alert Engine's real-time data, which didn't load this visit. Try again on your next visit — Base Radar never shows outdated intelligence as current." />
        )}

        {result.status === "ready" && result.matches.length === 0 && <EmptyState icon={Sparkles} title="No projects match right now" description="This collection is evaluated fresh from the latest available intelligence — nothing currently qualifies." />}

        {result.status === "ready" && result.matches.length > 0 && (
          <ul className="grid grid-cols-1 gap-3 lg:grid-cols-2" aria-label={`${result.name} matches`}>
            {result.matches.map((match) => (
              <SmartCollectionMatchRow key={match.projectId} match={match} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
