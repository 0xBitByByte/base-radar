import Image from "next/image";
import { Dialog } from "@base-ui/react/dialog";
import { X } from "lucide-react";

import { VerificationBadge } from "@/components/explorer/VerificationBadge";
import { ProjectCategoryChips } from "@/components/explorer/ProjectCategoryChips";
import type { Community, Identity } from "@/lib/intelligence/types";

type QuickViewHeaderProps = {
  identity: Identity;
  community: Community;
};

/**
 * Identity — logo, name, category/tag chips, verification, close control
 * (docs/explorer/03 §14, item 1). The "what is this?" beat: answered in
 * under a second, before anything else in the drawer. `Dialog.Title` is the
 * visible name heading itself (mirrors `MobileSidebar`'s own pattern) —
 * Base UI wires `aria-labelledby` from this automatically, so the
 * accessible name and the visible heading are the same element, never two
 * sources that could drift apart.
 *
 * This is the Project Logo (`identity.logoUrl`) — never a token logo, which
 * doesn't belong here (see `QuickViewMetrics` for where a future token logo
 * slots in instead).
 */
export function QuickViewHeader({ identity, community }: QuickViewHeaderProps) {
  return (
    <div className="flex flex-col gap-4 p-5">
      <div className="flex items-center gap-3">
        {identity.logoUrl ? (
          <Image
            src={identity.logoUrl}
            alt=""
            width={56}
            height={56}
            unoptimized
            className="size-14 shrink-0 rounded-full object-cover"
          />
        ) : (
          <span
            className="flex size-14 shrink-0 items-center justify-center rounded-full bg-radar-light-surface text-lg font-semibold text-radar-light-muted dark:bg-white/5 dark:text-radar-muted"
            aria-hidden="true"
          >
            {identity.name.slice(0, 2).toUpperCase()}
          </span>
        )}

        <div className="min-w-0 flex-1">
          <Dialog.Title className="truncate text-lg font-semibold text-radar-light-text dark:text-radar-white">
            {identity.name}
          </Dialog.Title>
          <VerificationBadge status={community.verificationStatus} className="mt-1.5" />
        </div>

        <Dialog.Close
          aria-label="Close project details"
          className="flex size-8 shrink-0 items-center justify-center rounded-lg text-radar-light-muted outline-none transition-colors hover:bg-radar-light-surface focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:text-radar-muted dark:hover:bg-white/5"
        >
          <X className="size-4" aria-hidden="true" />
        </Dialog.Close>
      </div>

      <ProjectCategoryChips categories={identity.categories} tags={identity.tags} />
    </div>
  );
}
