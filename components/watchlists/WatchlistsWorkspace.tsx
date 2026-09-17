"use client";

import { useMemo, useState } from "react";
import { Plus } from "lucide-react";

import { useWatchlists } from "@/lib/hooks/useWatchlists";
import type { PersonalWatchlist } from "@/lib/personalization/types";
import type { LiveProject } from "@/lib/projects/types";
import { WatchlistCollectionCard } from "@/components/watchlists/WatchlistCollectionCard";
import { WatchlistEditor } from "@/components/watchlists/WatchlistEditor";
import { WatchlistEmpty } from "@/components/watchlists/WatchlistEmpty";
import { WatchlistSelector } from "@/components/watchlists/WatchlistSelector";
import { PAGE_HEADER_GROUP_CLASS, PAGE_HEADER_TITLE_CLASS, PAGE_HEADER_SUBTITLE_CLASS } from "@/components/dashboard/pageHeaderStyles";

type WatchlistsWorkspaceProps = {
  /** PR-4 — fetched once, server-side, by `app/dashboard/watchlists/page.tsx` (the only place that can call `getLiveProjects()`); never fetched by this or any other client component here. */
  liveProjects: LiveProject[];
};

function moveWithinGroup(group: PersonalWatchlist[], id: string, direction: -1 | 1): string[] {
  const ids = group.map((watchlist) => watchlist.id);
  const index = ids.indexOf(id);
  const targetIndex = index + direction;
  if (index === -1 || targetIndex < 0 || targetIndex >= ids.length) return ids;
  [ids[index], ids[targetIndex]] = [ids[targetIndex], ids[index]];
  return ids;
}

/**
 * V2-UX-001 — Watchlists Experience Redesign. The `/dashboard/watchlists`
 * page's client-side composition root — previously a master/detail split
 * (`WatchlistSidebar`'s list on the left, one selected watchlist's contents
 * on the right, via an inline `WatchlistDetail`). Redesigned around a
 * gallery of self-contained `WatchlistCollectionCard`s, each showing its
 * own identity, active state, actions, and projects together — no
 * selection step, no separate panel, no left/right eye travel. Pinned
 * watchlists keep their own leading section (unchanged behavior, just
 * rendered as a card group instead of a list group); reordering
 * (`moveWithinGroup`/`handleMove`, moved here unchanged from the retired
 * `WatchlistSidebar`) is still exactly "swap with the next id in the same
 * pinned/unpinned group, translate back into one `onReorder` call" — a
 * pure array computation, not touched.
 *
 * Holds only local, ephemeral UI state (whether the editor dialog is open,
 * and for which watchlist) — never persisted, distinct from the *active*
 * watchlist, which `useWatchlists()` persists. The old `manualSelectedId`
 * "which watchlist is being viewed" state is gone entirely: every
 * watchlist is always visible now, so there's nothing to select into.
 */
export function WatchlistsWorkspace({ liveProjects }: WatchlistsWorkspaceProps) {
  const liveProjectById = useMemo(() => new Map(liveProjects.map((project) => [project.id, project])), [liveProjects]);

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

  const [editorOpen, setEditorOpen] = useState(false);
  const [editingWatchlistId, setEditingWatchlistId] = useState<string | null>(null);

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

  const pinned = watchlists.filter((watchlist) => watchlist.pinned);
  const rest = watchlists.filter((watchlist) => !watchlist.pinned);

  function handleMove(id: string, direction: -1 | 1) {
    const target = watchlists.find((watchlist) => watchlist.id === id);
    if (!target) return;
    const group = target.pinned ? pinned : rest;
    const otherGroup = target.pinned ? rest : pinned;
    const reorderedGroupIds = moveWithinGroup(group, id, direction);
    const otherGroupIds = otherGroup.map((watchlist) => watchlist.id);
    reorderWatchlists(target.pinned ? [...reorderedGroupIds, ...otherGroupIds] : [...otherGroupIds, ...reorderedGroupIds]);
  }

  function renderGroup(group: PersonalWatchlist[]) {
    return (
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {group.map((watchlist, index) => (
          <WatchlistCollectionCard
            key={watchlist.id}
            watchlist={watchlist}
            liveProjectById={liveProjectById}
            active={watchlist.id === activeWatchlistId}
            onSetActive={() => setActiveWatchlist(watchlist.id)}
            onEdit={() => handleEdit(watchlist)}
            onAddProjects={() => handleEdit(watchlist)}
            onDuplicate={() => duplicateWatchlist(watchlist.id)}
            onDelete={() => handleDelete(watchlist.id)}
            onTogglePin={() => pinWatchlist(watchlist.id, !watchlist.pinned)}
            onMoveUp={() => handleMove(watchlist.id, -1)}
            onMoveDown={() => handleMove(watchlist.id, 1)}
            canMoveUp={index > 0}
            canMoveDown={index < group.length - 1}
            onRemoveProject={(projectId) => removeProject(watchlist.id, projectId)}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className={PAGE_HEADER_GROUP_CLASS}>
          <h1 className={PAGE_HEADER_TITLE_CLASS}>Watchlists</h1>
          <p className={PAGE_HEADER_SUBTITLE_CLASS}>
            Organize projects into your own collections. One watchlist can be marked active — your Watchlist-scoped
            Dashboard widgets, Alerts, and Automation all follow it.
          </p>
        </div>
        <button
          type="button"
          onClick={handleCreate}
          className="flex shrink-0 items-center gap-1.5 rounded-lg border border-radar-light-border px-3 py-2 text-sm font-medium text-radar-light-text outline-none transition-colors hover:bg-radar-light-surface focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:border-white/10 dark:text-radar-white dark:hover:bg-white/5"
        >
          <Plus className="size-4" aria-hidden="true" />
          New Watchlist
        </button>
      </div>

      {/* V2-UX-001 (Adjustment 1) — a single global active-watchlist
          selector, kept near the header rather than relying solely on each
          card's own active pill: still the fastest way to see and change
          which watchlist is active without scanning the grid below,
          especially once there are more watchlists than fit in one
          viewport. Same shared `WatchlistSelector` the Topbar also mounts
          (unchanged there) — this is simply this page choosing to show it
          too, not a second implementation. */}
      <WatchlistSelector watchlists={watchlists} activeWatchlist={activeWatchlist} onSelect={setActiveWatchlist} className="self-start" />

      {pinned.length > 0 && (
        <div className="flex flex-col gap-3">
          <p className="text-[10.5px] font-semibold tracking-[0.1em] text-radar-light-muted uppercase dark:text-radar-muted/60">
            Pinned
          </p>
          {renderGroup(pinned)}
        </div>
      )}

      {rest.length > 0 && (
        <div className="flex flex-col gap-3">
          {pinned.length > 0 && (
            <p className="text-[10.5px] font-semibold tracking-[0.1em] text-radar-light-muted uppercase dark:text-radar-muted/60">
              All Watchlists
            </p>
          )}
          {renderGroup(rest)}
        </div>
      )}

      <WatchlistEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        watchlist={editingWatchlist}
        liveProjectById={liveProjectById}
        onCreate={createWatchlist}
        onUpdate={updateWatchlistDetails}
        onAddProject={addProject}
        onRemoveProject={removeProject}
      />
    </div>
  );
}
