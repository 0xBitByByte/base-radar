import { BaseRadarLogo } from "@/components/branding/BaseRadarLogo";
import { cn } from "@/lib/utils";

/**
 * PR-065 — the in-app page loader shown while a dashboard route segment's
 * Server Component data is still resolving (`loading.tsx`). Distinct from
 * `BrandSpinner`/`SplashScreen`, which stay reserved for the true app-boot
 * moment (a fixed 2s brand hold, continuous ambient breathing) — this loader
 * runs its logo reveal exactly once and then holds still, since it's meant
 * to disappear the instant real data is ready, not linger as an ambient
 * loop. No JavaScript is required for any of this: the reveal is driven
 * entirely by CSS `@keyframes` (`br-loader-reveal`/`br-loader-outline`/
 * `br-loader-fade-in`, defined in `globals.css` next to `BrandSpinner`'s own
 * keyframes) so this stays a Server Component and paints from the very
 * first byte of HTML — no hydration wait before a loading indicator can
 * even appear.
 *
 * The brand mark itself (`logo-icon.webp`) is a raster asset, not an SVG —
 * there is no vector source anywhere in this repo to trace a literal stroke
 * outline from. The "outline" phase below is therefore a desaturated
 * (`grayscale`/`contrast`/`brightness`) pass of that exact same asset, and
 * the "reveal" phase is a `clip-path` wipe that uncovers the exact same
 * asset at full, unmodified color — at every moment, the only pixels ever
 * on screen belong to the one real logo file. Nothing about the artwork or
 * its gradient is redrawn, approximated, or recolored.
 */

export type BrandLoaderSize = "sm" | "md" | "lg";

/** `clamp(min, preferred, max)` per size, mirroring `BrandSpinner`'s own responsive-tier pattern so the mark scales smoothly across viewports instead of snapping at fixed breakpoints. */
const SIZE_LOGO: Record<BrandLoaderSize, string> = {
  sm: "clamp(36px, 4vw + 24px, 48px)",
  md: "clamp(56px, 5vw + 36px, 80px)",
  lg: "clamp(84px, 6vw + 56px, 128px)",
};

export type BrandLoaderProps = {
  /** Visual size of the logo mark. Defaults to `"md"`. */
  size?: BrandLoaderSize;
  /** Optional deterministic loading message shown beneath the mark — e.g. "Preparing project insights…". Omit entirely for no message; never generated dynamically. */
  label?: string;
  /** Fills the available content area (a tall, centered region) — the route-level `loading.tsx` use case. Takes precedence over `inline` if both are set. */
  fullscreen?: boolean;
  /** Renders compactly inline within existing content flow (tighter gap, no minimum height) — for embedding inside a card or smaller region. */
  inline?: boolean;
  className?: string;
};

export function BrandLoader({ size = "md", label, fullscreen, inline, className }: BrandLoaderProps) {
  const logoSize = SIZE_LOGO[size];
  const ringSize = `calc(${logoSize} * 1.3)`;

  return (
    <div
      role="status"
      aria-label={label ? undefined : "Loading"}
      className={cn(
        "flex flex-col items-center justify-center opacity-0 [animation:br-loader-fade-in_300ms_ease-out_1_forwards]",
        fullscreen ? "min-h-[70vh] w-full gap-4" : inline ? "gap-2" : "gap-4",
        className
      )}
    >
      <div className="relative flex items-center justify-center" style={{ width: ringSize, height: ringSize }}>
        {/* Static ambient glow — brand gradient colors, never spinning or pulsing. */}
        <div
          aria-hidden="true"
          className="absolute inset-0 rounded-full opacity-[0.16] blur-[36px]"
          style={{
            background: "radial-gradient(circle, var(--color-radar-primary), var(--color-radar-accent) 55%, transparent 72%)",
          }}
        />

        {/* Outline / ghost pass — the real asset, desaturated, fading in then back out underneath the reveal. Never shown under reduced motion. */}
        <div
          aria-hidden="true"
          className="absolute opacity-0 [animation:br-loader-outline_800ms_ease-out_1_forwards] [filter:grayscale(1)_contrast(0.55)_brightness(1.6)] motion-reduce:animate-none"
          style={{ width: logoSize, height: logoSize }}
        >
          <BaseRadarLogo fill />
        </div>

        {/* Full-color reveal — the exact same asset, wiped open via clip-path. Starts fully open under reduced motion (completed logo, no sweep). */}
        <div
          aria-hidden="true"
          className={cn(
            "absolute [clip-path:inset(0_100%_0_0)] [animation:br-loader-reveal_800ms_ease-out_1_forwards]",
            "motion-reduce:animate-none motion-reduce:[clip-path:inset(0_0%_0_0)]"
          )}
          style={{ width: logoSize, height: logoSize }}
        >
          <BaseRadarLogo fill />
        </div>
      </div>

      {label && (
        <p className="text-sm text-radar-light-muted opacity-0 [animation:br-loader-fade-in_400ms_ease-out_1_forwards] [animation-delay:150ms] dark:text-radar-muted">
          {label}
        </p>
      )}
    </div>
  );
}
