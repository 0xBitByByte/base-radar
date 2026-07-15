"use client";

import { useEffect, useRef } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { motion } from "framer-motion";

import { QuickViewHeader } from "@/components/explorer/QuickViewHeader";
import { QuickViewSummary } from "@/components/explorer/QuickViewSummary";
import { QuickViewMetrics } from "@/components/explorer/QuickViewMetrics";
import { QuickViewCommunity } from "@/components/explorer/QuickViewCommunity";
import { QuickViewSources } from "@/components/explorer/QuickViewSources";
import { QuickViewActions } from "@/components/explorer/QuickViewActions";
import { cn } from "@/lib/utils";
import type { ProjectIntelligence } from "@/lib/intelligence/types";

const sectionListVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.025 } },
};

const sectionVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.15, ease: "easeOut" as const } },
};

type QuickViewDrawerProps = {
  /** `null` means closed — the single source of truth `ExplorerPageClient` owns; no separate open/closed boolean. */
  project: ProjectIntelligence | null;
  onClose: () => void;
};

/**
 * Explorer's Quick View — docs/explorer/03 §14. A preview, not the future
 * Project Profile: answers "what is this / why does it matter / can I
 * trust it," then stops. Built on the exact same accessible dialog
 * primitive `MobileSidebar` already uses (`@base-ui/react/dialog`) —
 * focus trap, Escape-to-close, backdrop-close, and focus restoration all
 * come from the primitive, not hand-built here — sliding from the right
 * edge instead of the left, present at every viewport (03 §14 requires a
 * right-side drawer on desktop/tablet; the mobile full-screen sheet is
 * PR7's job, not a second implementation to build now).
 *
 * Switching the selected project while already open never closes/reopens
 * this dialog — `open` is derived from `project !== null`, which stays
 * `true` across a swap; only the content inside crossfades.
 */
export function QuickViewDrawer({ project, onClose }: QuickViewDrawerProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // A different project should start from the top of the drawer's own
  // content, not wherever the previous project happened to be scrolled to.
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [project?.identity.id]);

  return (
    <Dialog.Root
      open={project !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Backdrop
          className={cn(
            "fixed inset-0 z-40 bg-radar-bg/40 backdrop-blur-sm dark:bg-black/60",
            "transition-opacity duration-300 motion-reduce:transition-none",
            "data-[starting-style]:opacity-0 data-[ending-style]:opacity-0"
          )}
        />
        <Dialog.Popup
          aria-modal="true"
          className={cn(
            "fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l outline-none",
            "border-radar-light-border bg-radar-light-card dark:border-white/10 dark:bg-radar-bg",
            "translate-x-full transition-transform duration-300 ease-out motion-reduce:transition-none",
            "data-[open]:translate-x-0"
          )}
        >
          {project && (
            <>
              <QuickViewHeader identity={project.identity} community={project.community} />

              <div
                ref={scrollRef}
                className="flex-1 divide-y divide-radar-light-border overflow-y-auto border-t border-radar-light-border dark:divide-white/10 dark:border-white/10"
              >
                <motion.div
                  key={project.identity.id}
                  initial="hidden"
                  animate="visible"
                  variants={sectionListVariants}
                  className="divide-y divide-radar-light-border dark:divide-white/10"
                >
                  <motion.div variants={sectionVariants}>
                    <QuickViewSummary
                      identity={project.identity}
                      market={project.market}
                      tvl={project.tvl}
                      health={project.health}
                      confidence={project.confidence}
                      summary={project.summary}
                      risk={project.risk}
                    />
                  </motion.div>
                  <motion.div variants={sectionVariants}>
                    <QuickViewMetrics
                      market={project.market}
                      trading={project.trading}
                      tvl={project.tvl}
                      chain={project.chain}
                      contracts={project.contracts}
                      narrative={project.narrative}
                    />
                  </motion.div>
                  <motion.div variants={sectionVariants}>
                    <QuickViewCommunity
                      community={project.community}
                      github={project.github}
                      governance={project.governance}
                    />
                  </motion.div>
                  <motion.div variants={sectionVariants}>
                    <QuickViewSources sources={project.sources} freshness={project.freshness} />
                  </motion.div>
                </motion.div>
              </div>

              <div className="border-t border-radar-light-border dark:border-white/10">
                <QuickViewActions />
              </div>
            </>
          )}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
