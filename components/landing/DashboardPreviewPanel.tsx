"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Activity, Code2, Fish, Landmark, Layers, ShieldCheck, Sparkles, TrendingUp, Wallet, type LucideIcon } from "lucide-react";

import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { GlassCard } from "@/components/ui/GlassCard";
import { GlowBadge } from "@/components/ui/GlowBadge";
import { formatterForKpiFormat } from "@/lib/data/format";
import {
  PREVIEW_STATS,
  PREVIEW_MARKET_SENTIMENT,
  PREVIEW_ECOSYSTEM_HEALTH,
  PREVIEW_TOP_OPPORTUNITIES,
  type PreviewOpportunity,
} from "@/constants/site";

const STAT_ICONS: Record<string, LucideIcon> = {
  "Projects Tracked": Layers,
  "Ecosystem TVL": Wallet,
  "24H Volume": Activity,
};

const OPPORTUNITY_ICONS: Record<PreviewOpportunity["icon"], LucideIcon> = {
  tvl: Wallet,
  whale: Fish,
  governance: Landmark,
  security: ShieldCheck,
  dev: Code2,
  momentum: TrendingUp,
};

/** Small, bounded random walk — same mechanic `Hero.tsx` has always used (PR9.3): keeps the preview visibly "alive" without ever reading as noisy or fake-blinking. */
function jitter(value: number, magnitude: number): number {
  return value * (1 + (Math.random() - 0.5) * magnitude);
}

const LIVE_UPDATE_INTERVAL_MS = 4500;

/**
 * Post-mount-only bounded random walk. Jitters from `PREVIEW_STATS`'s fixed
 * values every tick, never from the previous tick's result (an unbounded
 * random walk would keep compounding) — anchoring to the real value keeps
 * every stat gently oscillating around it for as long as the tab stays
 * open. `Math.random()` only ever runs inside this post-mount `setInterval`,
 * never during initial/SSR render, so this never risks a hydration
 * mismatch or non-deterministic first paint (the same guarantee
 * `Roadmap.tsx`'s old ambient dots and `Hero.tsx`'s own prior version relied
 * on). Skipped entirely under `prefers-reduced-motion`.
 */
function useLivePreviewStats(prefersReducedMotion: boolean | null) {
  const [stats, setStats] = useState(() => PREVIEW_STATS.map((stat) => stat.value));

  useEffect(() => {
    if (prefersReducedMotion) return;
    const id = setInterval(() => {
      setStats(PREVIEW_STATS.map((stat, index) => jitter(stat.value, index === 0 ? 0.03 : 0.02)));
    }, LIVE_UPDATE_INTERVAL_MS);
    return () => clearInterval(id);
  }, [prefersReducedMotion]);

  return stats;
}

type DashboardPreviewPanelProps = {
  /**
   * `teaser` (Hero, sits beside the headline) is deliberately a SMALLER
   * subset, not a shrunk copy of `large`'s full structure — visual
   * refinement pass, fixing a "same thing in two places" problem where
   * Hero and Product Proof both rendered the complete Executive Summary
   * (stats + Market Sentiment + Ecosystem Health + a 3-row AI Command
   * Center list). `teaser` drops the Market Sentiment badge and Ecosystem
   * Health bar entirely and shows only 2 signal rows with no section
   * eyebrow label — "promise + teaser," never a second full Executive
   * Summary. `large` (Product Proof, full-width) is unchanged: the real,
   * complete structure with all 4 opportunity rows — the page's actual
   * "evidence" section.
   */
  size?: "teaser" | "large";
};

/**
 * The one "what you get inside Base Radar" preview — real
 * `AnimatedNumber`/`GlowBadge` components driven by illustrative fixture
 * data shaped after the real Dashboard's Executive Summary strip
 * (`components/dashboard/ExecutiveSummaryStrip.tsx`) and AI Command Center
 * (`components/dashboard/TodaysTopInsight.tsx`) — never a static image,
 * never a live query against real user data (a marketing page has no
 * signed-in Watchlist to query). Shared by `Hero.tsx` and `ProductProof.tsx`
 * so the two don't duplicate this panel.
 */
