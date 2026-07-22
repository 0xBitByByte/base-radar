"use client";

import { useEffect, useState } from "react";
import { MotionConfig, motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  Compass,
  Fuel,
  Layers,
  Wallet,
  Activity,
  TrendingUp,
  Fish,
  Flame,
  Radio,
  type LucideIcon,
} from "lucide-react";

import { HeroBackground } from "@/components/landing/HeroBackground";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { GlassCard } from "@/components/ui/GlassCard";
import { GradientButton } from "@/components/ui/GradientButton";
import { GlowBadge } from "@/components/ui/GlowBadge";
import { formatterForKpiFormat } from "@/lib/data/format";
import {
  DASHBOARD_STATS,
  DASHBOARD_HIGHLIGHTS,
  TRUST_INDICATORS,
  type DashboardHighlight,
} from "@/constants/site";

const STAT_ICONS: Record<string, LucideIcon> = {
  Gas: Fuel,
  "Active Projects": Layers,
  TVL: Wallet,
  "24H Volume": Activity,
};

const HIGHLIGHT_ICONS: Record<DashboardHighlight["icon"], LucideIcon> = {
  trending: TrendingUp,
  whale: Fish,
  hot: Flame,
  signal: Radio,
};

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0 },
};

/** Small, bounded random walk — keeps the Hero preview's stats visibly "alive" (PR9.3) without ever reading as noisy or fake-blinking; each tick nudges by a tiny fraction of the value itself. */
function jitter(value: number, magnitude: number): number {
  return value * (1 + (Math.random() - 0.5) * magnitude);
}

const LIVE_UPDATE_INTERVAL_MS = 4500;

/**
 * Drives the Hero preview's "continuously alive" feel (PR9.3 §2/§15): every
 * few seconds, Gas/Active Projects/TVL/24H Volume each take one small,
 * bounded step — `AnimatedNumber` already animates any value change
 * smoothly, so this just needs to supply new numbers on an interval, not
 * its own animation. Skipped entirely under `prefers-reduced-motion`.
 */
function useLivePreview(prefersReducedMotion: boolean | null) {
  const [stats, setStats] = useState(() => DASHBOARD_STATS.map((stat) => stat.value));

  useEffect(() => {
    if (prefersReducedMotion) return;

    const id = setInterval(() => {
      // Jitters from `DASHBOARD_STATS`'s fixed values every tick, never
      // from the previous tick's already-jittered result — jittering from
      // the running value would be an unbounded random walk that keeps
      // compounding for as long as the tab stays open; anchoring to the
      // real value keeps every stat gently oscillating around it forever,
      // which is what "subtle live update" actually means.
      setStats(DASHBOARD_STATS.map((stat, index) => jitter(stat.value, index === 0 ? 0.08 : 0.015)));
    }, LIVE_UPDATE_INTERVAL_MS);

    return () => clearInterval(id);
  }, [prefersReducedMotion]);

  return { stats };
}

