import { CircleCheck, CircleHelp, ExternalLink } from "lucide-react";

import { ChainBadge } from "@/components/branding/ChainBadge";
import { formatLabel } from "@/components/explorer/format";
import { CopyButton } from "@/components/ui/CopyButton";
import { CHAIN_BRANDING } from "@/lib/branding/chains";
import { cn } from "@/lib/utils";
import type { ContractInfo, Contracts } from "@/lib/intelligence/types";
import type { ContractDetail } from "@/lib/providers/blockscout/service";

type ContractsListProps = {
  contracts: Contracts;
  /**
   * PR13.7 Goal 10 — real, per-address Blockscout verification detail,
   * keyed by address. Empty/omitted while the extended fetch is still in
   * flight (`ProfileContractDetailsAsync`'s Suspense fallback) — every row
   * still renders correctly with just the registry-merge `verified` field
   * in that case, exactly as before this goal.
   */
  detailsByAddress?: Record<string, ContractDetail>;
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

/** Group heading per real `ContractInfo.type` — PR13.6 Goal 14's "security dashboard" grouping. Only the types this registry's schema actually has (`data/projects/enums.ts`'s `CONTRACT_TYPES`) — Treasury/Timelock/Multisig/Oracle aren't real fields here, so they're never invented as groups. */
const TYPE_GROUP_LABEL: Record<ContractInfo["type"], string> = {
  token: "Token",
  governance: "Governance",
  proxy: "Proxy",
  vault: "Vault",
  staking: "Staking",
  router: "Router",
  factory: "Factory",
  pool: "Pool",
  bridge: "Bridge",
  other: "Other",
};

function groupContracts(items: ContractInfo[]): { type: ContractInfo["type"]; items: ContractInfo[] }[] {
  const byType = new Map<ContractInfo["type"], ContractInfo[]>();
  for (const item of items) {
    if (!byType.has(item.type)) byType.set(item.type, []);
    byType.get(item.type)!.push(item);
  }
  return [...byType.entries()]
    .sort(([a], [b]) => TYPE_PRIORITY[a] - TYPE_PRIORITY[b])
    .map(([type, groupItems]) => ({ type, items: groupItems }));
}

function shortenAddress(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

/**
 * The contract-rows list — extracted from `QuickViewMetrics.tsx` (PR11) so
 * the Project Profile page can reuse the exact same markup instead of a
 * second, parallel implementation. `verified` is `boolean | null` — `null`
 * means unknown, never a definite non-match, so it must read "Not Verified
 * Yet," not "Not Verified" (docs/explorer/05 §14). PR12 adds a copy-address
 * button and a real explorer link (from `CHAIN_BRANDING`, the same registry
 * `getExplorerLink` reads).
 *
 * PR13.6 Goal 14 — grouped by each contract's own real `type` (Token,
 * Governance, Proxy, Vault, Staking, Router, Factory, Pool, Bridge, Other —
 * the exact `CONTRACT_TYPES` enum, never a fabricated category like
 * "Treasury"/"Timelock"/"Multisig"/"Oracle" this registry's schema doesn't
 * track) instead of one flat sorted list.
 *
 * PR13.7 Goal 10 — when `detailsByAddress` has a real per-address Blockscout
 * lookup for a contract, that becomes the row's ground truth for Verified
 * (a direct per-address check, more reliable than the registry-merge
 * `contract.verified`, which only ever matched Blockscout's "most recently
 * verified contract on Base" — almost always a miss) and adds real
 * Compiler/License/Optimization badges plus Creator/Creation Tx links.
 * Owner and Creation Date/Block are still omitted — confirmed absent from
 * both Blockscout endpoints this uses, not fabricated.
 */
export function ContractsList({ contracts, detailsByAddress = {} }: ContractsListProps) {
  if (contracts.count === 0) {
    return <p className="text-xs text-radar-light-muted dark:text-radar-muted">No contracts listed for this project.</p>;
  }

  const groups = groupContracts(contracts.items);

  return (
    <div className="flex flex-col gap-4">
      {groups.map((group) => (
        <div key={group.type} className="flex flex-col gap-2">
          {groups.length > 1 && (
            <span className="text-[10.5px] font-semibold tracking-wide text-radar-light-muted uppercase dark:text-radar-muted">
              {TYPE_GROUP_LABEL[group.type]} {group.items.length > 1 ? `(${group.items.length})` : ""}
            </span>
          )}
          <ul className="flex flex-col gap-2">
            {group.items.map((contract) => {
              const explorerUrl = CHAIN_BRANDING[contract.chain]?.explorerUrl;
              const explorerHref = explorerUrl ? `${explorerUrl}/address/${contract.address}` : null;
              const detail = detailsByAddress[contract.address];
              const verified = detail ? detail.verified : contract.verified === true;

              return (
                <li
                  key={`${contract.chain}-${contract.address}`}
                  className="flex flex-col gap-2 rounded-xl border border-radar-light-border bg-radar-light-surface p-3 dark:border-white/10 dark:bg-white/[0.02]"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="truncate text-xs font-medium text-radar-light-text dark:text-radar-white">
                          {contract.label ?? formatLabel(contract.type)}
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
                      {contract.type === "proxy" && !detail?.proxyType && (
                        <p className="text-[10.5px] text-radar-light-muted dark:text-radar-muted">
                          Proxy contract — the registry doesn&apos;t track a separate implementation address; check the explorer link for the current implementation.
                        </p>
                      )}
                    </div>
                    <span
                      className={cn(
                        "flex shrink-0 items-center gap-1 text-xs font-medium",
                        verified ? "text-radar-success" : "text-radar-light-muted dark:text-radar-muted"
                      )}
                    >
                      {verified ? <CircleCheck className="size-3.5" aria-hidden="true" /> : <CircleHelp className="size-3.5" aria-hidden="true" />}
                      {verified ? "Verified" : "Not Verified Yet"}
                    </span>
                  </div>

                  {detail?.verified && (
                    <div className="flex flex-wrap items-center gap-1.5 border-t border-radar-light-border pt-2 text-[10.5px] text-radar-light-muted dark:border-white/10 dark:text-radar-muted">
                      {detail.compilerVersion && (
                        <span className="rounded-md bg-radar-light-border/60 px-1.5 py-0.5 dark:bg-white/5">Compiler {detail.compilerVersion}</span>
                      )}
                      {detail.optimizationEnabled !== null && (
                        <span className="rounded-md bg-radar-light-border/60 px-1.5 py-0.5 dark:bg-white/5">
                          Optimization {detail.optimizationEnabled ? "On" : "Off"}
                        </span>
                      )}
                      {detail.licenseType && <span className="rounded-md bg-radar-light-border/60 px-1.5 py-0.5 dark:bg-white/5">{detail.licenseType} license</span>}
                      {detail.proxyType && (
                        <span className="rounded-md bg-radar-light-border/60 px-1.5 py-0.5 dark:bg-white/5">
                          Proxy ({detail.proxyType}){detail.implementationAddress && ` → ${shortenAddress(detail.implementationAddress)}`}
                        </span>
                      )}
                      {detail.creatorAddress && (
                        <span className="rounded-md bg-radar-light-border/60 px-1.5 py-0.5 dark:bg-white/5">Creator {shortenAddress(detail.creatorAddress)}</span>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}
