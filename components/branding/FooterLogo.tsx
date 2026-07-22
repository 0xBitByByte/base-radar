import Image from "next/image";

const footerLockup = "/brand/footer-lockup.webp";
import { cn } from "@/lib/utils";

/** Intrinsic aspect ratio of `footer-lockup.webp` (455×280 source, keyed
 * directly from the official "Base_Radar_logo_3D_202607110902.jpeg" — a
 * different, stacked icon-above-wordmark composition than the Navbar's
 * side-by-side lockup, per the brief's explicit distinction between the two
 * assets; re-encoded from PNG to lossless WebP, pixel-identical, ~27%
 * smaller). `height` is the display height; width is derived so the artwork
 * is never stretched. */
const ASPECT = 455 / 280;

type FooterLogoProps = {
  height?: number;
  className?: string;
};

/**
 * The Footer's brand mark — the official 3D-render lockup rendered exactly
 * as provided, one single image, distinct from the Navbar's `HeaderLogo`.
 */
export function FooterLogo({ height = 64, className }: FooterLogoProps) {
  const width = Math.round(height * ASPECT);
  return (
    <Image
      src={footerLockup}
      alt="Base Radar"
      width={width}
      height={height}
      className={cn("object-contain", className)}
      style={{ width, height }}
    />
  );
}
