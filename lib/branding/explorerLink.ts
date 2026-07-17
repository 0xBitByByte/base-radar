import { CHAIN_BRANDING } from "@/lib/branding/chains";
import type { ChainInfo, Contracts, Identity } from "@/lib/intelligence/types";

export type ExplorerLinkTier = "contract" | "token" | "website" | "explorer-home";

export type ExplorerLink = {
  href: string;
  tier: ExplorerLinkTier;
  /** One sentence describing exactly where the link goes — used as both the tooltip content and the accessible label (PR11.3 Part 1/3). */
  description: string;
  /** The explorer service's real display name (e.g. "BaseScan", not "Base") — `null` only when the primary chain has no `CHAIN_BRANDING` entry at all. Exposed so callers can label a short "View on {serviceName}" pill without re-deriving the chain→explorer-name mapping themselves. */
  serviceName: string | null;
};

/**
 * The real display name of a chain's block explorer service, distinct from
 * the chain's own brand `label` (e.g. Base's explorer is "BaseScan", not
 * "Base"). Only chains with a genuinely different explorer brand need an
 * entry — anything absent falls back to `${label} Explorer`.
 */
const EXPLORER_SERVICE_NAME: Partial<Record<string, string>> = {
  base: "BaseScan",
  ethereum: "Etherscan",
  arbitrum: "Arbiscan",
  optimism: "Optimistic Etherscan",
  polygon: "PolygonScan",
  avalanche: "SnowTrace",
  bnb: "BscScan",
};

/**
 * Project Profile's "Explorer" action (PR11.3 Part 1/2) — previously always
 * linked to `CHAIN_BRANDING[chain.primaryChain].explorerUrl` (the bare
 * homepage), which told a researcher nothing. Reuses only registry data
 * this codebase already has (`CHAIN_BRANDING`'s per-chain `explorerUrl`,
 * the project's own `Contracts`/`Identity`) — no new provider, no new API.
 *
 * Priority, always scoped to the project's primary chain so the link never
 * silently jumps to a different network than the one the page is showing:
 *   1. A verified contract on the primary chain → its `/address/{addr}` page.
 *   2. A `token`-typed contract on the primary chain (verified or not) →
 *      its `/token/{addr}` page.
 *   3. The project's own website (every registry project has one).
 *   4. The bare explorer homepage — reachable only if the chain has no
 *      registered explorer-having brand entry falls through earlier, or
 *      defensively if a future project record ever ships without a website.
 * Returns `null` only when the primary chain isn't in `CHAIN_BRANDING` at
 * all and the project also has no website — not reachable with today's
 * registry data (`Identity.websiteUrl` is a required field), kept for type
 * safety rather than an assumption the caller should rely on.
 */
export function getExplorerLink(chain: ChainInfo, contracts: Contracts, identity: Identity): ExplorerLink | null {
  const brand = CHAIN_BRANDING[chain.primaryChain];
  const explorerName = brand ? (EXPLORER_SERVICE_NAME[brand.id] ?? `${brand.label} Explorer`) : null;

  if (brand?.explorerUrl) {
    const contractsOnChain = contracts.items.filter((item) => item.chain === chain.primaryChain);

    const verifiedContract = contractsOnChain.find((item) => item.verified === true);
    if (verifiedContract) {
      return {
        href: `${brand.explorerUrl}/address/${verifiedContract.address}`,
        tier: "contract",
        description: `View verified contract on ${explorerName}`,
        serviceName: explorerName,
      };
    }

    const tokenContract = contractsOnChain.find((item) => item.type === "token");
    if (tokenContract) {
      return {
        href: `${brand.explorerUrl}/token/${tokenContract.address}`,
        tier: "token",
        description: `View token contract on ${explorerName}`,
        serviceName: explorerName,
      };
    }
  }

  if (identity.websiteUrl) {
    return { href: identity.websiteUrl, tier: "website", description: "Open project website", serviceName: explorerName };
  }

  if (brand?.explorerUrl) {
    return { href: brand.explorerUrl, tier: "explorer-home", description: `Open ${explorerName} homepage`, serviceName: explorerName };
  }

  return null;
}
