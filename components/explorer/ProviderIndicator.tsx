import { Timestamp } from "@/components/explorer/Timestamp";
import { cn } from "@/lib/utils";
import type { SourceAttribution, SourceStatus } from "@/lib/intelligence/types";
import type { ProviderName } from "@/lib/providers/common/types";

type ProviderIndicatorProps = {
  provider: ProviderName;
  attribution: SourceAttribution;
};

const PROVIDER_LABEL: Record<ProviderName, string> = {
  coingecko: "CoinGecko",
  dexscreener: "DexScreener",
  defillama: "DefiLlama",
  blockscout: "Blockscout",
  github: "GitHub",
  base: "Base Network",
};

const STATUS_DOT_CLASS: Record<SourceStatus, string> = {
  live: "bg-radar-success",
  unavailable: "bg-radar-warning",
  not_configured: "bg-radar-light-muted dark:bg-radar-muted",
};

const STATUS_LABEL: Record<SourceStatus, string> = {
  live: "Live",
  unavailable: "Unavailable",
  not_configured: "Not configured",
};

/**
 * One provider's live/unavailable/not-configured status — the finer-grained
 * unit `QuickViewSources` repeats six times, once per provider (never hiding
 * provider origin, docs/explorer/03 §12). Distinct from a project-level
 * summary badge: this is per-provider detail, always all six, always shown
 * together. Presentation only — `attribution` is already-computed by
 * `lib/intelligence/sources.ts`, never re-derived here.
 */
export function ProviderIndicator({ provider, attribution }: ProviderIndicatorProps) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <div className="flex min-w-0 items-center gap-2">
        <span
          className={cn("size-1.5 shrink-0 rounded-full", STATUS_DOT_CLASS[attribution.status])}
          aria-hidden="true"
        />
        <span className="truncate text-xs font-medium text-radar-light-text dark:text-radar-white">
          {PROVIDER_LABEL[provider]}
        </span>
      </div>
      <div className="shrink-0 text-[11px] text-radar-light-muted dark:text-radar-muted">
        {attribution.status === "live" && attribution.fetchedAt ? (
          <Timestamp iso={attribution.fetchedAt} />
        ) : (
          <span>{attribution.detail ?? STATUS_LABEL[attribution.status]}</span>
        )}
      </div>
    </div>
  );
}
