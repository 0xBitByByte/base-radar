import { ExternalLink, MessageSquare } from "lucide-react";

import { cleanProposalDescription, isOutcomeUncertain } from "@/components/explorer/governanceIntelligenceHelpers";
import { CopyButton } from "@/components/ui/CopyButton";
import { GlowBadge, type GlowBadgeColor } from "@/components/ui/GlowBadge";
import { formatDate, shortenAddress } from "@/lib/data/format";
import type { GovernanceEvent, GovernanceStatus } from "@/lib/governance";

type GovernanceCardProps = {
  event: GovernanceEvent;
};

const GOVERNANCE_STATUS_COLOR: Record<GovernanceStatus, GlowBadgeColor> = {
  active: "accent",
  passed: "success",
  failed: "danger",
  pending: "muted",
};

/**
 * PR-084.04 — one bordered card per proposal, same visual family as
 * `PairCard.tsx`/`ContractCard.tsx` (`rounded-xl border ... p-3`). A new,
 * independent component, not a refactor of `GovernanceList.tsx`'s
 * `ProposalRow` — same precedent `ContractCard.tsx` set relative to
 * `ContractsList.tsx`. Adds the "Base Radar: Outcome Uncertain" flag using
 * the same attribution convention every prior Explorer round established.
 */
export function GovernanceCard({ event }: GovernanceCardProps) {
  const description = event.description ? cleanProposalDescription(event.description) : null;
  const uncertain = isOutcomeUncertain(event);

  return (
    <li className="flex flex-col gap-2 rounded-xl border border-radar-light-border bg-radar-light-surface p-3 dark:border-white/10 dark:bg-white/[0.02]">
      <div className="flex items-start justify-between gap-3">
        <a
          href={event.url}
          target="_blank"
          rel="noreferrer"
          className="min-w-0 flex-1 truncate text-xs font-medium text-radar-light-text hover:underline dark:text-radar-white"
        >
          {event.title}
        </a>
        <GlowBadge color={GOVERNANCE_STATUS_COLOR[event.status]} className="shrink-0 capitalize">
          {event.status}
        </GlowBadge>
      </div>

      {description && <p className="line-clamp-2 text-[11px] text-radar-light-muted dark:text-radar-muted">{description}</p>}

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-radar-light-muted dark:text-radar-muted">
        <span>Started {formatDate(event.start)}</span>
        <span>Ended {formatDate(event.end)}</span>
        {event.voterCount !== null && <span>{event.voterCount.toLocaleString()} voters</span>}
        {event.participation !== null && <span>{event.participation.toFixed(0)}% participation</span>}
      </div>

      {event.proposerAddress && (
        <div className="flex items-center gap-1.5 text-[11px] text-radar-light-muted dark:text-radar-muted">
          <span>Proposer {shortenAddress(event.proposerAddress)}</span>
          <CopyButton value={event.proposerAddress} label="proposer address" />
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 border-t border-radar-light-border pt-2 text-[11px] font-medium dark:border-white/10">
        <a
          href={event.url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-radar-light-muted outline-none transition-colors hover:text-radar-light-text focus-visible:text-radar-light-text dark:text-radar-muted dark:hover:text-radar-white dark:focus-visible:text-radar-white"
        >
          View Proposal
          <ExternalLink className="size-3" aria-hidden="true" />
        </a>
        {event.discussionUrl && (
          <a
            href={event.discussionUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-radar-light-muted outline-none transition-colors hover:text-radar-light-text focus-visible:text-radar-light-text dark:text-radar-muted dark:hover:text-radar-white dark:focus-visible:text-radar-white"
          >
            View Discussion
            <MessageSquare className="size-3" aria-hidden="true" />
          </a>
        )}
      </div>

      {uncertain && (
        <div className="flex flex-wrap items-center gap-1.5 border-t border-radar-light-border pt-2 dark:border-white/10">
          <GlowBadge color="warning" className="px-2 py-0.5 text-[10px]">
            Base Radar: Outcome Uncertain (No Quorum Set)
          </GlowBadge>
        </div>
      )}
    </li>
  );
}
