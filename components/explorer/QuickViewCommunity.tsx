import { DiscordMark, XMark } from "@/components/ui/BrandIcons";
import { MetricItem } from "@/components/explorer/MetricItem";
import { QuickViewSectionLabel } from "@/components/explorer/QuickViewSectionLabel";
import { VerificationBadge } from "@/components/explorer/VerificationBadge";
import { formatCompactNumber, formatNumber } from "@/lib/data/format";
import type { Community, GithubIntel } from "@/lib/intelligence/types";

type QuickViewCommunityProps = {
  community: Community;
  github: GithubIntel;
};

const SOCIAL_LINK_CLASS =
  "flex items-center gap-1.5 rounded-lg border border-radar-light-border px-2.5 py-1.5 text-xs font-medium text-radar-light-text outline-none transition-colors hover:bg-radar-light-surface focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:border-white/10 dark:text-radar-white dark:hover:bg-white/5";

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
export function QuickViewCommunity({ community, github }: QuickViewCommunityProps) {
  const starsAvailable = github.available && github.stars !== null;
  const forksAvailable = github.available && github.forks !== null;
  const issuesAvailable = github.available && github.openIssues !== null;
  const releaseAvailable = github.available && github.latestReleaseTag !== null;

  const socialLinks = [
    { key: "twitter", label: "X (Twitter)", href: community.socials.twitter, Icon: XMark },
    { key: "discord", label: "Discord", href: community.socials.discord, Icon: DiscordMark },
    { key: "telegram", label: "Telegram", href: community.socials.telegram, Icon: null },
    { key: "farcaster", label: "Farcaster", href: community.socials.farcaster, Icon: null },
  ].filter((entry): entry is typeof entry & { href: string } => entry.href !== null);

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
            infoTooltip="The project's GitHub star count, sourced live from the GitHub API."
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
        {socialLinks.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {socialLinks.map(({ key, label, href, Icon }) => (
              <a key={key} href={href} target="_blank" rel="noopener noreferrer" className={SOCIAL_LINK_CLASS}>
                {Icon && <Icon className="size-3.5" />}
                {label}
              </a>
            ))}
          </div>
        ) : (
          <p className="text-xs text-radar-light-muted dark:text-radar-muted">No community links listed for this project.</p>
        )}
      </section>
    </div>
  );
}
