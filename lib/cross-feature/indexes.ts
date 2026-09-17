/**
 * V4-FUTURE-001G — reusable O(1) lookup indexes over `CrossFeatureIntelligence.events`/
 * `.recommendations`. Every map value is the SAME object reference already
 * sitting in those arrays — this file duplicates no source object, only
 * builds pointers to them. Built in exactly one pass per source array (a
 * single `for` loop populates every map that array feeds), never a second
 * traversal of data already walked once.
 *
 * `eventByAutomationId`/`recommendationByAutomationId` use "first write
 * wins" (never overwriting an existing entry) specifically so they match
 * `Array.prototype.find()`'s own "first match" semantics exactly — the
 * real behavior every existing consumer (`lib/notification-explain/`) had
 * before this phase, preserved byte-for-byte.
 */

import type { CorrelatedEvent, CrossFeatureIndexes, RecommendationCorrelation } from "@/lib/cross-feature/types";

export type { CrossFeatureIndexes };

export function buildCrossFeatureIndexes(events: CorrelatedEvent[], recommendations: RecommendationCorrelation[]): CrossFeatureIndexes {
  const eventByAutomationId = new Map<string, CorrelatedEvent>();
  const eventByTopic = new Map<string, CorrelatedEvent[]>();
  const eventByHighlight = new Map<string, CorrelatedEvent>();

  for (const event of events) {
    if (event.refs.automationResultId && !eventByAutomationId.has(event.refs.automationResultId)) {
      eventByAutomationId.set(event.refs.automationResultId, event);
    }
    eventByTopic.set(event.topic, [...(eventByTopic.get(event.topic) ?? []), event]);
    if (!eventByHighlight.has(event.id)) eventByHighlight.set(event.id, event);
  }

  const recommendationByAutomationId = new Map<string, RecommendationCorrelation>();
  const recommendationById = new Map<string, RecommendationCorrelation>();

  for (const recommendation of recommendations) {
    if (recommendation.refs.automationResultId && !recommendationByAutomationId.has(recommendation.refs.automationResultId)) {
      recommendationByAutomationId.set(recommendation.refs.automationResultId, recommendation);
    }
    if (!recommendationById.has(recommendation.recommendationId)) recommendationById.set(recommendation.recommendationId, recommendation);
  }

  return { eventByAutomationId, recommendationByAutomationId, recommendationById, eventByTopic, eventByHighlight };
}
