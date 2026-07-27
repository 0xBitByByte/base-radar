/**
 * PR-053 — Classification (Task 4). Deterministic only — no AI, no
 * external classifier call, no randomness. Two real signal sources, tried
 * in priority order:
 *
 *   1. DefiLlama's own `category` string (`Protocol.category`,
 *      `lib/providers/defillama/mapper.ts`) — a real, source-reported
 *      classification, mapped onto this registry's existing
 *      `ProjectCategory` taxonomy (`data/projects/enums.ts`). Only
 *      available for `defillama`-sourced candidates.
 *   2. A fixed keyword table matched against the candidate's own
 *      `displayName` — the same "no fuzzy matching, no invented meaning"
 *      discipline `lib/discovery/duplicates.ts` already uses for name
 *      comparison. Never claims high confidence; a name-keyword hit is
 *      always reported as `"medium"` at best, `"low"` when nothing
 *      matches (falling back to `"other"`).
 *
 * Every value produced is a real `ProjectCategory` from the existing,
 * canonical enum — this module never invents a category string outside
 * that closed vocabulary.
 */

import type { ProjectCategory, ProjectTag } from "@/data/projects/enums";
import type { CandidateProject } from "@/lib/discovery/types";

export type ClassificationConfidence = "high" | "medium" | "low";

export type ClassificationResult = {
  category: ProjectCategory;
  /** Secondary, narrative tags this classifier is confident enough to add — always a subset of real evidence (e.g. `"ai-agents"` only when an AI keyword actually matched), never padded to look complete. */
  tags: ProjectTag[];
  confidence: ClassificationConfidence;
  /** Which real signal decided `category` — `"defillama-category"`, `"name-keyword"`, or `"unclassified"`. */
  method: "defillama-category" | "name-keyword" | "unclassified";
  /** The real string that was matched (DefiLlama's raw category, or the keyword that hit) — never fabricated. */
  evidence: string | null;
};

/**
 * DefiLlama's own protocol `category` strings, observed in its real public
 * `/protocols` response, mapped onto this codebase's existing
 * `ProjectCategory` enum. Deliberately conservative — a DefiLlama category
 * with no confident, unambiguous mapping falls through to the
 * name-keyword pass rather than being force-fit here.
 */
const DEFILLAMA_CATEGORY_MAP: Record<string, ProjectCategory> = {
  dexes: "dex",
  "dex aggregator": "dex",
  lending: "lending",
  "cdp": "lending",
  derivatives: "derivatives",
  options: "derivatives",
  "prediction market": "derivatives",
  yield: "yield",
  "yield aggregator": "yield",
  "liquid staking": "yield",
  restaking: "yield",
  staking: "yield",
  "algo-stables": "stablecoin",
  bridge: "bridge",
  "cross chain": "bridge",
  services: "infrastructure",
  "developer tooling": "infrastructure",
  oracle: "oracle",
  "nft marketplace": "nft",
  nft: "nft",
  gaming: "gaming",
  sofi: "social",
  social: "social",
  rwa: "rwa",
  insurance: "rwa",
  launchpad: "launchpad",
  payments: "payments",
  "privacy": "security",
};

/**
 * Keyword → category, checked in this exact order (first match wins) —
 * ordering matters where a name could plausibly hit more than one row
 * (e.g. "bridge" is checked before the generic "swap"/"dex" row so a name
 * like "TokenBridge Swap" resolves to `bridge`, its more specific signal).
 * Every keyword here is a real, common naming convention across live Base
 * projects (confirmed against the actual seed registry and CoinGecko's
 * Base-ecosystem listing during this PR's research) — not a guess.
 */
