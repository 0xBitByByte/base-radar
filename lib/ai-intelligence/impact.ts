/**
 * How much a brief matters *if it's true* — deliberately independent of
 * `IntelligenceConfidence` (how sure the engine is it's true). A brief can
 * be `impact: "critical"` with `confidence.level: "low"` (an unconfirmed
 * report of a critical exploit is still critical if true, just not yet
 * certain) or `impact: "informational"` with `confidence.level: "very-high"`
 * (a routine, well-evidenced release note). See
 * docs/AI_INTELLIGENCE_ENGINE.md "Confidence vs Impact" for worked
 * examples of all four combinations.
 *
 * Unlike confidence, impact is never derived from evidence count here —
 * how significant a piece of news is depends on its domain content (a
 * governance proposal vs. a security exploit vs. a routine TVL update),
 * which is an editorial/domain judgment. This PR requires every brief to
 * carry an explicit `impact`, assigned by whatever builds the brief; it
 * does not attempt to infer it.
 */
export const INTELLIGENCE_IMPACT_LEVELS = ["informational", "moderate", "significant", "critical"] as const;
export type IntelligenceImpactLevel = (typeof INTELLIGENCE_IMPACT_LEVELS)[number];
