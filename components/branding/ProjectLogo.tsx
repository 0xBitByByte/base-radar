"use client";

import { useState } from "react";
import Image from "next/image";

import { getProjectInitials } from "@/lib/branding/projects";
import { cn } from "@/lib/utils";

type ProjectLogoProps = {
  logoUrl: string | null | undefined;
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
 * `size`×`size` box, so nothing reflows whichever renders — including the
 * case where an image URL 404s after mount, which falls back to initials
 * instead of a broken-image icon.
 */
export function ProjectLogo({ logoUrl, name, size = 40, className }: ProjectLogoProps) {
  const [failed, setFailed] = useState(false);

  if (logoUrl && !failed) {
    return (
      <Image
        src={logoUrl}
        alt=""
        width={size}
        height={size}
        unoptimized
        onError={() => setFailed(true)}
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
