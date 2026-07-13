"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowLeftRight,
  BadgeCheck,
  Code2,
  Compass,
  Droplets,
  Fish,
  Landmark,
  Rocket,
  ShieldAlert,
  Sparkles,
  TrendingUp,
  Zap,
  type LucideIcon,
} from "lucide-react";

import { GlassCard } from "@/components/ui/GlassCard";

type TileTone = "primary" | "accent" | "success" | "warning" | "danger";
/** Only two size tiers now (PR9.5.1 §1) — the section must fit one desktop
 * viewport (700-800px), which a `row-span-2` bento (the PR9.5 approach)
 * can't hit at 12 tiles. A 6-wide/6-small split across `lg:grid-cols-6`
 * still reads as an uneven, premium arrangement (2/6 vs 1/6 column widths)
 * while keeping every row the same fixed height. */
type TileSize = "wide" | "small";

/** The card's flipped-side content (PR9.5.1 §1) — title stays, plus the
 * "live update" fields the brief asks for: headline, supporting detail,
 * a relative time, and a confidence percentage. */
type TileUpdate = {
  headline: string;
  detail: string;
  time: string;
  confidence: number;
};

type TileDef = {
  id: string;
  tone: TileTone;
  size: TileSize;
  icon: LucideIcon;
  title: string;
  update: TileUpdate;
};

/** Icon-chip tint only — PR9.5.1 §1 explicitly bans colored *card*
 * backgrounds ("clean white/glass surfaces"); color is confined to the
 * icon chip, the flipped-state status dot, and the confidence accent. */
const TONE_CLASS: Record<TileTone, string> = {
  primary: "bg-radar-primary/15 text-radar-primary dark:text-radar-accent",
  accent: "bg-radar-accent/15 text-radar-accent",
  success: "bg-radar-success/15 text-radar-success",
  warning: "bg-radar-warning/15 text-radar-warning",
  danger: "bg-radar-danger/15 text-radar-danger",
};

const TONE_DOT: Record<TileTone, string> = {
  primary: "bg-radar-primary dark:bg-radar-accent",
  accent: "bg-radar-accent",
  success: "bg-radar-success",
  warning: "bg-radar-warning",
  danger: "bg-radar-danger",
};

const TONE_ACCENT_TEXT: Record<TileTone, string> = {
  primary: "text-radar-primary dark:text-radar-accent",
  accent: "text-radar-accent",
  success: "text-radar-success",
  warning: "text-radar-warning",
  danger: "text-radar-danger",
};

const TILE_DEFS: TileDef[] = [
  {
    id: "whale-alert",
    tone: "warning",
    size: "wide",
    icon: Fish,
    title: "Whale Alert",
    update: { headline: "$4.8M transferred", detail: "Coinbase → Aerodrome", time: "2 mins ago", confidence: 94 },
  },
  {
    id: "ai-signal",
    tone: "primary",
    size: "wide",
    icon: Sparkles,
    title: "AI Signal",
    update: {
      headline: "AI Gaming momentum building",
      detail: "Cross-protocol signal detected",
      time: "5 mins ago",
      confidence: 88,
    },
  },
  {
    id: "narrative-shift",
    tone: "primary",
    size: "wide",
    icon: TrendingUp,
    title: "Narrative Shift",
    update: {
      headline: "AI Agents narrative rising",
      detail: "Mentions up 3.2x this week",
      time: "12 mins ago",
      confidence: 85,
    },
  },
  {
    id: "bridge-activity",
    tone: "primary",
    size: "wide",
    icon: ArrowLeftRight,
    title: "Bridge Activity",
    update: { headline: "$8.9M net inflow", detail: "Ethereum → Base", time: "8 mins ago", confidence: 93 },
  },
  {
    id: "security-update",
    tone: "success",
    size: "wide",
    icon: ShieldAlert,
    title: "Security Update",
    update: { headline: "Risk assessment: Low", detail: "Contract re-audited", time: "1 hr ago", confidence: 97 },
  },
  {
    id: "new-protocol",
    tone: "accent",
    size: "wide",
    icon: Compass,
    title: "New Protocol",
    update: { headline: "Added to registry", detail: "New DEX on Base", time: "3 mins ago", confidence: 82 },
  },
  {
    id: "funding-round",
    tone: "success",
    size: "small",
    icon: Rocket,
    title: "Funding Round",
    update: {
      headline: "$12M seed raised",
      detail: "Undisclosed Base protocol",
      time: "18 mins ago",
      confidence: 91,
    },
  },
  {
    id: "governance-vote",
    tone: "accent",
    size: "small",
    icon: Landmark,
    title: "Governance Vote",
    update: { headline: "Quorum reached", detail: "Proposal #142 passed", time: "34 mins ago", confidence: 99 },
  },
  {
    id: "tvl-spike",
    tone: "success",
    size: "small",
    icon: Zap,
    title: "TVL Spike",
    update: { headline: "+13% in 24h", detail: "Aerodrome Finance", time: "40 mins ago", confidence: 92 },
  },
  {
    id: "builder-verified",
    tone: "success",
    size: "small",
    icon: BadgeCheck,
    title: "Builder Verified",
    update: { headline: "Protocol reviewed", detail: "Code audit passed", time: "2 hrs ago", confidence: 96 },
  },
  {
    id: "developer-activity",
    tone: "accent",
    size: "small",
    icon: Code2,
    title: "Developer Activity",
    update: { headline: "42 commits today", detail: "Across 6 repositories", time: "27 mins ago", confidence: 90 },
  },
  {
    id: "liquidity-movement",
    tone: "warning",
    size: "small",
    icon: Droplets,
    title: "Liquidity Movement",
    update: { headline: "$1.3M LP inflow", detail: "BASE/ETH pool", time: "51 mins ago", confidence: 87 },
  },
];

