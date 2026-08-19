/** Pure helpers for the Contract Intelligence section. No JSX, no I/O. */

import { CONTRACT_TYPES, type Chain, type ContractType } from "@/data/projects/enums";
import { formatLabel } from "@/components/explorer/format";
import type { GlowBadgeColor } from "@/components/ui/GlowBadge";
import type { ContractInfo } from "@/lib/intelligence/types";
import type { ContractDetail } from "@/lib/providers/blockscout/service";

/**
 * PR-084.03 — one card per registered contract, combining the registry's own
 * `ContractInfo` (type/label, plus a weak chain-wide `verified` fallback)
 * with the precise per-address Blockscout `ContractDetail` when it resolves
 * — the same combination `ContractsList.tsx` already does inline per row
 * (`detail ? detail.verified : contract.verified === true`), now formalized
 * into one reusable builder so the Curation Engine and the card renderer
 * agree on exactly one shape.
 */
export type ContractCard = {
  chain: Chain;
  address: string;
  type: ContractType;
  label: string | null;
  /** Registry-level fallback signal — `null` means unknown/not checked. */
  verified: boolean | null;
  /** Precise per-address Blockscout signal; `null` while unresolved or unavailable. */
  detail: ContractDetail | null;
};

export function buildContractCard(contract: ContractInfo, detail: ContractDetail | null): ContractCard {
  return {
    chain: contract.chain,
    address: contract.address,
    type: contract.type,
    label: contract.label,
    verified: contract.verified,
    detail,
  };
}

export type ContractVerificationLabel = "Verified" | "Not Verified" | "Unknown";

export type ContractVerificationStatus = { label: ContractVerificationLabel; color: GlowBadgeColor };

/**
 * The single place verification status is computed — used by both category
 * filtering (`getContractsForCategory`) and card badges, exactly like
 * `getPoolStatus`'s role in the Pool Curation Engine. `detail.verified` (a
 * real, non-nullable boolean once Blockscout resolves) always wins over the
 * registry's own weaker `verified: boolean | null` fallback.
 */
export function getContractVerificationStatus(card: ContractCard): ContractVerificationStatus {
  const verified = card.detail ? card.detail.verified : card.verified;
  if (verified === true) return { label: "Verified", color: "success" };
  if (verified === false) return { label: "Not Verified", color: "warning" };
  return { label: "Unknown", color: "muted" };
}

/**
 * PR-084.03 — Base Radar's own read, not a Blockscout fact: a contract is
 * Upgradeable when Blockscout's own `proxyType` classification confirms a
 * live implementation target, or the registry itself labels it `"proxy"`.
 * Both are real, already-fetched signals — no new field, no inference.
 */
export function isUpgradeable(card: ContractCard): boolean {
  return card.detail?.proxyType != null || card.type === "proxy";
}

/**
 * PR-084.03 — Base Radar's own read: a contract needs a closer look when
 * it isn't verified, or when the registry says "proxy" but Blockscout can't
 * confirm an implementation — the exact same caveat `ContractsList.tsx`
 * already renders inline (`contract.type === "proxy" && !detail?.proxyType`),
 * now formalized as one reusable rule instead of a second, drifting copy.
 */
export function needsAttention(card: ContractCard): boolean {
  if (getContractVerificationStatus(card).label !== "Verified") return true;
  if (card.type === "proxy" && card.detail?.proxyType == null) return true;
  return false;
}

// ---------------------------------------------------------------------------
// Contract Curation Engine (PR-084.03)
//
// Mirrors the Pool Curation Engine's exact shape and role (see
// `pairIntelligenceHelpers.ts`'s own header comment). One category per real
// `ContractType` value — generated from `CONTRACT_TYPES`, never hand-
// duplicated, so it stays in sync automatically as the registry's schema
// grows — plus three BaseRadar-derived categories and an "All Contracts"
// catch-all. Every real project registered today only uses `type: "token"`
// (verified via the full seed-data audit during planning), so most of these
// categories are honestly empty right now — `ContractCategoryTabs` is
// responsible for hiding empty ones, this engine's job is only to define
// every category correctly, not to guess which ones matter today.
// ---------------------------------------------------------------------------

export type ContractCategoryId = ContractType | "verified" | "upgradeable" | "attention-required" | "all";

export type ContractCategoryDefinition = {
  id: ContractCategoryId;
  emoji: string;
  label: string;
  /** The one sentence rendered as this category's "why is this contract here" tooltip. */
  description: string;
  apply: (cards: ContractCard[]) => ContractCard[];
};

const CONTRACT_TYPE_EMOJI: Record<ContractType, string> = {
  token: "🪙",
  router: "🔀",
  factory: "🏭",
  pool: "💧",
  vault: "🔒",
  staking: "🥩",
  governance: "🏛",
  proxy: "🔁",
  bridge: "🌉",
  other: "📦",
};

const typeCategories: ContractCategoryDefinition[] = CONTRACT_TYPES.map((type) => ({
  id: type,
  emoji: CONTRACT_TYPE_EMOJI[type],
  label: formatLabel(type),
  description: `Contracts registered as "${formatLabel(type)}" in the Base Radar registry.`,
  apply: (cards) => cards.filter((card) => card.type === type),
}));

const derivedCategories: ContractCategoryDefinition[] = [
  {
    id: "verified",
    emoji: "🔐",
    label: "Verified",
    description: "Base Radar Intelligence: contracts with confirmed verified source code on Blockscout.",
    apply: (cards) => cards.filter((card) => getContractVerificationStatus(card).label === "Verified"),
  },
  {
    id: "upgradeable",
    emoji: "⚙️",
    label: "Upgradeable",
    description: "Base Radar Intelligence: registered as a proxy, or confirmed by Blockscout to have a live implementation target — behavior can change without a new deployment.",
    apply: (cards) => cards.filter(isUpgradeable),
  },
  {
    id: "attention-required",
    emoji: "⚠️",
    label: "Attention Required",
    description: "Base Radar Intelligence: not verified, or registered as a proxy without a confirmed implementation — worth a closer look before interacting.",
    apply: (cards) => cards.filter(needsAttention),
  },
];

const allCategory: ContractCategoryDefinition = {
  id: "all",
  emoji: "📋",
  label: "All Contracts",
  description: "Every contract Base Radar has registered for this project.",
  apply: (cards) => cards,
};

export const CONTRACT_CATEGORIES: ContractCategoryDefinition[] = [...typeCategories, ...derivedCategories, allCategory];

const CONTRACT_CATEGORY_BY_ID = new Map(CONTRACT_CATEGORIES.map((category) => [category.id, category]));

export function getContractsForCategory(cards: ContractCard[], categoryId: ContractCategoryId): ContractCard[] {
  return (CONTRACT_CATEGORY_BY_ID.get(categoryId) ?? CONTRACT_CATEGORY_BY_ID.get("all"))!.apply(cards);
}
