import { createIntelligenceBrief } from "@/lib/ai-intelligence/builder";
import type { AIIntelligenceBrief } from "@/lib/ai-intelligence/types";
import { buildDailyIntelligenceBriefing, buildStatistics, type DailyIntelligenceBriefing } from "@/lib/ai-intelligence/generator/briefing";
import { rankBriefs } from "@/lib/ai-intelligence/generator/ranking";
import { DAILY_BRIEF_RULES } from "@/lib/ai-intelligence/generator/rules";
import type { DailyBriefGeneratorInput } from "@/lib/ai-intelligence/generator/types";

/** Fills every optional array field with `[]` so every `Rule.evaluate()` can assume real (if possibly empty) arrays — the one place "gracefully handle missing inputs" is implemented, rather than every rule re-checking `?? []` itself. */
function normalizeInput(input: DailyBriefGeneratorInput): Required<Omit<DailyBriefGeneratorInput, "now">> {
  return {
    registryUpdates: input.registryUpdates ?? [],
    discoveryCandidates: input.discoveryCandidates ?? [],
    providerChanges: input.providerChanges ?? [],
    alertEvents: input.alertEvents ?? [],
    intelligenceAlerts: input.intelligenceAlerts ?? [],
    timelineEvents: input.timelineEvents ?? [],
  };
}

/**
 * The generation pipeline's core function — deterministic given the same
 * `input` (including the same explicit `input.now`, if provided): runs
 * every rule in `DAILY_BRIEF_RULES` against the normalized input, turns
 * every resulting `BriefDraft` into a real `AIIntelligenceBrief` via
 * `createIntelligenceBrief()` (PR-040's builder — never bypassed), and
 * returns them ranked highest-priority first. Returns `[]` when no rule's
 * real conditions are met — never a fabricated brief to avoid an empty
 * result. No randomness, no network call, no LLM.
 */
export function generateDailyBrief(input: DailyBriefGeneratorInput = {}): AIIntelligenceBrief[] {
  const now = input.now ?? new Date().toISOString();
  const normalized = normalizeInput(input);

  const briefs = DAILY_BRIEF_RULES.flatMap((rule) =>
    rule.evaluate(normalized).map((draft, index) =>
      createIntelligenceBrief({
        ...draft,
        id: `brief:${rule.id}:${index}:${now}`,
        generatedAt: now,
      })
    )
  );

  return rankBriefs(briefs, now);
}

/**
 * Wraps `generateDailyBrief()` with the statistics and metadata
 * `DailyIntelligenceBriefing` (`briefing.ts`) needs — the "Daily Brief
 * Collection" the PR brief's scope item 6 asks for. Statistics are always
 * computed from the same normalized input, regardless of whether any rule
 * actually fired — an empty `briefs: []` run still reports real (possibly
 * zero) `projectsAnalyzed`/`providersScanned`/`alertsProcessed`/
 * `discoveriesReviewed` counts, never omitted or fabricated.
 */
export function generateDailyIntelligenceBriefing(input: DailyBriefGeneratorInput = {}): DailyIntelligenceBriefing {
  const now = input.now ?? new Date().toISOString();
  const normalized = normalizeInput(input);

  const briefs = generateDailyBrief({ ...input, now });
  const statistics = buildStatistics(normalized);

  return buildDailyIntelligenceBriefing(briefs, statistics, now);
}
