export const SITE = {
  name: "Base Radar",
  tagline: "Built for the Base ecosystem.",
} as const;

export type NavLink = {
  label: string;
  href: string;
};

export const NAV_LINKS: NavLink[] = [
  { label: "Features", href: "#features" },
  { label: "Dashboard", href: "/dashboard" },
  { label: "Roadmap", href: "#" },
  { label: "Docs", href: "#" },
  { label: "GitHub", href: "#" },
];

export type FooterLinkGroup = {
  title: string;
  links: NavLink[];
};

export const FOOTER_LINK_GROUPS: FooterLinkGroup[] = [
  {
    title: "Product",
    links: [
      { label: "Documentation", href: "#" },
      { label: "API", href: "#" },
    ],
  },
  {
    title: "Company",
    links: [{ label: "Contact", href: "#" }],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy", href: "#" },
      { label: "Terms", href: "#" },
    ],
  },
  {
    title: "Connect",
    links: [
      { label: "GitHub", href: "#" },
      { label: "Twitter", href: "#" },
    ],
  },
];

export const TRUST_INDICATORS: string[] = ["Free", "Open Source", "Built for Base"];

export type DashboardStat = {
  label: string;
  value: string;
  delta?: string;
  trend?: "up" | "down";
};

export const DASHBOARD_STATS: DashboardStat[] = [
  { label: "Gas", value: "0.014 gwei", delta: "+6%", trend: "up" },
  { label: "Active Projects", value: "2,314", delta: "+42", trend: "up" },
  { label: "TVL", value: "$3.68B", delta: "+3.4%", trend: "up" },
  { label: "24H Volume", value: "$486M", delta: "+9.2%", trend: "up" },
];

export type DashboardHighlight = {
  label: string;
  value: string;
  icon: "trending" | "whale" | "hot" | "signal";
  tone: "primary" | "accent" | "success" | "warning";
};

export const DASHBOARD_HIGHLIGHTS: DashboardHighlight[] = [
  { label: "Trending Narrative", value: "AI Agents", icon: "trending", tone: "primary" },
  { label: "Whale Activity", value: "24 buys · 1h", icon: "whale", tone: "warning" },
  { label: "Hot AI Project", value: "NeuroBase AI", icon: "hot", tone: "accent" },
  {
    label: "Latest Alpha Signal",
    value: "LP inflow surge · BASE/ETH",
    icon: "signal",
    tone: "success",
  },
];
