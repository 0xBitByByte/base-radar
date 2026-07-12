import { BrandSpinner } from "@/components/ui/BrandSpinner";

/**
 * Uses the same branded `BrandSpinner` (tier="md") as every other route
 * transition rather than a content-shaped skeleton — requested explicitly so
 * every sidebar navigation (Dashboard, Explorer, and future segments) shows
 * one consistent loading experience instead of a different treatment per
 * route.
 */
export default function ExplorerLoading() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <div className="animate-[br-loader-reveal_600ms_ease-out_forwards] motion-reduce:animate-none">
        <BrandSpinner tier="xl" />
      </div>
    </div>
  );
}
