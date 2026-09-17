import type { Project } from "@/data/projects/types";

/**
 * Trading Discovery Strategy — the one centralized decision for "how does
 * this project's trading pool data get found," replacing what used to be
 * three separate, independently-hardcoded assumptions
 * (`lib/intelligence/sources.ts`'s `matchTrading`, the dedicated Pools
 * page, and the Project Profile page's own `richerPairsResult` fetch) that
 * all assumed the same thing: every project owns a single Base token
 * contract, and pool discovery means looking up pairs for that address.
 *
 * That assumption is correct for asset-type projects (a lending market's
 * governance token, a stablecoin, a liquid-staking token) but structurally
 * wrong for a DEX: Uniswap's real Base-native product is the pools it
 * *hosts*, not a token — UNI itself has no Base deployment at all
 * (confirmed live against CoinGecko's own platform listing), yet Uniswap
 * has hundreds of real, active Base pools trading other projects' tokens.
 * The old assumption made every DEX-category project registered without
 * its own Base token — Uniswap, Balancer — show "no pools" unconditionally,
 * regardless of real on-chain activity.
 *
 * `resolveTradingDiscoveryStrategies` is a pure function of a project's
 * `categories`, `contracts`, and `providerIds` — never its `id`/`slug`.
 * There is no `if (project.slug === "uniswap")` anywhere in this file or
 * any of its consumers; a new DEX project is automatically routed to the
 * `"dex"` strategy the moment its registry entry sets `categories` to
 * include `"dex"` and configures `providerIds.dexscreenerDexIds`, with the
 * exact same code path Uniswap and Aerodrome use.
 */
export type TradingDiscoveryStrategy =
  | {
      /** Discover via the project's own Base token contract address — the pre-existing, still-correct mechanism for any project whose real Base footprint IS a single tradeable token (lending governance tokens, stablecoins, liquid-staking tokens, etc.). */
      kind: "token";
      tokenAddress: string;
    }
  | {
      /** Discover via DexScreener `dexId` membership — every pool whose pair.dexId matches one of this project's own exchange identities, regardless of which tokens trade on it. The correct strategy for any DEX: its pools are the product, not a single governance token. */
      kind: "dex";
      dexIds: string[];
    }
  | {
      /** Recognized as a real, distinct discovery need — bridge relay/liquidity activity is not the same shape as an AMM pool — but no bridge-activity provider is integrated in this codebase today. Kept distinct from `not_applicable` so a future bridge-data integration has a real slot to fill, instead of being silently indistinguishable from "this category never has pools." */
      kind: "bridge_unimplemented";
    }
  | {
      /** Pool discovery does not apply to this project: no Base token contract exists for it, it isn't a DEX with a configured exchange identity, and its category has no real "pools" concept (identity, oracle, wallet, social infrastructure, etc.). `reason` is shown verbatim in the UI so an empty state always explains itself. */
      kind: "not_applicable";
      reason: string;
    };

/** Categories with no real "this project has pools" concept once token and dex signals are ruled out — a wallet, an oracle feed, or a naming registry isn't a tradeable asset or an exchange. */
const NO_POOL_CONCEPT_REASON: Partial<Record<Project["categories"][number], string>> = {
  oracle: "Oracle projects publish price feeds; they don't have their own tradeable Base pools.",
  identity: "Identity/naming projects have no tradeable Base token or exchange of their own.",
  wallet: "Wallet infrastructure isn't a tradeable asset or an exchange.",
  security: "Security infrastructure isn't a tradeable asset or an exchange.",
  social: "Social protocols don't have a tradeable Base token or exchange unless one is separately configured.",
  infrastructure: "Infrastructure projects don't have pools unless they also have a real Base token (checked above).",
};

/**
 * Returns an ordered list of strategies to try, not a single verdict —
 * necessary because a project can genuinely satisfy more than one signal
 * (Aerodrome and Curve are both real DEXes *and* have their own real Base
 * governance token). `"dex"` is tried first when configured, since it's
 * the more complete answer for a DEX ("every pool this exchange hosts," not
 * just pairs where its own token is one leg) — but DexScreener's trending-
 * only search can legitimately return zero for a real, correctly-
 * configured dexId (confirmed live: Curve's own "curve" dexId found no
 * currently-trending Base pairs during this audit, even though its CRV
 * token has real ones via other exchanges). A consumer tries each entry in
 * order and falls through to the next on an empty result — never on a
 * fetch failure, which is reported as-is from whichever entry produced it.
 * A project with only one applicable signal gets a single-entry list.
 */
export function resolveTradingDiscoveryStrategies(project: Project): TradingDiscoveryStrategy[] {
  const strategies: TradingDiscoveryStrategy[] = [];

  const isDex = project.categories.includes("dex");
  const dexIds = project.providerIds.dexscreenerDexIds;
  if (isDex && dexIds && dexIds.length > 0) {
    strategies.push({ kind: "dex", dexIds });
  }

  const tokenContract = project.contracts.find((c) => c.chain === "base" && c.type === "token");
  if (tokenContract) {
    strategies.push({ kind: "token", tokenAddress: tokenContract.address });
  }

  if (strategies.length > 0) return strategies;

  if (project.categories.includes("bridge")) {
    return [{ kind: "bridge_unimplemented" }];
  }

  const noPoolCategory = project.categories.find((c) => NO_POOL_CONCEPT_REASON[c]);
  if (noPoolCategory) {
    return [{ kind: "not_applicable", reason: NO_POOL_CONCEPT_REASON[noPoolCategory]! }];
  }

  if (isDex) {
    return [{ kind: "not_applicable", reason: "This DEX has no dexId configured yet — pool discovery isn't wired up for it." }];
  }

  return [{ kind: "not_applicable", reason: "No Base token contract is registered for this project." }];
}
