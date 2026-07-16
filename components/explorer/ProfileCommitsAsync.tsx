"use client";

import { use } from "react";

import { MetricItem } from "@/components/explorer/MetricItem";
import { formatNumber } from "@/lib/data/format";
import type { CommitActivity } from "@/lib/providers/github/service";
import type { ProviderResult } from "@/lib/providers/common/types";

/**
 * Unwraps the commit-activity promise `ProfileMetrics` hands down without
 * awaiting it itself — `use()` suspends only this one tile (Engineering
 * Health's "Commits (7d)") behind its own `<Suspense>`, same pattern as
 * `LiveStatusBarAsync`. GitHub's commit-activity endpoint is the one
 * genuinely slow provider call in this codebase (it's computed
 * asynchronously server-side by GitHub itself) — everything else in
 * Engineering Health (Stars/Forks/Open Issues/release/repo metadata) comes
 * from the fast `getRepoStats` call and renders on first paint, unaffected.
 * `null`/failed resolves to the exact same "unavailable" tile the page
 * already rendered whenever GitHub hadn't finished computing stats yet.
 */
export function ProfileCommitsAsync({ resultPromise }: { resultPromise: Promise<ProviderResult<CommitActivity> | null> }) {
  const result = use(resultPromise);
  const commitsLast7d = result?.ok ? result.data.commitsLast7d : null;

  return (
    <MetricItem
      bare
      emphasize
      label="Commits (7d)"
      value={commitsLast7d !== null ? formatNumber(commitsLast7d) : undefined}
      unavailable={commitsLast7d === null}
    />
  );
}