export function Hero() {
  const prefersReducedMotion = useReducedMotion();
  const live = useLivePreview(prefersReducedMotion);

  return (
    <MotionConfig reducedMotion="user">
      <section id="hero" className="relative overflow-hidden px-6 pt-6 pb-16 sm:pt-10 sm:pb-24 lg:pt-12 lg:pb-28 lg:px-8">
        <HeroBackground />

        <div className="mx-auto grid max-w-7xl items-center gap-y-20 lg:grid-cols-2 lg:gap-20">
          <motion.div
            initial="hidden"
            animate="show"
            transition={{ staggerChildren: 0.1 }}
            className="flex flex-col items-start gap-8"
          >
            <motion.div variants={fadeUp} transition={{ duration: 0.5 }}>
              <GlowBadge color="accent" dot>
                Live on Base
              </GlowBadge>
            </motion.div>

            <motion.h1
              variants={fadeUp}
              transition={{ duration: 0.5 }}
              className="text-5xl leading-[1.05] font-semibold tracking-tight text-radar-light-text sm:text-6xl lg:text-7xl dark:text-radar-white"
            >
              AI intelligence for the Base ecosystem.
              <br />
              <span className="bg-gradient-to-r from-radar-primary to-radar-accent bg-clip-text text-transparent">
                Briefed daily. Ready to act.
              </span>
            </motion.h1>

            <motion.p
              variants={fadeUp}
              transition={{ duration: 0.5 }}
              className="max-w-xl text-lg leading-relaxed text-radar-light-muted lg:text-xl dark:text-radar-muted"
            >
              Always know what changed and what to do next — an AI-written Daily
              Brief, Portfolio Intelligence, and Notifications, cross-checked
              across every source Base Radar uses.
            </motion.p>

            <motion.div
              variants={fadeUp}
              transition={{ duration: 0.5 }}
              className="flex flex-col gap-4 sm:flex-row"
            >
              <GradientButton href="/dashboard" variant="primary">
                Launch App
                <ArrowRight className="size-4" />
              </GradientButton>
              <GradientButton href="/dashboard/projects" variant="secondary">
                Explore Projects
                <Compass className="size-4" />
              </GradientButton>
            </motion.div>

            <motion.div
              variants={fadeUp}
              transition={{ duration: 0.5 }}
              className="flex flex-wrap items-center gap-x-6 gap-y-2"
            >
              {TRUST_INDICATORS.map((item) => (
                <span key={item} className="flex items-center gap-2 text-sm text-radar-light-muted dark:text-radar-muted">
                  <span className="size-1.5 rounded-full bg-radar-success" />
                  {item}
                </span>
              ))}
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <GlassCard glow className="p-6 sm:p-8">
              <div className="grid grid-cols-2 gap-4 pb-6">
                {DASHBOARD_STATS.map((stat, index) => {
                  const Icon = STAT_ICONS[stat.label];
                  return (
                    <motion.div
                      key={stat.label}
                      initial={{ opacity: 0, y: 10 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, margin: "-40px" }}
                      transition={{ duration: 0.4, delay: index * 0.06 }}
                      className="rounded-2xl border border-radar-light-border bg-radar-light-text/[0.02] p-4 transition-colors duration-200 hover:border-radar-primary/20 hover:bg-radar-light-text/[0.04] dark:border-white/10 dark:bg-white/[0.03] dark:hover:border-white/20 dark:hover:bg-white/[0.06]"
                    >
                      <div className="flex items-center gap-2 text-radar-light-muted dark:text-radar-muted">
                        {Icon && <Icon className="size-4" />}
                        <span className="text-xs">{stat.label}</span>
                      </div>
                      <div className="mt-2 flex items-baseline gap-2">
                        <AnimatedNumber
                          value={live.stats[index]}
                          format={formatterForKpiFormat(stat.format)}
                          duration={1.2}
                          className="whitespace-nowrap"
                        />
                        {stat.delta && (
                          <span
                            className={
                              stat.trend === "up"
                                ? "text-xs font-medium text-radar-success"
                                : "text-xs font-medium text-radar-danger"
                            }
                          >
                            {stat.delta}
                          </span>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              <div className="flex flex-col gap-1">
                {DASHBOARD_HIGHLIGHTS.map((highlight, index) => {
                  const Icon = HIGHLIGHT_ICONS[highlight.icon];
                  return (
                    <motion.div
                      key={highlight.label}
                      initial={{ opacity: 0, y: 10 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, margin: "-40px" }}
                      transition={{ duration: 0.4, delay: index * 0.06 }}
                      className="-mx-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-xl px-2 py-2 transition-colors duration-200 hover:bg-radar-light-text/[0.03] dark:hover:bg-white/[0.04]"
                    >
                      <span className="flex items-center gap-2 text-sm text-radar-light-muted dark:text-radar-muted">
                        <Icon className="size-4" />
                        {highlight.label}
                      </span>
                      <GlowBadge color={highlight.tone}>{highlight.value}</GlowBadge>
                    </motion.div>
                  );
                })}
              </div>
            </GlassCard>
          </motion.div>
        </div>
      </section>
    </MotionConfig>
  );
}
