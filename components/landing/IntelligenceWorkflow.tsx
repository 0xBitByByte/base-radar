"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { BrainCircuit, Compass, Eye, GitCompare, Zap, type LucideIcon } from "lucide-react";

import { GlassCard } from "@/components/ui/GlassCard";

type WorkflowStep = {
  label: string;
  icon: LucideIcon;
  description: string;
  href: string;
};

/** Discover → Compare → Watch → Understand → Act, each mapped to a real, existing route — never a fabricated capability (no automated trading/execution anywhere in this app). */
const WORKFLOW: WorkflowStep[] = [
  {
    label: "Discover",
    icon: Compass,
    description: "Browse a verified registry of every project on Base — categorized, scored, and cross-checked.",
    href: "/dashboard/projects",
  },
  {
    label: "Compare",
    icon: GitCompare,
    description: "Put up to 4 projects side by side — AI Grade, risk, TVL, governance, and more.",
    href: "/dashboard/compare",
  },
  {
    label: "Watch",
    icon: Eye,
    description: "Pin what matters to a Watchlist, and let Alerts surface real signals when you check in.",
    href: "/dashboard/watchlists",
  },
  {
    label: "Understand",
    icon: BrainCircuit,
    description: "Read the AI Workspace and AI Reports for the evidence behind every score.",
    href: "/dashboard/ai-workspace",
  },
  {
    label: "Act",
    icon: Zap,
    description: "Toggle automation rules, adjust your Watchlist, or dig into a project's full profile.",
    href: "/dashboard/automation",
  },
];

/** Fixed positions/timing for the section's ambient drifting dots — hand-authored (never `Math.random()`) so server and client render identically. Ported from `Roadmap.tsx`'s `RoadmapBackground` (PR9.3 §8), unchanged. */
const AMBIENT_DOTS = [
  { top: "12%", left: "8%", size: 5, duration: 9, delay: 0 },
  { top: "28%", left: "88%", size: 4, duration: 11, delay: 1.5 },
  { top: "68%", left: "14%", size: 3, duration: 8, delay: 0.8 },
  { top: "82%", left: "76%", size: 5, duration: 10, delay: 2.2 },
  { top: "48%", left: "50%", size: 3, duration: 12, delay: 3 },
];

/**
 * Ambient backdrop ported from the retired `Roadmap.tsx`'s
 * `RoadmapBackground` — a faint grid, a soft neutral horizontal timeline
 * spine (now sized for 5 steps instead of 3 columns), and a handful of
 * slowly drifting dots (`br-drift`). Everything here sits at `-z-10` and
 * ≤6% opacity so it reads as texture, never competes with the step cards'
 * content; entirely hidden under `prefers-reduced-motion` down to a static
 * grid, matching `HeroBackground`'s own pattern.
 */
function WorkflowBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden="true">
      <div
        className="absolute inset-0 text-radar-light-text opacity-[0.03] dark:text-radar-white dark:opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)",
          backgroundSize: "56px 56px",
          maskImage: "radial-gradient(ellipse 65% 60% at 50% 45%, black 30%, transparent 100%)",
          WebkitMaskImage: "radial-gradient(ellipse 65% 60% at 50% 45%, black 30%, transparent 100%)",
        }}
      />
      <div
        className="absolute top-1/2 left-[6%] hidden h-px w-[88%] -translate-y-1/2 bg-gradient-to-r from-transparent via-radar-light-border to-transparent lg:block dark:via-white/10"
        style={{ marginTop: "44px" }}
      />
      {AMBIENT_DOTS.map((dot, index) => (
        <span
          key={index}
          className="absolute rounded-full bg-radar-light-text/30 motion-reduce:hidden dark:bg-white/25"
          style={{
            top: dot.top,
            left: dot.left,
            width: dot.size,
            height: dot.size,
            animation: `br-drift ${dot.duration}s ease-in-out ${dot.delay}s infinite`,
          }}
        />
      ))}
    </div>
  );
}

/**
 * Landing Page V2, Section 7 — "From Signal to Decision" (replaces the
 * retired public "Roadmap" section; PR-089–PR-097 are internal engineering
 * epics that were never publicly PR-numbered on the old Roadmap section
 * either, but the "Roadmap" *concept* itself no longer has a public-facing
 * slot per this redesign). `id="how-it-works"` — Navbar/Footer's former
 * "Roadmap" link now reads "How It Works" and points here.
 */
export function IntelligenceWorkflow() {
  return (
    <section id="how-it-works" className="relative mx-auto max-w-7xl px-6 py-16 sm:py-24 lg:px-8">
      <WorkflowBackground />
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.5 }}
        className="mx-auto max-w-2xl text-center"
      >
        <h2 className="text-3xl font-semibold tracking-tight text-radar-light-text sm:text-4xl dark:text-radar-white">
          From Signal to Decision
        </h2>
        <p className="mt-3 text-lg text-radar-light-muted dark:text-radar-muted">
          Discover, compare, watch, understand, and act — the real path from a raw signal to a decision, inside
          Base Radar.
        </p>
      </motion.div>

      <div className="mt-10 grid gap-5 lg:grid-cols-5">
        {WORKFLOW.map((step, index) => (
          <motion.div
            key={step.label}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.4, delay: index * 0.08 }}
          >
            <Link href={step.href} className="block h-full">
              {/*
                Visual review: the number/title should sit below the icon
                (not beside it, which an earlier pass tried) — reverted to
                a vertical stack, but with the icon-to-title gap tightened
                from the original `gap-3` (the actual complaint that
                started this) down to `gap-2`, so it's close without the
                two sharing a row.
              */}
              <GlassCard className="flex h-full flex-col gap-2 p-5 text-center lg:text-left">
                <span className="mx-auto flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-radar-primary/15 to-radar-accent/15 text-radar-primary lg:mx-0 dark:text-radar-accent">
                  <step.icon className="size-4.5" aria-hidden="true" />
                </span>
                <div>
                  <h3 className="text-base font-semibold text-radar-light-text dark:text-radar-white">{step.label}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-radar-light-muted dark:text-radar-muted">{step.description}</p>
                </div>
              </GlassCard>
            </Link>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
