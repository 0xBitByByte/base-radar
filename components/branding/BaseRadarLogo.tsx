import Image from "next/image";

import logoIcon from "@/public/brand/logo-icon.webp";
import { cn } from "@/lib/utils";

/** Intrinsic aspect ratio of `logo-icon.webp` (902×1171 source, lossless WebP re-encode of the original PNG — pixel-identical, ~54% smaller) — the mark is taller than it is wide, unlike the old placeholder glyph it replaced. `size` below is treated as the display *height*; width is derived from this so the artwork is never stretched to a square box. */
const ICON_ASPECT = 902 / 1171;

type BaseRadarLogoProps = {
  size?: number;
  className?: string;
  /** Renders via Next Image's `fill` mode instead of a fixed pixel size — `size` is ignored. The parent must be `position: relative` with explicit (even if viewport-responsive) dimensions. The only consumer that needs this is `BrandSpinner`, whose logo size scales smoothly across viewports via `clamp()` rather than snapping between fixed pixel values. */
  fill?: boolean;
};

/**
 * The official Base Radar brand mark — background-removed directly from
 * the uploaded studio render ("Logo.jpeg"), not a recreation. This is the
 * one shared component every icon call site (Sidebar, Navbar, Footer,
 * BrandSpinner, splash) renders instead of each hand-rolling its own
 * glyph. A fixed brand asset, not `currentColor` — like Base's own chain
 * mark, it doesn't invert per theme.
 */
export function BaseRadarLogo({ size = 24, className, fill }: BaseRadarLogoProps) {
  if (fill) {
    // `priority`: every `fill` consumer today (`BrandSpinner`) is a
    // full-viewport loading indicator shown immediately on mount — without
    // this, Next's default `loading="lazy"` defers the request and the logo
    // never paints in time to be seen at all.
    //
    // `unoptimized`: Next's on-demand image-optimization endpoint measured
    // ~600ms for this asset's first request in dev (a fresh resize/transform
    // per unique size) — long enough to miss the entire splash's visible
    // window on a cold cache, showing only the empty glow ring with no logo.
    // The source PNG is already sized close to its largest on-screen use, so
    // skipping the transform and letting the browser cache the static file
    // directly is faster and more reliable than optimizing it on every first
    // hit.
    return (
      <Image
        src={logoIcon}
        alt=""
        fill
        priority
        unoptimized
        sizes="500px"
        className={cn("object-contain", className)}
      />
    );
  }

  const width = Math.round(size * ICON_ASPECT);
  return (
    <Image
      src={logoIcon}
      alt=""
      width={width}
      height={size}
      className={className}
      style={{ width, height: size, objectFit: "contain" }}
    />
  );
}
