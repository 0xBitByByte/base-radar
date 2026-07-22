"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Sparkles,
  Radio,
  Wallet,
  Fish,
  Landmark,
  Hammer,
  BarChart3,
  ShieldAlert,
  BellRing,
  Bookmark,
  TrendingUp,
  CheckCheck,
  type LucideIcon,
} from "lucide-react";

import { GlassCard } from "@/components/ui/GlassCard";

type FeatureItem = {
  icon: LucideIcon;
  title: string;
  description: string;
  href: string;
};

/**
 * "Features" (PR9.3 §7) — product *capabilities*, mechanical and concrete.
 * Deliberately distinct in tone from `WhyBaseRadar` (value props, "why it
 * matters") even where the two sections' subject matter overlaps — this
 * one describes what the product does, not why a user should care.
 */
const FEATURE_ITEMS: FeatureItem[] = [
  {
    icon: Sparkles,
    title: "AI Intelligence",
    description: "Every tracked project gets a continuously regenerated AI summary of what changed and why.",
    href: "/dashboard/alerts",
  },
  {
    icon: Radio,
    title: "Signals",
    description: "Buy, sell, momentum, and liquidity signals surfaced the moment they're detected onchain.",
    href: "/dashboard/alerts",
  },
  {
    icon: Wallet,
    title: "Portfolio Tracking",
    description: "Connect a wallet to see holdings, exposure, and PnL alongside ecosystem intelligence.",
    href: "#",
  },
  {
    icon: Fish,
    title: "Whale Monitoring",
    description: "Track large-wallet transfers and smart-money flows across the ecosystem in real time.",
    href: "/dashboard",
  },
  {
    icon: Landmark,
    title: "Governance",
    description: "Follow active proposals and voting activity across every governed protocol Base Radar tracks.",
    href: "/dashboard",
  },
  {
    icon: Hammer,
    title: "Builder Discovery",
    description: "Surface new teams and repos shipping on Base before they trend anywhere else.",
    href: "/dashboard/projects",
  },
  {
    icon: BarChart3,
    title: "TVL Tracking",
    description: "Live total value locked across every tracked protocol, aggregated from independent providers.",
    href: "/dashboard/projects",
  },
  {
    icon: ShieldAlert,
    title: "Risk Analysis",
    description: "Factor-based scoring flags contract, liquidity, and concentration risk — never a black box.",
    href: "/dashboard/projects",
  },
  {
    icon: BellRing,
    title: "Notifications",
    description: "Configurable alerts delivered the instant a followed project changes status or momentum.",
    href: "/dashboard/alerts",
  },
  {
    icon: Bookmark,
    title: "Watchlists",
    description: "Curate a personal list of projects, wallets, and tokens to monitor at a glance.",
    href: "/dashboard/watchlists",
  },
  {
    icon: TrendingUp,
    title: "Market Narratives",
    description: "See which categories and themes are gaining or losing momentum across Base, continuously.",
    href: "/dashboard",
  },
  {
    icon: CheckCheck,
    title: "Cross-source Verification",
    description: "Every metric is checked against multiple independent providers before it's ever shown.",
    href: "/dashboard/projects",
  },
];

export function Features() {
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
          Features
        </h2>
        <p className="mt-2 text-base text-radar-light-muted dark:text-radar-muted">
          Every capability, mechanically — what Base Radar actually does, end to end.
        </p>
      </motion.div>

      <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {FEATURE_ITEMS.map((feature, index) => {
          /* PR-LP-001 review fix — this file has no separate live/future
             status field; "#" is the existing sentinel (set in PR-LP-001)
             for a card with no real destination yet, so that's what's
             checked here rather than introducing a new status concept. */
          const hasDestination = feature.href !== "#";
          /* PR9.5 §2 — this CTA used to only reveal on hover; since hover
             interactions are removed site-wide, it's now permanently
             visible rather than disappearing entirely (still the same real
             `Link` for cards with a destination, just always legible). */
          const card = (
            <GlassCard className="flex h-full flex-col gap-1.5 p-4">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-radar-primary/15 to-radar-accent/15 text-radar-primary dark:text-radar-accent">
                <feature.icon className="size-4" aria-hidden="true" />
              </span>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-radar-light-text dark:text-radar-white">
                  {feature.title}
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-radar-light-muted dark:text-radar-muted">
                  {feature.description}
                </p>
              </div>
              <span className="flex items-center gap-1.5 text-sm font-medium text-radar-primary dark:text-radar-accent">
                Open in Dashboard
                <ArrowRight className="size-3.5" />
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
              {hasDestination ? (
                <Link href={feature.href} className="block h-full">
                  {card}
                </Link>
              ) : (
                <div className="block h-full">{card}</div>
              )}
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
