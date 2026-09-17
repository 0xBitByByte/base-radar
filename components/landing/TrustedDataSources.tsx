"use client";

import { motion } from "framer-motion";
import { BrainCircuit, Vote } from "lucide-react";

import { PipelineFlow, type PipelineInputNode } from "@/components/landing/PipelineFlow";
import { PROVIDER_BRANDING } from "@/lib/branding/providers";
import type { BrandIconComponent } from "@/lib/branding/types";
import type { ProviderName } from "@/lib/providers/common/types";

type SourceCard = {
  key: string;
  label: string;
  Icon: BrandIconComponent;
  /** The provider's short, concrete role in the pipeline — "what it actually supplies," matching `PROVIDER_BRANDING`'s own facts, just condensed to card-sized copy. */
  role: string;
  gradient: [string, string];
};

/**
 * The seven real, active data sources this app integrates. Six come from
 * `PROVIDER_BRANDING`/`ProviderName` (this codebase's canonical provider
 * registry); Snapshot is genuinely real and actively used (real-time voting
 * participation in Compare, governance highlights in Executive Summary,
 * `lib/providers/snapshot/service.ts`) but isn't in `ProviderName` yet —
 * that's core provider infrastructure, out of scope to widen for a landing
 * page redesign, so Snapshot is typed independently here rather than routed
 * through `PROVIDER_BRANDING`.
 */
const PROVIDER_KEYS: ProviderName[] = ["base", "blockscout", "coingecko", "defillama", "dexscreener", "github"];

const PROVIDER_GRADIENT: Record<ProviderName, [string, string]> = {
  base: ["var(--color-radar-primary)", "var(--color-radar-accent)"],
  coingecko: ["#a3e635", "#10b981"],
  defillama: ["#22d3ee", "#3b82f6"],
  blockscout: ["#a855f7", "#3b82f6"],
  github: ["#6366f1", "#8b5cf6"],
  dexscreener: ["#fb923c", "#ec4899"],
};

const PROVIDER_ROLE: Record<ProviderName, string> = {
  base: "Official Ecosystem Data",
  blockscout: "On-chain Intelligence",
  coingecko: "Market Data",
  defillama: "TVL Analytics",
  dexscreener: "DEX Activity",
  github: "Developer Activity",
};

const SOURCE_CARDS: SourceCard[] = [
  ...PROVIDER_KEYS.map((provider) => ({
    key: provider,
    label: PROVIDER_BRANDING[provider].label,
    Icon: PROVIDER_BRANDING[provider].Icon ?? Vote,
    role: PROVIDER_ROLE[provider],
    gradient: PROVIDER_GRADIENT[provider],
  })),
  { key: "snapshot", label: "Snapshot", Icon: Vote, role: "Governance Data", gradient: ["#ec4899", "#8b5cf6"] },
];

/**
 * What the AI engine actually extracts from these sources — real
 * intelligence-signal categories, not abstract pipeline-stage names.
 * Visual refinement pass: the prior "Signals/Research/Alerts/Scores/
 * Narratives" list described process stages, not what a visitor would
 * recognize as concrete output; this list is the real vocabulary
 * `lib/dashboard/commandCenter.ts`'s `RECOMMENDATION_CATEGORY_LABEL`
 * defines (TVL, Whale Activity, Governance, Security, Developer Activity),
 * plus DEX Activity — DexScreener's own real role in `PROVIDER_ROLE` above
 * — standing in for this section's own market-activity signal rather than
 * duplicating Market Momentum, which isn't itself a named provider role
 * here.
 */
const OUTPUT_STAGES = ["TVL", "Whale Activity", "Governance", "Security", "Developer Activity", "DEX Activity"];

/** Faint grid + one soft radial glow — same restrained language as `HeroBackground`, deliberately lighter (no drifting particles) per this section's own "no heavy backgrounds" brief. */
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
    <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-radar-primary/15 to-radar-accent/15 text-radar-primary dark:text-radar-accent">
      <Icon className="size-3.5" aria-hidden="true" />
    </span>
  );
}

/**
 * Landing Page V2, Section 8 — "Built on trusted Base ecosystem data."
 * Seven real providers (six from the app's canonical provider registry plus
 * Snapshot, see `SOURCE_CARDS`' own doc comment), each its own animated
 * gradient particle converging on the Base Radar AI hub
 * (`PipelineFlow`) — never implies ownership of any third-party dataset,
 * only that Base Radar aggregates and cross-checks them.
 */
