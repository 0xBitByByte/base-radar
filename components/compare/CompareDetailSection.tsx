"use client";

import { CircleCheck, CircleHelp, CircleX, Rocket, ShieldAlert, TrendingDown, TrendingUp, type LucideIcon } from "lucide-react";

import { ProjectLogo } from "@/components/branding/ProjectLogo";
import { GlowBadge } from "@/components/ui/GlowBadge";
import { GLASS_SURFACE_STATIC } from "@/components/ui/glassStyles";
import type { CompareContractDetail } from "@/lib/compare/detail";
import { shortenAddress } from "@/lib/data/format";
import { useCompareProjectDetail } from "@/lib/hooks/useCompareProjectDetail";
import type { LiveProject } from "@/lib/projects/types";
import { cn } from "@/lib/utils";

/**
 * PR-091.03 (Intelligence Compare, deep-dive) / PR-091.05 (Contract
 * Compare) — one column per compared project, each fetching its own real
 * `IntelligenceReport` strengths/weaknesses/opportunities/threats and real
 * per-contract Blockscout detail via `useCompareProjectDetail`. The main
 * `CompareView` table stays the fast, no-extra-fetch surface (AI
 * Grade/Confidence/Health/Risk/Recommendation, all already on
 * `LiveProject`); this section is the deliberately slower, richer one below
 * it — mirrors `ProfileExecutiveIntelligence.tsx`'s own "Bull Case"/"Bear
 * Case" grouping and `ContractCard.tsx`'s own Verified/Not Verified +
 * compiler/license/proxy chip recipe, rather than inventing either.
 */

