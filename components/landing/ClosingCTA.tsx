"use client";

import { motion } from "framer-motion";
import { ArrowRight, Compass } from "lucide-react";

import { GradientButton } from "@/components/ui/GradientButton";
import { LANDING_CTAS } from "@/constants/site";

/**
 * Landing Page V2, Section 10 — "Know what's happening on Base." Same two
 * CTAs as Hero (`LANDING_CTAS`, one shared source so the two never drift),
 * replacing the prior single "Launch App" button.
 */
export function ClosingCTA() {
  return (
    <section className="mx-auto max-w-7xl px-6 py-16 sm:py-24 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.5 }}
        className="mx-auto flex max-w-3xl flex-col items-center gap-6 rounded-3xl border border-radar-light-border bg-gradient-to-b from-radar-light-card to-radar-light-surface px-8 py-16 text-center shadow-[0_20px_60px_-30px_rgba(21,101,255,0.25)] sm:px-16 dark:border-white/10 dark:from-radar-elevated dark:to-radar-card dark:shadow-[0_20px_60px_-30px_rgba(61,118,255,0.3)]"
      >
        <h2 className="text-3xl font-semibold tracking-tight text-radar-light-text sm:text-4xl dark:text-radar-white">
          Know what&apos;s happening on Base.
        </h2>
        <p className="max-w-xl text-lg text-radar-light-muted dark:text-radar-muted">
          Explore projects, track wallets, understand risk, and discover the signals that matter.
        </p>
        <div className="flex flex-col gap-4 sm:flex-row">
          <GradientButton href={LANDING_CTAS.primary.href} variant="primary" className="px-8 py-3.5 text-base">
            {LANDING_CTAS.primary.label}
            <ArrowRight className="size-4" />
          </GradientButton>
          <GradientButton href={LANDING_CTAS.secondary.href} variant="secondary" className="px-8 py-3.5 text-base">
            {LANDING_CTAS.secondary.label}
            <Compass className="size-4" />
          </GradientButton>
        </div>
      </motion.div>
    </section>
  );
}
