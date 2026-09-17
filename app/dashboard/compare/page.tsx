import type { Metadata } from "next";

import { getRawWhaleEvents, getRegistryGovernanceEvents } from "@/lib/data/aggregate";
import { getLiveProjects } from "@/lib/projects/service";
import { evaluateServerCollections } from "@/lib/smart-collections/aggregate";
import { CompareView } from "@/components/compare/CompareView";

export const metadata: Metadata = {
  title: "Compare",
  description: "Compare up to 4 tracked Base ecosystem projects side by side — AI Grade, Confidence, Risk, Health, market data, and Smart Collection membership.",
};

/**
 * PR-091 (Compare Platform) — the Compare list itself (which project ids)
 * is client-only local-device state (`lib/compare/storage.ts`), so this
 * Server Component can't pre-filter the registry to just the selected
 * projects. Same precedent `app/dashboard/watchlists/page.tsx` already
 * established for the identical reason: await the real, already-
 * `cache()`-wrapped `getLiveProjects()`/`getRawWhaleEvents()` once and pass
 * the full result down, letting the client cross-reference its own
 * selection against it — never a second registry fetch, never re-derived.
 *
 * PR-091.04 — `getRegistryGovernanceEvents()` scans every registry-tracked
 * governance source's real Snapshot proposals, and was found (the same way
 * `app/dashboard/projects/[slug]/page.tsx`'s own `whalePromise` comment
 * already documents for whale detection) to occasionally take 30+ seconds
 * on a cold cache — long enough to make this whole page effectively hang
 * for anyone who happens to load it first. Raced against the same 5s
 * ceiling that page already uses, with the same honest fallback on timeout
 * (empty governance data, never a fabricated one) — Voting Participation
 * isn't required for the rest of this page to render.
 */
export default async function ComparePage() {
  const governancePromise = Promise.race([
    getRegistryGovernanceEvents(),
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Governance events timed out for the Compare page render")), 5_000)),
  ]);

  const [liveProjects, whaleEvents, governanceEvents] = await Promise.all([
    getLiveProjects(),
    getRawWhaleEvents(),
    governancePromise.then(
      (events) => events,
      () => []
    ),
  ]);
  const serverCollections = evaluateServerCollections(liveProjects, whaleEvents, new Date().toISOString());

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-radar-light-text dark:text-radar-white">Compare</h1>
        <p className="mt-1 text-sm text-radar-light-muted dark:text-radar-muted">
          Real, already-computed intelligence for up to 4 projects at once — nothing here is a new score or a new opinion.
        </p>
      </div>
      <CompareView liveProjects={liveProjects} serverCollections={serverCollections} governanceEvents={governanceEvents} />
    </div>
  );
}
