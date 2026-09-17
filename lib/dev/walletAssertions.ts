/**
 * V4-FUTURE-002A (Phase 3) — developer-only ASSERTIONS over an
 * already-built `WalletVerificationBundle`. Every check here is a
 * structural/referential-integrity read of data the app already computed
 * — none of these recompute a score, a recommendation, or a correlation.
 * Never rendered in production UI; consumed only by
 * `WalletVerificationHarness` (dev route) and this file's own tests.
 */

import { AI_CHAT_QUESTION_IDS } from "@/lib/ai-chat/types";
import { REPORT_PERIODS } from "@/components/wallet/walletReportEngine";
import type { WalletVerificationBundle } from "@/lib/dev/types";

export type WalletAssertionSeverity = "error" | "warning";

export type WalletAssertionResult = {
  id: string;
  severity: WalletAssertionSeverity;
  category: "duplicate-notifications" | "duplicated-highlights" | "replay-inconsistency" | "report-story-divergence" | "digest-report-mismatch" | "broken-feature-reference";
  message: string;
};

const REPORT_PERIOD_SET = new Set<string>(REPORT_PERIODS);
const AI_CHAT_QUESTION_ID_SET = new Set<string>(AI_CHAT_QUESTION_IDS);

function assertNoDuplicateNotifications(bundle: WalletVerificationBundle): WalletAssertionResult[] {
  const results: WalletAssertionResult[] = [];
  const seenIds = new Set<string>();
  const seenRuleFire = new Map<string, string>();

  for (const result of bundle.automationResults) {
    if (seenIds.has(result.id)) {
      results.push({ id: `dup-notification-id:${result.id}`, severity: "error", category: "duplicate-notifications", message: `AutomationResult id "${result.id}" appears more than once — notifications must be uniquely identified.` });
    }
    seenIds.add(result.id);

    const ruleFireKey = `${result.ruleId}@${result.triggeredAt}`;
    const existingId = seenRuleFire.get(ruleFireKey);
    if (existingId && existingId !== result.id) {
      results.push({
        id: `dup-notification-fire:${ruleFireKey}`,
        severity: "warning",
        category: "duplicate-notifications",
        message: `Rule "${result.ruleId}" fired twice at the exact same timestamp (${result.triggeredAt}) under two different result ids (${existingId}, ${result.id}) — likely a double-fire, not two real events.`,
      });
    }
    seenRuleFire.set(ruleFireKey, result.id);
  }

  return results;
}

function assertNoDuplicatedHighlights(bundle: WalletVerificationBundle): WalletAssertionResult[] {
  const results: WalletAssertionResult[] = [];
  const seen = new Set<string>();

  for (const highlight of bundle.analytics.highlights) {
    if (seen.has(highlight.dedupeKey)) {
      results.push({ id: `dup-highlight:${highlight.dedupeKey}`, severity: "error", category: "duplicated-highlights", message: `Highlight dedupeKey "${highlight.dedupeKey}" appears more than once — the whole point of dedupeKey is that it survives deduplication uniquely.` });
    }
    seen.add(highlight.dedupeKey);
  }

  return results;
}

function assertReplayConsistency(bundle: WalletVerificationBundle): WalletAssertionResult[] {
  const results: WalletAssertionResult[] = [];
  const { history } = bundle;

  const seenTimestamps = new Set<string>();
  for (let i = 0; i < history.length; i++) {
    const snapshot = history[i];
    if (seenTimestamps.has(snapshot.timestamp)) {
      results.push({ id: `replay-dup-timestamp:${snapshot.timestamp}`, severity: "error", category: "replay-inconsistency", message: `History contains two snapshots at the identical timestamp "${snapshot.timestamp}" — Replay's timestamp-keyed lookup (\`resolveReplayPosition\`) can only ever resolve to the first one.` });
    }
    seenTimestamps.add(snapshot.timestamp);

    if (i > 0 && snapshot.timestamp < history[i - 1].timestamp) {
      results.push({ id: `replay-out-of-order:${i}`, severity: "error", category: "replay-inconsistency", message: `History is not in ascending timestamp order at index ${i} ("${snapshot.timestamp}" comes after "${history[i - 1].timestamp}") — Replay assumes index 0 is oldest, index length-1 is latest.` });
    }
  }

  return results;
}

