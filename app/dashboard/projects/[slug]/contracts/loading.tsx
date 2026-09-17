import { BrandLoader } from "@/components/shared/BrandLoader";

/**
 * PR-097.02 (Bundle Optimization — Route Optimization) — same real gap as
 * the other 4 Explorer sub-pages under this route: real, awaited
 * Blockscout contract data with no `loading.tsx` of its own before this
 * file existed.
 */
export default function ProjectContractsLoading() {
  return <BrandLoader fullscreen size="lg" label="Loading contracts…" />;
}
