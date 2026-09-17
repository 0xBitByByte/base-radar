/**
 * PR-092.06 (Export & Sharing) — a real CSV of the connected wallet's
 * current holdings, one row per real `HoldingAsset`. Distinct from
 * `lib/report-export/csv.ts` (the Historical Report's own CSV, built from
 * persisted snapshots over a period) — this is the CURRENT, unsummarized
 * holdings list, the same fields `WalletPortfolioPage.tsx`'s own holdings
 * `<ul>` already renders. No field is recomputed; `usdValue`/`allocationPct`
 * are exported as an honest empty cell (never `"0"`) when genuinely
 * unknown, matching `HoldingAsset`'s own `null`-means-unknown convention.
 */

import { exportFilenameStamp } from "@/lib/export/markdown";
import type { HoldingAsset } from "@/lib/holdings/types";

/** Same deterministic-filename convention `buildHistoricalReportFilename()` already uses — same real moment in, same name out, never a random suffix. */
export function buildHoldingsCsvFilename(generatedAt: string = new Date().toISOString()): string {
  return `base-radar-wallet-holdings-${exportFilenameStamp(generatedAt)}.csv`;
}

const HEADER = ["Symbol", "Name", "Balance", "Address", "Chain", "USD Price", "USD Value", "Allocation %", "Verified"];

function csvField(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

export function buildHoldingsCsv(assets: HoldingAsset[], generatedAt: string = new Date().toISOString()): string {
  const lines: string[] = [HEADER.map(csvField).join(",")];
  for (const asset of assets) {
    lines.push(
      [
        asset.symbol,
        asset.name,
        asset.formattedBalance,
        asset.address ?? "Native ETH",
        asset.chain,
        asset.usdPrice !== null ? String(asset.usdPrice) : "",
        asset.usdValue !== null ? String(asset.usdValue) : "",
        asset.allocationPct !== null ? asset.allocationPct.toFixed(2) : "",
        asset.verified === null ? "Not checked" : asset.verified ? "Yes" : "No",
      ]
        .map(csvField)
        .join(",")
    );
  }
  return [`# Base Radar — Wallet Holdings — Generated ${generatedAt}`, ...lines].join("\r\n") + "\r\n";
}
