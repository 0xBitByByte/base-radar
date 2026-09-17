"use client";

import Link from "next/link";
import { CheckCircle2, ChevronDown, ChevronUp, Copy, Layers, MoreHorizontal, Pencil, Pin, PinOff, Plus, Trash2, X } from "lucide-react";
import { Menu } from "@base-ui/react/menu";

import { AlertToggle } from "@/components/alerts/AlertToggle";
import { ChainBadgeGroup } from "@/components/branding/ChainBadgeGroup";
import { ProjectLogo } from "@/components/branding/ProjectLogo";
import { RiskBadge } from "@/components/projects/RiskBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { GLASS_SURFACE_STATIC, GLASS_TILE_SURFACE } from "@/components/ui/glassStyles";
import { getProject } from "@/data/projects/helpers";
import { categoryPrimaryMetric } from "@/lib/projects/primaryMetric";
import { cn } from "@/lib/utils";
import type { PersonalWatchlist } from "@/lib/personalization/types";
import type { LiveProject } from "@/lib/projects/types";
import { WATCHLIST_COLOR_CLASSES, WATCHLIST_ICON_COMPONENTS } from "@/components/watchlists/meta";
import { WatchlistAIWatchStatus } from "@/components/watchlists/WatchlistAIWatchStatus";

type WatchlistCollectionCardProps = {
  watchlist: PersonalWatchlist;
  liveProjectById: Map<string, LiveProject>;
  active: boolean;
  onSetActive: () => void;
  onEdit: () => void;
  onAddProjects: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onTogglePin: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onRemoveProject: (projectId: string) => void;
};

/**
 * V2-UX-001 — Watchlists Experience Redesign. One self-contained "this is
 * my collection" card, replacing the old `WatchlistSidebar` (master list) +
 * `WatchlistDetail` (right panel, defined inline in the old
 * `WatchlistsWorkspace.tsx`) split. Every watchlist now shows its own
 * identity, active state, actions, AND its projects in one place — no
 * separate panel to select into, no separate identity display duplicated
 * between a list row and a detail header.
 *
 * Active state was previously shown in four places at once (the page's own
 * `WatchlistSelector` dropdown, a static pill on the sidebar row, a "Set
 * Active" item in that row's own menu, and a second pill/button in the
 * detail panel). This card is the only place it renders now: one pill,
 * doubling as the only "make this active" control — `WatchlistSelector`'s
 * mount was removed from this page entirely (still used, unchanged, in the
 * Topbar) since it's now a redundant second way to do the exact same thing
 * this pill already does, and "Set Active" was dropped from the overflow
 * menu for the same reason.
 *
 * "Add Projects" gets its own always-visible button, separate from the
 * overflow menu's "Edit" — the old page only ever exposed adding a project
 * via the *same* button as renaming/recoloring the watchlist itself
 * (`onEdit`), which is why the brief calls that flow "disconnected."
 * Managing contents (the frequent action) and managing identity (the rare
 * one) are now two distinct, clearly-labeled entry points, even though —
 * unchanged from before — both still open the same `WatchlistEditor`
 * dialog underneath (splitting that dialog into two would touch its
 * internal form logic, out of this pass's "presentation only" scope).
 */