const SIZE_CLASS: Record<TileSize, string> = { wide: "col-span-2", small: "col-span-1" };

/** Auto-cycle tick (PR9.5.1 §1) — every 2s, 1-2 random tiles flip; the
 * section works through every tile exactly once before reshuffling. */
const CYCLE_INTERVAL_MS = 2000;
/** How long a hover-previewed tile stays visible after the pointer leaves
 * the section, before the auto-cycle timer resumes (PR9.5.1 §3). */
const HOVER_LEAVE_HOLD_MS = 1000;

function shuffled(ids: string[]): string[] {
  const arr = [...ids];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function AIIntelligenceBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden="true">
      <div
        className="absolute inset-0 text-radar-light-text opacity-[0.025] dark:text-radar-white dark:opacity-[0.035]"
        style={{
          backgroundImage:
            "linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)",
          backgroundSize: "56px 56px",
          maskImage: "radial-gradient(ellipse 70% 65% at 50% 40%, black 30%, transparent 100%)",
          WebkitMaskImage: "radial-gradient(ellipse 70% 65% at 50% 40%, black 30%, transparent 100%)",
        }}
      />
      <div
        className="absolute top-1/3 left-1/2 size-[40rem] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-[0.035] dark:opacity-[0.05]"
        style={{ background: "radial-gradient(circle, var(--color-radar-primary) 0%, transparent 70%)" }}
      />
    </div>
  );
}

/**
 * One tile. Default state: icon + title only. Flipped state: title + a
 * short live update (headline, detail, time, confidence) — PR9.5.1 §1.
 * The flip is a plain keyed `motion.div` (not `AnimatePresence`): PR9.5's
 * `AnimatePresence mode="wait"` silently stalled re-renders under real
 * cycling (confirmed via React fiber inspection — state updated but the
 * DOM never did), so this keeps React's native key-based remount and lets
 * `initial`/`animate` alone drive the `rotateX` entrance.
 */
