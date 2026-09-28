"use client";

import { motion } from "framer-motion";
import { ArrowRight, BrainCircuit, Blocks, LineChart, Radar, Wallet, type LucideIcon } from "lucide-react";

import { CircuitTraces, HubChip } from "@/components/landing/HubChip";

type EngineInput = { key: string; label: string; description: string; Icon: LucideIcon };

const LEFT_INPUTS: EngineInput[] = [
  { key: "onchain", label: "On-chain Data", description: "Real-time blockchain activity and network insights", Icon: Blocks },
  { key: "market", label: "Market Data", description: "Live prices, trends and market intelligence", Icon: LineChart },
];

const RIGHT_INPUTS: EngineInput[] = [
  { key: "project", label: "Project Data", description: "Deep project intelligence and ecosystem insights", Icon: Radar },
  { key: "wallet", label: "Wallet Data", description: "Wallet activity, holdings and on-chain behavior", Icon: Wallet },
];

const OUTPUT_STAGES = ["Verified", "Scored", "Decision-Ready Intelligence"];

/** One input IC module — solid surface (never the translucent `GlassCard` treatment), a cyan border, icon, title, and a concrete one-line description of what it actually feeds the hub. Theme-adaptive like the rest of the page. */
function InputCard({ input, side }: { input: EngineInput; side: "left" | "right" }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: side === "left" ? -16 : 16 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.4 }}
      className="relative rounded-2xl border border-radar-primary/30 bg-radar-light-card p-5 shadow-[0_0_34px_-10px_rgba(6,184,212,0.25)] dark:border-radar-accent/40 dark:bg-radar-card dark:shadow-[0_0_34px_-10px_rgba(6,184,212,0.55)]"
    >
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-radar-primary/25 to-radar-accent/25 text-radar-primary dark:text-radar-accent">
          <input.Icon className="size-4.5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-radar-light-text dark:text-white">{input.label}</p>
          <p className="mt-1 text-sm text-radar-light-muted dark:text-radar-muted">{input.description}</p>
        </div>
        <ArrowRight className="mt-1 hidden size-4 shrink-0 text-radar-primary dark:text-radar-accent sm:block" aria-hidden="true" />
      </div>
    </motion.div>
  );
}

/**
 * Landing Page V2, Section 3 — "One intelligence layer. Everything
 * connected." On-chain, market, project, and wallet data feed Base Radar's
 * AI analysis layer, which turns them into decision-ready intelligence.
 *
 * Visual-review reference: this section was rebuilt from a generic
 * "4-cards-in-a-row above a hub" pipeline (the shared `PipelineFlow`
 * component `TrustedDataSources.tsx` still uses for its own, genuinely
 * different 7-provider case) into a bespoke, fixed composition — two input
 * modules flanking the hub on the left, two on the right — specifically
 * because that left/right relationship and the opaque "IC module" card
 * treatment don't generalize to N inputs the way `PipelineFlow` needs to for its other caller. Kept local to this
 * file rather than folded back into `PipelineFlow` for that reason.
 */
export function IntelligenceEngine() {
  return (
    <section id="intelligence-engine" className="relative isolate mx-auto max-w-7xl overflow-hidden px-6 py-16 sm:py-24 lg:px-8">
      <div className="relative">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
          className="mx-auto max-w-2xl text-center"
        >
          <h2 className="text-3xl font-semibold tracking-tight text-radar-light-text sm:text-4xl dark:text-radar-white">
            One intelligence layer. Everything
            <br />
            <span className="text-radar-primary dark:text-radar-accent">connected.</span>
          </h2>
          <p className="mt-3 text-lg text-radar-light-muted dark:text-radar-muted">
            On-chain activity, market data, project intelligence, and wallet activity — read, cross-checked and
            turned into a single, decision-ready view.
          </p>
        </motion.div>

        <div className="mt-14 grid grid-cols-1 items-center gap-4 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:grid-rows-2 lg:gap-x-16 lg:gap-y-6 xl:gap-x-24">
          <div className="lg:col-start-1 lg:row-start-1">
            <InputCard input={LEFT_INPUTS[0]} side="left" />
          </div>
          <div className="lg:col-start-1 lg:row-start-2">
            <InputCard input={LEFT_INPUTS[1]} side="left" />
          </div>

          <div className="relative lg:col-start-2 lg:row-span-2 lg:row-start-1">
            <CircuitTraces />
            <HubChip icon={BrainCircuit} title="AI Analysis" subtitle="Cross-checked, scored, decision-ready" pinsFromTraces />
          </div>

          <div className="lg:col-start-3 lg:row-start-1">
            <InputCard input={RIGHT_INPUTS[0]} side="right" />
          </div>
          <div className="lg:col-start-3 lg:row-start-2">
            <InputCard input={RIGHT_INPUTS[1]} side="right" />
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="mx-auto mt-14 flex max-w-full flex-wrap items-center justify-center gap-x-2 gap-y-2 px-1 lg:mt-20"
        >
          {OUTPUT_STAGES.map((stage, index) => (
            <span key={stage} className="flex shrink-0 items-center gap-2">
              <span className="rounded-full border border-radar-primary/25 bg-radar-light-elevated px-3 py-1 text-xs font-medium whitespace-nowrap text-radar-light-text dark:border-radar-accent/25 dark:bg-radar-elevated dark:text-white">
                {stage}
              </span>
              {index < OUTPUT_STAGES.length - 1 && (
                <span className="text-radar-light-muted/60 dark:text-radar-muted/60" aria-hidden="true">
                  →
                </span>
              )}
            </span>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
