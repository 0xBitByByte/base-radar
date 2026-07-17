"use client";

import { TrendingDown, TrendingUp } from "lucide-react";

import { ProjectLogo } from "@/components/branding/ProjectLogo";
import { VerificationBadge } from "@/components/explorer/VerificationBadge";
import { formatCompactCurrency, formatPercent } from "@/lib/data/format";
import { formatLabel } from "@/components/explorer/format";
import type { ProjectIntelligence } from "@/lib/intelligence/types";

type FeaturedProjectTileProps = {
  project: ProjectIntelligence;
  onActivate: () => void;
};

const HEALTH_COLOR: Record<string, string> = {
  excellent: "text-radar-success",
  good: "text-radar-accent",
  fair: "text-radar-warning",
  poor: "text-radar-danger",
  unknown: "text-radar-light-muted dark:text-radar-muted",
};

/**
 * One marquee item (PR9.3) — a taller, richer card than the original
 * logo/name/badge strip: logo, name, category, verification, then a
 * three-up stat row (AI Score / TVL / 24H) so the marquee reads as real
 * intelligence, not just a logo wall. Every field is real project data
 * (`identity`/`community`/`health`/`tvl`/`market`), the same shape
 * `ProjectCard` and the Project Profile page consume — nothing here is a
 * one-off lookalike computation.
 */
export function FeaturedProjectTile({ project, onActivate }: FeaturedProjectTileProps) {
  const { identity, community, health, tvl, market } = project;
  const category = identity.categories[0];
  const change = market.available ? market.changePct24h : null;
  const isUp = (change ?? 0) >= 0;

  return (
    <button
      type="button"
      onClick={onActivate}
      className="flex w-[22rem] shrink-0 flex-col gap-3.5 rounded-2xl border border-radar-light-border bg-radar-light-card p-5 text-left outline-none transition-all duration-200 hover:scale-[1.03] hover:border-radar-primary/30 hover:shadow-[0_16px_40px_-20px_rgba(var(--color-radar-primary-rgb),0.35)] focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:border-white/10 dark:bg-radar-card dark:hover:border-radar-border-hover"
    >
      {/* Name gets its own full-width row — `VerificationBadge` always
          renders all four status pills (one active, three dimmed), which
          alone is ~124px wide even in `compact` mode; sharing a row with
          it left as little as 90px for the name, clipping real project
          names like "Aerodrome Finance" (130px). Giving the name the full
          row instead fixes that without touching the shared badge
          component's own design. Widened further (320px→352px, PR9.3.2 §7)
          purely for breathing room — the fix itself no longer depends on
          the extra width. */}
      <div className="flex items-center gap-3">
        <ProjectLogo logoUrl={identity.logoUrl} name={identity.name} size={44} />
        <span className="min-w-0 flex-1 truncate text-sm font-semibold text-radar-light-text dark:text-radar-white">
          {identity.name}
        </span>
      </div>

      <div className="flex items-center justify-between gap-2">
        {category ? (
          <span className="truncate text-xs text-radar-light-muted dark:text-radar-muted">{formatLabel(category)}</span>
        ) : (
          <span />
        )}
        <VerificationBadge status={community.verificationStatus} compact />
      </div>

      <div className="grid grid-cols-3 gap-2 border-t border-radar-light-border pt-3 dark:border-white/10">
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] text-radar-light-muted dark:text-radar-muted">AI Score</span>
          <span className={`text-sm font-semibold tabular-nums ${HEALTH_COLOR[health.label] ?? HEALTH_COLOR.unknown}`}>
            {health.score}
          </span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] text-radar-light-muted dark:text-radar-muted">TVL</span>
          <span className="text-sm font-semibold tabular-nums text-radar-light-text dark:text-radar-white">
            {tvl.available && tvl.tvlUsd != null ? formatCompactCurrency(tvl.tvlUsd) : "—"}
          </span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] text-radar-light-muted dark:text-radar-muted">24H</span>
          {change != null ? (
            <span
              className={`flex items-center gap-0.5 text-sm font-semibold tabular-nums ${isUp ? "text-radar-success" : "text-radar-danger"}`}
            >
              {isUp ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
              {formatPercent(change, { showSign: false })}
            </span>
          ) : (
            <span className="text-sm font-semibold text-radar-light-muted dark:text-radar-muted">—</span>
          )}
        </div>
      </div>
    </button>
  );
}
