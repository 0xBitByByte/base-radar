"use client";

import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";

/** Evenly-spaced tick positions along one edge, in percent. */
const PIN_POSITIONS = [14, 28, 42, 58, 72, 86];

/**
 * Short glowing pin ticks lining all four edges of the hub chip, plus a
 * couple of gently pulsing via-dots per edge — the "chip pins" language of
 * the visual-review reference, restrained (cyan only, no rotating rainbow
 * ring).
 */
function HubPins({ className = "" }: { className?: string }) {
  const dot = "absolute size-1.5 rounded-full bg-radar-accent [animation:br-circuit-pulse_2.6s_ease-in-out_infinite] motion-reduce:animate-none";
  const line = "absolute bg-radar-accent/70";

  return (
    <div className={`pointer-events-none absolute inset-0 text-radar-accent [filter:drop-shadow(0_0_3px_currentColor)] ${className}`} aria-hidden="true">
      {PIN_POSITIONS.map((pos, i) => (
        <span key={`t-${pos}`} className={`${line} bottom-full w-px -translate-x-1/2`} style={{ left: `${pos}%`, height: 14 }}>
          {i % 2 === 0 && <span className={dot} style={{ top: -6, left: "50%", transform: "translateX(-50%)", animationDelay: `${i * 0.3}s` }} />}
        </span>
      ))}
      {PIN_POSITIONS.map((pos, i) => (
        <span key={`b-${pos}`} className={`${line} top-full w-px -translate-x-1/2`} style={{ left: `${pos}%`, height: 14 }}>
          {i % 2 === 1 && <span className={dot} style={{ bottom: -6, left: "50%", transform: "translateX(-50%)", animationDelay: `${i * 0.3 + 0.5}s` }} />}
        </span>
      ))}
      {PIN_POSITIONS.map((pos, i) => (
        <span key={`l-${pos}`} className={`${line} right-full h-px -translate-y-1/2`} style={{ top: `${pos}%`, width: 14 }}>
          {i % 2 === 0 && <span className={dot} style={{ left: -6, top: "50%", transform: "translateY(-50%)", animationDelay: `${i * 0.3 + 0.8}s` }} />}
        </span>
      ))}
      {PIN_POSITIONS.map((pos, i) => (
        <span key={`r-${pos}`} className={`${line} left-full h-px -translate-y-1/2`} style={{ top: `${pos}%`, width: 14 }}>
          {i % 2 === 1 && <span className={dot} style={{ right: -6, top: "50%", transform: "translateY(-50%)", animationDelay: `${i * 0.3 + 1.1}s` }} />}
        </span>
      ))}
    </div>
  );
}

/** Chip geometry (px, at `lg`+) that `CircuitTraces` is authored against — the chip is a fixed 22rem x 15rem so trace/pin coordinates can be exact rather than measured. */
const CHIP_W = 352;
const CHIP_H = 240;
const PIN_LEN = 12;
const SIDE_PINS = 10;
const EDGE_PINS = 9;

type Trace = { d: string; nodeX: number; nodeY: number; hollow: boolean };
type Pin = { x: number; y: number; w: number; h: number };

/**
 * Deterministic PCB geometry for the chip (no randomness — every value is a
 * pure function of the pin index, so SSR and client render identically).
 * Every pin gets one trace, fanned like a real routed bus: parallel traces
 * leave the pin straight, bend 45 degrees outward in an order that never
 * lets two traces cross (outer pins bend earliest and end furthest from the
 * centre line), then run out to a via. Coordinates are relative to the chip
 * centre.
 */
function buildChipGeometry(): { pins: Pin[]; traces: Trace[] } {
  const pins: Pin[] = [];
  const traces: Trace[] = [];
  const halfW = CHIP_W / 2;
  const halfH = CHIP_H / 2;

  for (const side of [1, -1]) {
    for (let i = 0; i < SIDE_PINS; i++) {
      const k = i - (SIDE_PINS - 1) / 2;
      const y = -96 + (i * 192) / (SIDE_PINS - 1);
      const dir = k < 0 ? -1 : 1;
      const sx = side * (halfW + PIN_LEN);
      pins.push({ x: side === 1 ? halfW : -halfW - PIN_LEN, y: y - 2.5, w: PIN_LEN, h: 5 });

      const shift = 8 + Math.abs(k) * 11;
      const bendX = 14 + (SIDE_PINS / 2 - Math.abs(k)) * 16;
      const run = 40 + ((i * (side === 1 ? 53 : 31)) % 7) * 45;
      const x1 = sx + side * bendX;
      const x2 = x1 + side * shift;
      const y2 = y + dir * shift;
      let d = `M ${sx} ${y} H ${x1} L ${x2} ${y2}`;
      let endX = x2 + side * run;
      let endY = y2;
      if (i % 3 === 0) {
        const mid = x2 + side * (run / 2);
        d += ` H ${mid} L ${mid + side * 16} ${y2 - dir * 16}`;
        endX = mid + side * (16 + 50);
        endY = y2 - dir * 16;
        d += ` H ${endX}`;
      } else {
        d += ` H ${endX}`;
      }
      traces.push({ d, nodeX: endX, nodeY: endY, hollow: i % 2 === 0 });
    }
  }

  for (const edge of [-1, 1]) {
    for (let i = 0; i < EDGE_PINS; i++) {
      const k = i - (EDGE_PINS - 1) / 2;
      const x = -140 + (i * 280) / (EDGE_PINS - 1);
      const outward = k < 0 ? -1 : 1;
      const sy = edge * (halfH + PIN_LEN);
      pins.push({ x: x - 2.5, y: edge === 1 ? halfH : -halfH - PIN_LEN, w: 5, h: PIN_LEN });

      const rise = 4 + (EDGE_PINS / 2 - Math.abs(k)) * 4.5;
      const y1 = sy + edge * rise;
      const y2 = y1 + edge * 12;
      const run = 30 + ((i * 41) % 6) * 38;
      let d = `M ${x} ${sy} V ${y1}`;
      let endX = x;
      const endY = y2;
      if (Math.abs(k) < 0.5) {
        d += ` V ${y2}`;
      } else {
        endX = x + outward * (12 + run);
        d += ` L ${x + outward * 12} ${y2} H ${endX}`;
      }
      traces.push({ d, nodeX: endX, nodeY: endY, hollow: i % 2 === 1 });
    }
  }

  return { pins, traces };
}

