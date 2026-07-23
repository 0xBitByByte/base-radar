import type { CandidateProject } from "@/lib/discovery/types";
import type { AIIntelligenceBrief } from "@/lib/ai-intelligence/types";
import type {
  DailyBriefGeneratorInput,
  ProviderChangeInput,
  RegistryUpdateInput,
} from "@/lib/ai-intelligence/generator/types";

/**
 * Every count here is a real tally over the generator's own input arrays
 * — never estimated, never a placeholder. Matches the "no fallback
 * metrics" discipline `data/projects/metrics.ts`'s `computeRegistryMetrics`
 * already established for the Project Registry.
 */
export type DailyIntelligenceBriefingStatistics = {
  /** Distinct real `projectId`s referenced across every input stream that carries one (registry updates, provider changes, alerts) — not `briefs.length`, since one brief can name several projects and several briefs can share one. */
  projectsAnalyzed: number;
  /** Distinct real `IntelligenceSourceType`s referenced across `registryUpdates`, `providerChanges`, and `discoveryCandidates`. */
  providersScanned: number;
  alertsProcessed: number;
  discoveriesReviewed: number;
};

/**
 * The full output of one generator run. Deliberately has **no** top-level
 * `headline`/`summary` of its own, unlike `lib/brief/`'s `DailyBrief` —
 * synthesizing an aggregate headline when `briefs` might legitimately be
 * `[]` (see docs/DAILY_BRIEF_GENERATOR.md "Empty-State Handling") would
 * require inventing text with nothing real to summarize. Every
 * `AIIntelligenceBrief` in `briefs` already carries its own real headline
 * and summary; this collection is a container plus statistics, nothing
 * more.
 */
export type DailyIntelligenceBriefing = {
  generatedAt: string;
  /** `YYYY-MM-DD`, derived from `generatedAt` (UTC) — the calendar date this briefing represents, distinct from the precise generation instant. */
  briefingDate: string;
  /** Schema version for this collection shape — bump on a breaking field change, same convention as `lib/alerts/types.ts`'s `AlertsState.version`. */
  version: 1;
  /** Already ranked — see `ranking.ts`. Index 0 is the highest-priority brief. */
  briefs: AIIntelligenceBrief[];
  statistics: DailyIntelligenceBriefingStatistics;
};

function toBriefingDate(generatedAt: string): string {
  return generatedAt.slice(0, 10);
}

/** Every `IntelligenceSourceType`-shaped field across the three input streams that carry a `source`, deduplicated. */
function countDistinctProviders(
  registryUpdates: RegistryUpdateInput[],
  providerChanges: ProviderChangeInput[],
  discoveryCandidates: CandidateProject[]
): number {
  const sources = new Set<string>();
  if (registryUpdates.length > 0) sources.add("base-registry");
  for (const change of providerChanges) sources.add(change.source);
  for (const candidate of discoveryCandidates) sources.add(candidate.source);
  return sources.size;
}

function countDistinctProjects(
  registryUpdates: RegistryUpdateInput[],
  providerChanges: ProviderChangeInput[],
  alertEvents: DailyBriefGeneratorInput["alertEvents"]
): number {
  const projectIds = new Set<string>();
  for (const update of registryUpdates) projectIds.add(update.projectId);
  for (const change of providerChanges) if (change.projectId) projectIds.add(change.projectId);
  for (const alert of alertEvents ?? []) projectIds.add(alert.projectId);
  return projectIds.size;
}

export function buildStatistics(input: Required<Omit<DailyBriefGeneratorInput, "now">>): DailyIntelligenceBriefingStatistics {
  return {
    projectsAnalyzed: countDistinctProjects(input.registryUpdates, input.providerChanges, input.alertEvents),
    providersScanned: countDistinctProviders(input.registryUpdates, input.providerChanges, input.discoveryCandidates),
    alertsProcessed: input.alertEvents.length,
    discoveriesReviewed: input.discoveryCandidates.length,
  };
}

export function buildDailyIntelligenceBriefing(
  briefs: AIIntelligenceBrief[],
  statistics: DailyIntelligenceBriefingStatistics,
  generatedAt: string
): DailyIntelligenceBriefing {
  return {
    generatedAt,
    briefingDate: toBriefingDate(generatedAt),
    version: 1,
    briefs,
    statistics,
  };
}
