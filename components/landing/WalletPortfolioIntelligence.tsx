"use client";

import { motion } from "framer-motion";
import { Activity, FileDown, Gauge, LineChart, ShieldAlert, Sparkles, Wallet as WalletIcon, type LucideIcon } from "lucide-react";

import { GlassCard } from "@/components/ui/GlassCard";
import { GlowBadge } from "@/components/ui/GlowBadge";

type PanelItem = { icon: LucideIcon; label: string; description: string };

/**
 * Wallet (`/dashboard/wallet`) and Portfolio Intelligence
 * (`/dashboard/portfolio`) are two distinct real features — Wallet is your
 * actual connected holdings on Base; Portfolio Intelligence is AI-derived
 * intelligence across your Watchlist, not your holdings. Kept as two
 * separate panels here so the landing page never conflates them the way a
 * single merged section would.
 */
const WALLET_ITEMS: PanelItem[] = [
  { icon: WalletIcon, label: "Real Holdings", description: "Your actual connected balances, USD value, and allocation on Base." },
  { icon: Gauge, label: "Portfolio Health", description: "A computed health read on your holdings, with risk analysis and allocation breakdowns." },
  { icon: FileDown, label: "Export Your Report", description: "Download or copy a Markdown, text, or HTML report of your own data — local only, never a public link." },
];

const PORTFOLIO_ITEMS: PanelItem[] = [
  { icon: LineChart, label: "Top Performers & Risks", description: "Health, top performers, and projects needing attention, scored across your Watchlist." },
  { icon: ShieldAlert, label: "Security & Governance Watch", description: "Security risks and governance activity flagged across everything you're tracking." },
  { icon: Activity, label: "Recommendations", description: "Momentum and narrative reads, with concrete next steps — not a black box." },
];

function Panel({ badge, title, description, items, delay }: { badge: string; title: string; description: string; items: PanelItem[]; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.4, delay }}
    >
      <GlassCard className="flex h-full flex-col gap-5 p-6 sm:p-8">
        <GlowBadge color="primary" className="w-fit">
          {badge}
        </GlowBadge>
        <div>
          <h3 className="text-xl font-semibold text-radar-light-text dark:text-radar-white">{title}</h3>
          <p className="mt-2 text-sm leading-relaxed text-radar-light-muted dark:text-radar-muted">{description}</p>
        </div>
        <ul className="flex flex-col gap-3">
          {items.map((item) => (
            <li key={item.label} className="flex items-start gap-3 border-t border-radar-light-border pt-3 first:border-t-0 first:pt-0 dark:border-white/10">
              <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-radar-primary/15 to-radar-accent/15 text-radar-primary dark:text-radar-accent">
                <item.icon className="size-4" aria-hidden="true" />
              </span>
              <div>
                <p className="text-sm font-medium text-radar-light-text dark:text-radar-white">{item.label}</p>
                <p className="text-sm leading-relaxed text-radar-light-muted dark:text-radar-muted">{item.description}</p>
              </div>
            </li>
          ))}
        </ul>
      </GlassCard>
    </motion.div>
  );
}

/**
 * Landing Page V2, Section 6 — "Your wallet. Your portfolio. Your
 * intelligence." Only real, shipped capabilities — the wallet's "AI
 * Summary"/"AI Chat" are deterministic templates over a fixed preset
 * question set, not free-form LLM chat, so this section never claims
 * conversational AI; the "Share" feature is a local export/download only
 * (never a public link), so this section never says "share publicly."
 */
export function WalletPortfolioIntelligence() {
  return (
    <section id="wallet-portfolio" className="mx-auto max-w-7xl px-6 py-16 sm:py-24 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.5 }}
        className="mx-auto max-w-2xl text-center"
      >
        <h2 className="text-3xl font-semibold tracking-tight text-radar-light-text sm:text-4xl dark:text-radar-white">
          Your wallet. Your portfolio. Your intelligence.
        </h2>
        <p className="mt-3 text-lg text-radar-light-muted dark:text-radar-muted">
          Connect a wallet for real holdings intelligence, or track a Watchlist for AI-derived portfolio
          intelligence — two distinct views, both genuinely yours.
        </p>
      </motion.div>

      <div className="mt-10 grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Panel badge="Wallet" title="Your real, connected holdings" description="Balances, USD value, and allocation — the actual state of your wallet on Base." items={WALLET_ITEMS} delay={0} />
        <Panel badge="Portfolio Intelligence" title="AI-derived intelligence across your Watchlist" description="Not your holdings — a computed read across every project you're tracking." items={PORTFOLIO_ITEMS} delay={0.1} />
      </div>

      <motion.p
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, margin: "-40px" }}
        transition={{ duration: 0.4, delay: 0.3 }}
        className="mt-6 flex items-center justify-center gap-2 text-center text-xs text-radar-light-muted dark:text-radar-muted"
      >
        <Sparkles className="size-3.5 shrink-0" aria-hidden="true" />
        AI Summary and AI Chat compose answers from your own already-computed data — never a live model call, never sent anywhere.
      </motion.p>
    </section>
  );
}
