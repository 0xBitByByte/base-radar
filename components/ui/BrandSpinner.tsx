import { BaseRadarLogo } from "@/components/branding/BaseRadarLogo";
import { cn } from "@/lib/utils";

type BrandSpinnerTier = "sm" | "md" | "lg" | "xl";

/**
 * `clamp(min, preferred, max)` per tier — the logo scales smoothly between
 * mobile and desktop viewports rather than snapping at fixed breakpoints.
 * Reference points: ~220px logo at a 390px (mobile) viewport, ~280px at a
 * 1024px+ (desktop) viewport, scaled proportionally for `md`/`sm`. `xl` uses
 * `vmin` instead of `vw` so it scales off the *smaller* viewport dimension —
 * sized to read as ~60-70% of a typical loading region's height, not just
 * its width, on both portrait and landscape viewports.
 */
const TIER_LOGO_SIZE: Record<BrandSpinnerTier, string> = {
  xl: "clamp(140px, 14vmin, 180px)",
  lg: "clamp(220px, 9vw + 184px, 280px)",
  md: "clamp(160px, 6vw + 136px, 200px)",
  sm: "clamp(80px, 6vw + 55px, 120px)",
};

type BrandSpinnerProps = {
  /**
   * `"xl"` — full-region loading states that should feel cinematic (route
   * `loading.tsx`, the sidebar navigation overlay: 260–440px). `"lg"` —
   * initial app launch splash (220–280px, `SplashScreen`). `"md"` — smaller
   * inline loading contexts. `"sm"` (default) — component/Suspense-level
   * loading (80–120px). One component, one animation language, every
   * loading context in the app.
   */
  tier?: BrandSpinnerTier;
  className?: string;
};

/**
 * The shared branded loading indicator — pure CSS (`transform`/`opacity`
 * only, defined in `globals.css`'s `br-breathe`/`br-spin-glow` keyframes) so
 * it's GPU-composited and mounts instantly, unlike a video. Reduced-motion
 * users get a static glow with no animation at all rather than a diminished
 * one. The logo itself renders via `BaseRadarLogo`'s `fill` mode so it can
 * scale continuously with the viewport instead of jumping between fixed
 * pixel sizes. Colors come from the theme-responsive `--color-radar-primary`/
 * `-accent`/`-purple` custom properties, so dark/light automatically resolve
 * without this component knowing which theme is active.
 */
export function BrandSpinner({ tier = "sm", className }: BrandSpinnerProps) {
  const logoSize = TIER_LOGO_SIZE[tier];

  return (
    <div
      role="status"
      aria-label="Loading"
      className={cn("relative flex items-center justify-center", className)}
      style={{ width: `calc(${logoSize} * 1.35)`, height: `calc(${logoSize} * 1.35)` }}
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 animate-[br-spin-glow_3s_linear_infinite] rounded-full opacity-[0.13] blur-[50px] motion-reduce:animate-none"
        style={{
          background:
            "conic-gradient(from 0deg, var(--color-radar-primary), var(--color-radar-accent), var(--color-radar-purple), var(--color-radar-primary))",
        }}
      />
      <div
        aria-hidden="true"
        className="relative animate-[br-breathe_1.6s_ease-in-out_infinite] motion-reduce:animate-none"
        style={{ width: logoSize, height: logoSize }}
      >
        <BaseRadarLogo fill />
      </div>
    </div>
  );
}
