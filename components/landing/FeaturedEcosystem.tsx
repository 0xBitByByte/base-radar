"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

import { FeaturedProjectTile } from "@/components/landing/FeaturedProjectTile";
import { FEATURED_PROJECTS } from "@/components/landing/featuredProjects";
import type { ProjectIntelligence } from "@/lib/intelligence/types";
import type { SignalFreshness } from "@/lib/intelligence/freshnessPolicy";
import type { RadarScoreResult } from "@/lib/intelligence/radarScore";

type FeaturedEcosystemProps = {
  /**
   * PR-098.05 — the merged (live-where-available, illustrative-elsewhere)
   * project list, built server-side by `app/page.tsx` via
   * `buildFeaturedProjectsWithSnapshot()`. Defaults to the fully
   * illustrative `FEATURED_PROJECTS` so this component keeps working
   * standalone (existing tests, Storybook-style usage) without requiring
   * every caller to thread a snapshot through.
   */
  projects?: ProjectIntelligence[];
  /** PR-098.07 — real per-project freshness, keyed by `identity.id`, threaded straight through to each tile. `undefined`/omitted when no live snapshot exists — tiles simply show no freshness tooltip. */
  freshnessById?: Record<string, { tvl: SignalFreshness | null; tokenChange: SignalFreshness | null }>;
  /** PR-099 — real per-project live `RadarScoreResult`, keyed by `identity.id`. `undefined`/omitted or a `null` entry means that tile's "Radar Score" is still the illustrative fixture value. */
  radarScoreById?: Record<string, RadarScoreResult | null>;
};

/**
 * The real 20-project marquee proving out `ProjectIntelligence.tsx`'s
 * claims just above it (shares its `id="projects"`) — a continuous
 * horizontal auto-scroll marquee (a modern SaaS logo-wall pattern), not a
 * static grid. The item list renders twice back-to-back and loops exactly
 * one half-width (`br-marquee` in globals.css) so the seam is invisible;
 * hovering any tile pauses the whole strip
 * (`group-hover:[animation-play-state:paused]`) while that tile itself
 * enlarges. Clicking a tile opens the project's full Profile page directly
 * (PR13.5 — the Profile page is now the single place to consume project
 * intelligence; the Quick View drawer this used to open has been removed).
 * No heading of its own — `ProjectIntelligence.tsx` (rendered immediately
 * before this, sharing `id="projects"`) already carries the section title.
 */
export function FeaturedEcosystem({ projects = FEATURED_PROJECTS, freshnessById, radarScoreById }: FeaturedEcosystemProps) {
  const router = useRouter();

  return (
    <div className="pb-16 sm:pb-24">
      {/* Visual review: "why is it closely arranged?" — this caption sat directly against ProjectIntelligence's own closing "Explore Projects" button with no gap of its own; `mt-14` gives the two components' shared boundary real breathing room. */}
      <div className="mx-auto mt-14 max-w-7xl px-6 lg:px-8">
        <p className="mx-auto max-w-2xl text-center text-sm text-radar-light-muted dark:text-radar-muted">
          {projects.length} protocols Base Radar tracks — real verification, health, and confidence
          scoring, updated continuously.
        </p>
      </div>

      {/* PR9.4 §2 — the text above sits inside a `max-w-7xl px-6 lg:px-8`
          container; the marquee track itself previously had no such
          constraint and ran flush to the viewport edges (cards visibly
          touching the page edge, misaligned with every other section). This
          wraps the masked/overflow-hidden viewport in the exact same
          container, so the fade-mask now happens at the page's own margin
          rather than the browser edge, and the marquee visually aligns with
          the rest of the page. The track itself (`w-max`, looping via
          `br-marquee`) is still allowed to be wider than the container —
          only its visible *viewport* is constrained. */}
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="group relative mt-16 overflow-hidden py-2 [mask-image:linear-gradient(to_right,transparent,black_5%,black_95%,transparent)]"
        >
          <div className="flex w-max animate-[br-marquee_60s_linear_infinite] gap-5 group-hover:[animation-play-state:paused] motion-reduce:animate-none">
            {[...projects, ...projects].map((project, index) => (
              <FeaturedProjectTile
                key={`${project.identity.id}-${index}`}
                project={project}
                freshness={freshnessById?.[project.identity.id]}
                radarScore={radarScoreById?.[project.identity.id]}
                onActivate={() => router.push(`/dashboard/projects/${project.identity.slug}`)}
              />
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
