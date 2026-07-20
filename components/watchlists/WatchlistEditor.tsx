"use client";

import { useState, type FormEvent } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { Search, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { getProject } from "@/data/projects/helpers";
import { useGlobalSearch } from "@/lib/hooks/useGlobalSearch";
import { WATCHLIST_COLORS, WATCHLIST_ICONS } from "@/lib/personalization/types";
import type { PersonalWatchlist, WatchlistColorKey, WatchlistIconKey } from "@/lib/personalization/types";
import { WATCHLIST_COLOR_CLASSES, WATCHLIST_ICON_COMPONENTS, WATCHLIST_ICON_LABELS } from "@/components/watchlists/meta";

type WatchlistEditorProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** `null` = create mode (name/description/icon/color only). A real watchlist = edit mode, which also shows project management — a brand-new watchlist has no id yet to attach projects to, so that section only appears once it exists. */
  watchlist: PersonalWatchlist | null;
  onCreate: (input: { name: string; description: string; icon: WatchlistIconKey; color: WatchlistColorKey }) => void;
  onUpdate: (id: string, patch: { name: string; description: string; icon: WatchlistIconKey; color: WatchlistColorKey }) => void;
  onAddProject: (watchlistId: string, projectId: string) => void;
  onRemoveProject: (watchlistId: string, projectId: string) => void;
};

const DEFAULT_ICON: WatchlistIconKey = "folder";
const DEFAULT_COLOR: WatchlistColorKey = "primary";

const FIELD_CLASS =
  "w-full rounded-xl border border-radar-light-border bg-transparent px-3 py-2 text-sm text-radar-light-text outline-none placeholder:text-radar-light-muted focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:border-white/10 dark:text-radar-white dark:placeholder:text-radar-muted";

/**
 * Create/rename/edit dialog for one watchlist. Mounts `WatchlistEditorForm`
 * keyed on `watchlist?.id ?? "create"` only while `open` — a fresh mount
 * per target means every field initializes directly from props via
 * `useState`'s initializer, with no effect resetting state on prop change
 * (avoids the "setState in an effect" anti-pattern this session's ESLint
 * config flags; the same fix applied to `useCommandPalette.ts` earlier).
 */
export function WatchlistEditor(props: WatchlistEditorProps) {
  const { open, onOpenChange, watchlist } = props;

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
            "fixed top-1/2 left-1/2 z-50 w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl border border-radar-light-border bg-radar-light-card shadow-2xl outline-none",
            "dark:border-white/10 dark:bg-radar-card",
            "transition-[opacity,transform] duration-200 motion-reduce:transition-none",
            "data-[starting-style]:scale-95 data-[starting-style]:opacity-0 data-[ending-style]:scale-95 data-[ending-style]:opacity-0"
          )}
        >
          {open && <WatchlistEditorForm key={watchlist?.id ?? "create"} {...props} />}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/**
 * The actual form — reuses `useGlobalSearch` (filtered to
 * `type === "project"`) for the project picker rather than building a
 * second search implementation, per the PR brief. Adding/removing a
 * project stores only its id (`lib/personalization/storage.ts`'s
 * `projectIds: string[]`); the full `Project` record is only ever read
 * from the registry for display, never duplicated into the watchlist.
 */
