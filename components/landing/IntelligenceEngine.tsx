"use client";

import { motion } from "framer-motion";
import { BrainCircuit, Blocks, LineChart, Radar, Wallet } from "lucide-react";

import { PipelineFlow, type PipelineInputNode } from "@/components/landing/PipelineFlow";

type EngineInput = { key: string; label: string; Icon: typeof Blocks; gradient: [string, string] };

const ENGINE_INPUTS: EngineInput[] = [
  { key: "onchain", label: "On-chain Data", Icon: Blocks, gradient: ["var(--color-radar-primary)", "var(--color-radar-accent)"] },
  { key: "market", label: "Market Data", Icon: LineChart, gradient: ["#a3e635", "#10b981"] },
  { key: "project", label: "Project Data", Icon: Radar, gradient: ["#22d3ee", "#3b82f6"] },
  { key: "wallet", label: "Wallet Data", Icon: Wallet, gradient: ["#a855f7", "#3b82f6"] },
];

const OUTPUT_STAGES = ["Verified", "Scored", "Decision-Ready Intelligence"];

/**
 * Landing Page V2, Section 3 — "One intelligence layer. Everything
 * connected." On-chain, market, project, and wallet data converge on Base
 * Radar's AI analysis layer, which turns them into decision-ready
 * intelligence — the same `PipelineFlow` visual `TrustedDataSources.tsx`
 * uses for its own 7-provider convergence, reused here rather than
 * duplicated. Copy is deliberately about aggregation and analysis, never
 * ownership — Base Radar doesn't control or own any of the underlying
 * on-chain/market/project/wallet data it reads.
 */
export function IntelligenceEngine() {
  const pipelineInputs: PipelineInputNode[] = ENGINE_INPUTS.map((input) => ({ key: input.key, gradient: input.gradient }));

  return (
    <section id="intelligence-engine" className="relative mx-auto max-w-7xl px-6 py-16 sm:py-24 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.5 }}
        className="mx-auto max-w-2xl text-center"
      >
        <h2 className="text-3xl font-semibold tracking-tight text-radar-light-text sm:text-4xl dark:text-radar-white">
          One intelligence layer. Everything connected.
        </h2>
        <p className="mt-3 text-lg text-radar-light-muted dark:text-radar-muted">
          On-chain activity, market data, project intelligence, and wallet activity — read, cross-checked, and
          turned into a single, decision-ready view.
        </p>
      </motion.div>

      {/*
        Visual refinement pass — the "charging" fill overlay this section
        used to have was removed per explicit feedback ("remove the fill
        animation"). Plain static cards again; the convergence particles
        below already carry the "data flows to AI Analysis" idea.
      */}
      <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {ENGINE_INPUTS.map((input, index) => (
          <motion.div
            key={input.key}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.4, delay: index * 0.06 }}
            className="flex flex-col items-center gap-2 rounded-2xl border border-radar-light-border bg-radar-light-text/[0.02] p-4 text-center dark:border-white/10 dark:bg-white/[0.03]"
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-radar-primary/15 to-radar-accent/15 text-radar-primary dark:text-radar-accent">
              <input.Icon className="size-4.5" aria-hidden="true" />
            </span>
            <span className="text-sm font-medium text-radar-light-text dark:text-radar-white">{input.label}</span>
          </motion.div>
        ))}
      </div>

      <PipelineFlow
        inputs={pipelineInputs}
        hubIcon={BrainCircuit}
        hubTitle="AI Analysis"
        hubSubtitle="Cross-checked, scored, decision-ready"
        outputStages={OUTPUT_STAGES}
      />
    </section>
  );
}
