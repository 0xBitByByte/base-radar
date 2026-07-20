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
  Layers,
  Settings,
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
      { label: "Watchlists", href: "/dashboard/watchlists", icon: Layers },
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
