import Link from "next/link";
import { ArrowRight, BookOpenCheck, FileText, Sparkles } from "lucide-react";

import { GLASS_TILE_SURFACE } from "@/components/ui/glassStyles";
import { cn } from "@/lib/utils";

const HUB_LINKS = [
  {
    href: "/dashboard/ai-workspace",
    icon: BookOpenCheck,
    label: "AI Workspace",
    description: "Ask deterministic, evidence-cited questions and manage AI Watch.",
  },
  {
    href: "/dashboard/collections",
    icon: Sparkles,
    label: "Smart Collections",
    description: "Projects grouped by AI Grade, Risk, Confidence, and on-chain activity.",
  },
  {
    href: "/dashboard/reports",
    icon: FileText,
    label: "AI Reports",
    description: "Executive-level reports composed from the latest intelligence.",
  },
] as const;

/**
 * PR-090.06 — Dashboard Integration. The Dashboard already surfaces heavy
 * per-widget AI intelligence (`AIIntelligenceWidget`, `AIProjectsWidget`,
 * `EcosystemOpportunitiesWidget`/`EcosystemRisksWidget`, `IntelligenceBrief`)
 * but, before this, none of it linked anywhere into the newer AI Workspace /
 * Smart Collections / AI Reports surfaces — only the sidebar nav did. Per
 * the explicit "avoid an AI-heavy wall of cards" direction, this is
 * deliberately ONE slim row of compact link-tiles, not another data widget —
 * no fetch, no client state, just real navigation into surfaces that already
 * exist.
 */
export function AIIntelligenceHubStrip() {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-[11px] font-medium tracking-wide text-radar-light-muted uppercase dark:text-radar-muted">
        AI Intelligence Suite
      </p>
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
        {HUB_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={cn("group flex items-start gap-3 p-3.5 transition-colors hover:border-radar-primary/40", GLASS_TILE_SURFACE)}
          >
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-radar-primary/10 text-radar-primary dark:bg-radar-accent/10 dark:text-radar-accent">
              <link.icon className="size-4" aria-hidden="true" />
            </span>
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="flex items-center gap-1 text-sm font-semibold text-radar-light-text dark:text-radar-white">
                {link.label}
                <ArrowRight className="size-3.5 shrink-0 text-radar-light-muted opacity-0 transition-opacity group-hover:opacity-100 dark:text-radar-muted" aria-hidden="true" />
              </span>
              <span className="text-xs text-radar-light-muted dark:text-radar-muted">{link.description}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