const CHIP_GEOMETRY = buildChipGeometry();

/** A small square matrix of dots — the micro-pattern texture patches visible in the reference's open areas. */
function dotMatrix(x: number, y: number, n: number): { x: number; y: number }[] {
  const out: { x: number; y: number }[] = [];
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) out.push({ x: x + c * 12, y: y + r * 12 });
  return out;
}

const DOT_PATCHES = [...dotMatrix(-690, -250, 4), ...dotMatrix(590, -240, 4), ...dotMatrix(-670, 200, 3), ...dotMatrix(610, 190, 3)];

/**
 * The chip's routed PCB: chunky pins on all four edges and one glowing trace
 * per pin fanning out behind the input cards, plus a few dot-matrix texture
 * patches (visual-review reference). Must be rendered inside a `relative`
 * element that is exactly the chip's centre (see `IntelligenceEngine`'s chip
 * cell) with the surrounding section `isolate`d, so `-z-10` puts it behind
 * every card. Desktop only — below `lg` the stacked layout has no room for
 * side traces, and the chip falls back to its own small `HubPins`.
 */
export function CircuitTraces() {
  const { pins, traces } = CHIP_GEOMETRY;
  return (
    <div className="pointer-events-none absolute top-1/2 left-1/2 -z-10 hidden h-[700px] w-[1600px] -translate-x-1/2 -translate-y-1/2 lg:block" aria-hidden="true">
      <svg viewBox="-800 -350 1600 700" className="h-full w-full text-radar-primary [filter:drop-shadow(0_0_2px_currentColor)_drop-shadow(0_0_7px_currentColor)]">
        <g fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" opacity="0.85">
          {traces.map((t, i) => (
            <path key={i} d={t.d} />
          ))}
        </g>
        <g className="text-radar-accent">
          {traces.map((t, i) => (
            <circle
              key={i}
              cx={t.nodeX}
              cy={t.nodeY}
              r={t.hollow ? 4 : 3}
              fill={t.hollow ? "none" : "currentColor"}
              stroke={t.hollow ? "currentColor" : "none"}
              strokeWidth="1.6"
            />
          ))}
          {DOT_PATCHES.map((d, i) => (
            <circle key={`dm-${i}`} cx={d.x} cy={d.y} r="1.4" fill="currentColor" opacity="0.5" />
          ))}
        </g>
        <g className="text-radar-accent" fill="currentColor">
          {pins.map((p, i) => (
            <rect key={i} x={p.x} y={p.y} width={p.w} height={p.h} rx="1.5" />
          ))}
        </g>
      </svg>
    </div>
  );
}

type HubChipProps = {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  className?: string;
  /** When true, the desktop pins come from `CircuitTraces` (rendered by the caller) instead of this chip's own small tick pins. */
  pinsFromTraces?: boolean;
};

/**
 * The landing page's central processing-chip card, shared by the "AI
 * Analysis" section (`IntelligenceEngine.tsx`) and the "Base Radar AI" hub
 * (`PipelineFlow.tsx`, used by `TrustedDataSources.tsx`) so both read as the
 * same component. Solid dark card (not `GlassCard`'s translucent/backdrop-
 * blur treatment) inside a purple → cyan → green gradient border, with one
 * quiet purple bloom and one quiet green bloom on opposite corners.
 * Deliberately fixed-dark in both site themes — a chip doesn't repaint
 * itself for "light mode." Fixed 22rem x 15rem at `lg`+ so `CircuitTraces`
 * can be authored against exact edge coordinates.
 */
export function HubChip({ icon: Icon, title, subtitle, className = "", pinsFromTraces = false }: HubChipProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.5, delay: 0.15 }}
      className={`relative mx-auto w-full max-w-sm lg:w-[22rem] ${className}`}
    >
      <div className="absolute -top-12 -left-12 size-44 rounded-full bg-radar-purple opacity-35 blur-2xl" aria-hidden="true" />
      <div className="absolute -right-12 -bottom-12 size-44 rounded-full bg-radar-success opacity-30 blur-2xl" aria-hidden="true" />
      <HubPins className={pinsFromTraces ? "lg:hidden" : ""} />
      <div className="relative h-60 rounded-[1.75rem] bg-[linear-gradient(135deg,#a855f7,#22d3ee_50%,#22c55e)] p-[1.5px] shadow-[0_0_60px_-14px_rgba(6,184,212,0.7)]">
        <div className="flex h-full flex-col items-center justify-center rounded-[calc(1.75rem-1.5px)] bg-gradient-to-b from-radar-elevated to-radar-card px-8 text-center">
          <span className="flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-radar-primary/25 to-radar-accent/25 text-radar-accent [filter:drop-shadow(0_0_6px_rgba(6,184,212,0.6))]">
            <Icon className="size-8" aria-hidden="true" />
          </span>
          <h3 className="mt-4 text-xl font-semibold text-white">{title}</h3>
          <p className="mt-2 text-sm text-radar-accent">{subtitle}</p>
        </div>
      </div>
    </motion.div>
  );
}
