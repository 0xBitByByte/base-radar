"use client";

import { useRef, useState } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { Download, RotateCcw, Upload } from "lucide-react";
import { Switch } from "@base-ui/react/switch";

import { cn } from "@/lib/utils";
import { usePersonalizationPreferences } from "@/lib/hooks/usePersonalizationPreferences";
import { useWatchlists } from "@/lib/hooks/useWatchlists";
import { exportWatchlistsToJson, validateWatchlistImport } from "@/lib/personalization/importExport";
import type { WatchlistImportResult } from "@/lib/personalization/importExport";

const SWITCH_ROOT_CLASS =
  "relative flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full bg-radar-light-border outline-none transition-colors data-[checked]:bg-radar-primary focus-visible:ring-2 focus-visible:ring-radar-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-radar-light-bg dark:bg-white/10 dark:data-[checked]:bg-radar-primary dark:focus-visible:ring-offset-radar-bg";
const SWITCH_THUMB_CLASS =
  "block size-4 translate-x-1 rounded-full bg-radar-light-card shadow transition-transform data-[checked]:translate-x-6 dark:bg-radar-bg";

/** Triggers a browser file download for a JSON string — no external request, no data leaves the tab. */
function downloadJson(filename: string, content: string): void {
  const blob = new Blob([content], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

/**
 * `/dashboard/settings/personalization` — the same card/section chrome
 * `SearchPreferencesPage.tsx`/`AutomationPreferencesPage.tsx` established.
 * Reads/writes `lib/personalization/preferences.ts` via
 * `usePersonalizationPreferences`, and drives watchlist import/export
 * through `lib/personalization/importExport.ts` (pure validation) +
 * `useWatchlists().importWatchlists` (the only place anything is actually
 * written to storage, and only once the user confirms in the dialog
 * below).
 */
export function PersonalizationPreferencesPage() {
  const { preferences, setPreferences, resetPreferences } = usePersonalizationPreferences();
  const { watchlists, importWatchlists } = useWatchlists();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [pendingImport, setPendingImport] = useState<WatchlistImportResult | null>(null);
  const [statusMessage, setStatusMessage] = useState("");

  function handleExport() {
    const json = exportWatchlistsToJson(watchlists);
    const filename = `base-radar-watchlists-${new Date().toISOString().slice(0, 10)}.json`;
    downloadJson(filename, json);
    setStatusMessage(`Exported ${watchlists.length} ${watchlists.length === 1 ? "watchlist" : "watchlists"} to ${filename}.`);
  }

  function handleFileSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = ""; // Allow re-selecting the same file after a cancelled/failed import.
    if (!file) return;

    file
      .text()
      .then((raw) => {
        const result = validateWatchlistImport(raw);
        setPendingImport(result);
        if (!result.valid) {
          setStatusMessage(`Import failed: ${result.issues[0]}`);
        }
      })
      .catch(() => {
        setPendingImport({ valid: false, issues: ["Could not read this file."] });
        setStatusMessage("Import failed: could not read this file.");
      });
  }

  function handleConfirmImport() {
    if (!pendingImport?.valid) return;
    const count = importWatchlists(pendingImport.watchlists);
    setStatusMessage(`Imported ${count} ${count === 1 ? "watchlist" : "watchlists"}.`);
    setPendingImport(null);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold text-radar-light-text dark:text-radar-white">Personalization Preferences</h1>
        <p className="text-sm leading-relaxed text-radar-light-muted dark:text-radar-muted">
          Control how the Dashboard, Global Search, and the Topbar respond to your active watchlist, and manage your
          watchlists as a file.
        </p>
      </div>

      <div role="status" aria-live="polite" className="sr-only">
        {statusMessage}
      </div>

      <section aria-labelledby="personalization-dashboard-heading" className="flex flex-col gap-3">
        <h2 id="personalization-dashboard-heading" className="text-sm font-semibold text-radar-light-text dark:text-radar-white">
          Dashboard
        </h2>
        <div className="flex items-center justify-between gap-3 rounded-xl border border-radar-light-border bg-radar-light-card p-4 dark:border-white/10 dark:bg-white/[0.02]">
          <span className="flex flex-col">
            <span className="text-sm font-medium text-radar-light-text dark:text-radar-white">
              Enable Dashboard Personalization
            </span>
            <span className="text-xs text-radar-light-muted dark:text-radar-muted">
              Scope the Dashboard, Timeline, Notifications, Automation, Portfolio, and Daily Brief to your active
              watchlist.
            </span>
          </span>
          <Switch.Root
            checked={preferences.filterDashboardByActiveWatchlist}
            onCheckedChange={(checked) => setPreferences({ filterDashboardByActiveWatchlist: checked })}
            aria-label={
              preferences.filterDashboardByActiveWatchlist
                ? "Disable Dashboard personalization"
                : "Enable Dashboard personalization"
            }
            className={SWITCH_ROOT_CLASS}
          >
            <Switch.Thumb className={SWITCH_THUMB_CLASS} />
          </Switch.Root>
        </div>
        {!preferences.filterDashboardByActiveWatchlist && (
          <p className="text-xs text-radar-light-muted dark:text-radar-muted">
            Off — every widget shows its full, un-filtered dataset regardless of which watchlist is active.
          </p>
        )}
      </section>

      <section aria-labelledby="personalization-search-heading" className="flex flex-col gap-3">
        <h2 id="personalization-search-heading" className="text-sm font-semibold text-radar-light-text dark:text-radar-white">
          Search
        </h2>
        <div className="flex items-center justify-between gap-3 rounded-xl border border-radar-light-border bg-radar-light-card p-4 dark:border-white/10 dark:bg-white/[0.02]">
          <span className="flex flex-col">
            <span className="text-sm font-medium text-radar-light-text dark:text-radar-white">
              Enable Search Prioritization
            </span>
            <span className="text-xs text-radar-light-muted dark:text-radar-muted">
              Break search ties in favor of projects in your active watchlist. Never hides other results.
            </span>
          </span>
          <Switch.Root
            checked={preferences.enableSearchPrioritization}
            onCheckedChange={(checked) => setPreferences({ enableSearchPrioritization: checked })}
            aria-label={
              preferences.enableSearchPrioritization ? "Disable search prioritization" : "Enable search prioritization"
            }
            className={SWITCH_ROOT_CLASS}
          >
            <Switch.Thumb className={SWITCH_THUMB_CLASS} />
          </Switch.Root>
        </div>
        {!preferences.enableSearchPrioritization && (
          <p className="text-xs text-radar-light-muted dark:text-radar-muted">
            Off — Global Search ranks purely by match quality, exactly as it did before Personalization existed.
          </p>
        )}
      </section>

      <section aria-labelledby="personalization-watchlist-heading" className="flex flex-col gap-3">
        <h2
          id="personalization-watchlist-heading"
          className="text-sm font-semibold text-radar-light-text dark:text-radar-white"
        >
          Watchlist Behavior
        </h2>
        <div className="flex flex-col divide-y divide-radar-light-border rounded-xl border border-radar-light-border bg-radar-light-card dark:divide-white/10 dark:border-white/10 dark:bg-white/[0.02]">
          <div className="flex items-center justify-between gap-3 p-4">
            <span className="flex flex-col">
              <span className="text-sm font-medium text-radar-light-text dark:text-radar-white">
                Remember Active Watchlist
              </span>
              <span className="text-xs text-radar-light-muted dark:text-radar-muted">
                Automatically select your last active watchlist when you return.
              </span>
            </span>
            <Switch.Root
              checked={preferences.rememberActiveWatchlist}
              onCheckedChange={(checked) => setPreferences({ rememberActiveWatchlist: checked })}
              aria-label={
                preferences.rememberActiveWatchlist
                  ? "Stop remembering the active watchlist"
                  : "Remember the active watchlist"
              }
              className={SWITCH_ROOT_CLASS}
            >
              <Switch.Thumb className={SWITCH_THUMB_CLASS} />
            </Switch.Root>
          </div>

          <div className="flex items-center justify-between gap-3 p-4">
            <span className="flex flex-col">
              <span className="text-sm font-medium text-radar-light-text dark:text-radar-white">
                Show Watchlist Selector in Topbar
              </span>
              <span className="text-xs text-radar-light-muted dark:text-radar-muted">
                Switch your active watchlist from anywhere. You can always change it from{" "}
                <span className="font-medium">Watchlists</span> in the sidebar.
              </span>
            </span>
            <Switch.Root
              checked={preferences.showWatchlistSelectorInTopbar}
              onCheckedChange={(checked) => setPreferences({ showWatchlistSelectorInTopbar: checked })}
              aria-label={
                preferences.showWatchlistSelectorInTopbar
                  ? "Hide the Watchlist Selector in the Topbar"
                  : "Show the Watchlist Selector in the Topbar"
              }
              className={SWITCH_ROOT_CLASS}
            >
              <Switch.Thumb className={SWITCH_THUMB_CLASS} />
            </Switch.Root>
          </div>
        </div>
      </section>

      <section aria-labelledby="personalization-import-export-heading" className="flex flex-col gap-3">
        <h2
          id="personalization-import-export-heading"
          className="text-sm font-semibold text-radar-light-text dark:text-radar-white"
        >
          Import / Export
        </h2>
        <div className="flex flex-col gap-3 rounded-xl border border-radar-light-border bg-radar-light-card p-4 dark:border-white/10 dark:bg-white/[0.02]">
          <p className="text-xs text-radar-light-muted dark:text-radar-muted">
            Export your {watchlists.length} {watchlists.length === 1 ? "watchlist" : "watchlists"} as a JSON file, or
            import one from another device. Importing never overwrites an existing watchlist — it only adds new ones,
            after you review and confirm what was found.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleExport}
              disabled={watchlists.length === 0}
              className="flex items-center gap-1.5 rounded-lg border border-radar-light-border px-3 py-1.5 text-sm font-medium text-radar-light-text outline-none transition-colors hover:bg-radar-light-surface focus-visible:ring-2 focus-visible:ring-radar-primary/50 disabled:pointer-events-none disabled:opacity-40 dark:border-white/10 dark:text-radar-white dark:hover:bg-white/5"
            >
              <Download className="size-3.5" aria-hidden="true" />
              Export Watchlists
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 rounded-lg border border-radar-light-border px-3 py-1.5 text-sm font-medium text-radar-light-text outline-none transition-colors hover:bg-radar-light-surface focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:border-white/10 dark:text-radar-white dark:hover:bg-white/5"
            >
              <Upload className="size-3.5" aria-hidden="true" />
              Import Watchlists
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json,.json"
              onChange={handleFileSelected}
              className="sr-only"
              aria-label="Choose a watchlist export file to import"
            />
          </div>
          {pendingImport && !pendingImport.valid && (
            <div className="rounded-lg border border-radar-danger/30 bg-radar-danger/5 p-3 text-xs text-radar-danger">
              <p className="font-medium">This file couldn&apos;t be imported.</p>
              <ul className="mt-1 list-inside list-disc">
                {pendingImport.issues.map((issue) => (
                  <li key={issue}>{issue}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </section>

      <Dialog.Root open={pendingImport?.valid === true} onOpenChange={(open) => !open && setPendingImport(null)}>
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
              "fixed top-1/2 left-1/2 z-50 w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl border border-radar-light-border bg-radar-light-card p-5 shadow-2xl outline-none",
              "dark:border-white/10 dark:bg-radar-card",
              "transition-[opacity,transform] duration-200 motion-reduce:transition-none",
              "data-[starting-style]:scale-95 data-[starting-style]:opacity-0 data-[ending-style]:scale-95 data-[ending-style]:opacity-0"
            )}
          >
            {pendingImport?.valid && (
              <>
                <Dialog.Title className="text-lg font-semibold text-radar-light-text dark:text-radar-white">
                  Import {pendingImport.watchlists.length}{" "}
                  {pendingImport.watchlists.length === 1 ? "watchlist" : "watchlists"}?
                </Dialog.Title>
                <Dialog.Description className="mt-1 text-sm text-radar-light-muted dark:text-radar-muted">
                  This adds new watchlists — it never overwrites or removes anything you already have. A name that
                  matches an existing watchlist will be imported as &quot;Name (Imported)&quot;.
                </Dialog.Description>

                <ul className="mt-4 flex max-h-40 flex-col gap-1 overflow-y-auto rounded-lg bg-radar-light-surface p-2.5 text-sm dark:bg-white/5">
                  {pendingImport.watchlists.map((watchlist) => (
                    <li key={watchlist.name} className="flex items-center justify-between gap-2 text-radar-light-text dark:text-radar-white">
                      <span className="truncate">{watchlist.name}</span>
                      <span className="shrink-0 text-xs text-radar-light-muted dark:text-radar-muted">
                        {watchlist.projectIds.length} {watchlist.projectIds.length === 1 ? "project" : "projects"}
                      </span>
                    </li>
                  ))}
                </ul>

                {pendingImport.issues.length > 0 && (
                  <div className="mt-3 rounded-lg border border-radar-warning/30 bg-radar-warning/5 p-3 text-xs text-radar-light-muted dark:text-radar-muted">
                    <p className="font-medium text-radar-light-text dark:text-radar-white">
                      {pendingImport.issues.length} {pendingImport.issues.length === 1 ? "note" : "notes"} from
                      validation:
                    </p>
                    <ul className="mt-1 list-inside list-disc">
                      {pendingImport.issues.map((issue) => (
                        <li key={issue}>{issue}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="mt-5 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setPendingImport(null)}
                    className="rounded-lg px-3 py-1.5 text-sm font-medium text-radar-light-muted outline-none transition-colors hover:bg-radar-light-surface focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:text-radar-muted dark:hover:bg-white/5"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmImport}
                    className="rounded-lg bg-radar-primary px-3 py-1.5 text-sm font-medium text-white outline-none transition-colors hover:bg-radar-primary/90 focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:bg-radar-accent dark:text-radar-bg dark:hover:bg-radar-accent/90"
                  >
                    Confirm Import
                  </button>
                </div>
              </>
            )}
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>

      <section>
        <button
          type="button"
          onClick={() => resetPreferences()}
          className="flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-radar-light-muted outline-none transition-colors hover:bg-radar-light-surface focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:text-radar-muted dark:hover:bg-white/5"
        >
          <RotateCcw className="size-3.5" aria-hidden="true" />
          Reset preferences to defaults
        </button>
      </section>
    </div>
  );
}
