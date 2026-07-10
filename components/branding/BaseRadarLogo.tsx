import Image from "next/image";

import baseRadarMark from "@/public/brand/base-radar-mark.png";

type BaseRadarLogoProps = {
  size?: number;
  className?: string;
};

/**
 * The Base Radar brand mark — cropped directly from the official logo
 * animation's settled final frame (blue→purple hexagonal "B" ribbon with
 * a cyan inner accent), background keyed to transparent. This is the one
 * shared component every icon-box call site (Sidebar, Navbar, Footer)
 * renders instead of each hand-rolling its own glyph (previously a
 * generic lucide `Radar` icon placeholder). A fixed brand asset, not
 * `currentColor` — like Base's own chain mark, it doesn't invert per
 * theme.
 */
export function BaseRadarLogo({ size = 24, className }: BaseRadarLogoProps) {
  return (
    <Image
      src={baseRadarMark}
      alt=""
      width={size}
      height={size}
      className={className}
      style={{ width: size, height: size, objectFit: "contain" }}
    />
  );
}
