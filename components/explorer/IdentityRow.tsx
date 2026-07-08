import Image from "next/image";

import { formatLabel } from "@/components/explorer/format";
import { VerificationBadge } from "@/components/explorer/VerificationBadge";
import { GlowBadge } from "@/components/ui/GlowBadge";
import type { ProjectIntelligence } from "@/lib/intelligence/types";

type IdentityRowProps = {
  project: ProjectIntelligence;
};

/**
 * PR1's entire per-project surface: logo, name, category, verification.
 * Nothing else — Grid cards, table rows, and Quick View are later PRs.
 */
export function IdentityRow({ project }: IdentityRowProps) {
  const { identity, community } = project;
  const primaryCategory = identity.categories[0];

  return (
    <li className="flex items-center gap-3 px-4 py-3 sm:px-5">
      {identity.logoUrl ? (
        <Image
          src={identity.logoUrl}
          alt=""
          width={32}
          height={32}
          unoptimized
          className="size-8 shrink-0 rounded-full object-cover"
        />
      ) : (
        <span
          className="flex size-8 shrink-0 items-center justify-center rounded-full bg-radar-light-surface text-xs font-semibold text-radar-light-muted dark:bg-white/5 dark:text-radar-muted"
          aria-hidden="true"
        >
          {identity.name.slice(0, 2).toUpperCase()}
        </span>
      )}

      <span className="min-w-0 flex-1 truncate text-sm font-medium text-radar-light-text dark:text-radar-white">
        {identity.name}
      </span>

      {primaryCategory && (
        <GlowBadge color="muted" className="hidden shrink-0 sm:inline-flex">
          {formatLabel(primaryCategory)}
        </GlowBadge>
      )}

      <VerificationBadge status={community.verificationStatus} className="shrink-0" />
    </li>
  );
}
