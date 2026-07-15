/**
 * The Whale Detection provider abstraction (PR10). PR10 ships exactly one
 * implementation — `BlockscoutWhaleProvider` (`blockscout-provider.ts`),
 * which scans large ERC-20 transfers on registry-tracked token contracts
 * via the free Blockscout API and prices them with already-fetched
 * CoinGecko data. A real whale-tracking service (Whale Alert, Arkham,
 * Nansen, Bubblemaps) is a future provider behind the same interface —
 * `index.ts`'s `getWhaleProvider()` is the seam.
 *
 * Results are never presented as more certain than the detection method
 * supports: `classification` only becomes `"whale-alert"` once `confidence`
 * crosses a threshold; everything else is the more honest
 * `"large-on-chain-transfer"`.
 */

export type WatchedToken = {
  projectId: string;
  projectName: string;
  tokenSymbol: string;
  contractAddress: string;
  /** `null` if no live price is available for this token this cycle — the token is skipped rather than guessing a USD value. */
  priceUsd: number | null;
  /** Whether this project shows another real, concurrent signal (e.g. a TVL or volume spike) in the same data batch — boosts confidence when a transfer is also detected, per the "multiple signals → higher confidence" pattern already used in `lib/intelligence/confidence.ts`. */
  hasCorroboratingSignal: boolean;
};

export type WhaleDetectionInput = {
  watchedTokens: WatchedToken[];
  /** Minimum USD value for a transfer to be reported at all. */
  usdThreshold: number;
};

export type WhaleEvent = {
  id: string;
  projectId: string;
  tokenSymbol: string;
  usdValue: number;
  txHash: string | null;
  fromAddress: string;
  timestamp: string;
  sourceProvider: string;
  /** 0-100. */
  confidence: number;
  detectionMethod: string;
  classification: "large-on-chain-transfer" | "whale-alert";
};

export interface WhaleDetectionProvider {
  detect(input: WhaleDetectionInput): Promise<WhaleEvent[]>;
}
