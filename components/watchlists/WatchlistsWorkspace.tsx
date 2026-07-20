"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, Pencil, Plus, X } from "lucide-react";

import { getProject } from "@/data/projects/helpers";
import { useWatchlists } from "@/lib/hooks/useWatchlists";
import type { PersonalWatchlist } from "@/lib/personalization/types";
import { WATCHLIST_COLOR_CLASSES, WATCHLIST_ICON_COMPONENTS } from "@/components/watchlists/meta";
import { WatchlistEditor } from "@/components/watchlists/WatchlistEditor";
import { WatchlistEmpty } from "@/components/watchlists/WatchlistEmpty";
import { WatchlistSelector } from "@/components/watchlists/WatchlistSelector";
import { WatchlistSidebar } from "@/components/watchlists/WatchlistSidebar";
import { cn } from "@/lib/utils";

/**
 * The `/dashboard/watchlists` page's client-side composition root —
 * assembles the five components the PR brief names (`WatchlistSidebar`,
 * `WatchlistCard` via the Sidebar, `WatchlistEditor`, `WatchlistSelector`,
 * `WatchlistEmpty`) into a master/detail layout, the same role
 * `AutomationCenter`/`NotificationCenter` play for their own pages. Holds
 * only local, ephemeral UI state (which watchlist is being *viewed* here,
 * and whether the editor dialog is open) — never persisted, distinct from
 * the *active* watchlist, which `useWatchlists()` persists.
 */
export function WatchlistsWorkspace() {
  const {
    watchlists,
    activeWatchlist,
    activeWatchlistId,
    createWatchlist,
    updateWatchlistDetails,
    deleteWatchlist,
    duplicateWatchlist,
    reorderWatchlists,
    addProject,
    removeProject,
    pinWatchlist,
    setActiveWatchlist,
  } = useWatchlists();

  const [manualSelectedId, setManualSelectedId] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingWatchlistId, setEditingWatchlistId] = useState<string | null>(null);

  const selectedId =
    manualSelectedId && watchlists.some((watchlist) => watchlist.id === manualSelectedId)
      ? manualSelectedId
      : (activeWatchlistId ?? watchlists[0]?.id ?? null);
  const selectedWatchlist = watchlists.find((watchlist) => watchlist.id === selectedId) ?? null;
  const editingWatchlist = editingWatchlistId
    ? (watchlists.find((watchlist) => watchlist.id === editingWatchlistId) ?? null)
    : null;

  function handleCreate() {
    setEditingWatchlistId(null);
    setEditorOpen(true);
  }

  function handleEdit(watchlist: PersonalWatchlist) {
    setEditingWatchlistId(watchlist.id);
    setEditorOpen(true);
  }

  function handleDelete(id: string) {
    const watchlist = watchlists.find((entry) => entry.id === id);
    if (!watchlist) return;
    if (typeof window !== "undefined" && !window.confirm(`Delete "${watchlist.name}"? This cannot be undone.`)) return;
    deleteWatchlist(id);
  }

  if (watchlists.length === 0) {
    return <WatchlistEmpty onCreate={handleCreate} />;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold text-radar-light-text dark:text-radar-white">Watchlists</h1>
        <p className="text-sm leading-relaxed text-radar-light-muted dark:text-radar-muted">
          Organize projects into your own collections. One watchlist can be marked active — Dashboard filtering by the
          active watchlist arrives in a future update.
        </p>
      </div>

      <WatchlistSelector watchlists={watchlists} activeWatchlist={activeWatchlist} onSelect={setActiveWatchlist} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_1fr]">
        <WatchlistSidebar
          watchlists={watchlists}
          activeWatchlistId={activeWatchlistId}
          selectedId={selectedId}
          onSelect={setManualSelectedId}
          onSetActive={setActiveWatchlist}
          onEdit={handleEdit}
          onCreate={handleCreate}
          onDuplicate={duplicateWatchlist}
          onDelete={handleDelete}
          onTogglePin={(id) => {
            const watchlist = watchlists.find((entry) => entry.id === id);
            if (watchlist) pinWatchlist(id, !watchlist.pinned);
          }}
          onReorder={reorderWatchlists}
        />

        {selectedWatchlist && (
          <WatchlistDetail
            watchlist={selectedWatchlist}
            isActive={selectedWatchlist.id === activeWatchlistId}
            onSetActive={() => setActiveWatchlist(selectedWatchlist.id)}
            onEdit={() => handleEdit(selectedWatchlist)}
            onRemoveProject={(projectId) => removeProject(selectedWatchlist.id, projectId)}
          />
        )}
      </div>

      <WatchlistEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        watchlist={editingWatchlist}
        onCreate={createWatchlist}
        onUpdate={updateWatchlistDetails}
        onAddProject={addProject}
        onRemoveProject={removeProject}
      />
    </div>
  );
}

