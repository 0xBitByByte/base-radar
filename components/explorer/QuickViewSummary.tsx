import { MetricItem } from "@/components/explorer/MetricItem";
import { QuickViewSectionLabel } from "@/components/explorer/QuickViewSectionLabel";
import { RISK_COLOR } from "@/components/explorer/riskColor";
import { ScoreBadge } from "@/components/explorer/ScoreBadge";
import { GlowBadge } from "@/components/ui/GlowBadge";
import { Tooltip } from "@/components/ui/Tooltip";
import { formatCompactCurrency, formatPrice } from "@/lib/data/format";
import type { Confidence, Health, Identity, Market, Risk, Tvl } from "@/lib/intelligence/types";

type QuickViewSummaryProps = {
  identity: Identity;
  market: Market;
  tvl: Tvl;
  health: Health;
  confidence: Confidence;
  summary: string;
  risk: Risk;
};

/**
 * The "why does it matter?" beat — docs/explorer/03 §14, item 2. Labeled
 * "Overview" rather than "Summary" deliberately: the content today is
 * exactly `identity.shortDescription`, never a generated or fabricated one
 * (a future AI Summary is explicitly a later milestone) — "Overview" stays
 * accurate to that, and leaves "AI Summary" free to be its own, distinct
 * label later rather than silently becoming true of a heading that already
 * says "Summary" today. Health/Confidence render with their `factors`
 * visible here — unlike the Grid card, this is where a score's reasoning
 * becomes visible, not just its number ("no hidden calculations").
 */
export function QuickViewSummary({ identity, market, tvl, health, confidence, summary, risk }: QuickViewSummaryProps) {
  const priceAvailable = market.available && market.priceUsd !== null;
  const tvlAvailable = tvl.available && tvl.tvlUsd !== null;
  const headlineAvailable = priceAvailable || tvlAvailable;

  return (
    <div className="flex flex-col gap-6 px-5 py-6">
      <section className="flex flex-col gap-2">
        <QuickViewSectionLabel>Overview</QuickViewSectionLabel>
        <p className="text-sm leading-relaxed text-radar-light-text dark:text-radar-white">
          {identity.shortDescription}
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <QuickViewSectionLabel>AI Summary</QuickViewSectionLabel>
        <p className="text-sm leading-relaxed text-radar-light-text dark:text-radar-white">{summary}</p>
        <Tooltip content={risk.explanation}>
          <GlowBadge color={RISK_COLOR[risk.level]} className="w-fit capitalize">
            {risk.level} risk
          </GlowBadge>
        </Tooltip>
      </section>

      <MetricItem
        label={priceAvailable ? "Price" : "TVL"}
        value={
          priceAvailable
            ? formatPrice(market.priceUsd as number)
            : tvlAvailable
              ? formatCompactCurrency(tvl.tvlUsd as number)
              : undefined
        }
        unavailable={!headlineAvailable}
      />

      <div className="grid grid-cols-2 gap-2">
        <ScoreBadge
          type="health"
          score={health.score}
          label={health.label}
          factors={health.factors}
          infoTooltip="A 0–100 score blending live market, TVL, and GitHub activity signals into one health read."
        />
        <ScoreBadge
          type="confidence"
          score={confidence.score}
          label={confidence.level}
          factors={confidence.factors}
          infoTooltip="A 0–100 score reflecting how much live data and registry verification back this record."
        />
      </div>
    </div>
  );
}
