"use client";

import { useState } from "react";
import { Dialog } from "@base-ui/react/dialog";
import {
  BarChart3,
  History,
  LineChart,
  ListChecks,
  RefreshCcw,
  Wallet,
  Wallet2,
  X,
} from "lucide-react";

import { cn } from "@/lib/utils";
import type { PortfolioSummary, WithSource } from "@/lib/data/types";
import { WidgetCard } from "@/components/dashboard/WidgetCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { GlowBadge } from "@/components/ui/GlowBadge";

type PortfolioWidgetProps = {
  data: WithSource<PortfolioSummary>;
  lastUpdated: string;
};

const PLANNED_FEATURES = [
  { icon: Wallet2, label: "Wallet support", detail: "Connect any Base-compatible wallet in a few clicks." },
  { icon: LineChart, label: "Portfolio tracking", detail: "Real-time value across every asset you hold." },
  { icon: ListChecks, label: "Holdings", detail: "A live breakdown of every token in your connected wallet." },
  { icon: BarChart3, label: "Profit / Loss", detail: "Realized and unrealized P&L, updated as prices move." },
  { icon: History, label: "Historical analytics", detail: "Performance trends over time, not just a snapshot." },
  { icon: RefreshCcw, label: "Watchlist synchronization", detail: "Holdings automatically cross-referenced with your Watchlist." },
];

/**
 * No wallet-connect implementation exists in this app (PR-048 requirement
 * 2) — this is a Coming Soon placeholder only. `data`/`lastUpdated` are kept
 * in the prop signature so the call site in `app/dashboard/page.tsx` doesn't
 * need to change, but the mock `PortfolioSummary` payload is intentionally
 * never rendered here, since showing it would imply a wallet is connected
 * when none is.
 */
export function PortfolioWidget({ lastUpdated }: PortfolioWidgetProps) {
  const [open, setOpen] = useState(false);

  return (
    <WidgetCard
      icon={<Wallet className="size-5" aria-hidden="true" />}
      title="Portfolio"
      subtitle="Connect a wallet to track holdings"
      accent="primary"
      lastUpdated={lastUpdated}
    >
      <EmptyState
        icon={Wallet}
        title="No wallet connected"
        description="Connect your wallet to unlock portfolio intelligence, holdings, performance tracking, and AI insights — wallet connection isn't available yet, but this card will come alive the moment it ships."
        action={
          <Dialog.Root open={open} onOpenChange={setOpen}>
            <Dialog.Trigger
              render={
                <button
                  type="button"
                  aria-label="Connect Wallet (Coming Soon)"
                  className="flex flex-col items-center justify-center gap-1 rounded-xl bg-radar-primary px-4 py-2 text-sm font-medium text-white outline-none transition-colors hover:bg-radar-primary/90 focus-visible:ring-2 focus-visible:ring-radar-primary/50"
                />
              }
            >
              <span className="flex items-center gap-1.5 whitespace-nowrap">
                <Wallet className="size-4 shrink-0" aria-hidden="true" />
                Connect Wallet
              </span>
              <GlowBadge color="muted" className="px-1.5 py-0 text-[9px] uppercase tracking-wide">
                Coming Soon
              </GlowBadge>
            </Dialog.Trigger>

            <Dialog.Portal>
              <Dialog.Backdrop
                className={cn(
                  "fixed inset-0 z-40 bg-radar-bg/40 backdrop-blur-sm dark:bg-black/60",
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
                <div className="mb-1 flex items-center justify-between">
                  <Dialog.Title className="text-sm font-semibold text-radar-light-text dark:text-radar-white">
                    Wallet Connect — Coming Soon
                  </Dialog.Title>
                  <Dialog.Close
                    aria-label="Close"
                    className="flex size-7 items-center justify-center rounded-lg text-radar-light-muted outline-none transition-colors hover:bg-radar-light-surface dark:text-radar-muted dark:hover:bg-white/5"
                  >
                    <X className="size-4" aria-hidden="true" />
                  </Dialog.Close>
                </div>
                <Dialog.Description className="mb-4 text-xs text-radar-light-muted dark:text-radar-muted">
                  Wallet support is planned but not built yet. Here&apos;s what it will unlock once it ships.
                </Dialog.Description>
                <div className="flex flex-col gap-3">
                  {PLANNED_FEATURES.map((feature) => (
                    <div key={feature.label} className="flex items-start gap-3">
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-radar-primary/10 text-radar-primary">
                        <feature.icon className="size-4" aria-hidden="true" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-radar-light-text dark:text-radar-white">
                          {feature.label}
                        </p>
                        <p className="text-[11px] text-radar-light-muted dark:text-radar-muted">
                          {feature.detail}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </Dialog.Popup>
            </Dialog.Portal>
          </Dialog.Root>
        }
      />
    </WidgetCard>
  );
}
