/**
 * Token Logo System — a static, zero-network fallback for common tickers,
 * checked before any live tier (see `lib/branding/resolveTokenLogo.ts`'s
 * doc comment for the full priority order and why this tier now runs
 * first). Address- and provider-id-based resolution still work for *any*
 * token CoinGecko tracks, not just what's listed here — this map exists to
 * guarantee a correct, instant result for the common tokens most pools
 * actually pair against (WETH, USDC, etc.), independent of CoinGecko's live
 * availability.
 *
 * Every `logoUrl` below is a real, verified CoinGecko CDN URL — confirmed
 * working by directly fetching each one during this system's development,
 * not guessed or hallucinated. Hardcoding the *URL* (not just the coin id)
 * is a deliberate reliability choice: live CoinGecko calls for this exact
 * data were repeatedly observed failing under this app's own rate-limit
 * pressure (confirmed via direct `curl` returning 429), which was
 * intermittently reverting well-known tokens back to the initials fallback
 * even though the resolution *logic* was correct — a live dependency for
 * data this stable (a token's logo essentially never changes) was the
 * wrong tradeoff. `coingeckoId` is kept alongside each entry so a future
 * live re-check (e.g. to pick up a genuine CoinGecko-side image update)
 * has a ready identifier, without making that live call load-bearing for
 * the common case.
 */
export const KNOWN_TOKEN_LOGOS: Record<string, { coingeckoId: string; logoUrl: string }> = {
  ETH: { coingeckoId: "ethereum", logoUrl: "https://coin-images.coingecko.com/coins/images/279/large/ethereum.png?1696501628" },
  WETH: { coingeckoId: "weth", logoUrl: "https://coin-images.coingecko.com/coins/images/2518/large/weth.png?1696503332" },
  BTC: { coingeckoId: "bitcoin", logoUrl: "https://coin-images.coingecko.com/coins/images/1/large/bitcoin.png?1696501400" },
  WBTC: { coingeckoId: "wrapped-bitcoin", logoUrl: "https://coin-images.coingecko.com/coins/images/7598/large/WBTCLOGO.png?1764496367" },
  CBBTC: { coingeckoId: "coinbase-wrapped-btc", logoUrl: "https://coin-images.coingecko.com/coins/images/40143/large/cbbtc.webp?1726136727" },
  USDC: { coingeckoId: "usd-coin", logoUrl: "https://coin-images.coingecko.com/coins/images/6319/large/USDC.png?1769615602" },
  USDT: { coingeckoId: "tether", logoUrl: "https://coin-images.coingecko.com/coins/images/325/large/Tether.png?1696501661" },
  DAI: { coingeckoId: "dai", logoUrl: "https://coin-images.coingecko.com/coins/images/9956/large/Badge_Dai.png?1696509996" },
  AAVE: { coingeckoId: "aave", logoUrl: "https://coin-images.coingecko.com/coins/images/12645/large/aave-token-round.png?1720472354" },
  LINK: { coingeckoId: "chainlink", logoUrl: "https://coin-images.coingecko.com/coins/images/877/large/Chainlink_Logo_500.png?1760023405" },
  UNI: { coingeckoId: "uniswap", logoUrl: "https://coin-images.coingecko.com/coins/images/12504/large/uniswap-logo.png?1720676669" },
  COMP: { coingeckoId: "compound-governance-token", logoUrl: "https://coin-images.coingecko.com/coins/images/10775/large/COMP.png?1696510737" },
  MORPHO: { coingeckoId: "morpho", logoUrl: "https://coin-images.coingecko.com/coins/images/29837/large/Morpho-token-icon.png?1726771230" },
  AERO: { coingeckoId: "aerodrome-finance", logoUrl: "https://coin-images.coingecko.com/coins/images/31745/large/token.png?1696530564" },
  CRV: { coingeckoId: "curve-dao-token", logoUrl: "https://coin-images.coingecko.com/coins/images/12124/large/Curve.png?1696511967" },
  BAL: { coingeckoId: "balancer", logoUrl: "https://coin-images.coingecko.com/coins/images/11683/large/Balancer.png?1696511572" },
  SNX: { coingeckoId: "havven", logoUrl: "https://coin-images.coingecko.com/coins/images/3406/large/SNX.png?1696504103" },
  MKR: { coingeckoId: "maker", logoUrl: "https://coin-images.coingecko.com/coins/images/1364/large/Mark_Maker.png?1696502423" },
  LDO: { coingeckoId: "lido-dao", logoUrl: "https://coin-images.coingecko.com/coins/images/13573/large/Lido_DAO.png?1696513326" },
  ARB: { coingeckoId: "arbitrum", logoUrl: "https://coin-images.coingecko.com/coins/images/16547/large/arb.jpg?1721358242" },
  OP: { coingeckoId: "optimism", logoUrl: "https://coin-images.coingecko.com/coins/images/25244/large/Token.png?1774456081" },
  MATIC: { coingeckoId: "matic-network", logoUrl: "https://coin-images.coingecko.com/coins/images/4713/large/polygon.png?1698233745" },
  PEPE: { coingeckoId: "pepe", logoUrl: "https://coin-images.coingecko.com/coins/images/29850/large/pepe-token.jpeg?1696528776" },
  SUSHI: { coingeckoId: "sushi", logoUrl: "https://coin-images.coingecko.com/coins/images/12271/large/512x512_Logo_no_chop.png?1696512101" },
};
