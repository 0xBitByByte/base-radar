import type { Project } from "@/data/projects/types";
import { acrossProtocol } from "./across-protocol";
import { aerodromeFinance } from "./aerodrome-finance";
import { aave } from "./aave";
import { balancer } from "./balancer";
import { basenames } from "./basenames";
import { clanker } from "./clanker";
import { compound } from "./compound";
import { curveFinance } from "./curve-finance";
import { extraFinance } from "./extra-finance";
import { farcaster } from "./farcaster";
import { layerZero } from "./layerzero";
import { moonwell } from "./moonwell";
import { morpho } from "./morpho";
import { pythNetwork } from "./pyth-network";
import { safe } from "./safe";
import { seamlessProtocol } from "./seamless-protocol";
import { uniswap } from "./uniswap";
import { usdCoin } from "./usd-coin";
import { virtualsProtocol } from "./virtuals-protocol";
import { zora } from "./zora";

export const SEED_PROJECTS: Project[] = [
  aerodromeFinance,
  uniswap,
  aave,
  compound,
  moonwell,
  morpho,
  extraFinance,
  seamlessProtocol,
  curveFinance,
  balancer,
  zora,
  farcaster,
  virtualsProtocol,
  clanker,
  basenames,
  safe,
  layerZero,
  acrossProtocol,
  pythNetwork,
  usdCoin,
];
