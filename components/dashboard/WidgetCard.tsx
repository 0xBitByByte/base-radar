"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Menu } from "@base-ui/react/menu";
import { MoreHorizontal, RefreshCw } from "lucide-react";

import { cn } from "@/lib/utils";
import { RelativeTime } from "@/components/shared/RelativeTime";
import { GLASS_CARD_SURFACE } from "@/components/ui/glassStyles";
import type { DataSource } from "@/lib/data/types";

export type WidgetAccent = "primary" | "success" | "purple" | "orange" | "danger" | "accent";

const ACCENT_ICON: Record<WidgetAccent, string> = {
  primary: "bg-radar-primary/10 text-radar-primary",
  success: "bg-radar-success/10 text-radar-success",
  purple: "bg-radar-purple/10 text-radar-purple",
  orange: "bg-radar-orange/10 text-radar-orange",
  danger: "bg-radar-danger/10 text-radar-danger",
  accent: "bg-radar-accent/10 text-radar-accent",
};

export type WidgetCardAction = {
  label: string;
  icon?: ReactNode;
  onSelect?: () => void;
};

type WidgetCardProps = {
  icon: ReactNode;
  title: string;
  subtitle?: string;
  accent: WidgetAccent;
  source?: DataSource;
  lastUpdated?: string;
  actions?: WidgetCardAction[];
  children: ReactNode;
  className?: string;
};

export function WidgetCard({
  icon,
  title,
  subtitle,
  accent,
  source,
  lastUpdated,
  actions,
  children,
  className,
}: WidgetCardProps) {
  const router = useRouter();
  const menuActions: WidgetCardAction[] = actions ?? [
    {
      label: "Refresh data",
      icon: <RefreshCw className="size-4" aria-hidden="true" />,
      onSelect: () => router.refresh(),
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      whileHover={{ y: -3 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className={cn("flex flex-col gap-4 p-5 sm:p-6", GLASS_CARD_SURFACE, className)}
    >
      <div className="flex items-center gap-3">
        <span
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-xl",
            ACCENT_ICON[accent]
          )}
        >
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-sm font-semibold text-radar-light-text dark:text-radar-white">
            {title}
          </h2>
          {subtitle && (
            <p className="truncate text-xs text-radar-light-muted dark:text-radar-muted">
              {subtitle}
            </p>
          )}
        </div>
        {source === "mock" && (
          <span className="shrink-0 rounded-full border border-radar-light-border px-2 py-0.5 text-[10px] font-medium text-radar-light-muted dark:border-white/10 dark:text-radar-muted/70">
            Demo data
          </span>
        )}
        {/* UX Polish, Phase 9 — the real, symmetric counterpart to "Demo
            data" above: `source` is a genuine `"live" | "mock"` flag
            (`lib/data/types.ts`), never invented per-widget, so a widget
            backed by real data now says so instead of only ever flagging
            the mock case. Same ping-dot + "LIVE" idiom `LiveStatusBar.tsx`
            already established — not a new visual language. */}
        {source === "live" && (
          <span className="flex shrink-0 items-center gap-1 text-[10px] font-semibold text-radar-success">
            <span className="relative flex size-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-radar-success opacity-75 motion-reduce:animate-none" />
              <span className="relative inline-flex size-1.5 rounded-full bg-radar-success" />
            </span>
            LIVE
          </span>
        )}

        <Menu.Root>
          <Menu.Trigger
            aria-label={`${title} actions`}
            className="flex size-7 shrink-0 items-center justify-center rounded-lg text-radar-light-muted outline-none transition-colors hover:bg-radar-light-surface focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:text-radar-muted dark:hover:bg-white/5"
          >
            <MoreHorizontal className="size-4" aria-hidden="true" />
          </Menu.Trigger>
          <Menu.Portal>
            <Menu.Positioner side="bottom" align="end" sideOffset={6}>
              <Menu.Popup
                className={cn(
                  "min-w-[160px] rounded-xl border border-radar-light-border bg-radar-light-card p-1 shadow-xl outline-none dark:border-white/10 dark:bg-radar-card",
                  "transition-[opacity,transform] duration-150 motion-reduce:transition-none",
                  "data-[starting-style]:scale-95 data-[starting-style]:opacity-0 data-[ending-style]:scale-95 data-[ending-style]:opacity-0"
                )}
              >
                {menuActions.map((action) => (
                  <Menu.Item
                    key={action.label}
                    onClick={action.onSelect}
                    className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-radar-light-text outline-none transition-colors data-[highlighted]:bg-radar-light-surface dark:text-radar-white dark:data-[highlighted]:bg-white/5"
                  >
                    {action.icon}
                    {action.label}
                  </Menu.Item>
                ))}
              </Menu.Popup>
            </Menu.Positioner>
          </Menu.Portal>
        </Menu.Root>
      </div>

      {children}

      {lastUpdated && (
        <p className="-mt-1 text-[10.5px] text-radar-light-muted/70 dark:text-radar-muted/50">
          Updated <RelativeTime iso={lastUpdated} />
        </p>
      )}
    </motion.div>
  );
}
