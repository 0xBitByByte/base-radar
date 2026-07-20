"use client";

import { Dialog } from "@base-ui/react/dialog";
import { RefreshCw, Trash2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/lib/data/format";
import { useSyncStatus } from "@/lib/hooks/useSyncStatus";

type SyncQueueDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const ENTITY_LABELS: Record<string, string> = {
  watchlist: "Watchlist",
  preferences: "Preferences",
  account: "Account",
};

const OPERATION_STATUS_CLASSES: Record<string, string> = {
  pending: "text-radar-light-muted dark:text-radar-muted",
  syncing: "text-radar-primary dark:text-radar-accent",
  error: "text-radar-danger",
  success: "text-radar-success",
};

/**
 * Lists every queued `SyncOperation` and exposes the two aggregate actions
 * the hook actually provides — `retrySync()` (attempt the whole queue)
 * and `clearQueue()` — rather than inventing a per-row action the service
 * layer doesn't expose.
 */
export function SyncQueueDialog({ open, onOpenChange }: SyncQueueDialogProps) {
  const { pendingOperations, retrySync, clearQueue, isOffline } = useSyncStatus();

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
            Sync Queue
          </Dialog.Title>
          <Dialog.Description className="mt-1 text-sm text-radar-light-muted dark:text-radar-muted">
            Operations waiting for a future Cloud Sync backend. Nothing here has ever been sent anywhere.
          </Dialog.Description>

          <div className="mt-4 flex-1 overflow-y-auto">
            {pendingOperations.length === 0 ? (
              <p className="rounded-lg border border-dashed border-radar-light-border px-3 py-6 text-center text-sm text-radar-light-muted dark:border-white/10 dark:text-radar-muted">
                The queue is empty.
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {pendingOperations.map((operation) => (
                  <li
                    key={operation.id}
                    className="rounded-xl border border-radar-light-border px-3 py-2.5 text-sm dark:border-white/10"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-radar-light-text dark:text-radar-white">
                        {ENTITY_LABELS[operation.entity] ?? operation.entity} · {operation.type}
                      </span>
                      <span className={cn("text-xs font-medium capitalize", OPERATION_STATUS_CLASSES[operation.status])}>
                        {operation.status}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-xs text-radar-light-muted dark:text-radar-muted">
                      {operation.entityId}
                    </p>
                    <p className="mt-0.5 text-xs text-radar-light-muted dark:text-radar-muted">
                      Updated {formatRelativeTime(operation.updatedAt)}
                      {operation.retryCount > 0 ? ` · ${operation.retryCount} retr${operation.retryCount === 1 ? "y" : "ies"}` : ""}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={() => {
                void retrySync();
              }}
              disabled={isOffline || pendingOperations.length === 0}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-radar-primary px-3 py-1.5 text-sm font-medium text-white outline-none transition-colors hover:bg-radar-primary/90 focus-visible:ring-2 focus-visible:ring-radar-primary/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-radar-accent dark:text-radar-bg dark:hover:bg-radar-accent/90"
            >
              <RefreshCw className="size-4" aria-hidden="true" />
              Retry Sync
            </button>
            <button
              type="button"
              onClick={clearQueue}
              disabled={pendingOperations.length === 0}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-radar-light-border px-3 py-1.5 text-sm font-medium text-radar-danger outline-none transition-colors hover:bg-radar-danger/10 focus-visible:ring-2 focus-visible:ring-radar-primary/50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10"
            >
              <Trash2 className="size-4" aria-hidden="true" />
              Clear Queue
            </button>
          </div>

          <div className="mt-3 flex justify-end">
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
