"use client";

import { MotionConfig, motion } from "framer-motion";
import { ArrowRight, Compass } from "lucide-react";

import { HeroBackground } from "@/components/landing/HeroBackground";
import { DashboardPreviewPanel } from "@/components/landing/DashboardPreviewPanel";
import { GradientButton } from "@/components/ui/GradientButton";
import { GlowBadge } from "@/components/ui/GlowBadge";
import { LANDING_CTAS, TRUST_INDICATORS } from "@/constants/site";

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0 },
};

/**
 * Landing Page V2 — "See Base. Understand Base. Act on Base." replaces the
 * prior "AI intelligence... Briefed daily" positioning, which undersold the
 * product: the real Dashboard is now Executive Summary, AI Command Center,
 * Project Intelligence, Compare, Watchlists, Alerts, Wallet + Portfolio
 * Intelligence, AI Workspace, AI Reports, and Automation, not just a daily
 * brief. The preview panel (`DashboardPreviewPanel`, `size="teaser"`) is
 * real React markup driven by illustrative fixture data
 * (`constants/site.ts`'s `PREVIEW_*` exports) shaped after the real
 * Dashboard's own Executive Summary + AI Command Center — never a static
 * image, never fabricated live data.
 */
export function Hero() {
  return (
    <MotionConfig reducedMotion="user">
      <section id="hero" className="relative overflow-hidden px-6 pt-6 pb-16 sm:pt-10 sm:pb-24 lg:pt-12 lg:pb-28 lg:px-8">
        <HeroBackground />

        <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-y-20 lg:grid-cols-2 lg:gap-20">
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
              See Base.
              <br />
              Understand Base.
              <br />
              <span className="bg-gradient-to-r from-radar-primary to-radar-accent bg-clip-text text-transparent">
                Act on Base.
              </span>
            </motion.h1>

            <motion.p
              variants={fadeUp}
              transition={{ duration: 0.5 }}
              className="max-w-xl text-lg leading-relaxed text-radar-light-muted lg:text-xl dark:text-radar-muted"
            >
              Base Radar turns on-chain activity, market data, project intelligence, wallet activity, and AI
              analysis into one decision-ready intelligence platform.
            </motion.p>

            <motion.div
              variants={fadeUp}
              transition={{ duration: 0.5 }}
              className="flex flex-col gap-4 sm:flex-row"
            >
              <GradientButton href={LANDING_CTAS.primary.href} variant="primary">
                {LANDING_CTAS.primary.label}
                <ArrowRight className="size-4" />
              </GradientButton>
              <GradientButton href={LANDING_CTAS.secondary.href} variant="secondary">
                {LANDING_CTAS.secondary.label}
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
            <DashboardPreviewPanel size="teaser" />
          </motion.div>
        </div>
      </section>
    </MotionConfig>
  );
}
