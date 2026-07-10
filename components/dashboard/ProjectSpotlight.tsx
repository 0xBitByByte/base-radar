"use client";

import { useState } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { Eye, Sparkles, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { formatCompactCurrency, formatPercent } from "@/lib/data/format";
import type { ProjectSpotlight as ProjectSpotlightData, WithSource } from "@/lib/data/types";
import { ProjectLogo } from "@/components/branding/ProjectLogo";
import { WidgetCard } from "@/components/dashboard/WidgetCard";
import { GlowBadge } from "@/components/ui/GlowBadge";
import { ProgressBar } from "@/components/ui/ProgressBar";

type ProjectSpotlightProps = {
  data: WithSource<ProjectSpotlightData>;
  lastUpdated: string;
};

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-xl border border-radar-light-border bg-radar-light-surface p-3 dark:border-white/10 dark:bg-white/[0.02]">
      <span className="text-[10.5px] text-radar-light-muted dark:text-radar-muted">{label}</span>
      <span className="text-sm font-semibold tabular-nums text-radar-light-text dark:text-radar-white">
        {value}
      </span>
    </div>
  );
}

export function ProjectSpotlight({ data, lastUpdated }: ProjectSpotlightProps) {
  const [open, setOpen] = useState(false);
  const isUp = data.change24hPct >= 0;

  const metrics = [
    { label: "TVL", value: data.tvlUsd !== null ? formatCompactCurrency(data.tvlUsd) : "—" },
    { label: "FDV", value: data.fdvUsd !== null ? formatCompactCurrency(data.fdvUsd) : "—" },
    {
      label: "Liquidity",
      value: data.liquidityUsd !== null ? formatCompactCurrency(data.liquidityUsd) : "—",
    },
    {
      label: "GitHub Stars",
      value: data.githubStars !== null ? data.githubStars.toLocaleString() : "—",
    },
  ];

  const scores = [
    { label: "Community", value: data.communityScore, color: "bg-radar-primary" },
    { label: "Developer Activity", value: data.developerActivityScore, color: "bg-radar-success" },
    { label: "AI Score", value: data.aiScore, color: "bg-radar-purple" },
    { label: "Health", value: data.healthScore, color: "bg-radar-orange" },
  ];

  return (
    <WidgetCard
      icon={<Sparkles className="size-5" aria-hidden="true" />}
      title="Project Spotlight"
      subtitle="Top project on Base by TVL"
      accent="primary"
      source={data.source}
      lastUpdated={lastUpdated}
      className="sm:col-span-2 xl:col-span-1"
    >
      <div className="flex items-center gap-3">
        {/* No `logoUrl` field exists on this legacy dashboard data type yet
            (unlike `lib/intelligence/types.ts`'s `Identity`) — `ProjectLogo`
            still gives this widget the same shared fallback-initials
            treatment Explorer uses, instead of a locally reimplemented one,
            and will start rendering a real image for free whenever this
            widget's data source gains a logo field. */}
        <ProjectLogo logoUrl={null} name={data.name} size={44} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="truncate text-sm font-semibold text-radar-light-text dark:text-radar-white">
              {data.name}
            </p>
            <GlowBadge color="muted" className="px-1.5 py-0 text-[10px]">
              {data.category}
            </GlowBadge>
          </div>
          <p className="text-xs text-radar-light-muted dark:text-radar-muted">{data.symbol}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-sm font-semibold tabular-nums text-radar-light-text dark:text-radar-white">
            {data.priceUsd > 0 ? `$${data.priceUsd.toFixed(4)}` : "—"}
          </p>
          <p className={cn("text-xs font-medium", isUp ? "text-radar-success" : "text-radar-danger")}>
            {formatPercent(data.change24hPct)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {metrics.map((m) => (
          <Metric key={m.label} label={m.label} value={m.value} />
        ))}
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-3">
        {scores.map((s) => (
          <ProgressBar key={s.label} value={s.value} label={s.label} colorClassName={s.color} />
        ))}
      </div>

      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Trigger
          render={
            <button
              type="button"
              className="flex items-center justify-center gap-1.5 rounded-xl border border-radar-light-border py-2 text-sm font-medium text-radar-light-text outline-none transition-colors hover:bg-radar-light-surface focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:border-white/10 dark:text-radar-white dark:hover:bg-white/5"
            />
          }
        >
          <Eye className="size-4" aria-hidden="true" />
          Quick View
        </Dialog.Trigger>

        <Dialog.Portal>
          <Dialog.Backdrop
            className={cn(
              "fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm dark:bg-black/60",
              "transition-opacity duration-200 motion-reduce:transition-none",
              "data-[starting-style]:opacity-0 data-[ending-style]:opacity-0"
            )}
          />
          <Dialog.Popup
            className={cn(
              "fixed top-1/2 left-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-radar-light-border bg-radar-light-card p-5 shadow-2xl outline-none dark:border-white/10 dark:bg-radar-card",
              "transition-[opacity,transform] duration-200 motion-reduce:transition-none",
              "data-[starting-style]:scale-95 data-[starting-style]:opacity-0 data-[ending-style]:scale-95 data-[ending-style]:opacity-0"
            )}
          >
            <div className="mb-4 flex items-center justify-between">
              <Dialog.Title className="text-sm font-semibold text-radar-light-text dark:text-radar-white">
                {data.name} ({data.symbol})
              </Dialog.Title>
              <Dialog.Close
                aria-label="Close quick view"
                className="flex size-7 items-center justify-center rounded-lg text-radar-light-muted outline-none transition-colors hover:bg-radar-light-surface dark:text-radar-muted dark:hover:bg-white/5"
              >
                <X className="size-4" />
              </Dialog.Close>
            </div>
            <Dialog.Description className="mb-4 text-xs text-radar-light-muted dark:text-radar-muted">
              Snapshot from the current dashboard session.
            </Dialog.Description>
            <div className="grid grid-cols-2 gap-2">
              {metrics.map((m) => (
                <Metric key={m.label} label={m.label} value={m.value} />
              ))}
              <Metric label="Price" value={data.priceUsd > 0 ? `$${data.priceUsd.toFixed(4)}` : "—"} />
              <Metric label="24h Change" value={formatPercent(data.change24hPct)} />
            </div>
            <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-3">
              {scores.map((s) => (
                <ProgressBar key={s.label} value={s.value} label={s.label} colorClassName={s.color} />
              ))}
            </div>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
    </WidgetCard>
  );
}
