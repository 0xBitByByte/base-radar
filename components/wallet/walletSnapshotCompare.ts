/**
 * V4-HISTORY-003 — the Snapshot Compare difference engine. Every function
 * here compares two ALREADY-REAL, already-persisted `AnalyticsSnapshot`s
 * field-by-field — pure subtraction/equality over stored values, never a
 * call into `lib/wallet-analytics` (no `buildTrends`/`buildBiggestChange`/
 * `buildTrendCorrelation`), never a new "improving/declining" judgment.
 * Colocated here (not under `lib/wallet-history/`), the same
 * "presentation-layer query logic, not a second engine" convention
 * `components/wallet/walletHistoryFilters.ts` already established.
 *
 * Deliberately does NOT apply Risk's "lower is better" framing the way
 * `lib/wallet-analytics/trend.ts` does — this reports the raw stored
 * numbers only, no interpretation, matching the same restraint
 * `WalletHistoryBrowser.tsx`'s cards already exercise (facts, not
 * judgments).
 */

import type { AnalyticsSnapshot } from "@/lib/wallet-history/types";

const USD_FORMAT = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

export type SnapshotDiffFieldKey =
  | "totalValue"
  | "healthScore"
  | "confidenceScore"
  | "confidenceLevel"
  | "riskScore"
  | "fingerprint"
  | "largestHoldingSymbol"
  | "diversificationScore"
  | "stablecoinExposure"
  | "ethPct";

export type SnapshotDiffField = {
  key: SnapshotDiffFieldKey;
  label: string;
  oldValue: number | string | null;
  newValue: number | string | null;
  /** Numeric delta (new − old) for numeric fields only; `null` for categorical fields or when either value is `null`. */
  delta: number | null;
  /** Real fact only — the old value literally differs from the new one. No threshold, no significance judgment. */
  changed: boolean;
  /** A real, deterministic fact string — e.g. "+8", "−12%", "+$4,800", "moderate → High". Never a generated explanation. */
  summary: string;
};

export type SnapshotComparison = {
  /**
   * `from`/`to` are LITERAL — whichever real snapshot the caller passed as
   * the first/second argument, never auto-resolved by timestamp. This is
   * deliberate: it's what makes "Swap Snapshots" (`WalletHistoryBrowser.tsx`)
   * a real, meaningful action rather than a no-op — swapping the two
   * arguments genuinely flips every delta's sign. Callers that want a
   * sensible DEFAULT (before any swap) should pass the real chronologically
   * earlier snapshot as `from` — `findPreviousSnapshot`/`findLatestSnapshot`
   * below, paired with a real snapshot, already produce that order.
   */
  from: AnalyticsSnapshot;
  to: AnalyticsSnapshot;
  fields: SnapshotDiffField[];
  changedCount: number;
  /** Real elapsed time between the two real timestamps — negative when `to` is chronologically earlier than `from` (e.g. right after a swap), never hidden or fabricated positive. */
  timeSpanDays: number;
  /** True only when every compared field is byte-identical — a real, honest "nothing changed" fact. */
  identical: boolean;
};

type FieldDefinition = {
  key: SnapshotDiffFieldKey;
  label: string;
  read: (s: AnalyticsSnapshot) => number | string | null;
  format: (oldValue: number | string | null, newValue: number | string | null, delta: number | null) => string;
};

function formatNumericDelta(delta: number, unit: string): string {
  const rounded = Math.round(delta * 10) / 10;
  return `${rounded >= 0 ? "+" : ""}${rounded}${unit}`;
}

function numericField(key: SnapshotDiffFieldKey, label: string, read: (s: AnalyticsSnapshot) => number, unit = ""): FieldDefinition {
  return {
    key,
    label,
    read,
    format: (oldValue, newValue, delta) => {
      if (delta === null || typeof oldValue !== "number" || typeof newValue !== "number") return `${oldValue ?? "—"} → ${newValue ?? "—"}`;
      return formatNumericDelta(delta, unit);
    },
  };
}

function currencyField(key: SnapshotDiffFieldKey, label: string, read: (s: AnalyticsSnapshot) => number): FieldDefinition {
  return {
    key,
    label,
    read,
    format: (oldValue, newValue, delta) => {
      if (delta === null || typeof delta !== "number") return `${oldValue ?? "—"} → ${newValue ?? "—"}`;
      return `${delta >= 0 ? "+" : "-"}${USD_FORMAT.format(Math.abs(delta))}`;
    },
  };
}

