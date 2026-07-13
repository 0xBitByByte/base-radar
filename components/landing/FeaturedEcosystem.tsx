"use client";

import { useState } from "react";
import { motion } from "framer-motion";

import { QuickViewDrawer } from "@/components/explorer/QuickViewDrawer";
import { FeaturedProjectTile } from "@/components/landing/FeaturedProjectTile";
import { FEATURED_PROJECTS } from "@/components/landing/featuredProjects";
import type { ProjectIntelligence } from "@/lib/intelligence/types";

/**
 * "Featured Base Ecosystem Projects" — a continuous horizontal auto-scroll
 * marquee (a modern SaaS logo-wall pattern), not a static grid. The item
 * list renders twice back-to-back and loops exactly one half-width
 * (`br-marquee` in globals.css) so the seam is invisible; hovering any tile
 * pauses the whole strip (`group-hover:[animation-play-state:paused]`)
 * while that tile itself enlarges. Clicking a tile opens the real Quick
 * View drawer — the same component/data shape Explorer's own Quick View
 * uses, not a separate preview.
 */
export function FeaturedEcosystem() {
  const [selected, setSelected] = useState<ProjectIntelligence | null>(null);

  return (
    <section id="projects" className="py-16 sm:py-24">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
          className="mx-auto max-w-2xl text-center"
        >
          <h2 className="text-3xl font-semibold tracking-tight text-radar-light-text sm:text-4xl dark:text-radar-white">
            Featured Base Ecosystem Projects
          </h2>
          <p className="mt-4 text-lg text-radar-light-muted dark:text-radar-muted">
            {FEATURED_PROJECTS.length} protocols Base Radar tracks — real verification, health, and
            confidence scoring, updated continuously.
          </p>
        </motion.div>
      </div>

      {/* PR9.4 §2 — the heading above sits inside a `max-w-7xl px-6 lg:px-8`
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
            {[...FEATURED_PROJECTS, ...FEATURED_PROJECTS].map((project, index) => (
              <FeaturedProjectTile
                key={`${project.identity.id}-${index}`}
                project={project}
                onActivate={() => setSelected(project)}
              />
            ))}
          </div>
        </motion.div>
      </div>

      <QuickViewDrawer project={selected} onClose={() => setSelected(null)} />
    </section>
  );
}
