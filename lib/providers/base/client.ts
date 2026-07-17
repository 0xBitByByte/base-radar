/**
 * Base mainnet public JSON-RPC endpoint — free, no key required.
 * https://docs.base.org/base-chain/tools/node-providers
 */

import { ProviderError } from "@/lib/providers/common/errors";
import { fetchJson } from "@/lib/providers/common/utilities";

const RPC_URL = "https://mainnet.base.org";

export type RawRpcBlock = {
  number: string;
  transactions: unknown[];
  timestamp: string;
};

type RpcEnvelope<T> = {
  result?: T;
  error?: { message: string };
};

async function rpcCall<T>(method: string, params: unknown[] = []): Promise<T> {
  const envelope = await fetchJson<RpcEnvelope<T>>("base", RPC_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });

  if (envelope.error) {
    throw new ProviderError("base", "http_error", envelope.error.message);
  }
  if (envelope.result === undefined) {
    throw new ProviderError("base", "parse_error", `Base RPC returned no result for ${method}`);
  }
  return envelope.result;
}

export async function fetchGasPriceHex(): Promise<string> {
  return rpcCall<string>("eth_gasPrice");
}

export async function fetchLatestBlock(): Promise<RawRpcBlock> {
  return rpcCall<RawRpcBlock>("eth_getBlockByNumber", ["latest", true]);
}

export async function fetchChainIdHex(): Promise<string> {
  return rpcCall<string>("eth_chainId");
}

/**
 * PR13.7 Goal 14 — the "safe" block tag is a real, standard Ethereum
 * JSON-RPC concept (the most recent block the network considers safe from
 * reorg), the same free Base RPC endpoint this provider already calls.
 * `false` for the second param — only the block number is needed, not full
 * transaction objects.
 */
export type RawRpcBlockNumber = { number: string };

export async function fetchSafeBlock(): Promise<RawRpcBlockNumber> {
  return rpcCall<RawRpcBlockNumber>("eth_getBlockByNumber", ["safe", false]);
}
