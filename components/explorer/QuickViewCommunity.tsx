import { SocialLink } from "@/components/branding/SocialLink";
import { MetricItem } from "@/components/explorer/MetricItem";
import { GITHUB_STARS_INFO_TOOLTIP } from "@/components/explorer/metricTooltips";
import { QuickViewSectionLabel } from "@/components/explorer/QuickViewSectionLabel";
import { VerificationBadge } from "@/components/explorer/VerificationBadge";
import { GlowBadge, type GlowBadgeColor } from "@/components/ui/GlowBadge";
import { formatCompactNumber, formatNumber } from "@/lib/data/format";
import type { Community, GithubIntel } from "@/lib/intelligence/types";
import type { SocialPlatform } from "@/lib/branding/types";
import type { GovernanceEvent, GovernanceStatus } from "@/lib/governance";

type QuickViewCommunityProps = {
  community: Community;
  github: GithubIntel;
  /** `null` means this project has no governance source configured — the section is omitted entirely, never shown empty. */
  governance: GovernanceEvent[] | null;
};

const GOVERNANCE_STATUS_COLOR: Record<GovernanceStatus, GlowBadgeColor> = {
  active: "accent",
  passed: "success",
  failed: "danger",
  pending: "muted",
};

/** One shared card for the group, instead of one bordered box per stat — same data, lighter chrome. */
const METRIC_GROUP_CLASS =
  "grid grid-cols-2 gap-4 rounded-xl border border-radar-light-border bg-radar-light-surface p-4 dark:border-white/10 dark:bg-white/[0.02]";

/**
 * Verification, developer activity, and community signals — docs/explorer/03
 * §14's Community content (item 7), given its own section per this task's
 * explicit component tree. `VerificationBadge` already appears in
 * `QuickViewHeader`; showing it again here at full trust-signal context (not
 * just a compact header badge) mirrors this codebase's own established
 * precedent of the same figure appearing at two levels of detail
 * (`ExplorerStatusBadge`/`ExplorerDataCoverage`) — not duplicated
 * responsibility, since neither location recomputes anything.
 */
export function QuickViewCommunity({ community, github, governance }: QuickViewCommunityProps) {
  const starsAvailable = github.available && github.stars !== null;
  const forksAvailable = github.available && github.forks !== null;
  const issuesAvailable = github.available && github.openIssues !== null;
  const releaseAvailable = github.available && github.latestReleaseTag !== null;

  const socialLinks: Array<{ platform: SocialPlatform; href: string | null }> = [
    { platform: "x", href: community.socials.twitter },
    { platform: "discord", href: community.socials.discord },
    { platform: "telegram", href: community.socials.telegram },
    { platform: "farcaster", href: community.socials.farcaster },
  ];
  const availableSocialLinks = socialLinks.filter(
    (entry): entry is { platform: SocialPlatform; href: string } => entry.href !== null
  );

  return (
    <div className="flex flex-col gap-6 px-5 py-6">
      <section className="flex flex-col gap-2">
        <QuickViewSectionLabel>Verification</QuickViewSectionLabel>
        <VerificationBadge status={community.verificationStatus} />
      </section>

      <section className="flex flex-col gap-2">
        <QuickViewSectionLabel>Developer Activity</QuickViewSectionLabel>
        <div className={METRIC_GROUP_CLASS}>
          <MetricItem
            bare
            label="GitHub Stars"
            value={starsAvailable ? formatCompactNumber(github.stars as number) : undefined}
            unavailable={!starsAvailable}
            infoTooltip={GITHUB_STARS_INFO_TOOLTIP}
          />
          <MetricItem
            bare
            label="Forks"
            value={forksAvailable ? formatNumber(github.forks as number) : undefined}
            unavailable={!forksAvailable}
          />
          <MetricItem
            bare
            label="Open Issues"
            value={issuesAvailable ? formatNumber(github.openIssues as number) : undefined}
            unavailable={!issuesAvailable}
          />
          <MetricItem
            bare
            label="Latest Release"
            value={releaseAvailable ? (github.latestReleaseTag as string) : undefined}
            unavailable={!releaseAvailable}
          />
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <QuickViewSectionLabel>Community</QuickViewSectionLabel>
        {availableSocialLinks.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {availableSocialLinks.map(({ platform, href }) => (
              <SocialLink key={platform} platform={platform} href={href} />
            ))}
          </div>
        ) : (
          <p className="text-xs text-radar-light-muted dark:text-radar-muted">No community links listed for this project.</p>
        )}
      </section>

      {governance && (
        <section className="flex flex-col gap-2">
          <QuickViewSectionLabel>Governance</QuickViewSectionLabel>
          {governance.length > 0 ? (
            <ul className="flex flex-col gap-2">
              {governance.map((event) => (
                <li
                  key={event.proposalId}
                  className="flex items-center justify-between gap-3 rounded-xl border border-radar-light-border bg-radar-light-surface p-3 dark:border-white/10 dark:bg-white/[0.02]"
                >
                  <a
                    href={event.url}
                    target="_blank"
                    rel="noreferrer"
                    className="min-w-0 truncate text-xs font-medium text-radar-light-text hover:underline dark:text-radar-white"
                  >
                    {event.title}
                  </a>
                  <GlowBadge color={GOVERNANCE_STATUS_COLOR[event.status]} className="shrink-0 capitalize">
                    {event.status}
                  </GlowBadge>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-radar-light-muted dark:text-radar-muted">No active governance proposals.</p>
          )}
        </section>
      )}
    </div>
  );
}