type WatchlistDetailProps = {
  watchlist: PersonalWatchlist;
  isActive: boolean;
  onSetActive: () => void;
  onEdit: () => void;
  onRemoveProject: (projectId: string) => void;
};

function WatchlistDetail({ watchlist, isActive, onSetActive, onEdit, onRemoveProject }: WatchlistDetailProps) {
  const Icon = WATCHLIST_ICON_COMPONENTS[watchlist.icon];
  const colorClasses = WATCHLIST_COLOR_CLASSES[watchlist.color];

  return (
    <section
      aria-labelledby="watchlist-detail-heading"
      className="flex flex-col gap-4 rounded-2xl border border-radar-light-border bg-radar-light-card p-5 dark:border-white/10 dark:bg-white/[0.02]"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className={cn("flex size-11 shrink-0 items-center justify-center rounded-full", colorClasses.bg)}>
            <Icon className={cn("size-5", colorClasses.text)} aria-hidden="true" />
          </span>
          <div className="flex flex-col">
            <h2 id="watchlist-detail-heading" className="text-base font-semibold text-radar-light-text dark:text-radar-white">
              {watchlist.name}
            </h2>
            {watchlist.description && (
              <p className="text-sm text-radar-light-muted dark:text-radar-muted">{watchlist.description}</p>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {isActive ? (
            <span className="flex items-center gap-1.5 rounded-full bg-radar-success/10 px-3 py-1.5 text-xs font-semibold text-radar-success">
              <CheckCircle2 className="size-3.5" aria-hidden="true" />
              Active
            </span>
          ) : (
            <button
              type="button"
              onClick={onSetActive}
              className="flex items-center gap-1.5 rounded-lg border border-radar-light-border px-2.5 py-1.5 text-xs font-medium text-radar-light-text outline-none transition-colors hover:bg-radar-light-surface focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:border-white/10 dark:text-radar-white dark:hover:bg-white/5"
            >
              <CheckCircle2 className="size-3.5" aria-hidden="true" />
              Set Active
            </button>
          )}
          <button
            type="button"
            onClick={onEdit}
            className="flex items-center gap-1.5 rounded-lg border border-radar-light-border px-2.5 py-1.5 text-xs font-medium text-radar-light-text outline-none transition-colors hover:bg-radar-light-surface focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:border-white/10 dark:text-radar-white dark:hover:bg-white/5"
          >
            <Pencil className="size-3.5" aria-hidden="true" />
            Edit
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-radar-light-border pt-4 dark:border-white/10">
        <h3 className="text-xs font-semibold tracking-[0.1em] text-radar-light-muted uppercase dark:text-radar-muted/60">
          {watchlist.projectIds.length} {watchlist.projectIds.length === 1 ? "Project" : "Projects"}
        </h3>
        <button
          type="button"
          onClick={onEdit}
          className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-radar-primary outline-none transition-colors hover:bg-radar-primary/10 focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:text-radar-accent dark:hover:bg-radar-accent/10"
        >
          <Plus className="size-3.5" aria-hidden="true" />
          Add Projects
        </button>
      </div>

      {watchlist.projectIds.length === 0 ? (
        <p className="rounded-xl border border-dashed border-radar-light-border px-4 py-8 text-center text-sm text-radar-light-muted dark:border-white/10 dark:text-radar-muted">
          No projects in this watchlist yet.
        </p>
      ) : (
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {watchlist.projectIds.map((projectId) => {
            const project = getProject(projectId);
            return (
              <li
                key={projectId}
                className="flex items-center justify-between gap-2 rounded-xl border border-radar-light-border p-3 dark:border-white/10"
              >
                {project ? (
                  <Link
                    href={`/dashboard/projects/${project.slug}`}
                    className="min-w-0 flex-1 truncate text-sm font-medium text-radar-light-text outline-none hover:text-radar-primary focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:text-radar-white dark:hover:text-radar-accent"
                  >
                    {project.name}
                  </Link>
                ) : (
                  <span className="min-w-0 flex-1 truncate text-sm text-radar-light-muted dark:text-radar-muted">
                    {projectId}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => onRemoveProject(projectId)}
                  aria-label={`Remove ${project?.name ?? projectId} from ${watchlist.name}`}
                  className="flex size-6 shrink-0 items-center justify-center rounded-md text-radar-light-muted outline-none transition-colors hover:bg-radar-light-surface focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:text-radar-muted dark:hover:bg-white/10"
                >
                  <X className="size-3.5" aria-hidden="true" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
