import { ArrowRightLeft, ExternalLink } from "lucide-react";

import { RelativeTime } from "@/components/shared/RelativeTime";
import { formatCompactNumber, formatNumber } from "@/lib/data/format";
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
      <div className="overflow-x-auto rounded-xl border border-radar-light-border dark:border-white/10">
        <table className="w-full min-w-[560px] border-collapse text-xs">
          <thead>
            <tr className="border-b border-radar-light-border bg-radar-light-surface text-[10px] font-medium tracking-wide text-radar-light-muted uppercase dark:border-white/10 dark:bg-white/[0.02] dark:text-radar-muted">
              <th scope="col" className="px-3 py-2 text-left font-medium">From</th>
              <th scope="col" className="px-3 py-2 text-left font-medium">To</th>
              <th scope="col" className="px-3 py-2 text-right font-medium">Block</th>
              <th scope="col" className="px-3 py-2 text-right font-medium">Amount</th>
              <th scope="col" className="px-3 py-2 text-right font-medium">Time</th>
              <th scope="col" className="px-3 py-2 text-right font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {transfers.slice(0, 5).map((transfer) => (
              <tr
                key={`${transfer.txHash}-${transfer.logIndex}`}
                className="border-b border-radar-light-border last:border-0 dark:border-white/10"
              >
                <td className="px-3 py-2 font-mono text-radar-light-text dark:text-radar-white" title={transfer.from}>
                  {truncate(transfer.from)}
                </td>
                <td className="px-3 py-2 font-mono text-radar-light-text dark:text-radar-white" title={transfer.to}>
                  {truncate(transfer.to)}
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-radar-light-muted dark:text-radar-muted">
                  {formatNumber(transfer.blockNumber)}
                </td>
                <td className="px-3 py-2 text-right font-medium tabular-nums text-radar-light-text dark:text-radar-white">
                  {formatCompactNumber(transfer.amount)} {tokenSymbol ?? ""}
                </td>
                <td className="px-3 py-2 text-right whitespace-nowrap text-radar-light-muted dark:text-radar-muted">
                  {transfer.timestamp ? <RelativeTime iso={transfer.timestamp} /> : "—"}
                </td>
                <td className="px-3 py-2 text-right">
                  <span className="inline-flex items-center gap-1 justify-end">
                    {/* Every transfer this endpoint returns already has a `blockNumber` — i.e. it's
                        mined and included in a block. There's no separate pending/failed state to
                        surface (Blockscout's transfers endpoint never returns those), so "Confirmed"
                        is a real derived fact about every row here, not a fabricated per-row value. */}
                    <span className="rounded-full bg-radar-success/10 px-1.5 py-0.5 text-[10px] font-medium text-radar-success dark:bg-radar-success/15">
                      Confirmed
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
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
