import { BrandLoader } from "@/components/shared/BrandLoader";

/**
 * PR-065 — the branded page loader shared by every dashboard route, shown
 * while a single project's fast-path intelligence data is being resolved.
 */
export default function ProjectProfileLoading() {
  return <BrandLoader fullscreen size="lg" label="Preparing project insights…" />;
}
