import { Globe2 } from "lucide-react";

import { CommunityLinks } from "@/components/explorer/CommunityLinks";
import { ProfileSectionCard } from "@/components/explorer/ProfileSectionCard";
import type { Community, Identity } from "@/lib/intelligence/types";

type ProfileCommunityProps = {
  socials: Community["socials"];
  governanceUrl: Community["governanceUrl"];
  websiteUrl: Identity["websiteUrl"];
  githubUrl: string | null;
};

/**
 * Community — PR11 Part 8, expanded in PR12 Req 10 to the full registry
 * link set: website/GitHub/governance (already shown elsewhere on the page,
 * repeated here so Community is the one complete list) plus every social
 * platform the registry can carry. Reuses `CommunityLinks` (extracted from
 * `QuickViewCommunity.tsx`) rather than a second, parallel rendering of the
 * same row. Wrapped in `ProfileSectionCard` (PR11.2 Part 3) to match every
 * other main-column section's card elevation.
 */
export function ProfileCommunity({ socials, governanceUrl, websiteUrl, githubUrl }: ProfileCommunityProps) {
  return (
    <ProfileSectionCard
      id="community"
      title="Community"
      icon={Globe2}
      sourceLink={{ href: websiteUrl, label: "Website" }}
    >
      <CommunityLinks socials={socials} websiteUrl={websiteUrl} githubUrl={githubUrl} governanceUrl={governanceUrl} />
    </ProfileSectionCard>
  );
}