function WatchlistEditorForm({
  onOpenChange,
  watchlist,
  onCreate,
  onUpdate,
  onAddProject,
  onRemoveProject,
}: WatchlistEditorProps) {
  const [name, setName] = useState(watchlist?.name ?? "");
  const [description, setDescription] = useState(watchlist?.description ?? "");
  const [icon, setIcon] = useState<WatchlistIconKey>(watchlist?.icon ?? DEFAULT_ICON);
  const [color, setColor] = useState<WatchlistColorKey>(watchlist?.color ?? DEFAULT_COLOR);
  const [projectQuery, setProjectQuery] = useState("");

  const projectResults = useGlobalSearch(projectQuery)
    .filter((item) => item.type === "project")
    .filter((item) => !watchlist?.projectIds.includes(item.id.slice("project:".length)))
    .slice(0, 8);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) return;

    if (watchlist) {
      onUpdate(watchlist.id, { name: trimmedName, description: description.trim(), icon, color });
    } else {
      onCreate({ name: trimmedName, description: description.trim(), icon, color });
    }
    onOpenChange(false);
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-h-[85vh] flex-col overflow-y-auto p-5">
      <Dialog.Title className="text-lg font-semibold text-radar-light-text dark:text-radar-white">
        {watchlist ? "Edit Watchlist" : "Create Watchlist"}
      </Dialog.Title>
      <Dialog.Description className="mt-1 text-sm text-radar-light-muted dark:text-radar-muted">
        {watchlist
          ? "Update this watchlist's details, or manage which projects belong to it."
          : "Give your new watchlist a name — you can add projects to it once it's created."}
      </Dialog.Description>

      <div className="mt-5 flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="watchlist-name" className="text-xs font-medium text-radar-light-text dark:text-radar-white">
            Name
          </label>
          <input
            id="watchlist-name"
            autoFocus
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="e.g. Layer 2 Projects"
            required
            className={FIELD_CLASS}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="watchlist-description" className="text-xs font-medium text-radar-light-text dark:text-radar-white">
            Description
          </label>
          <input
            id="watchlist-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="What is this watchlist for?"
            className={FIELD_CLASS}
          />
        </div>

        <fieldset className="flex flex-col gap-1.5">
          <legend className="text-xs font-medium text-radar-light-text dark:text-radar-white">Icon</legend>
          <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Choose an icon">
            {WATCHLIST_ICONS.map((iconKey) => {
              const IconComponent = WATCHLIST_ICON_COMPONENTS[iconKey];
              const isSelected = icon === iconKey;
              return (
                <button
                  key={iconKey}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  aria-label={WATCHLIST_ICON_LABELS[iconKey]}
                  onClick={() => setIcon(iconKey)}
                  className={cn(
                    "flex size-9 items-center justify-center rounded-lg border outline-none transition-colors focus-visible:ring-2 focus-visible:ring-radar-primary/50",
                    isSelected
                      ? "border-radar-primary bg-radar-primary/10 text-radar-primary dark:border-radar-accent dark:bg-radar-accent/10 dark:text-radar-accent"
                      : "border-radar-light-border text-radar-light-muted hover:bg-radar-light-surface dark:border-white/10 dark:text-radar-muted dark:hover:bg-white/5"
                  )}
                >
                  <IconComponent className="size-4" aria-hidden="true" />
                </button>
              );
            })}
          </div>
        </fieldset>

        <fieldset className="flex flex-col gap-1.5">
          <legend className="text-xs font-medium text-radar-light-text dark:text-radar-white">Color</legend>
          <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Choose a color">
            {WATCHLIST_COLORS.map((colorKey) => {
              const colorClasses = WATCHLIST_COLOR_CLASSES[colorKey];
              const isSelected = color === colorKey;
              return (
                <button
                  key={colorKey}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  aria-label={colorKey}
                  onClick={() => setColor(colorKey)}
                  className={cn(
                    "flex size-8 items-center justify-center rounded-full outline-none ring-2 ring-offset-2 ring-offset-radar-light-card transition-transform focus-visible:ring-radar-primary/50 dark:ring-offset-radar-card",
                    colorClasses.bg,
                    isSelected ? "scale-110 ring-radar-light-text dark:ring-radar-white" : "ring-transparent hover:scale-105"
                  )}
                >
                  {isSelected && <span className={cn("size-2 rounded-full", colorClasses.text, "bg-current")} aria-hidden="true" />}
                </button>
              );
            })}
          </div>
        </fieldset>

        {watchlist && (
          <div className="flex flex-col gap-2 border-t border-radar-light-border pt-4 dark:border-white/10">
            <h3 className="text-xs font-medium text-radar-light-text dark:text-radar-white">
              Projects ({watchlist.projectIds.length})
            </h3>

            {watchlist.projectIds.length > 0 && (
              <ul className="flex flex-col gap-1">
                {watchlist.projectIds.map((projectId) => {
                  const project = getProject(projectId);
                  return (
                    <li
                      key={projectId}
                      className="flex items-center justify-between gap-2 rounded-lg bg-radar-light-surface px-2.5 py-1.5 text-sm dark:bg-white/5"
                    >
                      <span className="truncate text-radar-light-text dark:text-radar-white">{project?.name ?? projectId}</span>
                      <button
                        type="button"
                        onClick={() => onRemoveProject(watchlist.id, projectId)}
                        aria-label={`Remove ${project?.name ?? projectId} from ${watchlist.name}`}
                        className="flex size-6 shrink-0 items-center justify-center rounded-md text-radar-light-muted outline-none transition-colors hover:bg-radar-light-card focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:text-radar-muted dark:hover:bg-white/10"
                      >
                        <X className="size-3.5" aria-hidden="true" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}

            <div className="relative">
              <Search
                className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-radar-light-muted dark:text-radar-muted"
                aria-hidden="true"
              />
              <input
                value={projectQuery}
                onChange={(event) => setProjectQuery(event.target.value)}
                placeholder="Search projects to add..."
                aria-label="Search projects to add to this watchlist"
                className={cn(FIELD_CLASS, "pl-9")}
              />
            </div>

            {projectQuery.trim() !== "" && (
              <ul className="flex flex-col gap-1">
                {projectResults.length === 0 && (
                  <li className="px-1 py-1.5 text-xs text-radar-light-muted dark:text-radar-muted">No matching projects found.</li>
                )}
                {projectResults.map((item) => {
                  const projectId = item.id.slice("project:".length);
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => {
                          onAddProject(watchlist.id, projectId);
                          setProjectQuery("");
                        }}
                        className="flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-left text-sm text-radar-light-text outline-none transition-colors hover:bg-radar-light-surface focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:text-radar-white dark:hover:bg-white/5"
                      >
                        <span className="truncate">{item.title}</span>
                        <span className="shrink-0 text-xs text-radar-primary dark:text-radar-accent">Add</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}
      </div>

      <div className="mt-6 flex justify-end gap-2">
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          className="rounded-lg px-3 py-1.5 text-sm font-medium text-radar-light-muted outline-none transition-colors hover:bg-radar-light-surface focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:text-radar-muted dark:hover:bg-white/5"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="rounded-lg bg-radar-primary px-3 py-1.5 text-sm font-medium text-white outline-none transition-colors hover:bg-radar-primary/90 focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:bg-radar-accent dark:text-radar-bg dark:hover:bg-radar-accent/90"
        >
          {watchlist ? "Save Changes" : "Create Watchlist"}
        </button>
      </div>
    </form>
  );
}
