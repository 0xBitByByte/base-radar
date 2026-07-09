import Image from "next/image";

import { VerificationBadge } from "@/components/explorer/VerificationBadge";
import type { Community, Identity } from "@/lib/intelligence/types";

type ProjectCardHeaderProps = {
  identity: Identity;
  community: Community;
};

/** Logo, name, and verification — docs/explorer/04-component-specification.md §9. */
export function ProjectCardHeader({ identity, community }: ProjectCardHeaderProps) {
  return (
    <div className="flex items-center gap-3">
      {identity.logoUrl ? (
        <Image
          src={identity.logoUrl}
          alt=""
          width={40}
          height={40}
          unoptimized
          className="size-10 shrink-0 rounded-full object-cover"
        />
      ) : (
        <span
          className="flex size-10 shrink-0 items-center justify-center rounded-full bg-radar-light-surface text-sm font-semibold text-radar-light-muted dark:bg-white/5 dark:text-radar-muted"
          aria-hidden="true"
        >
          {identity.name.slice(0, 2).toUpperCase()}
        </span>
      )}

      <span className="min-w-0 flex-1 truncate text-sm font-semibold text-radar-light-text dark:text-radar-white">
        {identity.name}
      </span>

      <VerificationBadge status={community.verificationStatus} className="shrink-0" />
    </div>
  );
}
