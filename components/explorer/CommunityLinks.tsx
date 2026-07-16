import { SocialLink } from "@/components/branding/SocialLink";
import type { Community } from "@/lib/intelligence/types";
import type { SocialPlatform } from "@/lib/branding/types";

type CommunityLinksProps = {
  socials: Community["socials"];
  /** Extra links Quick View doesn't pass (it already shows these elsewhere) — only the Project Profile's Community section supplies them, so Quick View's rendering is unaffected. */
  websiteUrl?: string | null;
  githubUrl?: string | null;
  governanceUrl?: string | null;
};

/**
 * The social-links row — extracted from `QuickViewCommunity.tsx` (PR11) so
 * the Project Profile page can reuse the exact same markup instead of a
 * second, parallel implementation. PR12 Req 10 expands the set to every
 * link this codebase's registry can carry (website/GitHub/governance plus
 * docs/blog/forum/medium/mirror/linkedin) — "only show links that actually
 * exist" still holds: every entry here is `null`-filtered, nothing is ever
 * fabricated for a project that hasn't configured it.
 */
export function CommunityLinks({ socials, websiteUrl, githubUrl, governanceUrl }: CommunityLinksProps) {
  const links: Array<{ platform: SocialPlatform; href: string | null | undefined }> = [
    { platform: "website", href: websiteUrl },
    { platform: "github", href: githubUrl },
    { platform: "x", href: socials.twitter },
    { platform: "discord", href: socials.discord },
    { platform: "telegram", href: socials.telegram },
    { platform: "farcaster", href: socials.farcaster },
    { platform: "governance", href: governanceUrl },
    { platform: "docs", href: socials.docs },
    { platform: "blog", href: socials.blog },
    { platform: "forum", href: socials.forum },
    { platform: "medium", href: socials.medium },
    { platform: "mirror", href: socials.mirror },
    { platform: "linkedin", href: socials.linkedin },
  ];
  const available = links.filter(
    (entry): entry is { platform: SocialPlatform; href: string } => Boolean(entry.href)
  );

  if (available.length === 0) {
    return (
      <p className="text-xs text-radar-light-muted dark:text-radar-muted">
        No community links are configured for this project in the Base Radar registry yet.
      </p>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {available.map(({ platform, href }) => (
        <SocialLink key={platform} platform={platform} href={href} />
      ))}
    </div>
  );
}