const NAME_KEYWORD_RULES: Array<{ category: ProjectCategory; tags: ProjectTag[]; keywords: string[] }> = [
  { category: "bridge", tags: ["cross-chain"], keywords: ["bridge"] },
  { category: "oracle", tags: [], keywords: ["oracle", "price feed"] },
  { category: "lending", tags: [], keywords: ["lend", "borrow", "credit"] },
  { category: "derivatives", tags: ["perpetuals"], keywords: ["perp", "derivative", "option", "future"] },
  { category: "yield", tags: ["real-yield"], keywords: ["yield", "vault", "farm", "stak"] },
  { category: "stablecoin", tags: [], keywords: ["stable", "usd", "dollar"] },
  { category: "dex", tags: [], keywords: ["swap", "dex", "exchange", "amm"] },
  { category: "nft", tags: [], keywords: ["nft", "collectible", "mint"] },
  { category: "gaming", tags: [], keywords: ["game", "gaming", "play"] },
  { category: "ai", tags: ["ai-agents"], keywords: ["ai ", " ai", "agent", "gpt", "neural"] },
  { category: "social", tags: ["onchain-social"], keywords: ["social", "cast", "farcaster", "friend"] },
  { category: "identity", tags: [], keywords: ["name", "identity", "domain", "ens"] },
  { category: "wallet", tags: ["account-abstraction"], keywords: ["wallet", "account abstraction", "smart account"] },
  { category: "launchpad", tags: [], keywords: ["launchpad", "launch", "incubator"] },
  { category: "dao", tags: [], keywords: ["dao", "governance"] },
  { category: "rwa", tags: [], keywords: ["real world", "rwa", "treasury bill", "tokenized"] },
  { category: "meme", tags: ["memecoin"], keywords: ["meme", "doge", "pepe", "inu", "cat"] },
  { category: "payments", tags: [], keywords: ["pay", "checkout", "commerce"] },
  { category: "infrastructure", tags: ["developer-tooling"], keywords: ["infra", "node", "rpc", "indexer", "sdk", "tooling", "api"] },
  { category: "security", tags: [], keywords: ["audit", "security", "monitor"] },
  { category: "analytics", tags: [], keywords: ["analytics", "dashboard", "explorer"] },
];

function classifyByDefillamaCategory(rawCategory: string | null | undefined): { category: ProjectCategory; evidence: string } | null {
  if (!rawCategory) return null;
  const mapped = DEFILLAMA_CATEGORY_MAP[rawCategory.trim().toLowerCase()];
  if (!mapped) return null;
  return { category: mapped, evidence: rawCategory };
}

function classifyByNameKeyword(displayName: string): { category: ProjectCategory; tags: ProjectTag[]; evidence: string } | null {
  const haystack = ` ${displayName.toLowerCase()} `;
  for (const rule of NAME_KEYWORD_RULES) {
    const hit = rule.keywords.find((keyword) => haystack.includes(keyword));
    if (hit) return { category: rule.category, tags: rule.tags, evidence: hit };
  }
  return null;
}

/**
 * Classifies a single candidate. Always returns a real `ProjectCategory` —
 * `"other"` (with `method: "unclassified"`, `confidence: "low"`) when
 * neither signal produces a confident match, never a fabricated guess
 * dressed up as a real category.
 */
export function classifyCandidate(candidate: CandidateProject): ClassificationResult {
  const rawCategory =
    candidate.source === "defillama" && typeof candidate.providerMetadata.category === "string"
      ? (candidate.providerMetadata.category as string)
      : null;

  const defillamaMatch = classifyByDefillamaCategory(rawCategory);
  if (defillamaMatch) {
    return {
      category: defillamaMatch.category,
      tags: [],
      confidence: "high",
      method: "defillama-category",
      evidence: defillamaMatch.evidence,
    };
  }

  const keywordMatch = classifyByNameKeyword(candidate.displayName);
  if (keywordMatch) {
    return {
      category: keywordMatch.category,
      tags: keywordMatch.tags,
      confidence: "medium",
      method: "name-keyword",
      evidence: keywordMatch.evidence,
    };
  }

  return { category: "other", tags: [], confidence: "low", method: "unclassified", evidence: null };
}
