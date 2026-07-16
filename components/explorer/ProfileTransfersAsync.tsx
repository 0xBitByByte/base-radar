"use client";

import { use } from "react";

import { RecentTransactions } from "@/components/explorer/RecentTransactions";
import type { TokenTransfer } from "@/lib/providers/blockscout/service";
import type { ProviderResult } from "@/lib/providers/common/types";

/**
 * Unwraps the token-transfers promise `ProfileMetrics` hands down without
 * awaiting it itself — Blockscout's transfer-history endpoint has been
 * observed taking 5-6s, and (unlike the metrics above it in the Network
 * section) feeds nothing else on first paint, so it's a clean candidate to
 * stream independently behind its own `<Suspense>` rather than block the
 * rest of the page. `hasTokenContract`/`isPrimaryChainBase` are static —
 * known synchronously from the fast intelligence record — only the actual
 * fetch outcome is asynchronous, so the "why unavailable" message logic is
 * reproduced exactly as it was when this was awaited inline.
 */
export function ProfileTransfersAsync({
  resultPromise,
  hasTokenContract,
  isPrimaryChainBase,
  tokenSymbol,
  explorerUrl,
}: {
  resultPromise: Promise<ProviderResult<TokenTransfer[]> | null>;
  hasTokenContract: boolean;
  isPrimaryChainBase: boolean;
  tokenSymbol: string | null;
  explorerUrl: string | null;
}) {
  const result = use(resultPromise);
  const transfers: TokenTransfer[] | null = result?.ok ? result.data : null;
  const unavailableReason = !hasTokenContract
    ? "No token contract is configured for this project on its primary chain."
    : !isPrimaryChainBase
      ? "Recent transfers are only available for projects with a token contract on Base."
      : result && !result.ok
        ? result.error.message
        : "No recent transfer data was returned by Blockscout.";

  return (
    <RecentTransactions transfers={transfers} tokenSymbol={tokenSymbol} explorerUrl={explorerUrl} unavailableReason={unavailableReason} />
  );
}
