"use client";

import { Activity, Fuel, Gauge, Globe, Radio, ShieldCheck, Zap } from "lucide-react";

import { useLiveNetworkStatus } from "@/lib/hooks/useLiveNetworkStatus";
import { formatNumber } from "@/lib/data/format";
import { cn } from "@/lib/utils";

type ProfileNetworkLiveProps = {
  chainLabel: string;
  gasGwei: number | null;
  blockHeight: number | null;
  estimatedTps: number | null;
  /** PR13.7 Goal 14 — real finality lag (blocks behind the chain's own "safe" tag), fetched once at page load (never live-polled — see `base.getFinality`'s own doc comment for why). `null` when the extended fetch failed or hasn't resolved. */
  finality: number | null;
  /** PR-074 FINAL POLISH — additional `NetworkStat`-shaped cells appended to this same divided strip (e.g. Verified Contracts), so a section-adjacent fact doesn't need its own separately-bordered box with its own surrounding whitespace below the strip. */
  children?: React.ReactNode;
};

const POLL_MS = 45_000;

/**
 * PR-074 REVIEW #6 — replaces six separately-bordered, separately-padded
 * boxes (each with its own icon chip) with one compact cell in a shared
 * divided strip. Six individual cards at `lg:grid-cols-6` left each tile's
 * short label/value pair stretched across far more width than the content
 * needs — a genuine layout problem, not a padding one (reviewer's own
 * instruction: "Do not simply reduce padding. Rework layout."). A single
 * bordered strip with vertical dividers between cells uses the same total
 * width far more densely, with no per-tile border/background/icon-chip
 * overhead repeated six times.
 */
export function NetworkStat({ icon: Icon, label, value, unavailable }: { icon: typeof Fuel; label: string; value: string; unavailable?: boolean }) {
  return (
    <div className="flex min-w-[104px] flex-1 shrink-0 items-center gap-2 px-3 py-2.5">
      <Icon className="size-3.5 shrink-0 text-radar-light-muted dark:text-radar-muted" aria-hidden="true" />
      <div className="flex min-w-0 flex-col">
        <span className="text-[9.5px] font-medium tracking-wide text-radar-light-muted uppercase dark:text-radar-muted">{label}</span>
        <span
          className={cn(
            "truncate text-xs font-bold tabular-nums text-radar-light-text dark:text-radar-white",
            unavailable && "text-radar-light-muted font-medium normal-case dark:text-radar-muted"
          )}
        >
          {value}
        </span>
      </div>
    </div>
  );
}

/**
 * Server-safe Suspense fallback for the Verified Contracts stat.
 * `ProfileMetrics.tsx` (a Server Component) needs a fallback for this cell,
 * but a Server Component can't pass a component reference like `icon={ShieldCheck}`
 * as a prop into a Client Component — React can't serialize a raw function
 * across that boundary ("Functions cannot be passed directly to Client
 * Components"). Confirmed live: that exact error was corrupting the SSR
 * stream (React's own log: "Aborted, errored or already flushed boundaries
 * should not be flushed again"), which is what made some project pages hang
 * on the loading screen forever — a real, reproducible bug, not a browser
 * quirk. Hardcoding the icon here, inside this already-client module, keeps
 * the fallback's only props (`value`/`unavailable`) as plain serializable
 * data.
 */
export function VerifiedContractsFallback({ value, unavailable }: { value: string; unavailable?: boolean }) {
  return <NetworkStat icon={ShieldCheck} label="Verified Contracts" value={value} unavailable={unavailable} />;
}

/**
 * Live-polling Network row (PR12.2, redesigned PR13.6 Goal 10 into one
 * equal-width row of Network/Status/Block Height/Gas) — reuses
 * `useLiveNetworkStatus` and the exact same underlying
 * `base.getBaseNetworkStatus()` call `sources.ts`'s `matchNetwork()`
 * already made for this page's first paint, zero new provider surface,
 * mirroring `MarketWidgetLive`'s relationship to the dashboard's Market
 * widget. "Status" is a real derived value (whether this page's own
 * network data resolved), never fabricated.
 *
 * Unlike `MarketWidgetLive`, this doesn't seed `useLiveNetworkStatus`'s
 * `initial` — `ChainInfo.network` (this page's merged shape) only carries
 * the 3 fields this section renders, not the full `NetworkStatus` the
 * hook's `initial` option expects. The hook polls immediately on mount
 * instead, and this component shows the SSR snapshot as a fallback until
 * that first poll resolves — one extra Base RPC call on page load, on the
 * cheapest and most generously-limited provider in this codebase (20s TTL,
 * 30 req/60s), not worth widening the shared `usePolling` seed contract to
 * avoid.
 */
export function ProfileNetworkLive({ chainLabel, gasGwei, blockHeight, estimatedTps, finality, children }: ProfileNetworkLiveProps) {
  const { status } = useLiveNetworkStatus(POLL_MS);

  const live = {
    gasGwei: status?.gasGwei ?? gasGwei,
    blockHeight: status?.blockHeight ?? blockHeight,
    // Goal 14 — real, already-fetched by `getBaseNetworkStatus` (no new provider call), just not rendered here before.
    estimatedTps: status?.estimatedTps ?? estimatedTps,
  };
  const available = live.gasGwei !== null || live.blockHeight !== null;

  return (
    // PR-082 — `flex-nowrap` + `overflow-x-auto` (same horizontal-scroll
    // fallback `ProfileSectionNav` already uses) guarantees every stat stays
    // on one row instead of wrapping to a second, regardless of how many
    // cells this strip ends up with or how narrow the viewport is.
    <div className="flex flex-nowrap divide-x divide-radar-light-border overflow-x-auto rounded-xl border border-radar-light-border bg-radar-light-surface dark:divide-white/10 dark:border-white/10 dark:bg-white/[0.02]">
      <NetworkStat icon={Globe} label="Network" value={chainLabel} />
      <NetworkStat icon={Radio} label="Status" value={available ? "Live" : "Reconnecting"} unavailable={!available} />
      <NetworkStat
        icon={Activity}
        label="Block Height"
        value={live.blockHeight !== null ? formatNumber(live.blockHeight) : "Reconnecting"}
        unavailable={live.blockHeight === null}
      />
      <NetworkStat icon={Fuel} label="Gas" value={live.gasGwei !== null ? `${live.gasGwei.toFixed(3)} gwei` : "Reconnecting"} unavailable={live.gasGwei === null} />
      <NetworkStat
        icon={Zap}
        label="Est. TPS"
        value={live.estimatedTps !== null ? formatNumber(live.estimatedTps) : "Reconnecting"}
        unavailable={live.estimatedTps === null}
      />
      <NetworkStat
        icon={Gauge}
        label="Finality"
        value={finality !== null ? `${formatNumber(finality)} block${finality === 1 ? "" : "s"} behind` : "Not Currently Available"}
        unavailable={finality === null}
      />
      {children}
    </div>
  );
}
