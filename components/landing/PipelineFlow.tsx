"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, type LucideIcon } from "lucide-react";

import { GlassCard } from "@/components/ui/GlassCard";

export type PipelineInputNode = {
  key: string;
  /** Two-stop gradient for this input's converging particle. */
  gradient: [string, string];
};

type PipelineFlowProps = {
  inputs: PipelineInputNode[];
  hubIcon: LucideIcon;
  hubTitle: string;
  hubSubtitle: string;
  outputStages: string[];
};

/**
 * Shared cycle length for the convergence particles, the hub ring sweep
 * (`tds-ai-sweep` in globals.css), and the exit particle — all three timed
 * off this one duration so they hand off in a single readable sequence
 * every loop: particles converge (0-40%), the hub "processes" (35-85%),
 * one particle exits (80-100%). Slowed from 4s → 7s per visual review
 * ("make it slow") — also update the two hardcoded `_7s_` Tailwind
 * arbitrary-animation classes below (`HubGlowPulse`/`HubRing`) if this
 * changes again; they can't read this constant (Tailwind needs the
 * literal text present in source to generate the CSS).
 */
const CYCLE_SECONDS = 7;

/**
 * N inputs → one hub, each input its own animated gradient particle
 * converging on the hub below. Pure SVG/SMIL (`animateMotion`) so the
 * motion compiles to a transform, not a layout property, and needs no JS
 * driver. Extracted from `TrustedDataSources.tsx`'s original
 * provider-convergence visual (PR9.5.1 §2) so `IntelligenceEngine.tsx` can
 * reuse the identical pipeline language for its own on-chain/market/
 * project/wallet/AI inputs instead of a second, duplicated implementation.
 */
