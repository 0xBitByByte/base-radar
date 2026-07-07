"use client";

import { MotionConfig, motion } from "framer-motion";
import {
  ArrowRight,
  ExternalLink,
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
import { GlassCard } from "@/components/ui/GlassCard";
import { GradientButton } from "@/components/ui/GradientButton";
import { GlowBadge } from "@/components/ui/GlowBadge";
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

export function Hero() {
  return (
    <MotionConfig reducedMotion="user">
      <section className="relative overflow-hidden px-6 pt-20 pb-24 sm:pt-28 sm:pb-32 lg:pt-32 lg:pb-40">
        <HeroBackground />

        <div className="mx-auto grid max-w-7xl items-center gap-y-20 lg:grid-cols-2 lg:gap-16">
          <motion.div
            initial="hidden"
            animate="show"
            transition={{ staggerChildren: 0.1 }}
            className="flex flex-col items-start gap-7"
          >
            <motion.div variants={fadeUp} transition={{ duration: 0.5 }}>
              <GlowBadge color="accent" dot>
                Live on Base
              </GlowBadge>
            </motion.div>

            <motion.h1
              variants={fadeUp}
              transition={{ duration: 0.5 }}
              className="text-4xl leading-[1.05] font-semibold tracking-tight text-radar-white sm:text-5xl lg:text-6xl xl:text-7xl"
            >
              Everything happening on Base.
              <br />
              <span className="bg-gradient-to-r from-radar-primary to-radar-accent bg-clip-text text-transparent">
                One intelligent dashboard.
              </span>
            </motion.h1>

            <motion.p
              variants={fadeUp}
              transition={{ duration: 0.5 }}
              className="max-w-xl text-base leading-relaxed text-radar-muted sm:text-lg lg:text-xl"
            >
              Track projects, narratives, builders, whales, AI ecosystems and emerging
              opportunities across the Base blockchain from a single platform.
            </motion.p>

            <motion.div
              variants={fadeUp}
              transition={{ duration: 0.5 }}
              className="flex flex-col gap-4 sm:flex-row"
            >
              <GradientButton href="/dashboard" variant="primary">
                Explore Dashboard
                <ArrowRight className="size-4" />
              </GradientButton>
              <GradientButton href="#" variant="secondary">
                View GitHub
                <ExternalLink className="size-4" />
              </GradientButton>
            </motion.div>

            <motion.div
              variants={fadeUp}
              transition={{ duration: 0.5 }}
              className="flex flex-wrap items-center gap-x-6 gap-y-2"
            >
              {TRUST_INDICATORS.map((item) => (
                <span key={item} className="flex items-center gap-2 text-sm text-radar-muted">
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
              <div className="flex items-center justify-between border-b border-white/10 pb-5">
                <span className="text-sm font-semibold text-radar-white">Base Network</span>
                <GlowBadge color="success" dot>
                  Live
                </GlowBadge>
              </div>

              <div className="grid grid-cols-2 gap-4 py-6">
                {DASHBOARD_STATS.map((stat) => {
                  const Icon = STAT_ICONS[stat.label];
                  return (
                    <div
                      key={stat.label}
                      className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 transition-colors duration-200 hover:border-white/20 hover:bg-white/[0.06]"
                    >
                      <div className="flex items-center gap-2 text-radar-muted">
                        {Icon && <Icon className="size-4" />}
                        <span className="text-xs">{stat.label}</span>
                      </div>
                      <div className="mt-2 flex items-baseline gap-2">
                        <span className="text-lg font-semibold text-radar-white">
                          {stat.value}
                        </span>
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
                    </div>
                  );
                })}
              </div>

              <div className="flex flex-col gap-1 border-t border-white/10 pt-5">
                {DASHBOARD_HIGHLIGHTS.map((highlight) => {
                  const Icon = HIGHLIGHT_ICONS[highlight.icon];
                  return (
                    <div
                      key={highlight.label}
                      className="-mx-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-xl px-2 py-2 transition-colors duration-200 hover:bg-white/[0.04]"
                    >
                      <span className="flex items-center gap-2 text-sm text-radar-muted">
                        <Icon className="size-4" />
                        {highlight.label}
                      </span>
                      <GlowBadge color={highlight.tone}>{highlight.value}</GlowBadge>
                    </div>
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
