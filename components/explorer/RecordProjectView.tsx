"use client";

import { useEffect } from "react";

import { useRecentlyViewed } from "@/lib/hooks/useRecentlyViewed";

type RecordProjectViewProps = {
  projectId: string;
  projectName: string;
  projectSlug: string;
};

/**
 * PR-093.04 (Personalization) — records a real Project Profile page visit
 * into this device's local Recently Viewed list. Deliberately a separate,
 * invisible component (renders nothing) rather than folded into
 * `ProfileQuickActions.tsx` — that component owns action buttons, not
 * view-tracking, matching this codebase's own single-responsibility
 * convention for small page-mounted client components. Fires once per
 * real page load (mount), never on every render or on any user
 * interaction — a page visit is itself the real event being recorded, not
 * a proxy for it.
 */
export function RecordProjectView({ projectId, projectName, projectSlug }: RecordProjectViewProps) {
  const { recordView } = useRecentlyViewed();

  useEffect(() => {
    recordView(projectId, projectName, projectSlug);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deliberately keyed only on the real identity that changes between page visits; `recordView` is a stable useCallback and re-including it would be a no-op dependency, not a behavior change.
  }, [projectId, projectName, projectSlug]);

  return null;
}