function Tile({ tile, isFlipped }: { tile: TileDef; isFlipped: boolean }) {
  return (
    <GlassCard className="relative flex h-full flex-col overflow-hidden p-4">
      <motion.div
        key={isFlipped ? "flipped" : "default"}
        initial={{ rotateX: -90, opacity: 0 }}
        animate={{ rotateX: 0, opacity: 1 }}
        transition={{ duration: 0.45, ease: "easeInOut" }}
        style={{ transformStyle: "preserve-3d", perspective: 800 }}
        className="flex h-full flex-col"
      >
        {isFlipped ? (
          <div className="flex h-full flex-col justify-center gap-1">
            <span className="truncate text-xs font-semibold text-radar-light-text dark:text-radar-white">
              {tile.title}
            </span>
            <span className="truncate text-[11px] font-medium text-radar-light-text/90 dark:text-white/90">
              {tile.update.headline}
            </span>
            <span className="truncate text-[10px] text-radar-light-muted dark:text-radar-muted">
              {tile.update.detail}
            </span>
            <div className="mt-0.5 flex items-center justify-between text-[10px]">
              <span className="flex items-center gap-1 text-radar-light-muted dark:text-radar-muted">
                <span className={`size-1.5 shrink-0 rounded-full ${TONE_DOT[tile.tone]}`} aria-hidden="true" />
                <span className="truncate">{tile.update.time}</span>
              </span>
              <span className={`shrink-0 font-semibold ${TONE_ACCENT_TEXT[tile.tone]}`}>
                {tile.update.confidence}%
              </span>
            </div>
          </div>
        ) : (
          <div className="flex h-full flex-col items-start justify-center gap-2">
            <span
              className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${TONE_CLASS[tile.tone]}`}
            >
              <tile.icon className="size-4" aria-hidden="true" />
            </span>
            <span className="text-sm font-semibold text-radar-light-text dark:text-radar-white">{tile.title}</span>
          </div>
        )}
      </motion.div>
    </GlassCard>
  );
}

/**
 * "AI Intelligence Engine" — a premium "Living Intelligence Wall"
 * (PR9.5.1). Auto mode: every 2s, 1-2 random tiles flip to a live-update
 * state; the wall works through every tile exactly once per cycle before
 * resetting. Hover mode: entering the section pauses the auto scheduler
 * (resuming later from wherever it left off, never restarting); moving
 * the pointer over a tile flips it immediately using the same animation,
 * and only one tile can be hover-flipped at a time. Leaving the section
 * holds the current view for ~1s, then resumes the auto cycle. The whole
 * section must fit one desktop viewport (700-800px) — a fixed
 * `lg:auto-rows-[120px]` × 3-row grid with trimmed section padding.
 */
export function AIIntelligencePreview() {
  const prefersReducedMotion = useReducedMotion();
  const [stateIndices, setStateIndices] = useState<Record<string, 0 | 1>>(() =>
    Object.fromEntries(TILE_DEFS.map((tile) => [tile.id, 0]))
  );
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const pendingRef = useRef<string[]>([]);
  const tickTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const leaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tickStartRef = useRef(0);
  const remainingRef = useRef(CYCLE_INTERVAL_MS);
  const pausedRef = useRef(false);
  /** Holds the latest `scheduleTick` so the recursive re-schedule inside its
   * own `setTimeout` callback never has to reference the `const` binding
   * before it's fully initialized (flagged by react-hooks' immutability
   * check) — the ref is always up to date by the time any timeout fires. */
  const scheduleTickRef = useRef<(ms: number) => void>(() => {});

  const doTick = useCallback(() => {
    if (pendingRef.current.length === 0) {
      pendingRef.current = shuffled(TILE_DEFS.map((tile) => tile.id));
    }
    const pickCount = Math.min(pendingRef.current.length, Math.random() < 0.5 ? 1 : 2);
    const picked = pendingRef.current.splice(0, pickCount);

    setStateIndices((prev) => {
      const next = { ...prev };
      for (const id of picked) {
        next[id] = next[id] === 0 ? 1 : 0;
      }
      return next;
    });
  }, []);

  const scheduleTick = useCallback(
    (ms: number) => {
      tickStartRef.current = Date.now();
      tickTimeoutRef.current = setTimeout(() => {
        doTick();
        scheduleTickRef.current(CYCLE_INTERVAL_MS);
      }, ms);
    },
    [doTick]
  );

  useEffect(() => {
    scheduleTickRef.current = scheduleTick;
  }, [scheduleTick]);

  useEffect(() => {
    if (prefersReducedMotion) return;
    scheduleTick(CYCLE_INTERVAL_MS);
    return () => {
      if (tickTimeoutRef.current) clearTimeout(tickTimeoutRef.current);
      if (leaveTimeoutRef.current) clearTimeout(leaveTimeoutRef.current);
    };
  }, [prefersReducedMotion, scheduleTick]);

  const handleSectionMouseEnter = () => {
    if (prefersReducedMotion) return;
    if (leaveTimeoutRef.current) {
      clearTimeout(leaveTimeoutRef.current);
      leaveTimeoutRef.current = null;
    }
    if (!pausedRef.current) {
      if (tickTimeoutRef.current) {
        clearTimeout(tickTimeoutRef.current);
        tickTimeoutRef.current = null;
      }
      const elapsed = Date.now() - tickStartRef.current;
      remainingRef.current = Math.max(0, CYCLE_INTERVAL_MS - elapsed);
      pausedRef.current = true;
    }
  };

  const handleSectionMouseLeave = () => {
    if (prefersReducedMotion) return;
    leaveTimeoutRef.current = setTimeout(() => {
      setHoveredId(null);
      pausedRef.current = false;
      scheduleTick(remainingRef.current);
      leaveTimeoutRef.current = null;
    }, HOVER_LEAVE_HOLD_MS);
  };

  return (
    <section
      id="ai"
      className="relative mx-auto max-w-7xl px-6 py-10 sm:py-14 lg:px-8"
      onMouseEnter={handleSectionMouseEnter}
      onMouseLeave={handleSectionMouseLeave}
    >
      <AIIntelligenceBackground />
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.5 }}
        className="mx-auto max-w-2xl text-center"
      >
        <h2 className="text-3xl font-semibold tracking-tight text-radar-light-text sm:text-4xl dark:text-radar-white">
          AI Intelligence Engine
        </h2>
        <p className="mt-2 text-base text-radar-light-muted dark:text-radar-muted">
          Continuously monitoring the Base ecosystem using multiple trusted intelligence sources.
        </p>
      </motion.div>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6 lg:auto-rows-[120px] lg:grid-flow-dense">
        {TILE_DEFS.map((tile, index) => {
          const isFlipped = hoveredId === tile.id ? true : stateIndices[tile.id] === 1;
          return (
            <motion.div
              key={tile.id}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.4, delay: (index % 6) * 0.05 }}
              className={`${SIZE_CLASS[tile.size]} min-h-[120px]`}
              onMouseEnter={() => {
                if (prefersReducedMotion) return;
                setHoveredId(tile.id);
              }}
            >
              <Tile tile={tile} isFlipped={isFlipped} />
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
