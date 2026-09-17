"use client";

/**
 * PR-091.03/PR-091.05 (Intelligence Compare, Contract Compare) — fetches
 * `/api/projects/[slug]/compare-detail` for one currently-compared project.
 * Uses `@tanstack/react-query` (already mounted app-wide by
 * `WalletProvider`'s `QueryClientProvider` — this is its first use outside
 * wallet/wagmi) purely for its request de-dup/caching, not for any new
 * client-state pattern: the Compare *selection* itself stays exactly where
 * it already lives, `useCompare()`'s `useSyncExternalStore` store.
 */

import { useQuery } from "@tanstack/react-query";

import type { CompareProjectDetail } from "@/lib/compare/detail";

async function fetchCompareProjectDetail(slug: string): Promise<CompareProjectDetail> {
  const response = await fetch(`/api/projects/${encodeURIComponent(slug)}/compare-detail`);
  if (!response.ok) throw new Error(`Failed to load intelligence detail for "${slug}" (${response.status}).`);
  return (await response.json()) as CompareProjectDetail;
}

export type UseCompareProjectDetailResult = {
  data: CompareProjectDetail | undefined;
  isLoading: boolean;
  isError: boolean;
};

/** `slug: null` (a discovery-only project with no registry route) skips the fetch entirely — never sent to a route that can only resolve a real registry id/slug. */
export function useCompareProjectDetail(slug: string | null): UseCompareProjectDetailResult {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["compare-project-detail", slug],
    queryFn: () => fetchCompareProjectDetail(slug as string),
    enabled: slug !== null,
    staleTime: 5 * 60 * 1000,
  });

  return { data, isLoading: slug !== null && isLoading, isError };
}
