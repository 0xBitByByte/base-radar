"use client";

import { useState } from "react";
import Image from "next/image";

import { getProjectInitials } from "@/lib/branding/projects";
import { cn } from "@/lib/utils";

type ProjectLogoProps = {
  logoUrl: string | null | undefined;
  /**
   * PR-072 — real, lower-priority logo candidates (e.g. `identity.logoUrlFallbacks`)
   * to try, in order, if `logoUrl`'s image fails to actually load (a broken
   * URL/404) — never tried before `logoUrl`, and never substituted just
   * because `logoUrl` is falsy (that case already skips straight to
   * initials, same as before this prop existed). Omit for call sites that
   * only ever had one candidate to begin with.
   */
  fallbackUrls?: (string | null | undefined)[];
  name: string;
  size?: number;
  className?: string;
};

function initialsTextClass(size: number): string {
  if (size >= 48) return "text-base";
  if (size >= 32) return "text-xs";
  return "text-[10px]";
}

/**
 * The one Project Logo implementation — official logo image, or an
 * initials fallback, at a caller-chosen pixel size. Previously
 * reimplemented at every call site (card header, table row, Quick View
 * header); this is the single source now, so a fallback-avatar change
 * never has to be made four times. Both branches occupy an identical
 * `size`×`size` box, so nothing reflows whichever renders.
 *
 * PR-072 — a broken image URL (a 404, not just an absent one) now advances
 * to the next real candidate in `fallbackUrls` instead of jumping straight
 * to initials; only once every candidate has failed to load does this fall
 * back to the initials avatar.
 */
export function ProjectLogo({ logoUrl, fallbackUrls, name, size = 40, className }: ProjectLogoProps) {
  const candidates = [logoUrl, ...(fallbackUrls ?? [])].filter((url): url is string => Boolean(url));
  const uniqueCandidates = Array.from(new Set(candidates));
  const [candidateIndex, setCandidateIndex] = useState(0);

  const activeUrl = uniqueCandidates[candidateIndex];

  if (activeUrl) {
    return (
      <Image
        key={activeUrl}
        src={activeUrl}
        alt=""
        width={size}
        height={size}
        unoptimized
        onError={() => setCandidateIndex((index) => index + 1)}
        className={cn("shrink-0 rounded-full object-cover", className)}
      />
    );
  }

  return (
    <span
      style={{ width: size, height: size }}
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full bg-radar-light-surface font-semibold text-radar-light-muted dark:bg-white/5 dark:text-radar-muted",
        initialsTextClass(size),
        className
      )}
      aria-hidden="true"
    >
      {getProjectInitials(name)}
    </span>
  );
}
