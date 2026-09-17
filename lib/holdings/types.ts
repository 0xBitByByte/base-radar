/**
 * V3-WALLET-002 — domain types for real, on-chain wallet holdings. Named
 * `lib/holdings/`, not `lib/portfolio/`: that name is already taken by the
 * unrelated, already-real "Portfolio Intelligence" feature (watchlist
 * analytics — `lib/portfolio/engine.ts`, `PortfolioIntelligence`,
 * `PortfolioHealth`), confirmed live during this feature's own required
 * investigation pass. Reusing the name would have meant either colliding
 * with or overwriting that feature's own `types.ts` — this directory is
 * deliberately distinct so neither feature's files are ever ambiguous about
 * which "portfolio" they mean.
 */

/** A single ERC-20 or native-ETH holding, discovered and priced. */
export type HoldingAsset = {
  /** `null` for native ETH — every ERC-20 holding has its real contract address. */
  address: string | null;
  symbol: string;
  name: string;
  /** Real official brand asset when known (Blockscout's own `icon_url`) — `null` when unknown, never a fabricated/generic substitute chosen here. */
  logo: string | null;
  /** Raw balance in the token's smallest unit, kept as a `bigint` end-to-end — see `lib/providers/base/mapper.ts`'s `mapEthBalance` for why this is never a plain `Number`. */
  balance: bigint;
  decimals: number;
  /** Decimal-adjusted, human-readable balance (via viem's `formatUnits`), e.g. `"1.2345"`. */
  formattedBalance: string;
  /** Real USD price for one unit of this token — `null` when genuinely unknown (never fabricated; see `pricing.ts`). */
  usdPrice: number | null;
  /** `balance-adjusted × usdPrice` — `null` whenever `usdPrice` is `null`, never computed against a guessed price. */
  usdValue: number | null;
  /** This asset's share of the wallet's total known USD value, 0-100 — `null` when `usdValue` is `null`, or when the wallet's total known value is 0 (nothing to allocate against). */
  allocationPct: number | null;
  chain: "base" | "base-sepolia";
  /**
   * Whether Blockscout has this ERC-20 contract verified. Deliberately
   * `boolean | null`, not a plain `boolean`: Blockscout's per-address
   * token-balances endpoint (the actual discovery call) doesn't return
   * this — getting a real answer means a separate `/smart-contracts/
   * {address}` call per holding (`blockscout.getContractDetail`, already
   * used elsewhere in this app), which would be a genuine N+1 request
   * pattern against a wallet that might hold dozens of tokens. Scoped out
   * deliberately (see the V3-WALLET-002 report) rather than either paying
   * that cost or fabricating `false` for something honestly unknown —
   * `null` here means "not checked," never "confirmed unverified."
   * Native ETH is always `null` — the concept doesn't apply to it.
   */
  verified: boolean | null;
  tokenType: "native" | "erc20";
};

export type Holdings = {
  address: string;
  chainId: number;
  assets: HoldingAsset[];
  /** Sum of every asset's real `usdValue` (assets with an unknown price are simply excluded from this sum, never treated as $0). */
  totalUsdValue: number;
  fetchedAt: string;
  /**
   * True when at least one real data source (balance discovery or pricing)
   * failed for this fetch, so what's shown may be missing assets or prices
   * — the honest signal `usePortfolio`'s consumers use to render "some data
   * couldn't be loaded" rather than silently presenting a partial result as
   * complete. Never true because of an empty-but-successful wallet.
   */
  partial: boolean;
};

/**
 * LP and staking-position discovery are explicitly NOT supported by this
 * feature's current data sources (Blockscout's token-balances endpoint
 * reports plain ERC-20 holdings only — an LP position is itself an ERC-20
 * token, so its balance *is* discovered, but this app has no logic to
 * recognize a given token as a specific pool's LP share, decompose it into
 * underlying assets, or classify it as "staked"). Rather than invent fake
 * support, every discovered LP/staking-shaped token is simply reported as a
 * regular ERC-20 holding — its balance, symbol, and price (if known) are
 * real; what's missing is only the additional classification. See the
 * V3-WALLET-002 report for the honest, explicit statement of this gap.
 */
export type UnsupportedPositionKind = "lp" | "staking";