function assertReportStoryAgreement(bundle: WalletVerificationBundle): WalletAssertionResult[] {
  const results: WalletAssertionResult[] = [];
  const { reportAll, story } = bundle;
  if (!reportAll || !story) return results;

  if (story.report.overview.lastSnapshotDate !== reportAll.overview.lastSnapshotDate) {
    results.push({
      id: "report-story-last-snapshot-mismatch",
      severity: "error",
      category: "report-story-divergence",
      message: `Story's own report reads lastSnapshotDate="${story.report.overview.lastSnapshotDate}" but the "all" period report passed to the harness reads "${reportAll.overview.lastSnapshotDate}" — Story and Report disagree about the wallet's most recent real snapshot.`,
    });
  }

  if (story.currentPosition && reportAll.health.last && story.currentPosition.health !== reportAll.health.last.value) {
    results.push({
      id: "report-story-health-mismatch",
      severity: "error",
      category: "report-story-divergence",
      message: `Story's currentPosition.health (${story.currentPosition.health}) disagrees with the Report's health.last.value (${reportAll.health.last.value}) for the same latest snapshot.`,
    });
  }

  return results;
}

function assertDigestReportAgreement(bundle: WalletVerificationBundle): WalletAssertionResult[] {
  const results: WalletAssertionResult[] = [];
  const { report30d, digest } = bundle;
  if (!report30d || !digest) return results;

  if (digest.report.overview.snapshotCount !== report30d.overview.snapshotCount) {
    results.push({
      id: "digest-report-snapshot-count-mismatch",
      severity: "error",
      category: "digest-report-mismatch",
      message: `Digest's own report reads ${digest.report.overview.snapshotCount} snapshots but the 30d report passed to the harness reads ${report30d.overview.snapshotCount} — Digest was built from a different report than the one it's being compared against.`,
    });
  }

  if (digest.healthSummary.last?.value !== report30d.health.last?.value) {
    results.push({
      id: "digest-report-health-mismatch",
      severity: "error",
      category: "digest-report-mismatch",
      message: `Digest.healthSummary.last (${digest.healthSummary.last?.value ?? "null"}) disagrees with Report.health.last (${report30d.health.last?.value ?? "null"}).`,
    });
  }

  return results;
}

function assertNoBrokenFeatureReferences(bundle: WalletVerificationBundle): WalletAssertionResult[] {
  const results: WalletAssertionResult[] = [];
  const automationResultIds = new Set(bundle.automationResults.map((r) => r.id));
  const historyTimestamps = new Set(bundle.history.map((s) => s.timestamp));

  const checkRefs = (refs: { automationResultId: string | null; historySnapshotTimestamp: string | null; reportPeriod: string | null; chatQuestionId: string | null }, sourceId: string) => {
    if (refs.automationResultId !== null && !automationResultIds.has(refs.automationResultId)) {
      results.push({ id: `broken-ref-automation:${sourceId}`, severity: "error", category: "broken-feature-reference", message: `"${sourceId}" references automationResultId "${refs.automationResultId}", which doesn't exist in automationResults.` });
    }
    if (refs.historySnapshotTimestamp !== null && !historyTimestamps.has(refs.historySnapshotTimestamp)) {
      results.push({ id: `broken-ref-history:${sourceId}`, severity: "error", category: "broken-feature-reference", message: `"${sourceId}" references historySnapshotTimestamp "${refs.historySnapshotTimestamp}", which doesn't exist in history.` });
    }
    if (refs.reportPeriod !== null && !REPORT_PERIOD_SET.has(refs.reportPeriod)) {
      results.push({ id: `broken-ref-period:${sourceId}`, severity: "error", category: "broken-feature-reference", message: `"${sourceId}" references reportPeriod "${refs.reportPeriod}", which isn't a real report period.` });
    }
    if (refs.chatQuestionId !== null && !AI_CHAT_QUESTION_ID_SET.has(refs.chatQuestionId)) {
      results.push({ id: `broken-ref-chat-question:${sourceId}`, severity: "error", category: "broken-feature-reference", message: `"${sourceId}" references chatQuestionId "${refs.chatQuestionId}", which isn't a real AI Chat question id.` });
    }
  };

  for (const event of bundle.crossFeature.events) checkRefs(event.refs, `event:${event.id}`);
  for (const recommendation of bundle.crossFeature.recommendations) checkRefs(recommendation.refs, `recommendation:${recommendation.recommendationId}`);

  return results;
}

export function runWalletAssertions(bundle: WalletVerificationBundle): WalletAssertionResult[] {
  return [
    ...assertNoDuplicateNotifications(bundle),
    ...assertNoDuplicatedHighlights(bundle),
    ...assertReplayConsistency(bundle),
    ...assertReportStoryAgreement(bundle),
    ...assertDigestReportAgreement(bundle),
    ...assertNoBrokenFeatureReferences(bundle),
  ];
}
