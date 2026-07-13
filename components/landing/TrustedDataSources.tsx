"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, BrainCircuit } from "lucide-react";

import { GlassCard } from "@/components/ui/GlassCard";
import { PROVIDER_BRANDING } from "@/lib/branding/providers";
import type { BrandIconComponent } from "@/lib/branding/types";
import type { ProviderName } from "@/lib/providers/common/types";

type SourceCard = {
  provider: ProviderName;
  /** The provider's short, concrete role in the pipeline — "what it actually supplies," matching `PROVIDER_BRANDING`'s own facts, just condensed to card-sized copy. */
  role: string;
};

/**
 * The six source providers, in the order PR9.3.1 lists them. Every icon
 * comes from `PROVIDER_BRANDING` — the same registry `ProviderBadge`/
 * `ProviderIndicator` already use everywhere else in the app — rather than
 * a fabricated "official logo" per provider; this codebase has never
 * shipped licensed brand marks for these six (only GitHub's real mark
 * does), so reusing the existing generic-icon convention here is the
 * "reuse the design system" instruction applied literally, not a
 * downgrade.
 */
const SOURCE_CARDS: SourceCard[] = [
  { provider: "base", role: "Official Ecosystem Data" },
  { provider: "blockscout", role: "On-chain Intelligence" },
  { provider: "coingecko", role: "Market Data" },
  { provider: "defillama", role: "TVL Analytics" },
  { provider: "dexscreener", role: "DEX Activity" },
  { provider: "github", role: "Developer Activity" },
];

/** Per-provider particle gradient (PR9.5.1 §2) — Base reuses the app's own
 * theme-responsive primary/accent tokens (so it repaints with the theme
 * toggle like everything else); the other five are fixed decorative hex
 * pairs since they aren't tied to an existing design token. */
const PROVIDER_GRADIENT: Record<ProviderName, [string, string]> = {
  base: ["var(--color-radar-primary)", "var(--color-radar-accent)"],
  coingecko: ["#a3e635", "#10b981"],
  defillama: ["#22d3ee", "#3b82f6"],
  blockscout: ["#a855f7", "#3b82f6"],
  github: ["#6366f1", "#8b5cf6"],
  dexscreener: ["#fb923c", "#ec4899"],
};

/** What the AI engine turns raw provider data into — the pipeline's output stages (PR9.3.2 §4), rendered as a wrapped row of small connected stages rather than a static tagline. */
const OUTPUT_STAGES = ["Signals", "Research", "Alerts", "Scores", "Narratives"];

/** Shared cycle length for the convergence particles, the AI-hub ring
 * sweep (`tds-ai-sweep` in globals.css), and the single verified-output
 * particle below — all three are timed off this one duration so they
 * hand off in a single readable sequence every loop: particles converge
 * (0-40%), the AI ring "processes" (35-85%), one particle exits (80-100%). */
const CYCLE_SECONDS = 4;

/** Faint grid + one soft radial glow — same restrained language as `HeroBackground`/`RoadmapBackground`, deliberately lighter (no drifting particles) per this section's own "no heavy backgrounds" brief. */
function TrustedDataSourcesBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden="true">
      <div
        className="absolute inset-0 text-radar-light-text opacity-[0.03] dark:text-radar-white dark:opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)",
          backgroundSize: "56px 56px",
          maskImage: "radial-gradient(ellipse 65% 70% at 50% 50%, black 30%, transparent 100%)",
          WebkitMaskImage: "radial-gradient(ellipse 65% 70% at 50% 50%, black 30%, transparent 100%)",
        }}
      />
      <div
        className="absolute top-1/2 left-1/2 size-[42rem] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-[0.04] dark:opacity-[0.06]"
        style={{ background: "radial-gradient(circle, var(--color-radar-primary) 0%, transparent 70%)" }}
      />
    </div>
  );
}

function ProviderIcon({ Icon }: { Icon: BrandIconComponent }) {
  return (
    <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-radar-primary/15 to-radar-accent/15 text-radar-primary dark:text-radar-accent">
      <Icon className="size-5" aria-hidden="true" />
    </span>
  );
}

/**
 * Six providers → one AI hub (PR9.5.1 §2). Each provider gets its own
 * animated gradient particle; all six travel simultaneously along curved
 * paths converging on the hub below. Pure SVG/SMIL (`animateMotion`) so
 * the motion itself compiles to a transform, not a layout property, and
 * needs no JS driver — `keyPoints`/`keyTimes` hold every particle at the
 * path's end (invisible, opacity 0) for the remainder of the shared 4s
 * cycle so it re-starts in sync with the AI-hub ring and the exit
 * particle below.
 */
