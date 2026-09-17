import Link from "next/link";
import { Layers } from "lucide-react";

import { ProjectLogo } from "@/components/branding/ProjectLogo";
import { RiskBadge } from "@/components/projects/RiskBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { GlowBadge } from "@/components/ui/GlowBadge";
import { GLASS_CARD_SURFACE } from "@/components/ui/glassStyles";
import type { HeldProjectLink } from "@/lib/portfolio-intelligence/projectLinks";
import { cn } from "@/lib/utils";

const USD_FORMAT = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });

type HeldProjectsIntelligenceSectionProps = {
  links: HeldProjectLink[];
  className?: string;
};

/**
 * PR-092.03 (Portfolio Intelligence) — the one place a held token's real
 * project-registry intelligence (AI Grade, Health, Confidence, Risk, Smart
 * Collection membership) is shown. Deliberately separate from `PortfolioHealthSection`
 * etc. (`WalletIntelligenceSections.tsx`): those compute wallet-native
 * scores over ALL holdings (most of which have no registry entry at all);
 * this section only ever shows the subset that genuinely matched a real,
 * already-tracked project — reusing that project's own real fields, never
 * a second scoring pipeline. `RiskBadge`/`GlowBadge`/`ProjectLogo` are the
 * exact same components Explorer's own `LiveProjectCard` and the Project
 * Profile page already render these fields with.
 */
export function HeldProjectsIntelligenceSection({ links, className }: HeldProjectsIntelligenceSectionProps) {
  return (
    <div className={cn("flex flex-col gap-4 p-6", GLASS_CARD_SURFACE, className)}>
      <div className="flex items-center gap-2">
        <Layers className="size-4 text-radar-primary dark:text-radar-accent" aria-hidden="true" />
        <h2 className="text-sm font-semibold text-radar-light-text dark:text-radar-white">Held Projects Intelligence</h2>
      </div>
      <p className="text-xs text-radar-light-muted dark:text-radar-muted">
        Real Base Radar intelligence for the projects you hold — the same AI Grade, Health, Confidence, and Risk shown on each project&apos;s own page, never a second score.
      </p>

      {links.length === 0 ? (
        <EmptyState
          icon={Layers}
          title="No tracked projects held"
          description="None of your current holdings match a project Base Radar tracks yet — this is common for a wallet holding mostly ETH, stablecoins, or tokens outside the registry."
          className="py-6"
        />
      ) : (
        <ul className="flex flex-col divide-y divide-radar-light-border dark:divide-white/10">
          {links.map(({ holding, project, smartCollectionNames }) => (
            <li key={project.id} className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Link
                  href={`/dashboard/projects/${project.slug}`}
                  className="flex min-w-0 items-center gap-2 rounded outline-none focus-visible:ring-2 focus-visible:ring-radar-primary/50"
                >
                  <ProjectLogo logoUrl={project.identity.logoUrl} fallbackUrls={project.identity.logoUrlFallbacks} name={project.identity.name} size={24} />
                  <span className="min-w-0 truncate text-sm font-medium text-radar-light-text dark:text-radar-white">{project.identity.name}</span>
                </Link>
                <span className="shrink-0 text-xs text-radar-light-muted dark:text-radar-muted">
                  {holding.formattedBalance} {holding.symbol}
                  {holding.usdValue !== null && <> · {USD_FORMAT.format(holding.usdValue)}</>}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 pl-8">
                <span className="rounded-full border border-radar-light-border px-2 py-0.5 text-[10.5px] font-semibold text-radar-light-text dark:border-white/10 dark:text-radar-white">
                  {project.aiRating ?? "—"}
                </span>
                <RiskBadge riskLevel={project.riskLevel} compact />
                <span className="text-[10.5px] text-radar-light-muted dark:text-radar-muted">
                  {project.confidence.score}/100 confidence
                </span>
                {project.health && (
                  <span className="text-[10.5px] text-radar-light-muted dark:text-radar-muted">{project.health.score}/100 health</span>
                )}
                {smartCollectionNames.map((name) => (
                  <GlowBadge key={name} color="primary" className="text-[10px]">
                    {name}
                  </GlowBadge>
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
