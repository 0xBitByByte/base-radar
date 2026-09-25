"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, type LucideIcon } from "lucide-react";

import { CircuitTraces, HubChip } from "@/components/landing/HubChip";

type PipelineFlowProps = {
  hubIcon: LucideIcon;
  hubTitle: string;
  hubSubtitle: string;
  outputStages: string[];
};

/** Cycle length of the exit particle below. */
const CYCLE_SECONDS = 7;

/** One output particle exits the hub after "processing" — white/cyan, active only in the final ~20% of its cycle so it reads as a hand-off out of the chip above. */
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
 * "Hub → outputs" pipeline visual for `TrustedDataSources.tsx`: the shared
 * `HubChip` with its routed `CircuitTraces` (same treatment the "AI Analysis"
 * section uses), an exit-particle
 * connector, and the output-stage row.
 */
export function PipelineFlow({ hubIcon: HubIcon, hubTitle, hubSubtitle, outputStages }: PipelineFlowProps) {
  return (
    <>
      <div className="relative mt-10 lg:mt-24 lg:mb-16">
        <CircuitTraces />
        <HubChip icon={HubIcon} title={hubTitle} subtitle={hubSubtitle} pinsFromTraces />
      </div>

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
              <span className="rounded-full border border-radar-accent/25 bg-radar-elevated px-3 py-1 text-xs font-medium whitespace-nowrap text-white">
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
