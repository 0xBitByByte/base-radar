"use client";

import { Dialog } from "@base-ui/react/dialog";
import { ShieldCheck } from "lucide-react";

import { cn } from "@/lib/utils";
import { useSyncStatus } from "@/lib/hooks/useSyncStatus";

type SyncConflictDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const ENTITY_LABELS: Record<string, string> = {
  watchlist: "Watchlist",
  preferences: "Preferences",
  account: "Account",
};

/**
 * Lists conflict records read-only. Per this PR's brief, conflict
 * *resolution* isn't implemented yet — there is no remote version for a
 * local one to ever genuinely conflict with, so this list is always empty
 * in practice today; the empty state says so honestly rather than showing
 * a bare "no data" placeholder.
 */
export function SyncConflictDialog({ open, onOpenChange }: SyncConflictDialogProps) {
  const { conflicts } = useSyncStatus();

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
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
            "fixed top-1/2 left-1/2 z-50 flex max-h-[80vh] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl border border-radar-light-border bg-radar-light-card p-5 shadow-2xl outline-none",
            "dark:border-white/10 dark:bg-radar-card",
            "transition-[opacity,transform] duration-200 motion-reduce:transition-none",
            "data-[starting-style]:scale-95 data-[starting-style]:opacity-0 data-[ending-style]:scale-95 data-[ending-style]:opacity-0"
          )}
        >
          <Dialog.Title className="text-lg font-semibold text-radar-light-text dark:text-radar-white">
            Sync Conflicts
          </Dialog.Title>
          <Dialog.Description className="mt-1 text-sm text-radar-light-muted dark:text-radar-muted">
            Conflict resolution isn&rsquo;t built yet — this is a read-only record of any local/remote mismatch a future sync engine detects.
          </Dialog.Description>

          <div className="mt-4 flex-1 overflow-y-auto">
            {conflicts.length === 0 ? (
              <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-radar-light-border px-3 py-6 text-center dark:border-white/10">
                <ShieldCheck className="size-5 text-radar-light-muted dark:text-radar-muted" aria-hidden="true" />
                <p className="text-sm text-radar-light-muted dark:text-radar-muted">
                  No conflicts recorded. Detecting a real conflict requires a cloud backend, which doesn&rsquo;t exist yet.
                </p>
              </div>
            ) : (
              <ul className="flex flex-col gap-2">
                {conflicts.map((conflict) => (
                  <li
                    key={`${conflict.entity}:${conflict.entityId}`}
                    className="rounded-xl border border-radar-light-border px-3 py-2.5 text-sm dark:border-white/10"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-radar-light-text dark:text-radar-white">
                        {ENTITY_LABELS[conflict.entity] ?? conflict.entity}
                      </span>
                      <span
                        className={cn(
                          "text-xs font-medium",
                          conflict.resolved ? "text-radar-success" : "text-radar-warning"
                        )}
                      >
                        {conflict.resolved ? "Resolved" : "Unresolved"}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-xs text-radar-light-muted dark:text-radar-muted">{conflict.entityId}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-radar-light-muted outline-none transition-colors hover:bg-radar-light-surface focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:text-radar-muted dark:hover:bg-white/5"
            >
              Close
            </button>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
