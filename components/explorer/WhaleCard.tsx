import { ExternalLink } from "lucide-react";

import { CopyButton } from "@/components/ui/CopyButton";
import { GlowBadge } from "@/components/ui/GlowBadge";
import { RelativeTime } from "@/components/shared/RelativeTime";
import { formatCompactCurrency, shortenAddress } from "@/lib/data/format";
import type { WhaleEvent } from "@/lib/whale";

type WhaleCardProps = {
  event: WhaleEvent;
  /** e.g. `https://basescan.org` — every whale event is Base-only, so this is resolved once by the page. `null` when unavailable. */
  explorerUrl: string | null;
};

/**
 * PR-084.05 — one bordered card per detected transfer, same visual family
 * as `PairCard.tsx`/`ContractCard.tsx`/`GovernanceCard.tsx`
 * (`rounded-xl border ... p-3`). Shows the real "To Contract"/"To Wallet"
 * distinction from `event.toIsContract` — a Blockscout fact about address
 * type, never presented as a buy/sell or exchange claim. The confidence
 * score is shown plainly, not hidden — a transparent number, not a black box.
 */
export function WhaleCard({ event, explorerUrl }: WhaleCardProps) {
  const isWhaleAlert = event.classification === "whale-alert";

  return (
    <li className="flex flex-col gap-2 rounded-xl border border-radar-light-border bg-radar-light-surface p-3 dark:border-white/10 dark:bg-white/[0.02]">
      <div className="flex items-start justify-between gap-3">
        <span className="text-sm font-semibold tabular-nums text-radar-light-text dark:text-radar-white">
          {formatCompactCurrency(event.usdValue)}
        </span>
        <GlowBadge color={isWhaleAlert ? "warning" : "accent"} className="shrink-0">
          {isWhaleAlert ? "Whale Alert" : "Large Transfer"}
        </GlowBadge>
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-radar-light-muted dark:text-radar-muted">
        <span>{event.tokenSymbol}</span>
        <span>
          <RelativeTime iso={event.timestamp} />
        </span>
        <span>Confidence {event.confidence}</span>
      </div>

      <div className="flex items-center gap-1.5 text-[11px] text-radar-light-muted dark:text-radar-muted">
        <span>From {shortenAddress(event.fromAddress)}</span>
        <CopyButton value={event.fromAddress} label="sender address" />
      </div>

      <div className="flex items-center gap-1.5 text-[11px] text-radar-light-muted dark:text-radar-muted">
        <span>
          To {shortenAddress(event.toAddress)}
          {event.toIsContract ? ` (Contract${event.toContractName ? `: ${event.toContractName}` : ""})` : " (Wallet)"}
        </span>
        <CopyButton value={event.toAddress} label="recipient address" />
      </div>

      {event.txHash && explorerUrl && (
        <a
          href={`${explorerUrl}/tx/${event.txHash}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex w-fit items-center gap-1 border-t border-radar-light-border pt-2 text-[11px] font-medium text-radar-light-muted outline-none transition-colors hover:text-radar-light-text focus-visible:text-radar-light-text dark:border-white/10 dark:text-radar-muted dark:hover:text-radar-white dark:focus-visible:text-radar-white"
        >
          View Transaction
          <ExternalLink className="size-3" aria-hidden="true" />
        </a>
      )}
    </li>
  );
}