function categoricalField(key: SnapshotDiffFieldKey, label: string, read: (s: AnalyticsSnapshot) => string | null): FieldDefinition {
  return {
    key,
    label,
    read,
    format: (oldValue, newValue) => `${oldValue ?? "—"} → ${newValue ?? "—"}`,
  };
}

const FIELD_DEFINITIONS: FieldDefinition[] = [
  currencyField("totalValue", "Portfolio Value", (s) => s.totalValue),
  numericField("healthScore", "Health", (s) => s.healthScore),
  numericField("confidenceScore", "Confidence Score", (s) => s.confidenceScore, "%"),
  categoricalField("confidenceLevel", "Confidence Level", (s) => s.confidenceLevel),
  numericField("riskScore", "Risk", (s) => s.riskScore),
  categoricalField("fingerprint", "Fingerprint", (s) => s.fingerprint),
  categoricalField("largestHoldingSymbol", "Largest Holding", (s) => s.largestHoldingSymbol),
  numericField("diversificationScore", "Diversification", (s) => s.diversificationScore),
  numericField("stablecoinExposure", "Stablecoin Allocation", (s) => s.stablecoinExposure, "%"),
  numericField("ethPct", "ETH Allocation", (s) => s.ethPct, "%"),
];

function buildField(definition: FieldDefinition, from: AnalyticsSnapshot, to: AnalyticsSnapshot): SnapshotDiffField {
  const oldValue = definition.read(from);
  const newValue = definition.read(to);
  const delta = typeof oldValue === "number" && typeof newValue === "number" ? Math.round((newValue - oldValue) * 10) / 10 : null;
  const changed = oldValue !== newValue;
  return { key: definition.key, label: definition.label, oldValue, newValue, delta, changed, summary: definition.format(oldValue, newValue, delta) };
}

/**
 * Real, stored-value-only comparison — no Analytics recalculation. `from`/
 * `to` are used LITERALLY, in the order given — see `SnapshotComparison`'s
 * own doc comment for why this doesn't auto-resolve by timestamp.
 */
export function compareSnapshots(from: AnalyticsSnapshot, to: AnalyticsSnapshot): SnapshotComparison {
  const fields = FIELD_DEFINITIONS.map((definition) => buildField(definition, from, to));
  const changedCount = fields.filter((f) => f.changed).length;
  const timeSpanDays = Math.round(((new Date(to.timestamp).getTime() - new Date(from.timestamp).getTime()) / (1000 * 60 * 60 * 24)) * 10) / 10;

  return { from, to, fields, changedCount, timeSpanDays, identical: changedCount === 0 };
}

/**
 * V4-HISTORY-003 (Phase 2) — the chronologically previous real snapshot to
 * `snapshot` within `history` (`history` assumed oldest-first, the same
 * contract `getSnapshots()` guarantees). `null` when `snapshot` is already
 * the oldest, or isn't found at all.
 */
export function findPreviousSnapshot(history: AnalyticsSnapshot[], snapshot: AnalyticsSnapshot): AnalyticsSnapshot | null {
  const index = history.findIndex((s) => s.timestamp === snapshot.timestamp);
  if (index <= 0) return null;
  return history[index - 1];
}

export function findLatestSnapshot(history: AnalyticsSnapshot[]): AnalyticsSnapshot | null {
  return history[history.length - 1] ?? null;
}

/**
 * V4-HISTORY-003 (Phase 7) — the Dashboard's compact "Last Comparison": the
 * single real field with the largest real numeric change between the two
 * most recent real snapshots (the same real comparison "vs Previous"
 * already produces — this is not a second engine, just picking the
 * headline field out of an already-real `SnapshotComparison`). `null` when
 * fewer than 2 snapshots exist, or when the two most recent are identical
 * across every numeric field — "if available" means a real, non-empty
 * comparison exists, not that something merely COULD be compared.
 */
export function buildLastComparisonHeadline(history: AnalyticsSnapshot[]): SnapshotDiffField | null {
  if (history.length < 2) return null;
  const comparison = compareSnapshots(history[history.length - 2], history[history.length - 1]);
  const changedNumeric = comparison.fields.filter((f) => f.changed && f.delta !== null);
  if (changedNumeric.length === 0) return null;
  return changedNumeric.reduce((max, field) => (Math.abs(field.delta!) > Math.abs(max.delta!) ? field : max));
}
