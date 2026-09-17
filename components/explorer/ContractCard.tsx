import { CircleCheck, CircleHelp, ExternalLink } from "lucide-react";

import { ChainBadge } from "@/components/branding/ChainBadge";
import { formatLabel } from "@/components/explorer/format";
import { getContractVerificationStatus, isUpgradeable, needsAttention, type ContractCard as ContractCardData } from "@/components/explorer/contractIntelligenceHelpers";
import { CopyButton } from "@/components/ui/CopyButton";
import { GlowBadge } from "@/components/ui/GlowBadge";
import { CHAIN_BRANDING } from "@/lib/branding/chains";
import { shortenAddress } from "@/lib/data/format";

type ContractCardProps = {
  card: ContractCardData;
};

/**
 * PR-084.03 — one bordered card per contract, mirroring `ContractsList.tsx`'s
 * existing visual recipe (`rounded-xl border ... p-3`, same badge-row
 * pattern for compiler/optimization/license/proxy/creator/creation-tx) —
 * a new, independent component, not a refactor of `ContractsList.tsx`
 * (same precedent as `PairCard.tsx` not touching `ProfileTokenAndPrice.tsx`).
 * Adds one thing `ContractsList.tsx` doesn't have: explicit "Base Radar:"
 * Upgradeable/Attention Required labels, using the same attribution
 * convention PR-084.01 established for Pool Classification — never
 * presented as if Blockscout said it.
 */
export function ContractCard({ card }: ContractCardProps) {
  const explorerUrl = CHAIN_BRANDING[card.chain]?.explorerUrl;
  const explorerHref = explorerUrl ? `${explorerUrl}/address/${card.address}` : null;
  const status = getContractVerificationStatus(card);
  const upgradeable = isUpgradeable(card);
  const attention = needsAttention(card);

  return (
    // PR-084.07 integration pass — the same shared hover formula every other
    // Market Intelligence card (`PairCard`, `SourceCard`, `ScorecardCardView`,
    // `TrustTileView`) already uses; this card and `ContractsList.tsx`'s own
    // row were the two confirmed to be missing it.
    <li className="group flex flex-col gap-2 rounded-xl border border-radar-light-border bg-radar-light-surface p-3 transition-[transform,box-shadow,border-color,background-color] duration-300 ease-out hover:-translate-y-0.5 hover:border-radar-primary/30 hover:bg-radar-light-card hover:shadow-[0_8px_24px_-12px_rgba(var(--color-radar-primary-rgb),0.18)] motion-reduce:hover:translate-y-0 dark:border-white/10 dark:bg-white/[0.02] dark:hover:border-radar-border-hover dark:hover:bg-white/[0.04]">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="truncate text-xs font-medium text-radar-light-text dark:text-radar-white">{card.label ?? formatLabel(card.type)}</span>
            <ChainBadge chain={card.chain} size="sm" className="shrink-0" />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="truncate text-[11px] text-radar-light-muted dark:text-radar-muted">{card.address}</span>
            <CopyButton value={card.address} label="contract address" />
            {explorerHref && (
              <a
                href={explorerHref}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`View ${card.label ?? formatLabel(card.type)} on block explorer`}
                className="shrink-0 text-radar-light-muted/70 outline-none transition-colors hover:text-radar-light-muted focus-visible:text-radar-light-muted dark:text-radar-muted/60 dark:hover:text-radar-muted dark:focus-visible:text-radar-muted"
              >
                <ExternalLink className="size-3" aria-hidden="true" />
              </a>
            )}
          </div>
          {card.type === "proxy" && !card.detail?.proxyType && (
            <p className="text-[10.5px] text-radar-light-muted dark:text-radar-muted">
              Proxy contract — the registry doesn&apos;t track a separate implementation address; check the explorer link for the current implementation.
            </p>
          )}
        </div>
        {/* PR-084.07 integration pass — the primary Verified/Not Verified
            indicator now goes through the shared `GlowBadge` component
            (previously a raw `<span>`, the one status pill on this card
            that didn't), matching every other card's status pill on this
            page (`PairCard`, `GovernanceCard`, `WhaleCard`). The compiler/
            optimization/license/proxy/creator chips below stay plain tags —
            they're metadata, not a status verdict, so `GlowBadge` isn't the
            right fit for them. */}
        <GlowBadge color={status.label === "Verified" ? "success" : "muted"} className="shrink-0 gap-1 px-2 py-0.5 text-[11px]">
          {status.label === "Verified" ? <CircleCheck className="size-3.5" aria-hidden="true" /> : <CircleHelp className="size-3.5" aria-hidden="true" />}
          {status.label === "Verified" ? "Verified" : status.label === "Not Verified" ? "Not Verified" : "Not Verified Yet"}
        </GlowBadge>
      </div>

      {card.detail?.verified && (
        <div className="flex flex-wrap items-center gap-1.5 border-t border-radar-light-border pt-2 text-[10.5px] text-radar-light-muted dark:border-white/10 dark:text-radar-muted">
          {card.detail.compilerVersion && (
            <span className="rounded-md bg-radar-light-border/60 px-1.5 py-0.5 dark:bg-white/5">Compiler {card.detail.compilerVersion}</span>
          )}
          {card.detail.optimizationEnabled !== null && (
            <span className="rounded-md bg-radar-light-border/60 px-1.5 py-0.5 dark:bg-white/5">
              Optimization {card.detail.optimizationEnabled ? "On" : "Off"}
            </span>
          )}
          {card.detail.licenseType && <span className="rounded-md bg-radar-light-border/60 px-1.5 py-0.5 dark:bg-white/5">{card.detail.licenseType} license</span>}
          {card.detail.proxyType && (
            <span className="rounded-md bg-radar-light-border/60 px-1.5 py-0.5 dark:bg-white/5">
              Proxy ({card.detail.proxyType})
              {card.detail.implementationAddress && ` → ${card.detail.implementationName ?? shortenAddress(card.detail.implementationAddress)}`}
            </span>
          )}
          {card.detail.creatorAddress && (
            <span className="rounded-md bg-radar-light-border/60 px-1.5 py-0.5 dark:bg-white/5">Creator {shortenAddress(card.detail.creatorAddress)}</span>
          )}
          {card.detail.creationTxHash && explorerUrl && (
            <a
              href={`${explorerUrl}/tx/${card.detail.creationTxHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-md bg-radar-light-border/60 px-1.5 py-0.5 text-radar-light-muted outline-none transition-colors hover:text-radar-light-text focus-visible:text-radar-light-text dark:bg-white/5 dark:text-radar-muted dark:hover:text-radar-white dark:focus-visible:text-radar-white"
            >
              Creation Tx {shortenAddress(card.detail.creationTxHash)}
            </a>
          )}
        </div>
      )}

      {(upgradeable || attention) && (
        <div className="flex flex-wrap items-center gap-1.5 border-t border-radar-light-border pt-2 dark:border-white/10">
          {upgradeable && (
            <GlowBadge color="accent" className="px-2 py-0.5 text-[10px]">
              Base Radar: Upgradeable
            </GlowBadge>
          )}
          {attention && (
            <GlowBadge color="warning" className="px-2 py-0.5 text-[10px]">
              Base Radar: Attention Required
            </GlowBadge>
          )}
        </div>
      )}
    </li>
  );
}
