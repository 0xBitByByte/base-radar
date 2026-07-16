"use client";

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

import { formatLabel } from "@/components/explorer/format";
import { getChainBrand } from "@/lib/branding/chains";
import { cn } from "@/lib/utils";

type ProfileChainDisplayProps = {
  /** Registry order — `chains[0]` is always this project's primary chain. */
  chains: string[];
  className?: string;
};

function SecondaryChainPill({ chainId, reducedMotion }: { chainId: string; reducedMotion: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const brand = getChainBrand(chainId);
  const Icon = brand?.Icon;
  const label = brand?.label ?? formatLabel(chainId);
  // Reduced-motion users always see the name — a hover-only reveal would
  // hide real information behind a motion-dependent interaction, which is
  // exactly what "respect reduced motion" means to avoid here.
  const showLabel = reducedMotion || expanded;

  return (
    <motion.span
      layout={!reducedMotion}
      tabIndex={0}
      // The name is always declared here for assistive tech, independent of
      // the animated visual reveal below (`aria-hidden`) — a screen reader
      // user shouldn't have to trigger a hover/focus animation just to learn
      // which chain this pill represents.
      aria-label={label}
      onHoverStart={() => setExpanded(true)}
      onHoverEnd={() => setExpanded(false)}
      onFocus={() => setExpanded(true)}
      onBlur={() => setExpanded(false)}
      transition={{ duration: reducedMotion ? 0 : 0.2, ease: "easeOut" }}
      className="inline-flex items-center gap-1.5 overflow-hidden rounded-full border border-radar-light-border bg-radar-light-surface px-1.5 py-1 text-xs font-medium whitespace-nowrap text-radar-light-text outline-none focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:border-white/10 dark:bg-white/[0.02] dark:text-radar-white"
    >
      {Icon && <Icon className="size-3.5 shrink-0" aria-hidden="true" />}
      <AnimatePresence initial={false}>
        {showLabel && (
          <motion.span
            aria-hidden="true"
            initial={reducedMotion ? false : { width: 0, opacity: 0 }}
            animate={{ width: "auto", opacity: 1 }}
            exit={reducedMotion ? undefined : { width: 0, opacity: 0 }}
            transition={{ duration: reducedMotion ? 0 : 0.18, ease: "easeOut" }}
          >
            {label}
          </motion.span>
        )}
      </AnimatePresence>
    </motion.span>
  );
}

/**
 * PR12.1 Req 9 — Project Profile's own chain display (the shared, still
 * unmodified `ChainBadgeGroup` continues to serve Explorer's Grid/Table/
 * Quick View exactly as before). The primary chain always renders fully
 * expanded with its brand-tinted background; every secondary chain starts
 * as an icon-only pill and reveals its name on hover/focus via Framer
 * Motion's `layout` animation, so neighboring pills slide smoothly rather
 * than jumping. `useReducedMotion` disables the width/opacity transition
 * entirely and always shows the name instead of gating it behind a hover.
 */
export function ProfileChainDisplay({ chains, className }: ProfileChainDisplayProps) {
  const reducedMotion = useReducedMotion();
  const [primaryChain, ...secondaryChains] = chains;
  if (!primaryChain) return null;

  const primaryBrand = getChainBrand(primaryChain);
  const PrimaryIcon = primaryBrand?.Icon;

  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      <span
        className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold text-radar-light-text dark:text-radar-white"
        style={
          primaryBrand
            ? { backgroundColor: `${primaryBrand.color}1A`, borderColor: `${primaryBrand.color}4D` }
            : undefined
        }
      >
        {PrimaryIcon && <PrimaryIcon className="size-3.5 shrink-0" />}
        {primaryBrand?.label ?? formatLabel(primaryChain)}
      </span>
      {secondaryChains.map((chainId) => (
        <SecondaryChainPill key={chainId} chainId={chainId} reducedMotion={Boolean(reducedMotion)} />
      ))}
    </div>
  );
}
