/**
 * Icon/color display metadata for the Personalization Layer — the one
 * place a `WatchlistIconKey`/`WatchlistColorKey` maps to a real
 * `lucide-react` icon or Tailwind color class, the same
 * `components/notifications/meta.ts` convention. `lib/personalization/`
 * itself stays framework-agnostic; only this UI-layer file knows about
 * React components or Tailwind classes.
 */

import {
  Coins,
  Flame,
  Folder,
  Gamepad2,
  Layers,
  Rocket,
  Server,
  Shield,
  Sparkles,
  Star,
  type LucideIcon,
} from "lucide-react";

import type { WatchlistColorKey, WatchlistIconKey } from "@/lib/personalization/types";

export const WATCHLIST_ICON_COMPONENTS: Record<WatchlistIconKey, LucideIcon> = {
  star: Star,
  sparkles: Sparkles,
  layers: Layers,
  server: Server,
  gamepad: Gamepad2,
  coins: Coins,
  folder: Folder,
  rocket: Rocket,
  shield: Shield,
  flame: Flame,
};

export const WATCHLIST_ICON_LABELS: Record<WatchlistIconKey, string> = {
  star: "Star",
  sparkles: "Sparkles",
  layers: "Layers",
  server: "Server",
  gamepad: "Gamepad",
  coins: "Coins",
  folder: "Folder",
  rocket: "Rocket",
  shield: "Shield",
  flame: "Flame",
};

type ColorClasses = { text: string; bg: string; ring: string };

export const WATCHLIST_COLOR_CLASSES: Record<WatchlistColorKey, ColorClasses> = {
  primary: {
    text: "text-radar-primary dark:text-radar-accent",
    bg: "bg-radar-primary/10 dark:bg-radar-accent/10",
    ring: "ring-radar-primary/30 dark:ring-radar-accent/30",
  },
  purple: { text: "text-purple-600 dark:text-purple-400", bg: "bg-purple-500/10", ring: "ring-purple-500/30" },
  blue: { text: "text-blue-600 dark:text-blue-400", bg: "bg-blue-500/10", ring: "ring-blue-500/30" },
  green: { text: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/10", ring: "ring-emerald-500/30" },
  orange: { text: "text-orange-600 dark:text-orange-400", bg: "bg-orange-500/10", ring: "ring-orange-500/30" },
  pink: { text: "text-pink-600 dark:text-pink-400", bg: "bg-pink-500/10", ring: "ring-pink-500/30" },
  cyan: { text: "text-cyan-600 dark:text-cyan-400", bg: "bg-cyan-500/10", ring: "ring-cyan-500/30" },
  yellow: { text: "text-yellow-600 dark:text-yellow-400", bg: "bg-yellow-500/10", ring: "ring-yellow-500/30" },
  red: { text: "text-red-600 dark:text-red-400", bg: "bg-red-500/10", ring: "ring-red-500/30" },
  gray: {
    text: "text-radar-light-muted dark:text-radar-muted",
    bg: "bg-radar-light-surface dark:bg-white/5",
    ring: "ring-radar-light-border dark:ring-white/10",
  },
};

export const WATCHLIST_COLOR_LABELS: Record<WatchlistColorKey, string> = {
  primary: "Primary",
  purple: "Purple",
  blue: "Blue",
  green: "Green",
  orange: "Orange",
  pink: "Pink",
  cyan: "Cyan",
  yellow: "Yellow",
  red: "Red",
  gray: "Gray",
};