function ProviderConvergence({ order }: { order: ProviderName[] }) {
  const prefersReducedMotion = useReducedMotion();

  if (prefersReducedMotion) {
    return (
      <div className="relative mx-auto mt-10 h-10 w-px" aria-hidden="true">
        <div className="absolute inset-0 bg-gradient-to-b from-radar-light-border to-transparent dark:from-white/15" />
      </div>
    );
  }

  const width = 1200;
  const height = 90;
  const centerX = width / 2;
  const step = width / order.length;

  return (
    <div className="relative mx-auto mt-10 h-16 w-full max-w-5xl sm:h-20" aria-hidden="true">
      <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="h-full w-full overflow-visible">
        <defs>
          {order.map((provider) => {
            const [from, to] = PROVIDER_GRADIENT[provider];
            return (
              <linearGradient key={provider} id={`tds-grad-${provider}`} x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" style={{ stopColor: from }} />
                <stop offset="100%" style={{ stopColor: to }} />
              </linearGradient>
            );
          })}
        </defs>
        {order.map((provider, index) => {
          const startX = step * index + step / 2;
          const path = `M ${startX} 0 C ${startX} 45, ${centerX} 45, ${centerX} ${height}`;
          return (
            <circle key={provider} r="5" fill={`url(#tds-grad-${provider})`}>
              <animateMotion
                dur={`${CYCLE_SECONDS}s`}
                repeatCount="indefinite"
                calcMode="linear"
                keyPoints="0;1;1"
                keyTimes="0;0.4;1"
                path={path}
              />
              <animate
                attributeName="opacity"
                dur={`${CYCLE_SECONDS}s`}
                repeatCount="indefinite"
                calcMode="linear"
                values="0;1;1;0;0"
                keyTimes="0;0.05;0.35;0.42;1"
              />
            </circle>
          );
        })}
      </svg>
    </div>
  );
}

/** The animated six-color gradient border around "Base Radar AI"
 * (PR9.5.1 §2) — a border-only conic-gradient (masked so only the border
 * band paints, never the card's interior) rotating via the registered
 * `--tds-angle` custom property, faded in/out by `tds-ai-sweep` so it
 * never snaps on or flashes. */
function AIHubRing() {
  const prefersReducedMotion = useReducedMotion();
  if (prefersReducedMotion) return null;

  const stops = [
    "var(--color-radar-primary)",
    "#a3e635",
    "#22d3ee",
    "#6366f1",
    "#a855f7",
    "#fb923c",
    "var(--color-radar-primary)",
  ].join(", ");

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute -inset-[3px] rounded-[calc(1.5rem+3px)] [animation:tds-ai-sweep_4s_linear_infinite]"
      style={{
        border: "3px solid transparent",
        background: `conic-gradient(from var(--tds-angle, 0deg), ${stops}) border-box`,
        WebkitMask: "linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0)",
        WebkitMaskComposite: "xor",
        maskComposite: "exclude",
      }}
    />
  );
}

/** One verified-intelligence particle exits the AI hub after processing
 * (PR9.5.1 §2) — white/cyan, active only in the final ~20% of the shared
 * 4s cycle so it reads as a direct hand-off from the ring sweep above. */
function VerifiedOutputConnector() {
  const prefersReducedMotion = useReducedMotion();

  if (prefersReducedMotion) {
    return (
      <div className="relative mx-auto mt-6 h-10 w-px" aria-hidden="true">
        <div className="absolute inset-0 bg-gradient-to-b from-radar-light-border to-transparent dark:from-white/15" />
      </div>
    );
  }

  return (
    <div className="relative mx-auto mt-6 h-10 w-px" aria-hidden="true">
      <div className="absolute inset-0 bg-gradient-to-b from-radar-light-border to-transparent dark:from-white/15" />
      <svg viewBox="0 0 10 40" preserveAspectRatio="none" className="absolute inset-0 h-full w-full overflow-visible">
        <defs>
          <linearGradient id="tds-grad-exit" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" style={{ stopColor: "#ffffff" }} />
            <stop offset="100%" style={{ stopColor: "var(--color-radar-accent)" }} />
          </linearGradient>
        </defs>
        <circle cx="5" cy="0" r="2.5" fill="url(#tds-grad-exit)">
          <animateMotion
            dur={`${CYCLE_SECONDS}s`}
            repeatCount="indefinite"
            calcMode="linear"
            keyPoints="0;0;1"
            keyTimes="0;0.8;1"
            path="M 5 0 L 5 40"
          />
          <animate
            attributeName="opacity"
            dur={`${CYCLE_SECONDS}s`}
            repeatCount="indefinite"
            calcMode="linear"
            values="0;0;1;1;0"
            keyTimes="0;0.78;0.84;0.96;1"
          />
        </circle>
      </svg>
    </div>
  );
}