export function DashboardPreviewPanel({ size = "teaser" }: DashboardPreviewPanelProps) {
  const prefersReducedMotion = useReducedMotion();
  const liveStats = useLivePreviewStats(prefersReducedMotion);
  const isLarge = size === "large";
  const opportunities = isLarge ? PREVIEW_TOP_OPPORTUNITIES : PREVIEW_TOP_OPPORTUNITIES.slice(0, 2);

  return (
    <GlassCard glow className={isLarge ? "p-6 sm:p-10 lg:p-12" : "p-6 sm:p-8"}>
      <div className="flex items-center justify-between pb-5">
        <span className="text-xs font-semibold tracking-wide text-radar-light-muted uppercase dark:text-radar-muted">
          {isLarge ? "Executive Summary" : "Live Base Intelligence"}
        </span>
        <GlowBadge color="success" dot>
          Live on Base
        </GlowBadge>
      </div>

      {/*
        Visual refinement pass — the teaser previously reused the exact same
        bordered/backgrounded 3-tile grid `large` uses, so even with fewer
        rows below it the two panels still read as "the same card, just
        shorter." The teaser's stats are now a plain divider-separated
        inline row (a ledger/ticker shape) instead of boxed tiles — same
        real numbers, a visibly different silhouette from Product Proof's
        card grid, not just less content.
      */}
      <div className={isLarge ? "grid grid-cols-3 gap-3 pb-6 sm:gap-4" : "flex items-start gap-4 pb-5 sm:gap-6"}>
        {PREVIEW_STATS.map((stat, index) => {
          const Icon = STAT_ICONS[stat.label];
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.4, delay: index * 0.06 }}
              className={
                isLarge
                  ? "rounded-2xl border border-radar-light-border bg-radar-light-text/[0.02] p-3 transition-colors duration-200 hover:border-radar-primary/20 hover:bg-radar-light-text/[0.04] sm:p-4 dark:border-white/10 dark:bg-white/[0.03] dark:hover:border-white/20 dark:hover:bg-white/[0.06]"
                  : "min-w-0 flex-1 border-l border-radar-light-border pl-4 first:border-l-0 first:pl-0 dark:border-white/10"
              }
            >
              <div className="flex items-center gap-1.5 text-radar-light-muted dark:text-radar-muted">
                {Icon && <Icon className="size-3.5 shrink-0" />}
                <span className="truncate text-[11px] sm:text-xs">{stat.label}</span>
              </div>
              <div className="mt-2 flex items-baseline gap-1.5">
                <AnimatedNumber
                  value={liveStats[index]}
                  format={formatterForKpiFormat(stat.format)}
                  duration={1.2}
                  className="whitespace-nowrap"
                />
              </div>
              {stat.delta && (
                <span
                  className={
                    stat.trend === "up"
                      ? "text-[11px] font-medium text-radar-success"
                      : "text-[11px] font-medium text-radar-danger"
                  }
                >
                  {stat.delta}
                </span>
              )}
            </motion.div>
          );
        })}
      </div>

      {isLarge && (
        <>
          <div className="flex flex-wrap items-center gap-2 border-t border-radar-light-border pt-4 pb-4 dark:border-white/10">
            <GlowBadge color="primary">{PREVIEW_MARKET_SENTIMENT.label} Sentiment</GlowBadge>
            <span className="text-xs text-radar-light-muted dark:text-radar-muted">{PREVIEW_MARKET_SENTIMENT.justification}</span>
          </div>

          <div className="flex items-center gap-3 pb-5">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-radar-light-border dark:bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-radar-primary to-radar-accent"
                style={{ width: `${PREVIEW_ECOSYSTEM_HEALTH.percent}%` }}
              />
            </div>
            <span className="shrink-0 text-xs text-radar-light-muted dark:text-radar-muted">
              <span className="font-semibold text-radar-light-text dark:text-radar-white">{PREVIEW_ECOSYSTEM_HEALTH.percent}%</span>{" "}
              {PREVIEW_ECOSYSTEM_HEALTH.detail}
            </span>
          </div>

          <div className="flex items-center gap-2 pb-2">
            <Sparkles className="size-4 text-radar-accent" aria-hidden="true" />
            <span className="text-xs font-semibold tracking-wide text-radar-light-muted uppercase dark:text-radar-muted">
              AI Command Center — Top Opportunities
            </span>
          </div>
        </>
      )}

      <div className={isLarge ? "flex flex-col gap-1" : "flex flex-col gap-1 border-t border-radar-light-border pt-4 dark:border-white/10"}>
        {opportunities.map((item, index) => {
          const Icon = OPPORTUNITY_ICONS[item.icon];
          return (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.4, delay: index * 0.06 }}
              className="-mx-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-xl px-2 py-2 transition-colors duration-200 hover:bg-radar-light-text/[0.03] dark:hover:bg-white/[0.04]"
            >
              <span className="flex items-center gap-2 text-sm text-radar-light-muted dark:text-radar-muted">
                <Icon className="size-4" aria-hidden="true" />
                {item.label}
              </span>
              <GlowBadge color={item.tone}>{item.value}</GlowBadge>
            </motion.div>
          );
        })}
      </div>
    </GlassCard>
  );
}
