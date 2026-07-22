import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  FolderKanban,
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
    items: [{ label: "Projects", href: "/dashboard/projects", icon: FolderKanban }],
  },
  {
    title: "Portfolio",
    items: [
      { label: "Watchlists", href: "/dashboard/watchlists", icon: Layers },
      { label: "Alerts", href: "/dashboard/alerts", icon: Bell },
      { label: "Automation", href: "/dashboard/automation", icon: Zap },
    ],
  },
];

export const DASHBOARD_SETTINGS_ITEM: NavItem = {
  label: "Settings",
  href: "/dashboard/settings/notifications",
  icon: Settings,
};

export const APP_VERSION = "v0.1.0";
