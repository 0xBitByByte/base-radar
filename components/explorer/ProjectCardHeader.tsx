import { ProjectLogo } from "@/components/branding/ProjectLogo";
import { VerificationBadge } from "@/components/explorer/VerificationBadge";
import { VerificationLevelBadge } from "@/components/explorer/VerificationLevelBadge";
import { LifecycleBadge } from "@/components/explorer/LifecycleBadge";
import { WatchButton } from "@/components/watchlists/WatchButton";
import type { RegistryLifecycleState, VerificationLevel } from "@/data/projects/enums";
import type { Community, Identity } from "@/lib/intelligence/types";

type ProjectCardHeaderProps = {
  identity: Identity;
  community: Community;
  /** PR-038 — both `undefined` on every current seed project; each badge renders nothing until the registry actually records a value. */
  verificationLevel?: VerificationLevel;
  lifecycleState?: RegistryLifecycleState;
};

/**
 * Logo, name, and verification — docs/explorer/04-component-specification.md §9.
 * Verification sits on its own row below the name (rather than beside it)
 * so the name row gets the card's full width to itself — a long name
 * (e.g. "Across Protocol", "Aerodrome Finance") no longer competes with
 * the badge for space and truncates later than it otherwise would.
 *
 * PR-038: the registry-model badges (Verification Level, Lifecycle) join
 * that same row, after the existing Verification Status badge — the
 * priority order this PR specifies. Both are `null` today for every seed
 * project, so this row renders byte-for-byte as before until registry data
 * adopts the new fields.
 */
export function ProjectCardHeader({ identity, community, verificationLevel, lifecycleState }: ProjectCardHeaderProps) {
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

        <WatchButton projectId={identity.id} projectName={identity.name} size="sm" className="-my-1" />
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <VerificationBadge status={community.verificationStatus} />
        <VerificationLevelBadge level={verificationLevel} />
        <LifecycleBadge state={lifecycleState} />
      </div>
    </div>
  );
}
