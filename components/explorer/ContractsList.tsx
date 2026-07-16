import { CircleCheck, CircleHelp, ExternalLink } from "lucide-react";

import { ChainBadge } from "@/components/branding/ChainBadge";
import { formatLabel } from "@/components/explorer/format";
import { CopyButton } from "@/components/ui/CopyButton";
import { CHAIN_BRANDING } from "@/lib/branding/chains";
import { cn } from "@/lib/utils";
import type { ContractInfo, Contracts } from "@/lib/intelligence/types";

type ContractsListProps = {
  contracts: Contracts;
};

/** Most-significant contract type first — a token or primary contract matters more to a researcher than a secondary router/factory address. Ties keep the registry's own order. */
const TYPE_PRIORITY: Record<ContractInfo["type"], number> = {
  token: 0,
  governance: 1,
  proxy: 2,
  vault: 3,
  staking: 4,
  router: 5,
  factory: 6,
  pool: 7,
  bridge: 8,
  other: 9,
};

function sortedContracts(items: ContractInfo[]): ContractInfo[] {
  return [...items].sort((a, b) => TYPE_PRIORITY[a.type] - TYPE_PRIORITY[b.type]);
}

/**
 * The contract-rows list — extracted from `QuickViewMetrics.tsx` (PR11) so
 * the Project Profile page can reuse the exact same markup instead of a
 * second, parallel implementation. `verified` is `boolean | null` — `null`
 * means unknown, never a definite non-match, so it must read "Unknown," not
 * "Not Verified" (docs/explorer/05 §14). PR12 adds a copy-address button and
 * a real explorer link (from `CHAIN_BRANDING`, the same registry
 * `getExplorerLink` reads) and sorts token/governance contracts first.
 */
export function ContractsList({ contracts }: ContractsListProps) {
  if (contracts.count === 0) {
    return <p className="text-xs text-radar-light-muted dark:text-radar-muted">No contracts listed for this project.</p>;
  }

  return (
    <ul className="flex flex-col gap-2">
      {sortedContracts(contracts.items).map((contract) => {
        const explorerUrl = CHAIN_BRANDING[contract.chain]?.explorerUrl;
        const explorerHref = explorerUrl ? `${explorerUrl}/address/${contract.address}` : null;

        return (
          <li
            key={`${contract.chain}-${contract.address}`}
            className="flex items-center justify-between gap-3 rounded-xl border border-radar-light-border bg-radar-light-surface p-3 dark:border-white/10 dark:bg-white/[0.02]"
          >
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="truncate text-xs font-medium text-radar-light-text dark:text-radar-white">
                  {contract.label ?? formatLabel(contract.type)}
                </span>
                <span className="shrink-0 rounded-md bg-radar-light-surface px-1.5 py-0.5 text-[10px] font-medium text-radar-light-muted dark:bg-white/5 dark:text-radar-muted">
                  {formatLabel(contract.type)}
                </span>
                <ChainBadge chain={contract.chain} size="sm" className="shrink-0" />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="truncate text-[11px] text-radar-light-muted dark:text-radar-muted">{contract.address}</span>
                <CopyButton value={contract.address} label="contract address" />
                {explorerHref && (
                  <a
                    href={explorerHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`View ${contract.label ?? formatLabel(contract.type)} on block explorer`}
                    className="shrink-0 text-radar-light-muted/70 outline-none transition-colors hover:text-radar-light-muted focus-visible:text-radar-light-muted dark:text-radar-muted/60 dark:hover:text-radar-muted dark:focus-visible:text-radar-muted"
                  >
                    <ExternalLink className="size-3" aria-hidden="true" />
                  </a>
                )}
              </div>
              {contract.type === "proxy" && (
                <p className="text-[10.5px] text-radar-light-muted dark:text-radar-muted">
                  Proxy contract — the registry doesn&apos;t track a separate implementation address; check the explorer link for the current implementation.
                </p>
              )}
            </div>
            <span
              className={cn(
                "flex shrink-0 items-center gap-1 text-xs font-medium",
                contract.verified === true ? "text-radar-success" : "text-radar-light-muted dark:text-radar-muted"
              )}
            >
              {contract.verified === true ? (
                <CircleCheck className="size-3.5" aria-hidden="true" />
              ) : (
                <CircleHelp className="size-3.5" aria-hidden="true" />
              )}
              {contract.verified === true ? "Verified" : "Unknown"}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
