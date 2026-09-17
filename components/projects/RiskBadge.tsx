import { ShieldQuestion } from "lucide-react";

import { GlowBadge, type GlowBadgeColor } from "@/components/ui/GlowBadge";
import { RichTooltip, type RichTooltipAccent } from "@/components/ui/RichTooltip";
import { Tooltip } from "@/components/ui/Tooltip";
import { cn } from "@/lib/utils";
import type { RiskContributor, RiskLevel } from "@/lib/intelligence-engine";

/**
 * Universal Project Card, PR-2A (Product Standard §8, Risk Badge).
 *
 * Engineering Note EN-1 resolution: the real engine `RiskLevel` has 4
 * values (low/moderate/elevated/high), one more than §8's stated
 * "Low/Moderate/High/Unknown" vocabulary. Rather than inventing a new
 * visual tier, `"elevated"` folds into `"Moderate"` here — the same
 * judgment this codebase already made and shipped in
 * `lib/intelligence/report.ts`'s `RECOMMENDATION_FOR_RISK` table, which
 * gives `moderate` and `elevated` the identical recommendation text
 * ("Monitor Closely"). Reusing an existing, already-shipped precedent
 * rather than a fresh guess.
 */
// Product Semantics audit — bare "Low"/"Moderate"/"High"/"Unknown" read as
// ambiguous sitting beside a verification badge and a confidence line: a
// viewer has no label telling them these words are about risk at all
// (easy to misread as confidence or priority). Every label now names what
// it's rating explicitly — "Unknown" specifically becomes "Risk Unrated"
// rather than "Risk Unknown": this state isn't a lookup that came back
// empty, it's a discovery-only project no `Risk` was ever computed for in
// the first place (see `riskLevel`'s own doc comment below) — "unrated"
// says that precisely, "unknown" would imply a failed lookup.
const RISK_LEVEL_STYLE: Record<RiskLevel, { label: string; color: GlowBadgeColor }> = {
  low: { label: "Low Risk", color: "success" },
  moderate: { label: "Moderate Risk", color: "warning" },
  elevated: { label: "Moderate Risk", color: "warning" },
  high: { label: "High Risk", color: "danger" },
};

type RiskBadgeProps = {
  /** `null` for a discovery-only project — no `Risk` was ever computed for it (no `ProjectIntelligence` exists). Renders "Risk Unrated," never a guess. */
  riskLevel: RiskLevel | null;
  /**
   * UX Polish, Phase 5 ("Explain Why") — the same `RiskAnalysisOutput.contributors`
   * that produced `riskLevel` (`LiveProject.riskContributors`, threaded
   * through from `lib/projects/build.ts`, itself the real engine output,
   * never re-derived here). Optional so existing call sites that only ever
   * had a bare `riskLevel` keep compiling; the badge just renders without
   * a tooltip when omitted, same as before this change existed. Empty
   * array (never a non-empty list of invented factors) is the honest state
   * for a level with no contributor detail on record.
   */
  contributors?: RiskContributor[];
  /** Denser padding/text size, matching `VerificationBadge`'s own `compact` treatment — for use alongside it in a compact-density Trust row, so badges sharing one row don't mix two different pill sizes. */
  compact?: boolean;
  className?: string;
};

const CONTRIBUTOR_SEVERITY_ACCENT: Record<RiskContributor["severity"], RichTooltipAccent> = {
  low: "success",
  moderate: "warning",
  high: "danger",
  unknown: "muted",
};

export function RiskBadge({ riskLevel, contributors, compact, className }: RiskBadgeProps) {
  const style = riskLevel !== null ? RISK_LEVEL_STYLE[riskLevel] : { label: "Risk Unrated", color: "muted" as GlowBadgeColor };

  const badge = (
    <GlowBadge
      color={style.color}
      tabIndex={contributors && contributors.length > 0 ? 0 : undefined}
      className={cn(
        compact && "gap-1 px-1.5 py-0.5 text-[10px]",
        contributors && contributors.length > 0 && "cursor-default outline-none focus-visible:ring-2 focus-visible:ring-radar-primary/50",
        className
      )}
    >
      {style.label}
    </GlowBadge>
  );

  if (!contributors || contributors.length === 0) return badge;

  return (
    <Tooltip
      // V1-FIX-022 — Accessibility & Reading Order. `LiveProjectCard`
      // renders its whole content tree under a `pointer-events-none`
      // ancestor (the peer-Link click-through overlay architecture), and
      // this Tooltip's actual trigger element never opted back into
      // `pointer-events-auto` the way `LiveProjectCard`'s social-icon row
      // and momentum `SegmentedControl` already do. Confirmed live: with
      // `pointer-events: none` inherited, neither a real mouse hover nor a
      // keyboard `.focus()` call opened this tooltip at all — the
      // risk-contributor evidence was reachable by no input method inside
      // that card. `pointer-events-auto` here is a no-op everywhere else
      // this component renders (Explorer Grid/Table/Quick View, Project
      // Profile), since none of those contexts have a `pointer-events-none`
      // ancestor to override in the first place — `auto` is already the
      // CSS default there.
      className="pointer-events-auto"
      content={
        <RichTooltip icon={ShieldQuestion} title={style.label} accent={style.color === "muted" ? "muted" : (style.color as RichTooltipAccent)}>
          <ul className="flex flex-col gap-0.5">
            {contributors.map((contributor) => (
              <li key={contributor.label} className="flex items-baseline gap-1.5">
                <span className={cn("shrink-0 text-[9px]", CONTRIBUTOR_SEVERITY_ACCENT[contributor.severity] === "muted" ? "text-radar-light-muted dark:text-radar-muted" : "")} aria-hidden="true">
                  •
                </span>
                <span>{contributor.detail}</span>
              </li>
            ))}
          </ul>
        </RichTooltip>
      }
    >
      {badge}
    </Tooltip>
  );
}
