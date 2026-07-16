"use client";

import { use } from "react";

import { MetricItem } from "@/components/explorer/MetricItem";
import { changePctOverDays } from "@/lib/intelligence/merge";
import type { SparklinePoint } from "@/lib/data/types";
import type { ProviderResult } from "@/lib/providers/common/types";

/**
 * Unwraps the TVL-history promise `ProfileMetrics` hands down without
 * awaiting it itself — renders the "TVL 7d Change"/"TVL 30d Change" tiles
 * (the only two fields in the TVL metric group that need the full history
 * series, not just DefiLlama's current-snapshot bulk data) behind their own
 * `<Suspense>`. Applies the exact same `changePctOverDays` the Intelligence
 * Engine's own `mergeTvl` uses — a reused pure function, not a re-derived
 * calculation — to whatever history streams in.
 */
export function ProfileTvlChangeTilesAsync({ resultPromise }: { resultPromise: Promise<ProviderResult<SparklinePoint[]> | null> }) {
  const result = use(resultPromise);
  const history = result?.ok ? result.data : null;

  return (
    <>
      <MetricItem bare emphasize label="TVL 7d Change" changeValue={changePctOverDays(history, 7)} />
      <MetricItem bare emphasize label="TVL 30d Change" changeValue={changePctOverDays(history, 30)} />
    </>
  );
}
