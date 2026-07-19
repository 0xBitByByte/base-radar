import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  FolderKanban,
  Shapes,
  TrendingUp,
  Rocket,
  BrainCircuit,
  Radio,
  Wallet,
  Eye,
  Bell,
  Zap,
  Settings,
  FileCode,
} from "lucide-react";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

export type NavGroup = {
  title: string;
  items: NavItem[];
};

export const DASHBOARD_NAV_GROUPS: NavGroup[] = [
  {
    title: "Overview",
    items: [{ label: "Dashboard", href: "/dashboard", icon: LayoutDashboard }],
  },
  {
    title: "Discover",
    items: [
      { label: "Projects", href: "/dashboard/projects", icon: FolderKanban },
      { label: "Categories", href: "/dashboard/categories", icon: Shapes },
      { label: "Narratives", href: "/dashboard/narratives", icon: TrendingUp },
      { label: "Launches", href: "/dashboard/launches", icon: Rocket },
    ],
  },
  {
    title: "Research",
    items: [
      { label: "AI Research", href: "/dashboard/ai-research", icon: BrainCircuit },
      { label: "Signals", href: "/dashboard/signals", icon: Radio },
    ],
  },
  {
    title: "Portfolio",
    items: [
      { label: "Wallet", href: "/dashboard/wallet", icon: Wallet },
      { label: "Watchlist", href: "/dashboard/watchlist", icon: Eye },
      { label: "Alerts", href: "/dashboard/alerts", icon: Bell },
      { label: "Automation", href: "/dashboard/automation", icon: Zap },
    ],
  },
];

export const DASHBOARD_SETTINGS_ITEM: NavItem = {
  label: "Settings",
  href: "/dashboard/settings",
  icon: Settings,
};

export const APP_VERSION = "v0.1.0";

export const RECENT_SEARCHES: string[] = ["Aerodrome", "cbBTC", "0x7a3f…9c21"];

export const TRENDING_SEARCHES: string[] = [
  "AI Agents",
  "Base gas tracker",
  "NeuroBase AI",
  "Whale wallets",
];

export type QuickAction = {
  label: string;
  href: string;
  icon: LucideIcon;
};

export const QUICK_ACTIONS: QuickAction[] = [
  { label: "Open Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Browse Projects", href: "/dashboard/projects", icon: FolderKanban },
  { label: "Open Wallet", href: "/dashboard/wallet", icon: Wallet },
  { label: "View Contracts", href: "/dashboard/projects", icon: FileCode },
  { label: "Browse Narratives", href: "/dashboard/narratives", icon: TrendingUp },
  { label: "View Signals", href: "/dashboard/signals", icon: Radio },
  { label: "AI Research", href: "/dashboard/ai-research", icon: BrainCircuit },
  { label: "Settings", href: "/dashboard/settings", icon: Settings },
];
