"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Compass, Landmark, LayoutGrid, ShieldCheck } from "lucide-react";

import { LANDING_CTAS } from "@/constants/site";

const HIGHLIGHTS = [
  { icon: ShieldCheck, label: "Verification", description: "Verified, Community, Unverified, or Flagged — four real trust tiers, never a self-reported claim taken at face value." },
  { icon: LayoutGrid, label: "Categories & Risk", description: "22 categories, Smart Views, and Smart Collections — plus a Low/Moderate/High risk read on every tracked project." },
  { icon: Landmark, label: "Governance & Activity", description: "Proposal activity, contract verification, and provider coverage, cross-checked before it reaches a profile." },
];

/**
 * Landing Page V2, Section 5 intro — "Discover the projects shaping Base."
 * Sits above the existing, real `FeaturedEcosystem` marquee (shares its
 * `id="projects"`), framing what the marquee's 20 real projects already
 * demonstrate: discovery, categories, verification, risk, activity, and
 * governance tracking.
 */
export function ProjectIntelligence() {
  return (
    <div className="mx-auto max-w-7xl px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.5 }}
        className="mx-auto max-w-2xl text-center"
      >
        <h2 className="text-3xl font-semibold tracking-tight text-radar-light-text sm:text-4xl dark:text-radar-white">
          Discover the projects shaping Base.
        </h2>
        <p className="mt-3 text-lg text-radar-light-muted dark:text-radar-muted">
          Every protocol on Base, in one verified registry — cross-checked, categorized, and scored, so you know
          what to trust before you dig in.
        </p>
      </motion.div>

      {/*
        Visual refinement pass — reads immediately after AI Command
        Center's own card grid (and Product Proof's card before that), so
        this block deliberately breaks the "bordered GlassCard grid"
        rhythm: no per-item background/border, just icon + heading +
        description separated by a hairline rule (vertical on desktop,
        horizontal on mobile) — the same real three facts, presented as an
        editorial row instead of a third consecutive card grid.
      */}
      <div className="mt-10 grid grid-cols-1 divide-y divide-radar-light-border sm:grid-cols-3 sm:divide-x sm:divide-y-0 dark:divide-white/10">
        {HIGHLIGHTS.map((item, index) => (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.4, delay: index * 0.08 }}
            className="flex flex-col gap-2 px-0 py-5 first:pt-0 sm:px-6 sm:py-0 sm:first:pl-0 sm:last:pr-0"
          >
            <item.icon className="size-5 shrink-0 text-radar-primary dark:text-radar-accent" aria-hidden="true" />
            <h3 className="text-sm font-semibold text-radar-light-text dark:text-radar-white">{item.label}</h3>
            <p className="text-sm leading-relaxed text-radar-light-muted dark:text-radar-muted">{item.description}</p>
          </motion.div>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.4, delay: 0.3 }}
        className="mt-8 flex justify-center"
      >
        <Link
          href={LANDING_CTAS.secondary.href}
          className="flex items-center gap-2 rounded-xl border border-radar-light-border bg-radar-light-surface/70 px-5 py-2.5 text-sm font-semibold text-radar-light-text backdrop-blur-xl transition-colors hover:border-radar-primary/25 hover:bg-radar-light-hover dark:border-white/15 dark:bg-white/5 dark:text-radar-white dark:hover:border-white/25 dark:hover:bg-white/10"
        >
          <Compass className="size-4" aria-hidden="true" />
          {LANDING_CTAS.secondary.label}
          <ArrowRight className="size-3.5" aria-hidden="true" />
        </Link>
      </motion.div>
    </div>
  );
}
