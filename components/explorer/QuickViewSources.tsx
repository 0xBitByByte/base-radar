import { ProviderIndicator } from "@/components/explorer/ProviderIndicator";
import { QuickViewSectionLabel } from "@/components/explorer/QuickViewSectionLabel";
import { Timestamp } from "@/components/explorer/Timestamp";
import type { Freshness, Sources } from "@/lib/intelligence/types";
import type { ProviderName } from "@/lib/providers/common/types";

type QuickViewSourcesProps = {
  sources: Sources;
  freshness: Freshness;
};

/** Fixed, deliberate order — matches the provider order already used throughout `lib/intelligence/`. */
const PROVIDER_ORDER: ProviderName[] = ["coingecko", "dexscreener", "defillama", "blockscout", "github", "base"];

/**
 * Per-provider attribution, always all six, always together — "never hide
 * provider origin" (docs/explorer/03 §12), the trust-building capstone that
 * deliberately sits last in the content hierarchy, after the numbers
 * themselves.
 */
export function QuickViewSources({ sources, freshness }: QuickViewSourcesProps) {
  return (
    <div className="flex flex-col gap-2 px-5 py-6">
      <div className="flex items-center justify-between gap-3">
        <QuickViewSectionLabel>Sources</QuickViewSectionLabel>
        <Timestamp
          iso={freshness.newestSourceAt}
          fallback="No live data yet"
          className="text-[11px] text-radar-light-muted dark:text-radar-muted"
        />
      </div>
      <div className="divide-y divide-radar-light-border dark:divide-white/10">
        {PROVIDER_ORDER.map((provider) => (
          <ProviderIndicator key={provider} provider={provider} attribution={sources[provider]} />
        ))}
      </div>
    </div>
  );
}
