/**
 * Base mainnet public JSON-RPC endpoint — free, no key required.
 * https://docs.base.org/base-chain/tools/node-providers
 */

const RPC_URL = "https://mainnet.base.org";
const REVALIDATE_SECONDS = 20;

type RpcBlock = {
  number: string;
  transactions: unknown[];
  timestamp: string;
};

async function rpcCall<T>(method: string, params: unknown[] = []): Promise<T> {
  const res = await fetch(RPC_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    next: { revalidate: REVALIDATE_SECONDS },
  });
  if (!res.ok) throw new Error(`Base RPC request failed: ${res.status}`);
  const json = (await res.json()) as { result?: T; error?: { message: string } };
  if (json.error) throw new Error(json.error.message);
  if (json.result === undefined) throw new Error("Base RPC returned no result");
  return json.result;
}

export async function getBaseNetworkStatus(): Promise<{
  gasGwei: number;
  blockHeight: number;
  txCountLatestBlock: number;
  estimatedTps: number;
  chainId: number;
} | null> {
  try {
    const [gasPriceHex, latestBlock, chainIdHex] = await Promise.all([
      rpcCall<string>("eth_gasPrice"),
      rpcCall<RpcBlock>("eth_getBlockByNumber", ["latest", true]),
      rpcCall<string>("eth_chainId"),
    ]);

    const gasWei = Number(BigInt(gasPriceHex));
    const gasGwei = gasWei / 1e9;
    const blockHeight = Number(BigInt(latestBlock.number));
    const txCountLatestBlock = latestBlock.transactions.length;
    // Base targets ~2s block times; used only to derive a rough live TPS estimate.
    const estimatedTps = Math.round((txCountLatestBlock / 2) * 10) / 10;
    const chainId = Number(BigInt(chainIdHex));

    return { gasGwei, blockHeight, txCountLatestBlock, estimatedTps, chainId };
  } catch {
    return null;
  }
}
