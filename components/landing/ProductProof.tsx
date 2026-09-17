"use client";

import { motion } from "framer-motion";

import { DashboardPreviewPanel } from "@/components/landing/DashboardPreviewPanel";

/**
 * Landing Page V2, Section 2 — "Base intelligence at a glance." A larger
 * presentation of the same real concepts Hero's preview shows (Executive
 * Summary, Market Sentiment, Ecosystem Health, AI Command Center, Top
 * Opportunities), so a visitor sees concretely what they get immediately
 * after entering Base Radar, not just a marketing headline. Shares
 * `DashboardPreviewPanel` with `Hero.tsx` rather than duplicating it.
 */
export function ProductProof() {
  return (
    <section id="product-proof" className="mx-auto max-w-7xl px-6 py-16 sm:py-24 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.5 }}
        className="mx-auto max-w-2xl text-center"
      >
        <h2 className="text-3xl font-semibold tracking-tight text-radar-light-text sm:text-4xl dark:text-radar-white">
          Base intelligence at a glance.
        </h2>
        <p className="mt-3 text-lg text-radar-light-muted dark:text-radar-muted">
          Executive Summary, Market Sentiment, Ecosystem Health, and the AI Command Center — the same real
          surfaces you land on inside Base Radar.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        whileInView={{ opacity: 1, y: 0, scale: 1 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.6 }}
        className="mx-auto mt-10 max-w-2xl"
      >
        <DashboardPreviewPanel size="large" />
      </motion.div>
    </section>
  );
}
