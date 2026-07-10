"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowDown, ArrowUp, Minus } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  formatCompactCurrencyParts,
  formatCompactNumberParts,
  formatGweiParts,
  formatPercent,
  formatRelativeTime,
} from "@/lib/data/format";
import type { Kpi, Trend } from "@/lib/data/types";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { Sparkline } from "@/components/ui/Sparkline";
import { Tooltip } from "@/components/ui/Tooltip";

const TREND_COLOR: Record<Trend, string> = {
  up: "text-radar-success",
  down: "text-radar-danger",
  flat: "text-radar-light-muted dark:text-radar-muted",
};

const TREND_HEX: Record<Trend, string> = {
  up: "#00e676",
  down: "#ff5a6f",
  flat: "#93a4c5",
};

const TREND_ICON: Record<Trend, typeof ArrowUp> = {
  up: ArrowUp,
  down: ArrowDown,
  flat: Minus,
};

function formatterFor(kpi: Kpi) {
  if (kpi.format === "currency") return formatCompactCurrencyParts;
  if (kpi.format === "gwei") return formatGweiParts;
  return formatCompactNumberParts;
}

type KPIRowProps = {
  items: Kpi[];
  lastUpdated: string;
};

export function KPIRow({ items, lastUpdated }: KPIRowProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
      {items.map((kpi, index) => {
        const trend = kpi.trend ?? "flat";
        const TrendIcon = TREND_ICON[trend];
        const format = formatterFor(kpi);

        return (
          <Tooltip
            key={kpi.id}
            content={
              <div className="flex flex-col gap-0.5">
                <span>{kpi.tooltip}</span>
                <span className="text-radar-light-muted/70 dark:text-radar-muted/50">
                  Updated {formatRelativeTime(lastUpdated)}
                </span>
              </div>
            }
          >
            <Link href="/dashboard/projects" className="contents">
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                whileHover={{ y: -3 }}
                transition={{ duration: 0.25, ease: "easeOut", delay: index * 0.03 }}
                className="flex h-[112px] w-full flex-col gap-1.5 overflow-hidden rounded-2xl border border-radar-light-border bg-radar-light-card/80 p-4 backdrop-blur-xl transition-[border-color,box-shadow] duration-200 hover:border-radar-primary/30 hover:shadow-lg dark:hover:shadow-[0_12px_40px_-12px_rgba(0,82,255,0.25)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:border-white/10 dark:bg-radar-card/60 dark:hover:border-radar-primary/40"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="min-w-0 flex-1 truncate text-[11px] font-medium text-radar-light-muted dark:text-radar-muted">
                    {kpi.label}
                  </span>
                  <Sparkline
                    data={kpi.sparkline}
                    color={TREND_HEX[trend]}
                    height={20}
                    opacity={0.8}
                    className="w-12 shrink-0"
                  />
                </div>
                <AnimatedNumber value={kpi.value} format={format} className="whitespace-nowrap" />
                {kpi.deltaPct !== undefined && (
                  <span className={cn("flex items-center gap-1 text-xs font-medium", TREND_COLOR[trend])}>
                    <TrendIcon className="size-3" aria-hidden="true" />
                    {formatPercent(kpi.deltaPct)}
                  </span>
                )}
              </motion.div>
            </Link>
          </Tooltip>
        );
      })}
    </div>
  );
}
