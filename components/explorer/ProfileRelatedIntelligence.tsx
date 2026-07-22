"use client";

import Link from "next/link";
import { ArrowRight, Clock, LayoutGrid, Newspaper, Sparkles, type LucideIcon } from "lucide-react";

import { useDailyBrief } from "@/lib/hooks/useDailyBrief";
import { useIntelligenceAlerts } from "@/lib/hooks/useIntelligenceAlerts";
import { usePortfolioIntelligence } from "@/lib/hooks/usePortfolioIntelligence";
import { useTimeline } from "@/lib/hooks/useTimeline";
import type { BriefHighlight, BriefOpportunity } from "@/lib/brief/types";

type ProfileRelatedIntelligenceProps = {
  projectId: string;
};

type RelatedLink = {
  href: string;
  label: string;
  icon: LucideIcon;
};

function mentionsProject(items: Array<BriefHighlight | BriefOpportunity>, projectId: string): boolean {
  return items.some((item) => item.projectId === projectId);
}

/**
 * A lightweight "where to investigate next" strip for the project currently
 * being viewed (PR-013) — the one connection this page never had to the
 * Alert Engine's own intelligence layer (`lib/alerts/intelligence`, distinct
 * from this page's existing `lib/intelligence/` health/risk report). Every
 * hook here is the exact same client-side store every other AI Intelligence
 * surface already reads (`AIIntelligenceWidget`, `BriefWidget`,
 * `PortfolioWidget`, `TimelineWidget`) — importing them here triggers no new
 * fetch; `lib/alerts/service.ts`'s one-time `refreshAlerts()` already fires
 * the first time any component in the tree uses a hook built on it,
 * regardless of which page that happens to be. Timeline/Daily
 * Brief/Portfolio Intelligence are themselves pure derivations of the same
 * alert data (see their own hooks' docs), so all four either populate
 * together or stay empty together — never partially fabricated.
 *
 * Only genuinely matching destinations render: a project with no real
 * alert/timeline/brief/portfolio mention today renders nothing at all,
 * never a disabled or generic link (PR-013's "empty navigation states"
 * rule). None of these routes accept a project-scoped query param today,
 * so each link goes to that surface's real, existing page — the user's own
 * project context carries over visually (its Watch state, its recent
 * signals) rather than through URL state this app doesn't have.
 */
export function ProfileRelatedIntelligence({ projectId }: ProfileRelatedIntelligenceProps) {
  const alerts = useIntelligenceAlerts();
  const timeline = useTimeline();
  const dailyBrief = useDailyBrief();
  const portfolio = usePortfolioIntelligence();

  const hasAlert = alerts.some((alert) => alert.projectId === projectId);
  const hasTimelineEvent = (timeline?.events ?? []).some((event) => event.projectId === projectId);
  const hasBriefMention = dailyBrief
    ? mentionsProject(
        [
          ...dailyBrief.topOpportunities,
          ...dailyBrief.securityHighlights,
          ...dailyBrief.governanceHighlights,
          ...dailyBrief.developmentHighlights,
          ...dailyBrief.tvlHighlights,
        ],
        projectId
      )
    : false;
  const hasPortfolioMention = portfolio
    ? mentionsProject(
        [
          ...portfolio.topPerformers,
          ...portfolio.projectsNeedingAttention,
          ...portfolio.securityRisks,
          ...portfolio.governanceWatch,
          ...portfolio.developmentMomentum,
        ],
        projectId
      )
    : false;

  const links: RelatedLink[] = [
    hasAlert && { href: "/dashboard/alerts", label: "AI Intelligence", icon: Sparkles },
    hasTimelineEvent && { href: "/dashboard/timeline", label: "Timeline", icon: Clock },
    hasBriefMention && { href: "/dashboard/brief", label: "Daily Brief", icon: Newspaper },
    hasPortfolioMention && { href: "/dashboard/portfolio", label: "Portfolio Intelligence", icon: LayoutGrid },
  ].filter((link): link is RelatedLink => link !== false);

  if (links.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-radar-light-border bg-radar-light-card p-3 dark:border-white/10 dark:bg-radar-card">
      <span className="text-[10px] font-medium tracking-wide text-radar-light-muted uppercase dark:text-radar-muted">
        Related Intelligence
      </span>
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className="flex items-center gap-1.5 rounded-lg border border-radar-light-border px-2.5 py-1.5 text-xs font-medium text-radar-light-text outline-none transition-colors hover:bg-radar-light-surface focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:border-white/10 dark:text-radar-white dark:hover:bg-white/5"
        >
          <link.icon className="size-3.5 shrink-0 text-radar-primary dark:text-radar-accent" aria-hidden="true" />
          {link.label}
          <ArrowRight className="size-3 shrink-0 opacity-50" aria-hidden="true" />
        </Link>
      ))}
    </div>
  );
}