function InputConvergence({ inputs }: { inputs: PipelineInputNode[] }) {
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
  const step = width / inputs.length;

  return (
    <div className="relative mx-auto mt-10 h-16 w-full max-w-5xl sm:h-20" aria-hidden="true">
      <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="h-full w-full overflow-visible">
        <defs>
          {inputs.map((input) => {
            const [from, to] = input.gradient;
            return (
              <linearGradient key={input.key} id={`pipeline-grad-${input.key}`} x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" style={{ stopColor: from }} />
                <stop offset="100%" style={{ stopColor: to }} />
              </linearGradient>
            );
          })}
        </defs>
        {inputs.map((input, index) => {
          const startX = step * index + step / 2;
          const midY = height * 0.55;
          // Right-angle "circuit board" routing (drop → horizontal run → drop into the hub)
          // instead of the earlier smooth bezier curve — visual-review note was that the
          // curved lines read as generic connector art, not a circuit. Solid (not dashed)
          // and at real opacity, so the trace is "always visible," not just texture.
          const path = `M ${startX} 0 V ${midY} H ${centerX} V ${height}`;
          return (
            <g key={input.key}>
              {/*
                Visual refinement pass — the trace and its static via-dots
                were colored per-input (the same gradient as the traveling
                particle), which read as busy/noisy. Only the ANIMATED
                particle stays colorful now; the static line + entry/bend
                dots are a mild neutral, so color reads as "something is
                moving," not decoration on every line.
              */}
              {/* Visual review: "reduce the line visibility 90%" — dropped from opacity-40/30 to near-invisible; texture only, the traveling particle carries the "connection" idea. */}
              <path
                d={path}
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-radar-light-muted opacity-[0.04] dark:text-white dark:opacity-[0.03]"
              />
              <circle cx={startX} cy="0" r="2.5" fill="currentColor" className="text-radar-light-muted opacity-[0.05] dark:text-white dark:opacity-[0.04]" />
              <circle cx={startX} cy={midY} r="2" fill="currentColor" className="text-radar-light-muted opacity-[0.05] dark:text-white dark:opacity-[0.04]" />
              <circle r="5" fill={`url(#pipeline-grad-${input.key})`}>
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
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/** Three evenly-spaced positions along each of the hub card's four edges — same set reused for every side, so the trace count/rhythm is identical top/bottom/left/right instead of the corner-vs-midpoint mix an earlier version used (visual review: "circuit board and connect lines looks uneven"). */
const CIRCUIT_STUB_POSITIONS = [22, 50, 78];
const CIRCUIT_STUB_LENGTH = 14;

/**
 * Static "circuit board" backdrop radiating from the hub card's own edges —
 * 12 identical straight stubs (3 per side, same length/style on every
 * side) each ending in a via-dot that pulses gently (`br-circuit-pulse`,
 * staggered per stub) — "mild animation," not another traveling particle
 * competing with the convergence lines above. Plain divs, not SVG: a
 * straight perpendicular stub needs no path math, and it sidesteps the
 * exact bug an earlier stretched-SVG version hit (trace endpoints landing
 * *inside* the card's own opaque background — see git history). "Mild"
 * opacity throughout — texture behind the hub, never competing with the
 * particles or the arrival glow below.
 */
function HubCircuitBackground() {
  const line = "absolute bg-radar-primary/30 dark:bg-radar-accent/40";
  const dot =
    "absolute size-1.5 rounded-full bg-radar-primary/55 dark:bg-radar-accent/60 [animation:br-circuit-pulse_2.6s_ease-in-out_infinite] motion-reduce:animate-none";

  return (
    <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden="true">
      {CIRCUIT_STUB_POSITIONS.map((pos, i) => (
        <span
          key={`top-${pos}`}
          className={`${line} bottom-full w-px -translate-x-1/2`}
          style={{ left: `${pos}%`, height: CIRCUIT_STUB_LENGTH }}
        >
          <span className={dot} style={{ top: -6, left: "50%", transform: "translateX(-50%)", animationDelay: `${i * 0.25}s` }} />
        </span>
      ))}
      {CIRCUIT_STUB_POSITIONS.map((pos, i) => (
        <span
          key={`bottom-${pos}`}
          className={`${line} top-full w-px -translate-x-1/2`}
          style={{ left: `${pos}%`, height: CIRCUIT_STUB_LENGTH }}
        >
          <span className={dot} style={{ bottom: -6, left: "50%", transform: "translateX(-50%)", animationDelay: `${i * 0.25 + 0.4}s` }} />
        </span>
      ))}
      {CIRCUIT_STUB_POSITIONS.map((pos, i) => (
        <span
          key={`left-${pos}`}
          className={`${line} right-full h-px -translate-y-1/2`}
          style={{ top: `${pos}%`, width: CIRCUIT_STUB_LENGTH }}
        >
          <span className={dot} style={{ left: -6, top: "50%", transform: "translateY(-50%)", animationDelay: `${i * 0.25 + 0.8}s` }} />
        </span>
      ))}
      {CIRCUIT_STUB_POSITIONS.map((pos, i) => (
        <span
          key={`right-${pos}`}
          className={`${line} left-full h-px -translate-y-1/2`}
          style={{ top: `${pos}%`, width: CIRCUIT_STUB_LENGTH }}
        >
          <span className={dot} style={{ right: -6, top: "50%", transform: "translateY(-50%)", animationDelay: `${i * 0.25 + 1.2}s` }} />
        </span>
      ))}
    </div>
  );
}

/** Continuously rotating conic-gradient border around the hub card — border-only (masked so only the border band paints), driven by the registered `--tds-angle` custom property via `tds-ai-sweep`. Always on now (visual review: "running lights around AI Analysis"), not gated to the particles' own convergence window. */
function HubRing() {
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
      className="pointer-events-none absolute -inset-[1.5px] rounded-[calc(1.5rem+1.5px)] [animation:tds-ai-sweep_7s_linear_infinite]"
      style={{
        border: "1.5px solid transparent",
        background: `conic-gradient(from var(--tds-angle, 0deg), ${stops}) border-box`,
        WebkitMask: "linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0)",
        WebkitMaskComposite: "xor",
        maskComposite: "exclude",
      }}
    />
  );
}

/** One output particle exits the hub after "processing" — white/cyan, active only in the final ~20% of the shared cycle so it reads as a direct hand-off from the ring sweep above. */
function OutputConnector() {
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
          <linearGradient id="pipeline-grad-exit" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" style={{ stopColor: "#ffffff" }} />
            <stop offset="100%" style={{ stopColor: "var(--color-radar-accent)" }} />
          </linearGradient>
        </defs>
        <circle cx="5" cy="0" r="2.5" fill="url(#pipeline-grad-exit)">
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
 * Generic "N inputs → one hub → M outputs" pipeline visual — the shared
 * implementation behind both `TrustedDataSources.tsx` (7 providers → Base
 * Radar AI → 5 output stages) and `IntelligenceEngine.tsx` (5 data
 * categories → Base Radar AI → decision-ready intelligence), extracted so
 * the two sections reuse one ~150-line implementation instead of each
 * carrying its own copy.
 */
export function PipelineFlow({ inputs, hubIcon: HubIcon, hubTitle, hubSubtitle, outputStages }: PipelineFlowProps) {
  return (
    <>
      <InputConvergence inputs={inputs} />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.4, delay: 0.3 }}
        className="isolate relative mx-auto mt-6 max-w-md"
      >
        <HubCircuitBackground />
        <HubRing />
        <GlassCard className="relative flex flex-col items-center gap-3 border-radar-primary/30 p-8 text-center dark:border-radar-border-hover">
          <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-radar-primary/20 to-radar-accent/20 text-radar-primary dark:text-radar-accent">
            <HubIcon className="size-7" aria-hidden="true" />
          </span>
          <div>
            <h3 className="text-lg font-semibold text-radar-light-text dark:text-radar-white">{hubTitle}</h3>
            <p className="mt-1.5 text-sm text-radar-primary dark:text-radar-accent">{hubSubtitle}</p>
          </div>
        </GlassCard>
      </motion.div>

      <OutputConnector />

      {/*
        Visual refinement pass — at 6 output stages (Trusted Data Sources)
        this row never fit one line at any real viewport width even
        unwrapped; wrapping to two lines broke the "single chain of custody"
        reading of provider → hub → signal. `flex-nowrap` + `w-max` (never
        stretched wider than its content) inside an `overflow-x-auto`
        viewport guarantees one row always: centered via `mx-auto` when it
        fits (Intelligence Engine's 3-stage case), scrollable without ever
        wrapping when it doesn't (Trusted Data Sources' 6-stage case).
      */}
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.4, delay: 0.4 }}
        className="mx-auto mt-6 max-w-full overflow-x-auto px-1 pb-1 [-webkit-overflow-scrolling:touch] [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <div className="mx-auto flex w-max flex-nowrap items-center gap-x-2">
          {outputStages.map((stage, index) => (
            <span key={stage} className="flex shrink-0 items-center gap-2">
              <span className="rounded-full border border-radar-light-border bg-radar-light-surface px-3 py-1 text-xs font-medium whitespace-nowrap text-radar-light-text dark:border-white/10 dark:bg-white/5 dark:text-radar-white">
                {stage}
              </span>
              {index < outputStages.length - 1 && (
                <ArrowRight className="size-3 shrink-0 text-radar-light-muted/60 dark:text-radar-muted/60" aria-hidden="true" />
              )}
            </span>
          ))}
        </div>
      </motion.div>
    </>
  );
}
