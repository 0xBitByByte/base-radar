"use client";

import { motion } from "framer-motion";
import { ArrowRight, Landmark, ShieldCheck, TrendingUp, Wallet as WalletIcon, Zap, type LucideIcon } from "lucide-react";

import { GlassCard } from "@/components/ui/GlassCard";
import { GlowBadge, type GlowBadgeColor } from "@/components/ui/GlowBadge";

type OpportunityCard = {
  project: string;
  category: "TVL" | "Whale Activity" | "Governance" | "Security" | "Developer Activity" | "Market Momentum";
  icon: LucideIcon;
  color: GlowBadgeColor;
  reason: string;
  confidence: number;
  ctaLabel: string;
};

/**
 * Illustrative cards only — the real feature is `TodaysTopInsight.tsx`
 * ("AI Command Center"), which needs a real, signed-in Watchlist to
 * produce anything (a static marketing page has none). Category set is the
 * real, complete 6-category vocabulary
 * `lib/dashboard/commandCenter.ts`'s `RECOMMENDATION_CATEGORY_LABEL`
 * defines (TVL, Whale Activity, Governance, Security, Developer Activity,
 * Market Momentum) — "liquidity" is a defined-but-dead category (no
 * provider produces it) and is never shown; "Repository Health" is a
 * display override for GitHub-sourced Security alerts specifically, not a
 * 7th category, so it's represented here as a Security-category card whose
 * reason text names a repository event, matching that real nuance.
 */
const TOP_OPPORTUNITIES: OpportunityCard[] = [
  {
    project: "Moonwell",
    category: "Governance",
    icon: Landmark,
    color: "primary",
    reason: "Proposal passed — treasury allocation update",
    confidence: 92,
    ctaLabel: "View Proposal",
  },
  {
    project: "Aerodrome Finance",
    category: "TVL",
    icon: WalletIcon,
    color: "success",
    reason: "TVL increased 4.2% in 24h",
    confidence: 88,
    ctaLabel: "Analyze TVL",
  },
  {
    project: "Moonbase Protocol",
    category: "Security",
    icon: ShieldCheck,
    color: "accent",
    reason: "Contract verified on Blockscout",
    confidence: 95,
    ctaLabel: "Review Risk",
  },
];

const WATCH_CLOSELY: OpportunityCard[] = [
  {
    project: "Compound",
    category: "Whale Activity",
    icon: Zap,
    color: "warning",
    reason: "$2.1M transferred to a new wallet",
    confidence: 74,
    ctaLabel: "View Activity",
  },
  {
    project: "Seamless Protocol",
    category: "Market Momentum",
    icon: TrendingUp,
    color: "danger",
    reason: "Price down 6.8% against 24h average",
    confidence: 68,
    ctaLabel: "Research Project",
  },
];

function OpportunityCardView({ card, index }: { card: OpportunityCard; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.4, delay: (index % 3) * 0.06 }}
    >
      <GlassCard className="flex h-full flex-col gap-3 p-5">
        <div className="flex items-center justify-between gap-2">
          <GlowBadge color={card.color}>
            <card.icon className="size-3.5" aria-hidden="true" />
            {card.category}
          </GlowBadge>
          <span className="text-xs font-medium text-radar-light-muted dark:text-radar-muted">{card.confidence}% confidence</span>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-radar-light-text dark:text-radar-white">{card.project}</h3>
          <p className="mt-1 text-sm leading-relaxed text-radar-light-muted dark:text-radar-muted">{card.reason}</p>
        </div>
        <span className="mt-auto flex items-center gap-1.5 text-sm font-medium text-radar-primary dark:text-radar-accent">
          {card.ctaLabel}
          <ArrowRight className="size-3.5" aria-hidden="true" />
        </span>
      </GlassCard>
    </motion.div>
  );
}

/**
 * Landing Page V2, Section 4 — "Stop watching the blockchain. Start knowing
 * what matters." Represents the real AI Command Center
 * (`components/dashboard/TodaysTopInsight.tsx`), grouped under its exact
 * real headings — "Top Opportunities" / "Watch Closely" — with illustrative
 * cards, clearly presentational: real category vocabulary, real per-card
 * shape (category, reason, confidence, CTA), fictional project
 * names/numbers.
 */
export function AICommandCenter() {
  return (
    <section id="ai-command-center" className="mx-auto max-w-7xl px-6 py-16 sm:py-24 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.5 }}
        className="mx-auto max-w-2xl text-center"
      >
        <h2 className="text-3xl font-semibold tracking-tight text-radar-light-text sm:text-4xl dark:text-radar-white">
          Stop watching the blockchain. Start knowing what matters.
        </h2>
        <p className="mt-3 text-lg text-radar-light-muted dark:text-radar-muted">
          The AI Command Center surfaces what&apos;s genuinely worth your attention across TVL, whale activity,
          governance, security, developer activity, and market momentum — not everything, just what matters.
        </p>
      </motion.div>

      <div className="mt-10">
        <h3 className="mb-4 text-xs font-semibold tracking-wide text-radar-light-muted uppercase dark:text-radar-muted">
          Top Opportunities
        </h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {TOP_OPPORTUNITIES.map((card, index) => (
            <OpportunityCardView key={card.project} card={card} index={index} />
          ))}
        </div>
      </div>

      <div className="mt-8">
        <h3 className="mb-4 text-xs font-semibold tracking-wide text-radar-light-muted uppercase dark:text-radar-muted">
          Watch Closely
        </h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {WATCH_CLOSELY.map((card, index) => (
            <OpportunityCardView key={card.project} card={card} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
}
