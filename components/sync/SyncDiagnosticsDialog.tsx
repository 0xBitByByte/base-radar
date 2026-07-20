"use client";

import { Dialog } from "@base-ui/react/dialog";
import { CheckCircle2, XCircle } from "lucide-react";

import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/lib/data/format";
import { useSyncDiagnostics } from "@/lib/hooks/useSyncDiagnostics";

type SyncDiagnosticsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const ROW_CLASS = "flex items-center justify-between gap-4 py-2";
const LABEL_CLASS = "text-sm text-radar-light-muted dark:text-radar-muted";
const VALUE_CLASS = "text-sm font-medium text-radar-light-text dark:text-radar-white";

function HealthBadge({ healthy, healthyLabel, issueLabel }: { healthy: boolean; healthyLabel: string; issueLabel: string }) {
  const Icon = healthy ? CheckCircle2 : XCircle;
  return (
    <span className={cn("flex items-center gap-1.5 text-sm font-medium", healthy ? "text-radar-success" : "text-radar-danger")}>
      <Icon className="size-3.5" aria-hidden="true" />
      {healthy ? healthyLabel : issueLabel}
    </span>
  );
}

/**
 * Read-only diagnostics — queue health, storage health, migration status.
 * Opened from `SyncStatusCard`'s "View Diagnostics" button. Introduces no
 * new sync logic; everything here is `useSyncDiagnostics()`'s own
 * aggregation of what the Sync + Account layers already store.
 */
export function SyncDiagnosticsDialog({ open, onOpenChange }: SyncDiagnosticsDialogProps) {
  const diagnostics = useSyncDiagnostics();

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
            "fixed top-1/2 left-1/2 z-50 flex max-h-[85vh] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl border border-radar-light-border bg-radar-light-card p-5 shadow-2xl outline-none",
            "dark:border-white/10 dark:bg-radar-card",
            "transition-[opacity,transform] duration-200 motion-reduce:transition-none",
            "data-[starting-style]:scale-95 data-[starting-style]:opacity-0 data-[ending-style]:scale-95 data-[ending-style]:opacity-0"
          )}
        >
          <Dialog.Title className="text-lg font-semibold text-radar-light-text dark:text-radar-white">
            Sync Diagnostics
          </Dialog.Title>
          <Dialog.Description className="mt-1 text-sm text-radar-light-muted dark:text-radar-muted">
            A read-only report of queue health, storage integrity, and migration status — local only, nothing here is sent anywhere.
          </Dialog.Description>

          <div className="mt-4 flex-1 overflow-y-auto">
            <div className="divide-y divide-radar-light-border dark:divide-white/10">
              <div className={ROW_CLASS}>
                <span className={LABEL_CLASS}>Queue size</span>
                <span className={VALUE_CLASS}>{diagnostics.queueSize}</span>
              </div>
              <div className={ROW_CLASS}>
                <span className={LABEL_CLASS}>Pending operations</span>
                <span className={VALUE_CLASS}>{diagnostics.pendingOperationCount}</span>
              </div>
              <div className={ROW_CLASS}>
                <span className={LABEL_CLASS}>Conflict count</span>
                <span className={VALUE_CLASS}>{diagnostics.conflictCount}</span>
              </div>
              <div className={ROW_CLASS}>
                <span className={LABEL_CLASS}>Offline state</span>
                <span className={VALUE_CLASS}>{diagnostics.isOffline ? "Offline" : "Online"}</span>
              </div>
              <div className={ROW_CLASS}>
                <span className={LABEL_CLASS}>Last sync</span>
                <span className={VALUE_CLASS}>{diagnostics.lastSyncAt ? formatRelativeTime(diagnostics.lastSyncAt) : "Never"}</span>
              </div>
              <div className={ROW_CLASS}>
                <span className={LABEL_CLASS}>Storage integrity</span>
                <HealthBadge healthy={diagnostics.storageIntegrity} healthyLabel="Healthy" issueLabel="Issues found" />
              </div>
              <div className={ROW_CLASS}>
                <span className={LABEL_CLASS}>Migration integrity</span>
                <HealthBadge healthy={diagnostics.migrationIntegrity} healthyLabel="Up to date" issueLabel="Needs attention" />
              </div>
            </div>

            <h3 className="mt-4 text-xs font-semibold tracking-wide text-radar-light-muted uppercase dark:text-radar-muted">
              Storage Health
            </h3>
            <ul className="mt-2 flex flex-col gap-2">
              {diagnostics.storageHealth.map((entry) => (
                <li key={entry.storageKey} className="rounded-xl border border-radar-light-border px-3 py-2.5 text-sm dark:border-white/10">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-radar-light-text dark:text-radar-white">{entry.key}</span>
                    <HealthBadge healthy={entry.issueCount === 0} healthyLabel="Healthy" issueLabel={`${entry.issueCount} issue${entry.issueCount === 1 ? "" : "s"}`} />
                  </div>
                  <p className="mt-0.5 text-xs text-radar-light-muted dark:text-radar-muted">
                    {entry.exists
                      ? `Version ${entry.version ?? "—"} (${entry.isKnownVersion ? "recognized" : "unrecognized"}) · ${entry.validRecords}/${entry.totalRecords} records valid`
                      : "Not yet created"}
                  </p>
                </li>
              ))}
            </ul>
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