function ReportBucket({ icon: Icon, label, tone, items }: { icon: LucideIcon; label: string; tone: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-1.5">
        <Icon className={cn("size-3 shrink-0", tone)} aria-hidden="true" />
        <span className="text-[10px] font-semibold tracking-wider text-radar-light-muted uppercase dark:text-radar-muted">{label}</span>
      </div>
      <ul className="flex flex-col gap-1">
        {items.map((item, index) => (
          <li key={index} className="text-xs leading-relaxed text-radar-light-text dark:text-radar-white">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function ContractDetailRow({ contract }: { contract: CompareContractDetail }) {
  const ownership = contract.proxyType ? `Upgradeable (proxy — ${contract.proxyType})` : "Standard (non-upgradeable)";
  const security = contract.verified === true ? "Verified — source code publicly auditable" : contract.verified === false ? "Unverified — source not publicly available" : "Unknown — not checked";

  return (
    <li className="flex flex-col gap-1.5 rounded-lg border border-radar-light-border p-2.5 dark:border-white/10">
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-[11px] text-radar-light-muted dark:text-radar-muted">{shortenAddress(contract.address)}</span>
        <GlowBadge color={contract.verified === true ? "success" : "muted"} className="shrink-0 gap-1 px-1.5 py-0.5 text-[10px]">
          {contract.verified === true ? <CircleCheck className="size-3" aria-hidden="true" /> : <CircleHelp className="size-3" aria-hidden="true" />}
          {contract.verified === true ? "Verified" : contract.verified === false ? "Unverified" : "Unknown"}
        </GlowBadge>
      </div>
      <div className="flex flex-wrap gap-1 text-[10px] text-radar-light-muted dark:text-radar-muted">
        {contract.compilerVersion && <span className="rounded-md bg-radar-light-border/60 px-1.5 py-0.5 dark:bg-white/5">Compiler {contract.compilerVersion}</span>}
        {contract.licenseType && <span className="rounded-md bg-radar-light-border/60 px-1.5 py-0.5 dark:bg-white/5">{contract.licenseType} license</span>}
        <span className="rounded-md bg-radar-light-border/60 px-1.5 py-0.5 dark:bg-white/5">{contract.proxyType ? `Proxy (${contract.proxyType})` : "Not a proxy"}</span>
      </div>
      <p className="text-[10.5px] text-radar-light-muted dark:text-radar-muted">
        <span className="font-medium text-radar-light-text dark:text-radar-white">Ownership: </span>
        {ownership}
      </p>
      <p className="text-[10.5px] text-radar-light-muted dark:text-radar-muted">
        <span className="font-medium text-radar-light-text dark:text-radar-white">Security: </span>
        {security}
      </p>
    </li>
  );
}

function ProjectDetailColumn({ project }: { project: LiveProject }) {
  const { data, isLoading, isError } = useCompareProjectDetail(project.slug);
  const hasBullCase = !!data && (data.strengths.length > 0 || data.opportunities.length > 0);
  const hasBearCase = !!data && (data.weaknesses.length > 0 || data.threats.length > 0);

  return (
    <div className={cn("flex flex-col gap-4 rounded-2xl p-4", GLASS_SURFACE_STATIC)}>
      <div className="flex items-center gap-2">
        <ProjectLogo logoUrl={project.identity.logoUrl} fallbackUrls={project.identity.logoUrlFallbacks} name={project.identity.name} size={20} />
        <span className="min-w-0 truncate text-sm font-semibold text-radar-light-text dark:text-radar-white">{project.identity.name}</span>
      </div>

      {project.slug === null ? (
        <p className="text-xs text-radar-light-muted dark:text-radar-muted">
          No AI Intelligence report — this is a discovery-only project with no registry page yet.
        </p>
      ) : isLoading ? (
        <div className="flex flex-col gap-2" role="status" aria-label={`Loading intelligence and contract detail for ${project.identity.name}`}>
          <div className="h-3 w-3/4 animate-pulse rounded bg-radar-light-border dark:bg-white/10" />
          <div className="h-3 w-1/2 animate-pulse rounded bg-radar-light-border dark:bg-white/10" />
          <div className="h-3 w-2/3 animate-pulse rounded bg-radar-light-border dark:bg-white/10" />
        </div>
      ) : isError ? (
        <p className="text-xs text-radar-danger">Couldn&apos;t load intelligence for this project right now.</p>
      ) : data ? (
        <>
          <div className="flex flex-col gap-3 border-t border-radar-light-border pt-3 dark:border-white/10">
            <span className="text-[10px] font-semibold tracking-wider text-radar-light-muted uppercase dark:text-radar-muted">Bull / Bear Case</span>
            {!hasBullCase && !hasBearCase ? (
              <p className="text-xs text-radar-light-muted dark:text-radar-muted">No strengths or risks currently flagged for this project.</p>
            ) : (
              <>
                {hasBullCase && (
                  <div className="flex flex-col gap-2 border-l-2 border-l-radar-success/40 pl-2.5">
                    <p className="flex items-center gap-1.5 text-[11px] font-semibold text-radar-success">
                      <TrendingUp className="size-3 shrink-0" aria-hidden="true" />
                      Bull Case
                    </p>
                    <ReportBucket icon={CircleCheck} label="Strengths" tone="text-radar-success" items={data.strengths} />
                    <ReportBucket icon={Rocket} label="Opportunities" tone="text-radar-primary dark:text-radar-accent" items={data.opportunities} />
                  </div>
                )}
                {hasBearCase && (
                  <div className="flex flex-col gap-2 border-l-2 border-l-radar-danger/40 pl-2.5">
                    <p className="flex items-center gap-1.5 text-[11px] font-semibold text-radar-danger">
                      <TrendingDown className="size-3 shrink-0" aria-hidden="true" />
                      Bear Case
                    </p>
                    <ReportBucket icon={CircleX} label="Weaknesses" tone="text-radar-danger" items={data.weaknesses} />
                    <ReportBucket icon={ShieldAlert} label="Risks" tone="text-radar-danger" items={data.threats} />
                  </div>
                )}
              </>
            )}
          </div>

          <div className="flex flex-col gap-2 border-t border-radar-light-border pt-3 dark:border-white/10">
            <span className="text-[10px] font-semibold tracking-wider text-radar-light-muted uppercase dark:text-radar-muted">Contracts</span>
            {data.contracts.length === 0 ? (
              <p className="text-xs text-radar-light-muted dark:text-radar-muted">No registered contracts for this project.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {data.contracts.map((contract) => (
                  <ContractDetailRow key={contract.address} contract={contract} />
                ))}
              </ul>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}

export function CompareDetailSection({ compared }: { compared: LiveProject[] }) {
  return (
    <div className="flex flex-col gap-3">
      <div>
        <h2 className="text-sm font-semibold text-radar-light-text dark:text-radar-white">Intelligence &amp; Contract Detail</h2>
        <p className="text-xs text-radar-light-muted dark:text-radar-muted">
          Real Bull Case / Bear Case narrative and real per-contract verification detail — the same report and contract data each project&apos;s own page already shows.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {compared.map((project) => (
          <ProjectDetailColumn key={project.id} project={project} />
        ))}
      </div>
    </div>
  );
}
