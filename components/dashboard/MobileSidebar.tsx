"use client";

import { Dialog } from "@base-ui/react/dialog";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";
import { SidebarNav } from "@/components/dashboard/Sidebar";

type MobileSidebarProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function MobileSidebar({ open, onOpenChange }: MobileSidebarProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop
          className={cn(
            "fixed inset-0 z-40 bg-radar-bg/40 backdrop-blur-sm lg:hidden dark:bg-black/60",
            "transition-opacity duration-300 motion-reduce:transition-none",
            "data-[starting-style]:opacity-0 data-[ending-style]:opacity-0"
          )}
        />
        <Dialog.Popup
          className={cn(
            "fixed inset-y-0 left-0 z-50 flex w-[280px] max-w-[85vw] flex-col overflow-y-auto border-r px-4 pb-6 outline-none lg:hidden",
            "border-radar-light-border bg-radar-light-card dark:border-white/10 dark:bg-radar-bg",
            "-translate-x-full transition-transform duration-300 ease-out motion-reduce:transition-none",
            "data-[open]:translate-x-0"
          )}
        >
          <div className="flex items-center justify-between px-2 pt-5 pb-2">
            <Dialog.Title className="text-xs font-semibold tracking-wider text-radar-light-muted uppercase dark:text-radar-muted">
              Navigation
            </Dialog.Title>
            <Dialog.Close
              aria-label="Close navigation"
              className="flex size-8 items-center justify-center rounded-lg text-radar-light-muted outline-none transition-colors hover:bg-radar-light-surface focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:text-radar-muted dark:hover:bg-white/5"
            >
              <X className="size-4" aria-hidden="true" />
            </Dialog.Close>
          </div>
          <SidebarNav onNavigate={() => onOpenChange(false)} />
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
