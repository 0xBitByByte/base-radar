import { ProjectLogo } from "@/components/branding/ProjectLogo";
import { VerificationBadge } from "@/components/explorer/VerificationBadge";
import type { Community, Identity } from "@/lib/intelligence/types";

type ProjectCardHeaderProps = {
  identity: Identity;
  community: Community;
};

/**
 * Logo, name, and verification — docs/explorer/04-component-specification.md §9.
 * Verification sits on its own row below the name (rather than beside it)
 * so the name row gets the card's full width to itself — a long name
 * (e.g. "Across Protocol", "Aerodrome Finance") no longer competes with
 * the badge for space and truncates later than it otherwise would.
 */
export function ProjectCardHeader({ identity, community }: ProjectCardHeaderProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-3">
        <ProjectLogo logoUrl={identity.logoUrl} name={identity.name} size={40} />

        <span
          title={identity.name}
          className="min-w-0 flex-1 truncate text-sm font-semibold text-radar-light-text dark:text-radar-white"
        >
          {identity.name}
        </span>
      </div>

      <VerificationBadge status={community.verificationStatus} />
    </div>
  );
}
