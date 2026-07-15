import * as blockscout from "@/lib/providers/blockscout/service";
import type { WatchedToken, WhaleDetectionInput, WhaleDetectionProvider, WhaleEvent } from "@/lib/whale/types";

/** Confidence (0-100) at or above which a transfer is labeled "Whale Alert" instead of the more conservative "Large On-chain Transfer". */
const WHALE_ALERT_CONFIDENCE_THRESHOLD = 70;
/** How many of a token's most recent transfers to consider per detection pass. */
const MAX_TRANSFERS_PER_TOKEN = 10;

/**
 * Base confidence scales with how far above the USD threshold a transfer
 * is (logarithmically, so a 100x-over-threshold transfer doesn't hit 100
 * on its own) — real corroboration from another concurrent signal (TVL/
 * volume spike on the same project) adds the rest.
 */
function computeConfidence(usdValue: number, usdThreshold: number, hasCorroboratingSignal: boolean): number {
  const ratio = Math.max(usdValue / usdThreshold, 1);
  const base = Math.min(70, Math.round(30 + Math.log2(ratio) * 15));
  const corroborationBonus = hasCorroboratingSignal ? 20 : 0;
  return Math.min(100, base + corroborationBonus);
}

export class BlockscoutWhaleProvider implements WhaleDetectionProvider {
  async detect(input: WhaleDetectionInput): Promise<WhaleEvent[]> {
    const results = await Promise.allSettled(
      input.watchedTokens.map((token) => this.detectForToken(token, input.usdThreshold))
    );
    return results.flatMap((result) => (result.status === "fulfilled" ? result.value : []));
  }

  private async detectForToken(token: WatchedToken, usdThreshold: number): Promise<WhaleEvent[]> {
    if (token.priceUsd === null) return [];

    const result = await blockscout.getTokenTransfers(token.contractAddress);
    if (!result.ok) return [];

    const events: WhaleEvent[] = [];
    for (const transfer of result.data.slice(0, MAX_TRANSFERS_PER_TOKEN)) {
      const usdValue = transfer.amount * token.priceUsd;
      if (usdValue < usdThreshold) continue;

      const confidence = computeConfidence(usdValue, usdThreshold, token.hasCorroboratingSignal);

      events.push({
        id: `${token.contractAddress}-${transfer.txHash}`,
        projectId: token.projectId,
        tokenSymbol: token.tokenSymbol,
        usdValue,
        txHash: transfer.txHash,
        fromAddress: transfer.from,
        timestamp: transfer.timestamp ?? new Date().toISOString(),
        sourceProvider: "blockscout",
        confidence,
        detectionMethod: "erc20-transfer-threshold",
        classification: confidence >= WHALE_ALERT_CONFIDENCE_THRESHOLD ? "whale-alert" : "large-on-chain-transfer",
      });
    }

    return events;
  }
}
