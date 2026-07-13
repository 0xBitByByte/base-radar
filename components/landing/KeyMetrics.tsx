"use client";

import { motion } from "framer-motion";

import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { GlowBadge } from "@/components/ui/GlowBadge";
import { formatCompactCurrencyParts, formatCompactNumberParts, formatGweiParts } from "@/lib/data/format";
import { TICKER_METRICS, type KeyMetric } from "@/constants/site";

function formatterFor(format: KeyMetric["format"]) {
  if (format === "compactCurrency") return formatCompactCurrencyParts;
  if (format === "gwei") return formatGweiParts;
  return formatCompactNumberParts;
}

function TickerItem({ metric }: { metric: KeyMetric }) {
  return (
    <span className="flex shrink-0 items-center gap-2 text-sm">
      <AnimatedNumber value={metric.value} format={formatterFor(metric.format)} className="text-base font-semibold" />
      <span className="text-radar-light-muted dark:text-radar-muted">{metric.label}</span>
    </span>
  );
}

/**
 * "Live Intelligence Ticker" (PR9.3) — replaces the old static Key Metrics
 * grid with a continuously scrolling single-row strip, the same
 * duplicated-content-loop technique `FeaturedEcosystem`'s marquee uses
 * (`br-ticker` in globals.css), just slower and denser. Pauses on hover
 * and under `prefers-reduced-motion`, same as the project marquee.
 */
export function KeyMetrics() {
  return (
    <section className="border-y border-radar-light-border bg-radar-light-surface/60 dark:border-white/10 dark:bg-white/[0.02]">
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-6 py-5 lg:px-8">
        <motion.div
          initial={{ opacity: 0, x: -8 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
        >
          <GlowBadge color="success" dot className="shrink-0 uppercase">
            Live
          </GlowBadge>
        </motion.div>

        <div className="group relative min-w-0 flex-1 overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_4%,black_96%,transparent)]">
          <div className="flex w-max animate-[br-ticker_46s_linear_infinite] items-center gap-6 group-hover:[animation-play-state:paused] motion-reduce:animate-none">
            {[...TICKER_METRICS, ...TICKER_METRICS].map((metric, index) => (
              <div key={`${metric.label}-${index}`} className="flex shrink-0 items-center gap-6">
                <TickerItem metric={metric} />
                <span className="size-1 shrink-0 rounded-full bg-radar-light-border dark:bg-white/15" aria-hidden="true" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
