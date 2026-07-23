import {
  Brain,
  CircleAlert,
  CircleCheck,
  CircleHelp,
  Droplets,
  Landmark,
  ShieldAlert,
  ShieldCheck,
  ShieldQuestion,
  type LucideIcon,
} from "lucide-react";

import { ProfileSectionCard } from "@/components/explorer/ProfileSectionCard";
import { QuickViewSectionLabel } from "@/components/explorer/QuickViewSectionLabel";
import { formatPercent } from "@/lib/data/format";
import { cn } from "@/lib/utils";
import type { Confidence, Health, Risk } from "@/lib/intelligence/types";
import type { NarrativeSignal, RiskContributorSeverity } from "@/lib/intelligence-engine";
import type { GovernanceEvent } from "@/lib/governance";

type ProfileIntelligenceProps = {
  narrative: NarrativeSignal | null;
  risk: Risk;
  health: Health;
  confidence: Confidence;
  governance: GovernanceEvent[] | null;
};

/** Card border/background tint per contributor severity — the same semantic palette every other severity indicator on this page uses (success/warning/danger), plus a neutral tint for factors this codebase has no real data source for. */
const SEVERITY_CARD_CLASS: Record<RiskContributorSeverity, string> = {
  low: "border-radar-success/25 bg-radar-success/5 dark:border-radar-success/20 dark:bg-radar-success/10",
  moderate: "border-radar-warning/25 bg-radar-warning/5 dark:border-radar-warning/20 dark:bg-radar-warning/10",
  high: "border-radar-danger/25 bg-radar-danger/5 dark:border-radar-danger/20 dark:bg-radar-danger/10",
  unknown: "border-radar-light-border bg-radar-light-surface dark:border-white/10 dark:bg-white/[0.02]",
};

const SEVERITY_TEXT_CLASS: Record<RiskContributorSeverity, string> = {
  low: "text-radar-success",
  moderate: "text-radar-warning",
  high: "text-radar-danger",
  unknown: "text-radar-light-muted dark:text-radar-muted",
};

const SEVERITY_ICON: Record<RiskContributorSeverity, typeof ShieldCheck> = {
  low: ShieldCheck,
  moderate: ShieldAlert,
  high: ShieldAlert,
  unknown: ShieldQuestion,
};

/** "Not Assessed" (not "Unknown") for the same reason `lib/intelligence/scorecard.ts`'s Score Matrix tiles use it — Goal 17 never shows a bare "Unknown"; this factor's own `detail` sentence already explains why it can't be scored yet, so the chip should read as "not enough data" rather than an unexplained mystery. */
const SEVERITY_STATUS_LABEL: Record<RiskContributorSeverity, string> = {
  low: "Low Risk",
  moderate: "Moderate",
  high: "Elevated",
  unknown: "Not Assessed",
};

/**
 * Groups the Risk Analysis's 7 flat contributors into 3 parent categories
 * for a decision-tree-style read (PR12.1c Req 5.10) — purely a display
 * grouping of the exact same `risk.contributors` the engine already
 * computed; no sub-item here is invented beyond each contributor's own
 * real `detail` sentence.
 */
const RISK_GROUPS: { label: string; icon: LucideIcon; contributorLabels: string[] }[] = [
  { label: "Smart Contract & Security", icon: ShieldCheck, contributorLabels: ["Smart Contract Risk", "Centralization", "Data Freshness"] },
  { label: "Liquidity & Value", icon: Droplets, contributorLabels: ["Liquidity Risk", "TVL Stability"] },
  { label: "Governance & Engineering", icon: Landmark, contributorLabels: ["Governance Activity", "Developer Health"] },
];

const SEVERITY_RANK: Record<RiskContributorSeverity, number> = { high: 3, moderate: 2, low: 1, unknown: 0 };

/** Display-only rename (PR12.1d Req 7) — the engine's own contributor `label` field stays "Developer Health" (it's a matching key used elsewhere), only the on-screen text changes to match the page's "Engineering Health" terminology. */
const CONTRIBUTOR_DISPLAY_LABEL: Record<string, string> = { "Developer Health": "Engineering Health" };

/** Splits a factor string like `"TVL signal (+30)"` into its label and signed score, for the structured explanation cards below. Falls back to the whole string as the label when a factor doesn't follow that convention (e.g. the flagged/no-signal fallback sentences). */
function parseFactor(factor: string): { label: string; scoreText: string | null; scoreValue: number | null } {
  const match = factor.match(/^(.*)\s\(([+-]\d+)\)$/);
  if (!match) return { label: factor, scoreText: null, scoreValue: null };
  return { label: match[1], scoreText: match[2], scoreValue: Number(match[2]) };
}

function FactorCard({ factor }: { factor: string }) {
  const { label, scoreText, scoreValue } = parseFactor(factor);
  const Icon = scoreValue === null ? CircleHelp : scoreValue > 0 ? CircleCheck : scoreValue < 0 ? CircleAlert : CircleHelp;
  const colorClass =
    scoreValue === null
      ? "text-radar-light-muted dark:text-radar-muted"
      : scoreValue > 0
        ? "text-radar-success"
        : scoreValue < 0
          ? "text-radar-danger"
          : "text-radar-light-muted dark:text-radar-muted";

  return (
    <li className="flex items-center gap-2 rounded-xl border border-radar-light-border bg-radar-light-surface p-3 text-xs dark:border-white/10 dark:bg-white/[0.02]">
      <Icon className={cn("size-4 shrink-0", colorClass)} aria-hidden="true" />
      <span className="min-w-0 flex-1 truncate text-radar-light-text dark:text-radar-white">{label}</span>
      {scoreText && <span className={cn("shrink-0 font-semibold tabular-nums", colorClass)}>{scoreText}</span>}
    </li>
  );
}