export function WatchlistCollectionCard({
  watchlist,
  liveProjectById,
  active,
  onSetActive,
  onEdit,
  onAddProjects,
  onDuplicate,
  onDelete,
  onTogglePin,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
  onRemoveProject,
}: WatchlistCollectionCardProps) {
  const Icon = WATCHLIST_ICON_COMPONENTS[watchlist.icon];
  const colorClasses = WATCHLIST_COLOR_CLASSES[watchlist.color];
  const projectCount = watchlist.projectIds.length;

  return (
    <article aria-label={watchlist.name} className={cn("flex flex-col gap-4 p-5", GLASS_SURFACE_STATIC)}>
      {/* PR-090.07 QA fix — responsive overflow. Adding `WatchlistAIWatchStatus`
          (PR-090.06) to the right-side `shrink-0` control group could push its
          combined width past what's left after the icon+name column on narrow
          viewports; since that column's old `min-w-0` (no floor) let flexbox
          shrink it all the way to 0 instead of wrapping, the icon rendered
          with nowhere to go and visually overlapped the controls (confirmed
          live at 375px width). `flex-wrap` on this row plus a real minimum
          width on the icon+name column (instead of an unbounded `min-w-0`)
          makes the controls wrap to their own line below the name once they
          no longer fit, the same "never let shrink-0 siblings overlap
          instead of reflowing" fix this file's own project-row rework below
          already established. */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-[140px] flex-1 items-center gap-3">
          <span className={cn("flex size-11 shrink-0 items-center justify-center rounded-full", colorClasses.bg)}>
            <Icon className={cn("size-5", colorClasses.text)} aria-hidden="true" />
          </span>
          <div className="flex min-w-0 flex-col gap-0.5">
            <div className="flex items-center gap-1.5">
              <h2 className="truncate text-base font-semibold text-radar-light-text dark:text-radar-white">{watchlist.name}</h2>
              {watchlist.pinned && (
                <Pin className="size-3 shrink-0 fill-current text-radar-light-muted dark:text-radar-muted" aria-hidden="true" />
              )}
            </div>
            {watchlist.description ? (
              <p className="truncate text-xs text-radar-light-muted dark:text-radar-muted">{watchlist.description}</p>
            ) : (
              <p className="text-xs text-radar-light-muted dark:text-radar-muted">
                {projectCount} {projectCount === 1 ? "project" : "projects"}
              </p>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <WatchlistAIWatchStatus projectIds={watchlist.projectIds} />
          {active ? (
            <span className="flex items-center gap-1.5 rounded-full bg-radar-success/10 px-3 py-1.5 text-xs font-semibold whitespace-nowrap text-radar-success">
              <CheckCircle2 className="size-3.5" aria-hidden="true" />
              Active
            </span>
          ) : (
            <button
              type="button"
              onClick={onSetActive}
              className="flex items-center gap-1.5 rounded-full border border-radar-light-border px-2.5 py-1.5 text-xs font-medium whitespace-nowrap text-radar-light-text outline-none transition-colors hover:bg-radar-light-surface focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:border-white/10 dark:text-radar-white dark:hover:bg-white/5"
            >
              <CheckCircle2 className="size-3.5" aria-hidden="true" />
              Set Active
            </button>
          )}

          <Menu.Root>
            <Menu.Trigger
              aria-label={`Actions for "${watchlist.name}"`}
              className="flex size-8 shrink-0 items-center justify-center rounded-lg text-radar-light-muted outline-none transition-colors hover:bg-radar-light-surface focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:text-radar-muted dark:hover:bg-white/5"
            >
              <MoreHorizontal className="size-4" aria-hidden="true" />
            </Menu.Trigger>
            <Menu.Portal>
              <Menu.Positioner side="bottom" align="end" sideOffset={6}>
                <Menu.Popup
                  className={cn(
                    "min-w-[180px] rounded-2xl border border-radar-light-border bg-radar-light-card/95 p-1.5 shadow-xl backdrop-blur-xl outline-none dark:border-white/10 dark:bg-radar-card/95",
                    "transition-[opacity,transform] duration-150 motion-reduce:transition-none",
                    "data-[starting-style]:scale-95 data-[starting-style]:opacity-0 data-[ending-style]:scale-95 data-[ending-style]:opacity-0"
                  )}
                >
                  <Menu.Item
                    onClick={onEdit}
                    className="flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm text-radar-light-text outline-none transition-colors data-[highlighted]:bg-radar-light-surface dark:text-radar-muted dark:data-[highlighted]:bg-white/5 dark:data-[highlighted]:text-radar-white"
                  >
                    <Pencil className="size-4" aria-hidden="true" />
                    Rename / Edit
                  </Menu.Item>
                  <Menu.Item
                    onClick={onTogglePin}
                    className="flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm text-radar-light-text outline-none transition-colors data-[highlighted]:bg-radar-light-surface dark:text-radar-muted dark:data-[highlighted]:bg-white/5 dark:data-[highlighted]:text-radar-white"
                  >
                    {watchlist.pinned ? <PinOff className="size-4" aria-hidden="true" /> : <Pin className="size-4" aria-hidden="true" />}
                    {watchlist.pinned ? "Unpin" : "Pin"}
                  </Menu.Item>
                  {canMoveUp && (
                    <Menu.Item
                      onClick={onMoveUp}
                      className="flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm text-radar-light-text outline-none transition-colors data-[highlighted]:bg-radar-light-surface dark:text-radar-muted dark:data-[highlighted]:bg-white/5 dark:data-[highlighted]:text-radar-white"
                    >
                      <ChevronUp className="size-4" aria-hidden="true" />
                      Move Up
                    </Menu.Item>
                  )}
                  {canMoveDown && (
                    <Menu.Item
                      onClick={onMoveDown}
                      className="flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm text-radar-light-text outline-none transition-colors data-[highlighted]:bg-radar-light-surface dark:text-radar-muted dark:data-[highlighted]:bg-white/5 dark:data-[highlighted]:text-radar-white"
                    >
                      <ChevronDown className="size-4" aria-hidden="true" />
                      Move Down
                    </Menu.Item>
                  )}
                  <Menu.Item
                    onClick={onDuplicate}
                    className="flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm text-radar-light-text outline-none transition-colors data-[highlighted]:bg-radar-light-surface dark:text-radar-muted dark:data-[highlighted]:bg-white/5 dark:data-[highlighted]:text-radar-white"
                  >
                    <Copy className="size-4" aria-hidden="true" />
                    Duplicate
                  </Menu.Item>
                  <div className="my-1 h-px bg-radar-light-border dark:bg-white/10" />
                  <Menu.Item
                    onClick={onDelete}
                    className="flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm text-radar-danger outline-none transition-colors data-[highlighted]:bg-radar-danger/10"
                  >
                    <Trash2 className="size-4" aria-hidden="true" />
                    Delete
                  </Menu.Item>
                </Menu.Popup>
              </Menu.Positioner>
            </Menu.Portal>
          </Menu.Root>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-radar-light-border pt-3 dark:border-white/10">
        <h3 className="text-[10.5px] font-semibold tracking-[0.1em] text-radar-light-muted uppercase dark:text-radar-muted/60">
          {projectCount} {projectCount === 1 ? "Project" : "Projects"}
        </h3>
        <button
          type="button"
          onClick={onAddProjects}
          className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-radar-primary outline-none transition-colors hover:bg-radar-primary/10 focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:text-radar-accent dark:hover:bg-radar-accent/10"
        >
          <Plus className="size-3.5" aria-hidden="true" />
          Add Projects
        </button>
      </div>

      {projectCount === 0 ? (
        <EmptyState
          icon={Layers}
          title="No projects yet"
          description={`Add projects to "${watchlist.name}" to start tracking them here.`}
          action={
            <button
              type="button"
              onClick={onAddProjects}
              className="flex items-center gap-1.5 rounded-lg border border-radar-light-border px-3 py-1.5 text-xs font-medium text-radar-light-text outline-none transition-colors hover:bg-radar-light-surface focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:border-white/10 dark:text-radar-white dark:hover:bg-white/5"
            >
              <Plus className="size-3.5" aria-hidden="true" />
              Add Projects
            </button>
          }
          className="py-6"
        />
      ) : (
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {watchlist.projectIds.map((projectId) => {
            const liveProject = liveProjectById.get(projectId);
            const project = getProject(projectId);
            const displayName = liveProject?.identity.name ?? project?.name ?? projectId;
            return (
              <WatchlistProjectRow
                key={projectId}
                projectId={projectId}
                liveProject={liveProject}
                project={project}
                displayName={displayName}
                watchlistName={watchlist.name}
                onRemove={() => onRemoveProject(projectId)}
              />
            );
          })}
        </ul>
      )}
    </article>
  );
}

type WatchlistProjectRowProps = {
  projectId: string;
  liveProject: LiveProject | undefined;
  project: ReturnType<typeof getProject>;
  displayName: string;
  watchlistName: string;
  onRemove: () => void;
};

/**
 * V2-UX-001A — one project's row inside a Watchlist card.
 *
 * Root cause of the reported overlap: this row previously used
 * `LiveProjectCard`'s `micro` variant (a fixed single-line shape — logo +
 * name + chain badge + rating + metric value, every cell but the name
 * `shrink-0`) as a `flex-1` sibling of this file's own compact
 * `AlertToggle` and remove button, all in ONE flex row with no wrap.
 * `shrink-0` cells don't shrink OR wrap on their own — their combined
 * minimum width (chain badge + rating + metric, before the name gets any
 * space at all) plus this file's own ~80px of controls routinely exceeded
 * the real available width in this card's 2-up grid, so content
 * overlapped instead of reflowing.
 *
 * Rebuilt as two lines instead of reaching for `LiveProjectCard` again:
 * that component's `micro` variant is a fixed shape used broadly elsewhere
 * in the app (this same file's own empty-state aside, `WatchlistEditor`'s
 * project picker, Search results) — changing its internal layout would be
 * a shared-component change far outside this fix's narrow scope. This
 * reads the exact same real fields `micro` already did
 * (`identity`, `chains`, `aiRating`, `categoryPrimaryMetric()`), just
 * arranged as:
 *
 *   [logo] Project Name                    [Alert] [Remove]
 *          Base · Score · TVL
 *
 * Line 1 — logo + name is the one element that shrinks/truncates
 * (`min-w-0 flex-1 truncate`); the alert toggle and remove button are
 * fixed-width (`shrink-0`) siblings, so they're never pushed out or
 * overlapped by a long name. Kept clickable via the same navigate-to-
 * profile `Link` `micro` used, wrapping only the logo+name — never the
 * controls, the same "no interactive control nested inside a Link" rule
 * `LiveProjectCard`'s own `detailed` variant already documents. Matches
 * `micro`'s own honest behavior for a project with no real `slug`: no
 * `Link` wrapper at all in that case, not a broken href.
 *
 * Line 2 — chain/score/metric, secondary and muted, indented to align
 * under the name past the logo. Only rendered when real `LiveProject`
 * data exists, matching `micro`'s own fallback for a registry-only or
 * fully-unmatched project id (name/id only, no fabricated metrics).
 */
function WatchlistProjectRow({ projectId, liveProject, project, displayName, watchlistName, onRemove }: WatchlistProjectRowProps) {
  const metric = liveProject ? categoryPrimaryMetric(liveProject) : null;
  const slug = liveProject?.slug ?? project?.slug ?? null;

  const identity = liveProject ? (
    <>
      <ProjectLogo
        logoUrl={liveProject.identity.logoUrl}
        fallbackUrls={liveProject.identity.logoUrlFallbacks}
        name={liveProject.identity.name}
        size={20}
        className="shrink-0"
      />
      <span
        title={liveProject.identity.name}
        className="min-w-0 flex-1 truncate text-sm font-medium text-radar-light-text dark:text-radar-white"
      >
        {liveProject.identity.name}
      </span>
    </>
  ) : (
    <span className="min-w-0 flex-1 truncate text-sm font-medium text-radar-light-text dark:text-radar-white">
      {project?.name ?? projectId}
    </span>
  );

  return (
    <li className={cn("flex flex-col gap-1.5 p-2.5", GLASS_TILE_SURFACE)}>
      <div className="flex items-center gap-1.5">
        {slug ? (
          <Link
            href={`/dashboard/projects/${slug}`}
            className="flex min-w-0 flex-1 items-center gap-1.5 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-radar-primary/50"
          >
            {identity}
          </Link>
        ) : (
          <div className="flex min-w-0 flex-1 items-center gap-1.5">{identity}</div>
        )}

        <div className="flex shrink-0 items-center gap-1">
          <AlertToggle projectId={projectId} projectName={displayName} compact />
          <button
            type="button"
            onClick={onRemove}
            aria-label={`Remove ${displayName} from ${watchlistName}`}
            className="flex size-7 shrink-0 items-center justify-center rounded-lg text-radar-light-muted outline-none transition-colors hover:bg-radar-light-surface focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:text-radar-muted dark:hover:bg-white/10"
          >
            <X className="size-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>

      {liveProject && metric && (
        <div className="flex min-w-0 flex-wrap items-center gap-1.5 pl-[26px] text-xs text-radar-light-muted dark:text-radar-muted">
          <ChainBadgeGroup chains={liveProject.chains} size="sm" max={1} className="shrink-0 flex-nowrap" />
          <span className="shrink-0" aria-hidden="true">
            ·
          </span>
          <span className="shrink-0 font-semibold text-radar-light-text dark:text-radar-white">{liveProject.aiRating ?? "—"}</span>
          <span className="shrink-0" aria-hidden="true">
            ·
          </span>
          <span title={metric.value ?? "Not Tracked"} className="min-w-0 truncate tabular-nums">
            {metric.value ?? "Not Tracked"}
          </span>
          {/* PR-090.06 — Watchlist Integration. Risk/Confidence were the two
              real `LiveProject` fields this row didn't surface yet, despite
              already rendering AI Grade — reusing the same `RiskBadge`
              Explorer's own card already uses (not a new risk display), and
              the same `confidence.level` vocabulary shown everywhere else
              in the app. `flex-wrap` (added above) lets these wrap onto
              their own line on narrow cards instead of the fixed single-row
              layout that previously caused real overlap here. */}
          <RiskBadge riskLevel={liveProject.riskLevel} compact />
          <span className="shrink-0 capitalize">{liveProject.confidence.level} Confidence</span>
        </div>
      )}
    </li>
  );
}
