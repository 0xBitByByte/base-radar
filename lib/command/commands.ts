/**
 * Static command registry — a fixed list of real, working destinations in
 * the app. This is a UI/navigation layer only: no provider calls, no engine
 * calls, no derived intelligence, and no route that doesn't already resolve
 * to a real page (this app's own "no placeholder features" principle
 * applies here too).
 *
 * PR21 Part 2: this file now only owns the registry and its types —
 * search/scoring/grouping moved to `lib/search/globalSearch.ts`, which
 * normalizes every `Command` (via `normalizeCommand`) into the same
 * `SearchableItem` shape Global Search uses for every other source.
 */

import type { LucideIcon } from "lucide-react";
import { Bell, Clock, Eye, FolderKanban, Layers, LayoutDashboard, LayoutGrid, Newspaper, Settings, Zap } from "lucide-react";

export type CommandGroup =
  | "Dashboard"
  | "Navigation"
  | "Projects"
  | "Timeline"
  | "Notifications"
  | "Automation"
  | "Portfolio"
  | "Daily Brief"
  | "Settings";

export type Command = {
  id: string;
  title: string;
  description: string;
  group: CommandGroup;
  icon: LucideIcon;
  route: string;
  keywords: string[];
};

export const COMMANDS: Command[] = [
  {
    id: "dashboard",
    title: "Dashboard",
    description: "Go to your dashboard overview.",
    group: "Dashboard",
    icon: LayoutDashboard,
    route: "/dashboard",
    keywords: ["home", "overview", "main"],
  },
  {
    id: "projects",
    title: "Browse Projects",
    description: "Explore the Base ecosystem project registry.",
    group: "Projects",
    icon: FolderKanban,
    route: "/dashboard/projects",
    keywords: ["explorer", "registry", "browse", "search projects"],
  },
  {
    id: "watchlist",
    title: "Watchlist",
    description: "View the projects you're watching.",
    group: "Navigation",
    icon: Eye,
    route: "/dashboard/watchlist",
    keywords: ["watch", "tracked", "following", "saved"],
  },
  {
    id: "watchlists",
    title: "Watchlists",
    description: "Organize projects into your own collections.",
    group: "Navigation",
    icon: Layers,
    route: "/dashboard/watchlists",
    keywords: ["collections", "organize", "personalization", "lists"],
  },
  {
    id: "alerts",
    title: "Alerts",
    description: "View real-time alerts for your Watchlist.",
    group: "Navigation",
    icon: Bell,
    route: "/dashboard/alerts",
    keywords: ["alert", "signal", "feed"],
  },
  {
    id: "timeline",
    title: "Intelligence Timeline",
    description: "Browse the chronological activity feed across every intelligence layer.",
    group: "Timeline",
    icon: Clock,
    route: "/dashboard/timeline",
    keywords: ["activity", "feed", "history", "events"],
  },
  {
    id: "notifications",
    title: "Notification Center",
    description: "View and manage your notifications.",
    group: "Notifications",
    icon: Bell,
    route: "/dashboard/notifications",
    keywords: ["notification", "inbox", "unread"],
  },
  {
    id: "automation",
    title: "Automation",
    description: "View automation rule results across your Watchlist.",
    group: "Automation",
    icon: Zap,
    route: "/dashboard/automation",
    keywords: ["rules", "automations", "triggers"],
  },
  {
    id: "portfolio",
    title: "Portfolio Intelligence",
    description: "See a health summary across your entire Watchlist.",
    group: "Portfolio",
    icon: LayoutGrid,
    route: "/dashboard/portfolio",
    keywords: ["portfolio", "health", "overview"],
  },
  {
    id: "daily-brief",
    title: "Daily Brief",
    description: "Read today's AI-generated intelligence summary.",
    group: "Daily Brief",
    icon: Newspaper,
    route: "/dashboard/brief",
    keywords: ["brief", "summary", "digest", "daily"],
  },
  {
    id: "settings-notifications",
    title: "Notification Preferences",
    description: "Choose which notification types appear, and manage read history.",
    group: "Settings",
    icon: Settings,
    route: "/dashboard/settings/notifications",
    keywords: ["settings", "preferences", "notifications"],
  },
  {
    id: "settings-automation",
    title: "Automation Preferences",
    description: "Turn Automation on or off, and choose which rules can fire.",
    group: "Settings",
    icon: Settings,
    route: "/dashboard/settings/automation",
    keywords: ["settings", "preferences", "automation", "rules"],
  },
  {
    id: "settings-search",
    title: "Search Preferences",
    description: "Control the keyboard shortcut and manage Recent Searches.",
    group: "Settings",
    icon: Settings,
    route: "/dashboard/settings/search",
    keywords: ["settings", "preferences", "search", "recent", "shortcut"],
  },
  {
    id: "settings-personalization",
    title: "Personalization Preferences",
    description: "Control Dashboard filtering, search prioritization, and the Topbar watchlist selector.",
    group: "Settings",
    icon: Settings,
    route: "/dashboard/settings/personalization",
    keywords: ["settings", "preferences", "personalization", "watchlist", "import", "export"],
  },
];

