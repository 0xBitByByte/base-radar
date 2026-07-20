"use client";

import { useState } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { Activity, ListChecks, ShieldAlert } from "lucide-react";

import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/lib/data/format";
import { useSyncStatus } from "@/lib/hooks/useSyncStatus";
import { useSyncDiagnostics } from "@/lib/hooks/useSyncDiagnostics";
import { SYNC_STATE_DISPLAY } from "@/components/sync/meta";
import { SyncQueueDialog } from "@/components/sync/SyncQueueDialog";
import { SyncConflictDialog } from "@/components/sync/SyncConflictDialog";
import { SyncDiagnosticsDialog } from "@/components/sync/SyncDiagnosticsDialog";

type SyncStatusCardProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const ROW_CLASS = "flex items-center justify-between gap-4 py-2.5";
const LABEL_CLASS = "text-sm text-radar-light-muted dark:text-radar-muted";
const VALUE_CLASS = "text-sm font-medium text-radar-light-text dark:text-radar-white";

/**
 * The read-only "Sync Status" summary — opened from both the Topbar's
 * Sync Status Indicator and the Account Menu's Cloud Sync item. Shows
 * current status, queue size, last sync, offline state, conflict count,
 * storage health, and migration status only; "View Queue"/"View
 * Conflicts"/"Diagnostics" navigate to the three actionable/detail
 * dialogs rather than mutating anything here.
 *
 * "View Queue"/"View Conflicts"/"Diagnostics" close this dialog before
 * opening the next one, rather than stacking a second `Dialog.Root` on
 * top of this one — Base UI only reliably scopes Escape/focus-trap
 * handling to one modal at a time, and two independent `Dialog.Root`
 * siblings both being "open" simultaneously let Escape close the wrong
 * (outer) one, orphaning the inner dialog. Closing first keeps exactly
 * one dialog open at any moment.
 */
export function SyncStatusCard({ open, onOpenChange }: SyncStatusCardProps) {
  const { syncStatus, lastSyncAt, pendingOperations, isOffline, conflicts } = useSyncStatus();
  const { storageIntegrity, migrationIntegrity } = useSyncDiagnostics();
  const [queueOpen, setQueueOpen] = useState(false);
  const [conflictsOpen, setConflictsOpen] = useState(false);
  const [diagnosticsOpen, setDiagnosticsOpen] = useState(false);

  const display = SYNC_STATE_DISPLAY[syncStatus];
  const StatusIcon = display.icon;
  const unresolvedConflictCount = conflicts.filter((conflict) => !conflict.resolved).length;

  return (
    <>
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
              "fixed top-1/2 left-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl border border-radar-light-border bg-radar-light-card p-5 shadow-2xl outline-none",
              "dark:border-white/10 dark:bg-radar-card",
              "transition-[opacity,transform] duration-200 motion-reduce:transition-none",
              "data-[starting-style]:scale-95 data-[starting-style]:opacity-0 data-[ending-style]:scale-95 data-[ending-style]:opacity-0"
            )}
          >
            <div className="flex items-center gap-2.5">
              <StatusIcon className={cn("size-5 shrink-0", display.textClass, display.spin && "animate-spin motion-reduce:animate-none")} aria-hidden="true" />
              <Dialog.Title className="text-lg font-semibold text-radar-light-text dark:text-radar-white">
                Sync Status
              </Dialog.Title>
            </div>
            <Dialog.Description className="mt-1 text-sm text-radar-light-muted dark:text-radar-muted">
              Local-only foundation — there is no cloud backend to sync with yet. Everything below is read-only.
            </Dialog.Description>

            <div className="mt-4 divide-y divide-radar-light-border dark:divide-white/10">
              <div className={ROW_CLASS}>
                <span className={LABEL_CLASS}>Current status</span>
                <span className={cn(VALUE_CLASS, display.textClass, "flex items-center gap-1.5")}>
                  <StatusIcon className={cn("size-3.5", display.spin && "animate-spin motion-reduce:animate-none")} aria-hidden="true" />
                  {display.label}
                </span>
              </div>
              <div className={ROW_CLASS}>
                <span className={LABEL_CLASS}>Queue size</span>
                <span className={VALUE_CLASS}>{pendingOperations.length}</span>
              </div>
              <div className={ROW_CLASS}>
                <span className={LABEL_CLASS}>Last sync</span>
                <span className={VALUE_CLASS}>{lastSyncAt ? formatRelativeTime(lastSyncAt) : "Never"}</span>
              </div>
              <div className={ROW_CLASS}>
                <span className={LABEL_CLASS}>Offline</span>
                <span className={VALUE_CLASS}>{isOffline ? "Yes" : "No"}</span>
              </div>
              <div className={ROW_CLASS}>
                <span className={LABEL_CLASS}>Conflicts</span>
                <span className={VALUE_CLASS}>{unresolvedConflictCount}</span>
              </div>
              <div className={ROW_CLASS}>
                <span className={LABEL_CLASS}>Storage health</span>
                <span className={cn(VALUE_CLASS, storageIntegrity ? "text-radar-success" : "text-radar-danger")}>
                  {storageIntegrity ? "Healthy" : "Issues found"}
                </span>
              </div>
              <div className={ROW_CLASS}>
                <span className={LABEL_CLASS}>Migration status</span>
                <span className={cn(VALUE_CLASS, migrationIntegrity ? "text-radar-success" : "text-radar-danger")}>
                  {migrationIntegrity ? "Up to date" : "Needs attention"}
                </span>
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={() => {
                  onOpenChange(false);
                  setQueueOpen(true);
                }}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-radar-light-border px-3 py-1.5 text-sm font-medium text-radar-light-text outline-none transition-colors hover:bg-radar-light-surface focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:border-white/10 dark:text-radar-white dark:hover:bg-white/5"
              >
                <ListChecks className="size-4" aria-hidden="true" />
                View Queue ({pendingOperations.length})
              </button>
              <button
                type="button"
                onClick={() => {
                  onOpenChange(false);
                  setConflictsOpen(true);
                }}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-radar-light-border px-3 py-1.5 text-sm font-medium text-radar-light-text outline-none transition-colors hover:bg-radar-light-surface focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:border-white/10 dark:text-radar-white dark:hover:bg-white/5"
              >
                <ShieldAlert className="size-4" aria-hidden="true" />
                View Conflicts ({unresolvedConflictCount})
              </button>
              <button
                type="button"
                onClick={() => {
                  onOpenChange(false);
                  setDiagnosticsOpen(true);
                }}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-radar-light-border px-3 py-1.5 text-sm font-medium text-radar-light-text outline-none transition-colors hover:bg-radar-light-surface focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:border-white/10 dark:text-radar-white dark:hover:bg-white/5"
              >
                <Activity className="size-4" aria-hidden="true" />
                Diagnostics
              </button>
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

      <SyncQueueDialog open={queueOpen} onOpenChange={setQueueOpen} />
      <SyncConflictDialog open={conflictsOpen} onOpenChange={setConflictsOpen} />
      <SyncDiagnosticsDialog open={diagnosticsOpen} onOpenChange={setDiagnosticsOpen} />
    </>
  );
}
