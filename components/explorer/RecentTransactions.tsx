import { ArrowRightLeft, ExternalLink } from "lucide-react";

import { formatCompactNumber, formatRelativeTime } from "@/lib/data/format";
import type { TokenTransfer } from "@/lib/providers/blockscout/service";

type RecentTransactionsProps = {
  transfers: TokenTransfer[] | null;
  tokenSymbol: string | null;
  /** e.g. `https://basescan.org` — `null` when the primary chain has no known explorer. */
  explorerUrl: string | null;
  /** Why `transfers` is `null` (no token contract configured, provider error, etc.) — always shown instead of a blank state. */
  unavailableReason: string;
};

function truncate(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

/**
 * PR12.1 Req 5.5 — real recent on-chain transfers, reusing Blockscout's
 * already-implemented `getTokenTransfers` (previously only powering
 * whale-detection). Only rendered for projects with a token contract
 * configured on their primary chain; `transfers === null` always renders an
 * honest explanation instead of a blank list.
 */
export function RecentTransactions({ transfers, tokenSymbol, explorerUrl, unavailableReason }: RecentTransactionsProps) {
  if (!transfers || transfers.length === 0) {
    return (
      <p className="flex items-center gap-1.5 text-xs text-radar-light-muted dark:text-radar-muted">
        <ArrowRightLeft className="size-3.5 shrink-0" aria-hidden="true" />
        {transfers === null ? unavailableReason : `No recent ${tokenSymbol ?? "token"} transfers were found.`}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <p className="flex items-center gap-1.5 text-[10.5px] font-medium tracking-wide text-radar-light-muted uppercase dark:text-radar-muted">
        <ArrowRightLeft className="size-3.5 shrink-0" aria-hidden="true" />
        Recent {tokenSymbol ?? "Token"} Transfers
      </p>
      <ul className="flex flex-col gap-1.5">
        {transfers.slice(0, 5).map((transfer) => (
          <li
            key={transfer.txHash}
            className="flex items-center justify-between gap-3 rounded-xl border border-radar-light-border bg-radar-light-surface p-3 text-xs dark:border-white/10 dark:bg-white/[0.02]"
          >
            <span className="min-w-0 truncate text-radar-light-text dark:text-radar-white">
              {truncate(transfer.from)} → {truncate(transfer.to)}
            </span>
            <span className="flex shrink-0 items-center gap-2">
              <span className="font-medium tabular-nums text-radar-light-text dark:text-radar-white">
                {formatCompactNumber(transfer.amount)} {tokenSymbol ?? ""}
              </span>
              <span className="text-radar-light-muted dark:text-radar-muted">
                {transfer.timestamp ? formatRelativeTime(transfer.timestamp) : "—"}
              </span>
              {explorerUrl && (
                <a
                  href={`${explorerUrl}/tx/${transfer.txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="View transaction on block explorer"
                  className="text-radar-light-muted/70 outline-none transition-colors hover:text-radar-light-muted focus-visible:text-radar-light-muted dark:text-radar-muted/60 dark:hover:text-radar-muted dark:focus-visible:text-radar-muted"
                >
                  <ExternalLink className="size-3" aria-hidden="true" />
                </a>
              )}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
