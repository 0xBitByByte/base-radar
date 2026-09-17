"use client";

import { useState } from "react";

import { ChangeValue } from "@/components/explorer/ChangeValue";
import { SegmentedControl, type SegmentedControlOption } from "@/components/ui/SegmentedControl";
import { cn } from "@/lib/utils";
import type { MarketSummary } from "@/lib/projects/types";

type PerformanceWindow = "24h" | "7d" | "30d";

type LiveProjectCardMomentumProps = {
  market: MarketSummary;
  /** Matches `MetricItem`'s own `valueClassName` override this cell used before — same visual weight as the primary metric cell beside it. */
  valueClassName?: string;
};

/**
 * PR-086.03 — `LiveProjectCard.tsx`'s momentum cell, made interactive.
 * Replaces the previous static `MetricItem label={momentumLabel}
 * changeValue={momentumPct}` cell (which auto-picked 7D, falling back to
 * 24H, with no way to see the other window) with a real 24H/7D/30D switch.
 * `market.changePct24h/7d/30d` is read directly — all three already
 * threaded from the same already-fetched CoinGecko bulk response
 * (`lib/providers/coingecko/mapper.ts`'s `mapCoinMarket`) onto
 * `MarketSummary` (`lib/projects/build.ts`), so switching windows here is
 * zero new provider calls, zero new computation. This is its own small
 * Client Component (not `LiveProjectCard.tsx` itself becoming one) so the
 * card grid — potentially hundreds of instances on `/dashboard/projects/all`
 * — stays server-rendered everywhere except this one interactive cell, per
 * Next.js's own "push 'use client' down" guidance.
 *
 * PR-086.04 — the mini sparkline tried here was removed after live review
 * judged it added visual noise without improving scanability; this cell is
 * now exactly the three things the spec asks for — the switch, the
 * percentage, the arrow (`ChangeValue` already renders both) — nothing
 * else. A window with no real data for this project (e.g. no 30-day
 * figure) now renders its tab genuinely disabled — grey, `cursor-not-
 * allowed`, unselectable — rather than a live tab that would show a bare
 * "—" if clicked; the default-selected window is always chosen from
 * whichever real windows exist, never landing on a disabled one.
 *
 * Deliberately wired only into `LiveProjectCard`'s `detailed` variant (the
 * Full Directory) — `compact`/`micro` are explicitly documented elsewhere
 * in this file as tuned for "rapid-comparison density," and adding an
 * interactive control to every card on a dense curated rail would work
 * against that, not polish it.
 *
 * PR-086.06 — given the same bordered tile surface as its sibling
 * `MetricItem` cell (see the root `<div>` below) so the two cells in
 * `LiveProjectCard`'s momentum row read as one consistent set of tiles
 * instead of one bordered box beside one floating, borderless one. This is
 * a surface-only change — the percentage shown here stays the independent
 * market-wide momentum figure it already was (see the "Independent of
 * `metric`'s own Price-only `changePct24h`" comment in `LiveProjectCard.tsx`
 * around its `momentumPct` computation); it is never merged into the
 * primary metric's own label/value, since that would misattribute this
 * figure to a metric it isn't actually describing.
 *
 * V1-FIX-021 — Typography & Visual Emphasis (approved refinement). This
 * cell's `ChangeValue` call is a direct render, bypassing `MetricItem`'s own
 * `emphasize` styling entirely — so despite sharing `text-2xl` with the
 * Primary Metric cell beside it (via the same `valueClassName` prop), it
 * never picked up `emphasize`'s `font-bold tracking-tight` treatment,
 * staying at `ChangeValue`'s own base `font-semibold`. Per the approved
 * scope, this stays `font-semibold` — Momentum is supporting evidence, not
 * executive synthesis, and must not visually compete with the Primary
 * Metric or AI Rating. Only `tracking-tight` is added, to align the glyph
 * spacing of this cell's large digits with its `text-2xl` hero siblings
 * without changing its weight.
 */
export function LiveProjectCardMomentum({ market, valueClassName }: LiveProjectCardMomentumProps) {
  const options: SegmentedControlOption<PerformanceWindow>[] = [
    { value: "24h", label: "24H", disabled: market.changePct24h === null },
    { value: "7d", label: "7D", disabled: market.changePct7d === null },
    { value: "30d", label: "30D", disabled: market.changePct30d === null },
  ];
  const firstAvailable = options.find((option) => !option.disabled)?.value ?? "7d";
  // PR-086.04 — prefers 7D when it's real (matching this card's pre-switch
  // default), otherwise the first genuinely available window in 24H/7D/30D
  // order — never initializes onto a disabled tab.
  const [window_, setWindow] = useState<PerformanceWindow>(market.changePct7d !== null ? "7d" : firstAvailable);

  const pct = window_ === "24h" ? market.changePct24h : window_ === "7d" ? market.changePct7d : market.changePct30d;

  return (
    // PR-086.06 — this cell previously had no border/background of its own,
    // so it floated beside its sibling `MetricItem` primary-metric tile
    // instead of reading as part of the same set of contained tiles. Given
    // the same bordered surface here (not merged data — the percentage
    // stays its own independent market-wide figure, see the doc comment
    // above).
    <div className="flex min-w-0 flex-col gap-1 rounded-xl border border-radar-light-border bg-radar-light-surface p-3 dark:border-white/10 dark:bg-white/[0.02]">
      <SegmentedControl aria-label="Performance window" options={options} value={window_} onChange={setWindow} size="sm" />
      <ChangeValue value={pct} className={cn("font-semibold tracking-tight tabular-nums", valueClassName)} />
    </div>
  );
}
