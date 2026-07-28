import { ShieldCheck } from "lucide-react";

import { ProfileSectionCard } from "@/components/explorer/ProfileSectionCard";
import { GlowBadge, type GlowBadgeColor } from "@/components/ui/GlowBadge";
import { PROVIDER_NAMES } from "@/lib/providers/common/types";
import type { VerificationStatus } from "@/data/projects/enums";
import type { Confidence, Contracts, GithubIntel, Sources } from "@/lib/intelligence/types";

type TrustTileStatus = "pass" | "partial" | "fail" | "neutral";

type TrustTile = {
  id: string;
  label: string;
  status: TrustTileStatus;
  detail: string;
};

const STATUS_COLOR: Record<TrustTileStatus, GlowBadgeColor> = {
  pass: "success",
  partial: "warning",
  fail: "danger",
  neutral: "muted",
};

const STATUS_LABEL: Record<TrustTileStatus, string> = {
  pass: "Yes",
  partial: "Partial",
  fail: "No",
  neutral: "N/A",
};

type ProfileTrustCenterProps = {
  verificationStatus: VerificationStatus;
  confidence: Confidence;
  contracts: Contracts;
  sources: Sources;
  github: GithubIntel;
  /** Real registry signal, independent of whether the live GitHub fetch itself succeeded — distinguishes "not linked" from "linked but unreachable." */
  githubConfigured: boolean;
  websiteUrl: string | null;
  docsUrl: string | null;
  /** Real completeness count (links present ÷ platforms this codebase tracks) — same numbers already feeding the Health Scorecard's Community tile, never recomputed. */
  communityLinkCount: number;
  communityLinkTotal: number;
};

/**
 * PR-062 Task 3 — the Trust Center: every trust signal this app already
 * computes, grouped into one place so "can this project be trusted?" has
 * one answer instead of being scattered across the Header, Scorecard,
 * Sources, and Contracts sections. No new provider call, no new score —
 * every tile below reads a field `ProjectIntelligence`/the registry already
 * produced elsewhere on this page.
 */
export function ProfileTrustCenter({
  verificationStatus,
  confidence,
  contracts,
  sources,
  github,
  githubConfigured,
  websiteUrl,
  docsUrl,
  communityLinkCount,
  communityLinkTotal,
}: ProfileTrustCenterProps) {
  const verifiedContracts = contracts.items.filter((item) => item.verified === true).length;
  const liveSourceCount = PROVIDER_NAMES.filter((provider) => sources[provider].status === "live").length;
  const completenessRatio = communityLinkTotal > 0 ? communityLinkCount / communityLinkTotal : 0;

  const tiles: TrustTile[] = [
    {
      id: "verification",
      label: "Registry Verification",
      status:
        verificationStatus === "verified"
          ? "pass"
          : verificationStatus === "community"
            ? "partial"
            : verificationStatus === "flagged"
              ? "fail"
              : "neutral",
      detail:
        verificationStatus === "verified"
          ? "Reviewed and confirmed by Base Radar's editorial team."
          : verificationStatus === "community"
            ? "Community-submitted, partially reviewed — not yet fully verified."
            : verificationStatus === "flagged"
              ? "Flagged by Base Radar's editorial team — check the flag reason before trusting this project's data."
              : "Not yet reviewed by Base Radar's editorial team.",
    },
    {
      id: "confidence",
      label: "Data Confidence",
      status: confidence.level === "high" ? "pass" : confidence.level === "medium" ? "partial" : "fail",
      detail: `${confidence.score}/100 — ${confidence.level} confidence, based on how much of this profile comes from live provider data vs. registry defaults.`,
    },
    {
      id: "contracts",
      label: "Verified Contracts",
      status: contracts.count === 0 ? "neutral" : verifiedContracts > 0 ? "pass" : "partial",
      detail:
        contracts.count === 0
          ? "No contracts have been registered for this project yet."
          : `${verifiedContracts} of ${contracts.count} registered contract${contracts.count === 1 ? "" : "s"} verified on-chain.`,
    },
    {
      id: "providers",
      label: "Provider Coverage",
      status: liveSourceCount === 0 ? "fail" : liveSourceCount === PROVIDER_NAMES.length ? "pass" : "partial",
      detail: `${liveSourceCount} of ${PROVIDER_NAMES.length} tracked data providers returned live data just now.`,
    },
    {
      id: "github",
      label: "GitHub Repository",
      status: !githubConfigured ? "neutral" : github.available ? "pass" : "fail",
      detail: !githubConfigured
        ? "No GitHub repository is currently linked in the registry."
        : github.available
          ? "Public repository linked and actively indexed."
          : "A repository is linked, but couldn't be reached just now — this will retry automatically.",
    },
    {
      id: "website",
      label: "Official Website",
      status: websiteUrl ? "pass" : "neutral",
      detail: websiteUrl ? "Official website configured in the registry." : "No official website is currently linked.",
    },
    {
      id: "docs",
      label: "Documentation",
      status: docsUrl ? "pass" : "neutral",
      detail: docsUrl ? "Technical documentation linked in the registry." : "No documentation link is currently configured.",
    },
    {
      id: "completeness",
      label: "Registry Completeness",
      status:
        communityLinkTotal === 0
          ? "neutral"
          : completenessRatio >= 0.7
            ? "pass"
            : completenessRatio >= 0.3
              ? "partial"
              : "fail",
      detail: `${communityLinkCount} of ${communityLinkTotal} tracked official/community links configured.`,
    },
  ];

  return (
    <ProfileSectionCard id="trust-center" title="Trust Center" icon={ShieldCheck}>
      <p className="text-xs leading-relaxed text-radar-light-muted dark:text-radar-muted">
        Everything Base Radar checks to answer one question: can this project be trusted?
      </p>
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
        {tiles.map((tile) => (
          <div
            key={tile.id}
            className="flex flex-col gap-1.5 rounded-xl border border-radar-light-border bg-radar-light-surface p-3 dark:border-white/10 dark:bg-white/[0.02]"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-radar-light-text dark:text-radar-white">{tile.label}</span>
              <GlowBadge color={STATUS_COLOR[tile.status]} className="shrink-0 px-1.5 py-0.5 text-[10px]">
                {STATUS_LABEL[tile.status]}
              </GlowBadge>
            </div>
            <p className="text-[11px] leading-relaxed text-radar-light-muted dark:text-radar-muted">{tile.detail}</p>
          </div>
        ))}
      </div>
    </ProfileSectionCard>
  );
}
