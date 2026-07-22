"use client";

import { motion } from "framer-motion";
import { CheckCircle2, Clock, Sparkles, type LucideIcon } from "lucide-react";

import { GlassCard } from "@/components/ui/GlassCard";
import { GlowBadge, type GlowBadgeColor } from "@/components/ui/GlowBadge";

type RoadmapColumn = {
  label: string;
  icon: LucideIcon;
  color: GlowBadgeColor;
  items: string[];
};

const ROADMAP: RoadmapColumn[] = [
  {
    label: "Now",
    icon: CheckCircle2,
    color: "success",
    items: [
      "Project registry & Explorer",
      "AI Intelligence Brief",
      "Health & confidence scoring",
      "Live network status",
      "Narrative heatmap",
      "Watchlists & alerts",
      "Portfolio Intelligence",
    ],
  },
  {
    label: "Coming Soon",
    icon: Clock,
    color: "warning",
    items: ["Wallet connect", "Wallet intelligence"],
  },
  {
    label: "Future",
    icon: Sparkles,
    color: "accent",
    items: ["Open public API", "Project comparison tools", "Mobile app"],
  },
];

/** Fixed positions/timing for the section's ambient drifting dots — hand-authored (never `Math.random()`) so server and client render identically. Kept at very low opacity, purely `transform`/`opacity`. */
const AMBIENT_DOTS = [
  { top: "12%", left: "8%", size: 5, duration: 9, delay: 0 },
  { top: "28%", left: "88%", size: 4, duration: 11, delay: 1.5 },
  { top: "68%", left: "14%", size: 3, duration: 8, delay: 0.8 },
  { top: "82%", left: "76%", size: 5, duration: 10, delay: 2.2 },
  { top: "48%", left: "50%", size: 3, duration: 12, delay: 3 },
];

/** Roadmap's ambient backdrop (PR9.3 §8, de-blued PR9.3.X §8) — a faint
 * grid, a soft neutral horizontal timeline spine behind the three
 * columns, and a handful of slowly drifting dots (`br-drift`). The spine
 * and dots previously used `radar-primary`/`radar-accent` (blue) —
 * PR9.3.X explicitly bans blue "bar lines" anywhere on the landing page,
 * so both now use the same neutral border/foreground tones
 * `SectionDivider` already establishes. Everything here sits at `-z-10`
 * and ≤6% opacity so it reads as texture, never competes with the
 * quarter cards' content; entirely hidden under `prefers-reduced-motion`
 * down to a static grid, matching `HeroBackground`'s own pattern. */
function RoadmapBackground() {
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
        className="absolute top-1/2 left-[10%] hidden h-px w-[80%] -translate-y-1/2 bg-gradient-to-r from-transparent via-radar-light-border to-transparent lg:block dark:via-white/10"
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

export function Roadmap() {
  return (
    <section id="roadmap" className="relative mx-auto max-w-7xl px-6 py-16 sm:py-24 lg:px-8">
      <RoadmapBackground />
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.5 }}
        className="mx-auto max-w-2xl text-center"
      >
        <h2 className="text-3xl font-semibold tracking-tight text-radar-light-text sm:text-4xl dark:text-radar-white">
          Roadmap
        </h2>
        <p className="mt-3 text-lg text-radar-light-muted dark:text-radar-muted">
          Built in the open, shipped continuously.
        </p>
      </motion.div>

      <div className="mt-10 grid gap-5 lg:grid-cols-3">
        {ROADMAP.map((column, columnIndex) => (
          <motion.div
            key={column.label}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.4, delay: columnIndex * 0.1 }}
          >
            <GlassCard className="flex h-full flex-col gap-5 p-6">
              <GlowBadge color={column.color} className="w-fit">
                <column.icon className="size-3.5" aria-hidden="true" />
                {column.label}
              </GlowBadge>
              <ul className="flex flex-col gap-3">
                {column.items.map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-2.5 border-t border-radar-light-border pt-3 text-sm text-radar-light-text first:border-t-0 first:pt-0 dark:border-white/10 dark:text-radar-white"
                  >
                    <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-radar-primary dark:bg-radar-accent" />
                    {item}
                  </li>
                ))}
              </ul>
            </GlassCard>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