/** A thin top border between sub-sections within one rail card (PR11.2 Part 6) — every sub-section but the first gets this, so Narrative/Risk/Health/Confidence read as clearly separate rather than run together. */
const DIVIDED_SECTION_CLASS = "flex flex-col gap-1.5 border-t border-radar-light-border pt-4 dark:border-white/10";

/**
 * AI Intelligence — PR11 Part 4, regrouped in PR11.1 Part 3. Reuses the
 * exact same real, already-computed fields the Intelligence Engine produces
 * (`risk`/`health`/`confidence` factors, `narrative`). AI Summary itself is
 * shown once, in the Executive Intelligence section — not repeated here.
 * PR13.3 Goal 6 moved the Activity Feed/Timeline card that used to render
 * as this component's last sub-card out into its own top-level
 * `ProfileActivityFeed` section (page.tsx now renders it last, per the
 * mandated linear order) — no data or logic changed, only where it renders.
 */
export function ProfileIntelligence({ narrative, risk, health, confidence, governance }: ProfileIntelligenceProps) {
  const activeGovernanceCount = governance?.filter((event) => event.status === "active").length ?? 0;

  return (
    <div className="flex flex-col gap-5">
      <ProfileSectionCard title="AI Intelligence" icon={Brain} className="gap-5">
        {narrative && (
          <section className="flex flex-col gap-1.5">
            <QuickViewSectionLabel>Narrative</QuickViewSectionLabel>
            <p className="text-sm text-radar-light-text dark:text-radar-white">
              {narrative.category} narrative: {narrative.label} ({formatPercent(narrative.changePct24h)} 24h)
            </p>
          </section>
        )}

        <section className={narrative ? DIVIDED_SECTION_CLASS : "flex flex-col gap-1.5"}>
          <QuickViewSectionLabel>Risk Analysis</QuickViewSectionLabel>
          <p className="text-sm capitalize text-radar-light-text dark:text-radar-white">{risk.level} risk</p>
          <p className="text-xs text-radar-light-muted dark:text-radar-muted">{risk.explanation}</p>
          {risk.contributors.length > 0 && (
            <div className="mt-1 flex flex-col gap-3">
              {RISK_GROUPS.map((group) => {
                const members = group.contributorLabels
                  .map((label) => risk.contributors.find((c) => c.label === label))
                  .filter((c): c is (typeof risk.contributors)[number] => c !== undefined);
                if (members.length === 0) return null;

                const worstSeverity = members.reduce<RiskContributorSeverity>(
                  (worst, c) => (SEVERITY_RANK[c.severity] > SEVERITY_RANK[worst] ? c.severity : worst),
                  "unknown"
                );
                const GroupIcon = group.icon;

                return (
                  <div key={group.label} className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-1.5">
                      <GroupIcon className={cn("size-3.5 shrink-0", SEVERITY_TEXT_CLASS[worstSeverity])} aria-hidden="true" />
                      <span className="text-xs font-semibold text-radar-light-text dark:text-radar-white">{group.label}</span>
                    </div>
                    <ul className="ml-[7px] flex flex-col gap-1.5 border-l border-radar-light-border pl-3 dark:border-white/10">
                      {members.map((contributor) => {
                        const Icon = SEVERITY_ICON[contributor.severity];
                        return (
                          <li
                            key={contributor.label}
                            className={cn("flex flex-col gap-1 rounded-xl border p-2.5", SEVERITY_CARD_CLASS[contributor.severity])}
                          >
                            <div className="flex items-center gap-1.5">
                              <Icon className={cn("size-3.5 shrink-0", SEVERITY_TEXT_CLASS[contributor.severity])} aria-hidden="true" />
                              <span className="text-xs font-semibold text-radar-light-text dark:text-radar-white">
                                {CONTRIBUTOR_DISPLAY_LABEL[contributor.label] ?? contributor.label}
                              </span>
                              <span
                                className={cn(
                                  "ml-auto shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium",
                                  SEVERITY_TEXT_CLASS[contributor.severity]
                                )}
                              >
                                {SEVERITY_STATUS_LABEL[contributor.severity]}
                              </span>
                            </div>
                            <p className="text-xs text-radar-light-muted dark:text-radar-muted">{contributor.detail}</p>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className={DIVIDED_SECTION_CLASS}>
          <QuickViewSectionLabel>Health Explanation</QuickViewSectionLabel>
          {health.factors.length > 0 ? (
            <ul className="flex flex-col gap-1.5">
              {health.factors.map((factor) => (
                <FactorCard key={factor} factor={factor} />
              ))}
            </ul>
          ) : (
            <p className="text-xs text-radar-light-muted dark:text-radar-muted">No live signals available to assess health.</p>
          )}
        </section>

        <section className={DIVIDED_SECTION_CLASS}>
          <QuickViewSectionLabel>Confidence Explanation</QuickViewSectionLabel>
          {confidence.factors.length > 0 ? (
            <ul className="flex flex-col gap-1.5">
              {confidence.factors.map((factor) => (
                <FactorCard key={factor} factor={factor} />
              ))}
            </ul>
          ) : (
            <p className="text-xs text-radar-light-muted dark:text-radar-muted">No live sources available.</p>
          )}
        </section>
      </ProfileSectionCard>

      {governance && (
        <ProfileSectionCard title="Governance" icon={Landmark}>
          <p className="text-sm text-radar-light-text dark:text-radar-white">
            {governance.length} proposal{governance.length === 1 ? "" : "s"} tracked,{" "}
            <span className={cn(activeGovernanceCount > 0 && "font-semibold text-radar-primary dark:text-radar-accent")}>
              {activeGovernanceCount} active
            </span>
          </p>
        </ProfileSectionCard>
      )}
    </div>
  );
}