/**
 * "Trusted Data Sources" (PR9.3.1, reworked PR9.3.X §9, PR9.5.1 §2) —
 * beyond a plain logo grid, this visually communicates the intelligence
 * pipeline: six providers, each its own animated gradient particle,
 * converging on the Base Radar AI hub; the hub's border performs a
 * six-color gradient sweep while "processing"; a single white/cyan
 * particle exits to represent verified output, which then reaches the
 * pipeline's output stages (Signals, Research, Scores, Alerts,
 * Narratives).
 */
export function TrustedDataSources() {
  return (
    <section className="relative mx-auto max-w-7xl px-6 py-16 sm:py-24 lg:px-8">
      <TrustedDataSourcesBackground />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.5 }}
        className="mx-auto max-w-2xl text-center"
      >
        <h2 className="text-3xl font-semibold tracking-tight text-radar-light-text sm:text-4xl dark:text-radar-white">
          Trusted Data Sources
        </h2>
        <p className="mt-3 text-lg text-radar-light-muted dark:text-radar-muted">
          Base Radar continuously aggregates, verifies, and analyzes trusted on-chain and off-chain data to
          generate actionable intelligence for the Base ecosystem.
        </p>
      </motion.div>

      {/* PR9.3.2 §4 — all 6 providers now fit one row on desktop instead of
          wrapping to 4+2, with 3x2 on tablet and 2x3 on mobile; padding and
          icon size trimmed slightly so 6-across stays comfortable at
          narrower card widths. */}
      <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {SOURCE_CARDS.map((card, index) => {
          const { label, Icon } = PROVIDER_BRANDING[card.provider];
          return (
            <motion.div
              key={card.provider}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.4, delay: (index % 6) * 0.05 }}
            >
              <GlassCard className="flex h-full flex-col gap-2.5 p-4 text-center sm:text-left">
                {Icon && <ProviderIcon Icon={Icon} />}
                <div>
                  <h3 className="text-sm font-semibold text-radar-light-text dark:text-radar-white">{label}</h3>
                  <p className="mt-1 text-xs leading-snug text-radar-primary dark:text-radar-accent">{card.role}</p>
                </div>
              </GlassCard>
            </motion.div>
          );
        })}
      </div>

      <ProviderConvergence order={SOURCE_CARDS.map((c) => c.provider)} />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.4, delay: 0.3 }}
        className="relative mx-auto mt-6 max-w-md"
      >
        <AIHubRing />
        <GlassCard
          glow
          className="relative flex flex-col items-center gap-3 border-radar-primary/30 p-8 text-center dark:border-radar-border-hover"
        >
          <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-radar-primary/20 to-radar-accent/20 text-radar-primary dark:text-radar-accent">
            <BrainCircuit className="size-7" aria-hidden="true" />
          </span>
          <div>
            <h3 className="text-lg font-semibold text-radar-light-text dark:text-radar-white">Base Radar AI</h3>
            <p className="mt-1.5 text-sm text-radar-primary dark:text-radar-accent">Cross-provider Intelligence Engine</p>
          </div>
        </GlassCard>
      </motion.div>

      <VerifiedOutputConnector />

      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.4, delay: 0.4 }}
        className="mx-auto mt-6 flex max-w-2xl flex-wrap items-center justify-center gap-x-2 gap-y-2"
      >
        {OUTPUT_STAGES.map((stage, index) => (
          <span key={stage} className="flex items-center gap-2">
            <span className="rounded-full border border-radar-light-border bg-radar-light-surface px-3 py-1 text-xs font-medium text-radar-light-text dark:border-white/10 dark:bg-white/5 dark:text-radar-white">
              {stage}
            </span>
            {index < OUTPUT_STAGES.length - 1 && (
              <ArrowRight className="size-3 text-radar-light-muted/60 dark:text-radar-muted/60" aria-hidden="true" />
            )}
          </span>
        ))}
      </motion.div>
    </section>
  );
}
