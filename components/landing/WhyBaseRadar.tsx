"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  BrainCircuit,
  ShieldCheck,
  Wallet,
  Eye,
  Bell,
  Radio,
  TrendingUp,
  LayoutGrid,
  Compass,
  Fingerprint,
  Network,
  Code2,
  type LucideIcon,
} from "lucide-react";

import { GlassCard } from "@/components/ui/GlassCard";
import { GlowBadge } from "@/components/ui/GlowBadge";
import { cn } from "@/lib/utils";

type Feature = {
  icon: LucideIcon;
  title: string;
  description: string;
  /** A short supporting number/fact under the description — a concrete reason to believe the card's claim, not decoration. */
  metric: string;
  href: string;
  status?: "future";
};

/**
 * PR9.3.2 §3 — hand-ordered so every LIVE card is a contiguous block first,
 * every COMING SOON card a contiguous block last. This reorders the same
 * 12 features (9 live / 3 future, the actual current product status — see
 * PR-LP-001; "Alerts" moved from future to live and into the live block
 * since `/dashboard/alerts` has shipped); the live/future split itself is
 * unchanged aside from that one correction, only the display order is.
 */
const FEATURES: Feature[] = [
  {
    icon: BrainCircuit,
    title: "AI Research",
    description: "AI-generated narrative summaries and momentum signals from live ecosystem data.",
    metric: "Updated continuously",
    href: "/dashboard/alerts",
  },
  {
    icon: ShieldCheck,
    title: "Verification Engine",
    description: "Verified, community, unverified, and flagged — reviewed trust signals, not guesses.",
    metric: "4 trust tiers",
    href: "/dashboard/projects",
  },
  {
    icon: Eye,
    title: "Watchlists",
    description: "Pin projects, wallets, and tokens to track them at a glance from your dashboard.",
    metric: "Unlimited pins",
    href: "/dashboard/watchlists",
  },
  {
    icon: Radio,
    title: "Signals",
    description: "Buy, watch, and momentum alerts generated continuously from onchain activity.",
    metric: "86 signals today",
    href: "/dashboard/alerts",
  },
  {
    icon: TrendingUp,
    title: "Narratives",
    description: "Track which categories and themes are gaining or losing momentum on Base.",
    metric: "12+ categories tracked",
    href: "/dashboard",
  },
  {
    icon: LayoutGrid,
    title: "Categories",
    description: "Browse the ecosystem by sector — DeFi, AI, social, gaming, and more.",
    metric: "12 sectors",
    href: "/dashboard/projects",
  },
  {
    icon: Compass,
    title: "Projects",
    description: "A complete, continuously updated registry of protocols building on Base.",
    metric: "2,348 verified",
    href: "/dashboard/projects",
  },
  {
    icon: Network,
    title: "Provider Aggregation",
    description: "Every metric is cross-checked across multiple independent data providers.",
    metric: "6 independent providers",
    href: "/dashboard/projects",
  },
  {
    icon: Bell,
    title: "Alerts",
    description: "Get notified the moment a project you follow changes status or momentum.",
    metric: "Real-time push",
    href: "/dashboard/alerts",
  },
  {
    icon: Wallet,
    title: "Portfolio Tracking",
    description: "Connect a wallet to see your Base holdings alongside ecosystem intelligence.",
    metric: "Wallet connect",
    href: "#",
    status: "future",
  },
  {
    icon: Fingerprint,
    title: "Wallet Intelligence",
    description: "Understand smart-money behavior and wallet activity across the ecosystem.",
    metric: "Smart-money tracking",
    href: "#",
    status: "future",
  },
  {
    icon: Code2,
    title: "Open APIs",
    description: "Programmatic access to Base Radar's intelligence data for builders.",
    metric: "REST + GraphQL",
    href: "#",
    status: "future",
  },
];

export function WhyBaseRadar() {
  return (
    <section id="why" className="mx-auto max-w-7xl px-6 py-16 sm:py-24 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.5 }}
        className="mx-auto max-w-2xl text-center"
      >
        <h2 className="text-3xl font-semibold tracking-tight text-radar-light-text sm:text-4xl dark:text-radar-white">
          Why Base Radar
        </h2>
        <p className="mt-2 text-base text-radar-light-muted dark:text-radar-muted">
          One platform for everything you need to understand the Base ecosystem.
        </p>
      </motion.div>

      <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {FEATURES.map((feature, index) => {
          const isFuture = feature.status === "future";
          /* PR9.5 §2 — hover lift/border-glow/icon-rotate removed (landing
             page relies on passive ambient motion, not hover gimmicks);
             Coming Soon cards stay permanently muted (no hover-triggered
             brightening) rather than only reading as "live" status via
             their badge. */
          const card = (
            <GlassCard
              className={cn(
                "flex h-full flex-col gap-2 p-4",
                isFuture && "opacity-70"
              )}
            >
              <div className="flex items-center justify-between">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-radar-primary/15 to-radar-accent/15 text-radar-primary dark:text-radar-accent">
                  <feature.icon className="size-5" aria-hidden="true" />
                </span>
                <GlowBadge color={isFuture ? "muted" : "success"} dot className="text-[10px] uppercase">
                  {isFuture ? "Coming soon" : "Live"}
                </GlowBadge>
              </div>
              <div className="flex-1">
                <h3 className="text-base font-semibold text-radar-light-text dark:text-radar-white">
                  {feature.title}
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-radar-light-muted dark:text-radar-muted">
                  {feature.description}
                </p>
              </div>
              <span className="text-xs font-medium text-radar-primary dark:text-radar-accent">
                {feature.metric}
              </span>
            </GlassCard>
          );
          return (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.4, delay: (index % 4) * 0.06 }}
            >
              {isFuture ? (
                // PR-LP-001 review fix — future cards have no real
                // destination yet; a plain, non-interactive wrapper (rather
                // than `<Link href="#">`) avoids a dead/fake link while
                // rendering the exact same card underneath.
                <div className="block h-full">{card}</div>
              ) : (
                <Link href={feature.href} className="block h-full">
                  {card}
                </Link>
              )}
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