export function TrustedDataSources() {
  const pipelineInputs: PipelineInputNode[] = SOURCE_CARDS.map((card) => ({ key: card.key, gradient: card.gradient }));

  return (
    <section id="trusted-data" className="relative mx-auto max-w-7xl px-6 py-16 sm:py-24 lg:px-8">
      <TrustedDataSourcesBackground />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.5 }}
        className="mx-auto max-w-2xl text-center"
      >
        <h2 className="text-3xl font-semibold tracking-tight text-radar-light-text sm:text-4xl dark:text-radar-white">
          Built on trusted Base ecosystem data.
        </h2>
        <p className="mt-3 text-lg text-radar-light-muted dark:text-radar-muted">
          Base Radar brings fragmented ecosystem data together into one unified intelligence experience — never a
          replacement for these sources, an aggregation and cross-check layer on top of them.
        </p>
      </motion.div>

      {/*
        Visual refinement pass — these seven sources are real inputs to the
        pipeline below, not this section's own visual focus (the point of
        "Built on trusted Base ecosystem data" is the extraction/analysis
        Base Radar performs, not a logo wall). Downgraded from seven
        full `GlassCard`s to compact, borderless pills under a plain
        "Sources" label — every real fact (label + role) is preserved,
        just presented with far less visual weight than the pipeline/hub/
        signal-output content beneath it.
      */}
      <p className="mt-10 text-center text-[11px] font-semibold tracking-wide text-radar-light-muted uppercase sm:text-left dark:text-radar-muted">
        Sources
      </p>
      {/*
        Visual refinement pass — seven pills at full label+role width don't
        fit one row even at desktop (max-w-7xl), and wrapping to two rows
        read as clutter. Made this a continuously-running marquee instead,
        the same duplicated-content-loop technique `KeyMetrics.tsx`'s own
        live ticker uses, but `br-ticker-ltr` (globals.css) — `br-ticker`'s
        own default direction runs right-to-left, confirmed by tracking a
        real pill's pixel position across screenshots (see that keyframe's
        doc comment); this row needs the opposite, asked for explicitly.
        Pauses on hover (`group-hover:[animation-play-state:paused]`) so
        the labels are readable, resumes the moment the pointer leaves.
        Every real fact (label + role) stays — nothing dropped, just
        always in exactly one row.
      */}
      <div className="group relative mt-3 overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_4%,black_96%,transparent)]">
        <div className="flex w-max animate-[br-ticker-ltr_34s_linear_infinite] items-center gap-2 group-hover:[animation-play-state:paused] motion-reduce:animate-none">
          {[...SOURCE_CARDS, ...SOURCE_CARDS].map((card, index) => (
            <div
              key={`${card.key}-${index}`}
              className="flex shrink-0 items-center gap-2 rounded-full border border-radar-light-border bg-radar-light-text/[0.02] py-1.5 pr-3.5 pl-1.5 dark:border-white/10 dark:bg-white/[0.03]"
            >
              <ProviderIcon Icon={card.Icon} />
              <span className="text-xs font-medium whitespace-nowrap text-radar-light-text dark:text-radar-white">{card.label}</span>
              {/*
                The role tag's dot is tinted with this provider's own
                convergence-particle gradient (see `PROVIDER_GRADIENT`,
                `pipelineInputs` below) — the same color that carries this
                provider's particle into the AI hub, so the tag reads as
                "the one signal Base Radar AI actually extracts from this
                source," not just a label.
              */}
              <span className="flex items-center gap-1 text-xs whitespace-nowrap text-radar-light-muted dark:text-radar-muted">
                <span className="size-1 shrink-0 rounded-full" style={{ background: card.gradient[0] }} aria-hidden="true" />
                {card.role}
              </span>
            </div>
          ))}
        </div>
      </div>

      <PipelineFlow
        inputs={pipelineInputs}
        hubIcon={BrainCircuit}
        hubTitle="Base Radar AI"
        hubSubtitle="Cross-provider Intelligence Engine"
        outputStages={OUTPUT_STAGES}
      />
    </section>
  );
}
