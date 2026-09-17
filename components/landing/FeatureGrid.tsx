"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  Activity,
  Bell,
  BookMarked,
  BrainCircuit,
  Compass,
  FileText,
  GitCompare,
  LineChart,
  Radar,
  ShieldAlert,
  Sparkles,
  Wallet,
  Zap,
  type LucideIcon,
} from "lucide-react";

import { GlassCard } from "@/components/ui/GlassCard";

type Feature = {
  icon: LucideIcon;
  title: string;
  description: string;
  href: string;
};

/**
 * Landing Page V2, Section 9 — the single consolidated capability grid,
 * replacing the retired `WhyBaseRadar.tsx` + `Features.tsx` (their overlap
 * was already a known tension — see the removed files' own doc comments —
 * and both carried "Coming soon" items that are now real, shipped
 * features). Exactly 12 real capabilities, each linking to its actual
 * route; no "future"/"coming soon" state anymore, and no
 * Analytics/Performance (internal admin-only tooling, never a public
 * feature).
 */
const FEATURES: Feature[] = [
  {
    icon: Sparkles,
    title: "AI Intelligence",
    description: "Real signals scored for confidence, surfaced from every source Base Radar tracks.",
    href: "/dashboard/alerts",
  },
  {
    icon: Compass,
    title: "Project Intelligence",
    description: "A verified registry of every project on Base — categorized, scored, and cross-checked.",
    href: "/dashboard/projects",
  },
  {
    icon: Wallet,
    title: "Wallet Intelligence",
    description: "Connect a wallet to see your real holdings, USD value, allocation, and portfolio health.",
    href: "/dashboard/wallet",
  },
  {
    icon: LineChart,
    title: "Portfolio Intelligence",
    description: "AI-derived intelligence across your Watchlist — top performers, risks, and recommendations.",
    href: "/dashboard/portfolio",
  },
  {
    icon: BookMarked,
    title: "Watchlists",
    description: "Pin the projects that matter — one active Watchlist drives your Dashboard, Alerts, and Automation.",
    href: "/dashboard/watchlists",
  },
  {
    icon: Bell,
    title: "Alerts",
    description: "Real alerts from five live providers, scoped to your Watchlist or the full ecosystem feed.",
    href: "/dashboard/alerts",
  },
  {
    icon: GitCompare,
    title: "Compare",
    description: "Put up to 4 projects side by side — AI Grade, risk, TVL, governance, and more, at once.",
    href: "/dashboard/compare",
  },
  {
    icon: Zap,
    title: "Automation",
    description: "Toggle preset automation rules — critical security notices, high-priority alerts, and daily digests.",
    href: "/dashboard/automation",
  },
  {
    icon: BrainCircuit,
    title: "AI Workspace",
    description: "A read-only evidence dashboard for what Base Radar currently believes about Base, and why.",
    href: "/dashboard/ai-workspace",
  },
  {
    icon: FileText,
    title: "AI Reports",
    description: "Daily Brief, Weekly, Monthly, Market Outlook, Ecosystem, and Opportunity reports, on demand.",
    href: "/dashboard/reports",
  },
  {
    icon: ShieldAlert,
    title: "Risk Analysis",
    description: "Factor-based risk scoring across your wallet and every tracked project — never a black box.",
    href: "/dashboard/wallet",
  },
  {
    icon: Radar,
    title: "Ecosystem Intelligence",
    description: "Market sentiment, ecosystem health, and narrative trends across all of Base, in one place.",
    href: "/dashboard",
  },
];

export function FeatureGrid() {
  return (
    <section id="features" className="mx-auto max-w-7xl scroll-mt-24 px-6 py-16 sm:py-24 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.5 }}
        className="mx-auto max-w-2xl text-center"
      >
        <h2 className="text-3xl font-semibold tracking-tight text-radar-light-text sm:text-4xl dark:text-radar-white">
          Everything you need to understand Base.
        </h2>
        <p className="mt-2 text-base text-radar-light-muted dark:text-radar-muted">
          One platform, twelve real capabilities — every card here is a live, shipped part of Base Radar.
        </p>
      </motion.div>

      <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {FEATURES.map((feature, index) => (
          <motion.div
            key={feature.title}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.4, delay: (index % 4) * 0.06 }}
          >
            <Link href={feature.href} className="block h-full">
              <GlassCard className="flex h-full flex-col gap-2 p-4">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-radar-primary/15 to-radar-accent/15 text-radar-primary dark:text-radar-accent">
                  <feature.icon className="size-5" aria-hidden="true" />
                </span>
                <div className="flex-1">
                  <h3 className="text-base font-semibold text-radar-light-text dark:text-radar-white">{feature.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-radar-light-muted dark:text-radar-muted">
                    {feature.description}
                  </p>
                </div>
                <span className="flex items-center gap-1.5 text-xs font-medium text-radar-primary dark:text-radar-accent">
                  <Activity className="size-3 shrink-0" aria-hidden="true" />
                  Live in Dashboard
                </span>
              </GlassCard>
            </Link>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
