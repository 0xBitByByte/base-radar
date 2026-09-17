import Link from "next/link";
import { ArrowRight, BookOpenCheck, Eye, FileText, Sparkles } from "lucide-react";

import { GLASS_TILE_SURFACE } from "@/components/ui/glassStyles";
import { cn } from "@/lib/utils";

export type ProjectSmartCollectionMembership = { id: string; name: string };

type ProfileAIIntelligenceLinksProps = {
  smartCollections: ProjectSmartCollectionMembership[];
};

/**
 * PR-090.06 — Project Integration. The Project Profile page already renders
 * deep, project-specific AI intelligence (`ProfileExecutiveIntelligence`,
 * `ProfileIntelligencePanel`, `ProfileKeySignals`, the dedicated `/ai`
 * report route) — this adds only the genuinely missing piece: links out to
 * the ecosystem-wide AI surfaces that have no project-scoped equivalent
 * (AI Ask, AI Watch, Executive Reports), plus this project's real Smart
 * Collection membership.
 *
 * `smartCollections` is computed by the caller (`[slug]/page.tsx`) from the
 * SAME already-fetched `getLiveProjects()`/`getRawWhaleEvents()` this page
 * uses elsewhere, via the existing `evaluateServerCollections()` — never a
 * second scoring pipeline, never re-fetched here.
 *
 * AI Ask and AI Watch have no per-project mode (AI Ask answers ecosystem-
 * wide questions from `WorkspaceView`; AI Watch is Watchlist-scoped, not
 * project-scoped) — so both link to AI Workspace itself rather than
 * fabricating a "for this project" view that doesn't exist. The AI Watch
 * line keeps the exact required wording verbatim.
 */
export function ProfileAIIntelligenceLinks({ smartCollections }: ProfileAIIntelligenceLinksProps) {
  return (
    <div className={cn("flex flex-col gap-3 p-4", GLASS_TILE_SURFACE)}>
      <p className="text-[11px] font-medium tracking-wide text-radar-light-muted uppercase dark:text-radar-muted">
        AI Intelligence
      </p>

      {smartCollections.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <Sparkles className="size-3.5 shrink-0 text-radar-primary dark:text-radar-accent" aria-hidden="true" />
          <span className="text-xs text-radar-light-muted dark:text-radar-muted">Member of:</span>
          {smartCollections.map((collection) => (
            <Link
              key={collection.id}
              href={`/dashboard/collections/${collection.id}`}
              className="rounded-full border border-radar-light-border px-2.5 py-1 text-xs font-medium text-radar-light-text outline-none transition-colors hover:bg-radar-light-surface focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:border-white/10 dark:text-radar-white dark:hover:bg-white/5"
            >
              {collection.name}
            </Link>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-2 border-t border-radar-light-border/60 pt-3 dark:border-white/10">
        <Link
          href="/dashboard/ai-workspace"
          className="group flex items-center gap-2 text-xs font-medium text-radar-light-text outline-none transition-colors hover:text-radar-primary focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:text-radar-white dark:hover:text-radar-accent"
        >
          <BookOpenCheck className="size-3.5 shrink-0 text-radar-light-muted dark:text-radar-muted" aria-hidden="true" />
          Ask AI Ask about the ecosystem
          <ArrowRight className="size-3 shrink-0 opacity-0 transition-opacity group-hover:opacity-100" aria-hidden="true" />
        </Link>
        <p className="flex items-start gap-2 text-xs text-radar-light-muted dark:text-radar-muted">
          <Eye className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
          <span>
            Add this project to a Watchlist to include it in{" "}
            <Link href="/dashboard/ai-workspace" className="font-medium text-radar-light-text underline decoration-dotted underline-offset-2 dark:text-radar-white">
              AI Watch
            </Link>{" "}
            — it checks your saved watch when you open AI Workspace, it doesn&apos;t run in the background.
          </span>
        </p>
        <Link
          href="/dashboard/reports"
          className="group flex items-center gap-2 text-xs font-medium text-radar-light-text outline-none transition-colors hover:text-radar-primary focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:text-radar-white dark:hover:text-radar-accent"
        >
          <FileText className="size-3.5 shrink-0 text-radar-light-muted dark:text-radar-muted" aria-hidden="true" />
          View AI Executive Reports
          <ArrowRight className="size-3 shrink-0 opacity-0 transition-opacity group-hover:opacity-100" aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}
