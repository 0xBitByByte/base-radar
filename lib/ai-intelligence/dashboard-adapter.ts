import type { EvidenceKind } from "@/lib/ai-intelligence/evidence";
import type { DailyIntelligenceBriefing } from "@/lib/ai-intelligence/generator/briefing";
import { INTELLIGENCE_SOURCE_LABEL } from "@/lib/ai-intelligence/sources";
import type { AIIntelligenceBrief } from "@/lib/ai-intelligence/types";
import type { BriefTone, IntelligenceBrief, IntelligenceBriefPoint } from "@/lib/data/types";

/**
 * PR-042 — converts a `DailyIntelligenceBriefing` (PR-041's generator
 * output) into the shapes the existing Dashboard Intelligence widget
 * (`components/dashboard/IntelligenceBrief.tsx`) already knows how to
 * render. This is the ONLY place that translation happens — nothing here
 * introduces a new "brief" model; every output type below is either
 * already-shipped (`IntelligenceBrief`, `IntelligenceBriefPoint`,
 * `BriefTone` — all from `lib/data/types.ts`, untouched) or a small,
 * presentation-only shape scoped to exactly the two new widget sections
 * this PR adds (source attribution, evidence summary).
 */

/** The widget shows a compact list, not a full feed — matches `MOCK_INTELLIGENCE_BRIEF`'s own 6-point length (`lib/data/mock.ts`) so a real, populated brief doesn't visually outgrow the fallback it replaces. */
const MAX_DASHBOARD_POINTS = 6;

/**
 * `AIIntelligenceBrief` has no explicit valence/sentiment field — only
 * `category`/`impact`/`confidence`, none of which say "good news" or "bad
 * news." Rather than guess sentiment for cases the model doesn't actually
 * capture (is "2 new registry entries" positive? probably, but that's an
 * inference this data doesn't license), this only asserts the one
 * genuinely unambiguous case: a `"security"` brief is bad news. Every
 * other category renders `"neutral"` — an honest default, not a guess.
 */
function deriveTone(brief: AIIntelligenceBrief): BriefTone {
  return brief.category === "security" ? "negative" : "neutral";
}

/** Converts ranked `AIIntelligenceBrief[]` into the existing `IntelligenceBrief` shape — `data/types.ts`'s own type, never a new one. Order is preserved (already ranked by `rankBriefs()`), just truncated to `MAX_DASHBOARD_POINTS`. */
export function toDashboardIntelligenceBrief(briefing: DailyIntelligenceBriefing): IntelligenceBrief {
  const points: IntelligenceBriefPoint[] = briefing.briefs.slice(0, MAX_DASHBOARD_POINTS).map((brief) => ({
    id: brief.id,
    text: brief.headline,
    tone: deriveTone(brief),
  }));

  return { points, generatedAt: briefing.generatedAt };
}

export type DashboardSourceAttribution = {
  name: string;
  url?: string;
};

/** Every distinct contributing source across every rendered brief (not just the truncated top `MAX_DASHBOARD_POINTS` — a source cited by a lower-ranked brief still real attribution), de-duplicated by display name. */
export function toDashboardSourceAttribution(briefing: DailyIntelligenceBriefing): DashboardSourceAttribution[] {
  const seen = new Map<string, DashboardSourceAttribution>();
  for (const brief of briefing.briefs) {
    for (const source of brief.supportingSources) {
      const name = source.label ?? INTELLIGENCE_SOURCE_LABEL[source.source];
      if (!seen.has(name)) seen.set(name, { name, url: source.url });
    }
  }
  return Array.from(seen.values());
}

export type DashboardEvidenceSummaryItem = {
  label: string;
  count: number;
};

/** Plain-language label per `EvidenceKind` — matches the brief's own example wording ("Registry Update", "Provider Signal"). */
const EVIDENCE_KIND_LABEL: Record<EvidenceKind, string> = {
  "registry-change": "Registry Update",
  "intelligence-signal": "Intelligence Signal",
  "provider-update": "Provider Signal",
  "contract-event": "Contract Event",
  "liquidity-movement": "Liquidity Signal",
  "governance-event": "Governance Event",
  other: "Signal",
};

function pluralize(label: string, count: number): string {
  return count === 1 ? label : `${label}s`;
}

/**
 * Counts real `supportingSignals` across every rendered brief, bucketed by
 * a label. A signal belonging to a `"security"`-category brief is
 * labeled "Security Alert" rather than its raw `EvidenceKind` label — more
 * accurate for a reader than the generic "Signal" `"other"` maps to by
 * default, and still derived entirely from the brief's own real
 * `category` field, never invented. Sorted highest-count first, matching
 * the brief's own example ordering (3, then 2, then 1).
 */
export function toDashboardEvidenceSummary(briefing: DailyIntelligenceBriefing): DashboardEvidenceSummaryItem[] {
  const counts = new Map<string, number>();

  for (const brief of briefing.briefs) {
    for (const signal of brief.supportingSignals) {
      const label = brief.category === "security" ? "Security Alert" : EVIDENCE_KIND_LABEL[signal.kind];
      counts.set(label, (counts.get(label) ?? 0) + 1);
    }
  }

  return Array.from(counts.entries())
    .map(([label, count]) => ({ label: pluralize(label, count), count }))
    .sort((a, b) => b.count - a.count);
}
