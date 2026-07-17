"use client";

import { use } from "react";

import { formatNumber } from "@/lib/data/format";
import type { ContributorCount } from "@/lib/providers/github/service";
import type { ProviderResult } from "@/lib/providers/common/types";

/**
 * Unwraps the contributor-count promise `ProfileCommunityMetrics` hands
 * down without awaiting it itself (PR13.7 Goal 2/6) — `use()` suspends only
 * this one tile behind its own `<Suspense>`, same pattern as
 * `ProfileCommitsAsync`. Renders "100+" (never a fabricated exact number)
 * when the real page-1 response hit GitHub's 100-item cap.
 */
export function ProfileContributorsAsync({ resultPromise }: { resultPromise: Promise<ProviderResult<ContributorCount> | null> }) {
  const result = use(resultPromise);
  const contributors = result?.ok ? result.data : null;

  if (!contributors) {
    return (
      <>
        <span className="text-sm font-bold text-radar-light-muted dark:text-radar-muted">Not Currently Available</span>
        <span className="text-[10.5px] text-radar-light-muted dark:text-radar-muted">
          GitHub returned no contributor data for this repository just now.
        </span>
      </>
    );
  }

  return (
    <span className="text-sm font-bold tabular-nums text-radar-light-text dark:text-radar-white">
      {contributors.hitCap ? `${formatNumber(contributors.count)}+` : formatNumber(contributors.count)}
    </span>
  );
}
