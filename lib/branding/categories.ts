/**
 * PR-057 — one icon + display label per `ProjectCategory`, the asset gap
 * `docs/PR-055_PROJECTS_PAGE_UX_ARCHITECTURE.md` §3 flagged as needed for
 * the Category Rail ("no per-category icon map exists in the codebase yet").
 * Follows the same "one lookup table, one reader" convention already
 * established by `CHAIN_BRANDING` (`lib/branding/chains.ts`) — never
 * hardcode a category icon inline in a component.
 *
 * Labels are hand-authored rather than derived from `formatLabel()`
 * (`components/explorer/format.ts`) because several category ids are real
 * acronyms — `formatLabel("dex")` would produce "Dex", not "DEX"; this map
 * is the one place that distinction is corrected.
 */

import {
  ArrowLeftRight,
  BarChart3,
  Bot,
  Building2,
  Coins,
  CreditCard,
  Eye,
  Fingerprint,
  Gamepad2,
  Image as ImageIcon,
  Landmark,
  type LucideIcon,
  Repeat,
  Rocket,
  Server,
  Shapes,
  ShieldCheck,
  Smile,
  Sprout,
  TrendingUp,
  Users,
  Vote,
  Wallet,
} from "lucide-react";

import type { ProjectCategory } from "@/data/projects/enums";

export type CategoryBrand = {
  label: string;
  Icon: LucideIcon;
};

export const CATEGORY_BRANDING: Record<ProjectCategory, CategoryBrand> = {
  dex: { label: "DEX", Icon: Repeat },
  lending: { label: "Lending", Icon: Landmark },
  derivatives: { label: "Derivatives", Icon: TrendingUp },
  yield: { label: "Yield", Icon: Sprout },
  stablecoin: { label: "Stablecoin", Icon: Coins },
  bridge: { label: "Bridge", Icon: ArrowLeftRight },
  infrastructure: { label: "Infrastructure", Icon: Server },
  oracle: { label: "Oracle", Icon: Eye },
  wallet: { label: "Wallet", Icon: Wallet },
  identity: { label: "Identity", Icon: Fingerprint },
  nft: { label: "NFT", Icon: ImageIcon },
  gaming: { label: "Gaming", Icon: Gamepad2 },
  social: { label: "Social", Icon: Users },
  ai: { label: "AI", Icon: Bot },
  rwa: { label: "RWA", Icon: Building2 },
  dao: { label: "DAO", Icon: Vote },
  launchpad: { label: "Launchpad", Icon: Rocket },
  analytics: { label: "Analytics", Icon: BarChart3 },
  security: { label: "Security", Icon: ShieldCheck },
  meme: { label: "Meme", Icon: Smile },
  payments: { label: "Payments", Icon: CreditCard },
  other: { label: "Other", Icon: Shapes },
};
