import type { Alert } from "@/lib/alerts/types";
import type { IntelligenceAlert } from "@/lib/alerts/intelligence/types";
import type { CandidateProject } from "@/lib/discovery/types";
import type { TimelineEvent } from "@/lib/timeline/types";
import type { IntelligenceCategory } from "@/lib/ai-intelligence/categories";
import type { SupportingSignal } from "@/lib/ai-intelligence/evidence";
import type { IntelligenceImpactLevel } from "@/lib/ai-intelligence/impact";
import type { IntelligenceSourceType, SourceReference } from "@/lib/ai-intelligence/sources";

/**
 * A real registry change, supplied by the caller — this generator does not
 * diff `data/projects/` itself (no snapshot-comparison logic exists
 * anywhere in this codebase yet). Whoever eventually calls
 * `generateDailyBrief()` is responsible for producing these from a real
 * before/after comparison; this PR only defines the shape it can accept.
 */
export type RegistryUpdateInput = {
  projectId: string;
  projectName: string;
  kind: "new-entry" | "lifecycle-change" | "verification-level-change" | "status-change";
  /** The real, specific value reached — e.g. `"verified"` for a `verification-level-change`, `"archived"` for a `lifecycle-change`. Never a paraphrase. */
  detail?: string;
  occurredAt: string;
};

/**
 * A real, material change a provider reported — supplied by the caller
 * (this generator never polls a provider itself; see the PR's own "do not
 * call external services" constraint). `metric` is a free-form label
 * (`"tvl"`, `"price"`, `"volume"`, `"stars"`, ...) so rules can filter on
 * the metric they care about without this type enumerating every possible
 * one up front.
 */
export type ProviderChangeInput = {
  source: IntelligenceSourceType;
  metric: string;
  description: string;
  /** Signed percent change, if the metric is naturally a percentage move (TVL, price, volume). Omitted for non-percentage metrics. */
  changePct?: number;
  projectId?: string;
  occurredAt: string;
  referenceUrl?: string;
};

/**
 * Every field optional — `generateDailyBrief()` must produce a valid
 * (possibly empty) result from `{}` alone. `now` is the generator's
 * explicit clock: pass the same `now` with the same other inputs and the
 * output is byte-for-byte identical, satisfying this PR's "deterministic,
 * no randomness" requirement. Defaults to the real current time only when
 * omitted — the determinism guarantee is "same explicit inputs (`now`
 * included) → same output," the same convention `data/projects/metrics.ts`'s
 * `computeRegistryMetrics(projects, now = new Date())` already
 * established.
 */
export type DailyBriefGeneratorInput = {
  registryUpdates?: RegistryUpdateInput[];
  discoveryCandidates?: CandidateProject[];
  providerChanges?: ProviderChangeInput[];
  alertEvents?: Alert[];
  /** The Alert Intelligence Engine's rolled-up per-project summaries (`lib/alerts/intelligence/`) — richer than raw `alertEvents` (already carries confidence/severity/narrative), accepted for forward compatibility. No shipped rule in this PR consumes it yet — see docs/DAILY_BRIEF_GENERATOR.md "Rule Evaluation Flow" for why. */
  intelligenceAlerts?: IntelligenceAlert[];
  /** The Intelligence Timeline's already-merged chronological events (`lib/timeline/`) — accepted for forward compatibility, not yet consumed by any shipped rule. */
  timelineEvents?: TimelineEvent[];
  now?: string;
};

/**
 * What one `Rule` produces before it becomes a real `AIIntelligenceBrief`
 * — everything `createIntelligenceBrief()` (PR-040's builder) needs except
 * `confidence` (which that builder derives, never accepts as input) and
 * `id`/`generatedAt` (which `generate.ts` assigns so every brief in one
 * run has a unique, deterministic id).
 */
export type BriefDraft = {
  headline: string;
  summary: string;
  category: IntelligenceCategory;
  impact: IntelligenceImpactLevel;
  affectedProjects: string[];
  supportingSignals: SupportingSignal[];
  supportingSources: SourceReference[];
  tags: string[];
};

/**
 * One rule's contract: real, normalized input in, zero or more real
 * drafts out. A rule with nothing to say about the given input returns
 * `[]` — it never manufactures a draft to "fill a slot." Deterministic:
 * the same input array (in the same order) always yields the same
 * drafts.
 */
export type Rule = {
  id: string;
  description: string;
  evaluate: (input: Required<Omit<DailyBriefGeneratorInput, "now">>) => BriefDraft[];
};
