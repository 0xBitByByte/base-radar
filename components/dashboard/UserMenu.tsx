"use client";

import Link from "next/link";
import { Menu } from "@base-ui/react/menu";
import { Avatar } from "@base-ui/react/avatar";
import { LogOut, Settings, User } from "lucide-react";

import { cn } from "@/lib/utils";

const ACCOUNT_LINKS = [
  { label: "Profile", href: "/dashboard/settings", icon: User },
  { label: "Settings", href: "/dashboard/settings", icon: Settings },
];

export function UserMenu() {
  return (
    <Menu.Root>
      <Menu.Trigger
        aria-label="Open account menu"
        className="flex shrink-0 items-center gap-2 rounded-full outline-none transition-opacity hover:opacity-80 focus-visible:ring-2 focus-visible:ring-radar-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-radar-light-bg dark:focus-visible:ring-offset-radar-bg"
      >
        <Avatar.Root className="flex size-9 items-center justify-center overflow-hidden rounded-full border border-radar-light-border bg-radar-primary/10 dark:border-white/10">
          <Avatar.Fallback className="text-xs font-semibold text-radar-primary dark:text-radar-accent">
            RK
          </Avatar.Fallback>
        </Avatar.Root>
      </Menu.Trigger>

      <Menu.Portal>
        <Menu.Positioner side="bottom" align="end" sideOffset={10}>
          <Menu.Popup
            className={cn(
              "min-w-[220px] rounded-2xl border border-radar-light-border bg-radar-light-card/95 p-1.5 shadow-xl backdrop-blur-xl outline-none dark:border-white/10 dark:bg-radar-card/95",
              "transition-[opacity,transform] duration-150 motion-reduce:transition-none",
              "data-[starting-style]:scale-95 data-[starting-style]:opacity-0 data-[ending-style]:scale-95 data-[ending-style]:opacity-0"
            )}
          >
            <div className="px-2.5 py-2">
              <p className="text-sm font-semibold text-radar-light-text dark:text-radar-white">RK</p>
              <p className="text-xs text-radar-light-muted dark:text-radar-muted">Base Radar account</p>
            </div>

            <div className="my-1 h-px bg-radar-light-border dark:bg-white/10" />

            {ACCOUNT_LINKS.map((link) => (
              <Menu.LinkItem
                key={link.label}
                render={<Link href={link.href} />}
                closeOnClick
                className="flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm text-radar-light-text outline-none transition-colors data-[highlighted]:bg-radar-light-surface data-[highlighted]:text-radar-light-text dark:text-radar-muted dark:data-[highlighted]:bg-white/5 dark:data-[highlighted]:text-radar-white"
              >
                <link.icon className="size-4" />
                {link.label}
              </Menu.LinkItem>
            ))}

            <div className="my-1 h-px bg-radar-light-border dark:bg-white/10" />

            <Menu.Item className="flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm text-radar-danger outline-none transition-colors data-[highlighted]:bg-radar-danger/10">
              <LogOut className="size-4" />
              Sign out
            </Menu.Item>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
