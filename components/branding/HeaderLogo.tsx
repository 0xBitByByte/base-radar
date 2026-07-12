import Image from "next/image";

import headerLockup from "@/public/brand/header-lockup.webp";
import { cn } from "@/lib/utils";

/** Intrinsic aspect ratio of `header-lockup.webp` (2652×900 source, keyed as
 * one flattened image directly from the official "Logo with title.jpeg" —
 * icon and wordmark are never split into separate assets or recomposed via
 * CSS; re-encoded from PNG to lossless WebP, pixel-identical, ~34% smaller).
 * `height` is the display height; width is derived so the artwork is
 * never stretched. */
const ASPECT = 2652 / 900;

type HeaderLogoProps = {
  height?: number;
  className?: string;
};

/**
 * The Navbar's brand mark — the official lockup artwork rendered exactly as
 * provided, one single image. No icon-box, no typeset text, no separate
 * wordmark component composed alongside it.
 */
export function HeaderLogo({ height = 40, className }: HeaderLogoProps) {
  const width = Math.round(height * ASPECT);
  return (
    <Image
      src={headerLockup}
      alt="Base Radar"
      width={width}
      height={height}
      priority
      className={cn("object-contain", className)}
      style={{ width, height }}
    />
  );
}
