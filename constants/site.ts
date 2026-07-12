export type SocialLinks = {
  github: string;
  x: string;
  discord: string;
  telegram: string;
  linktree: string;
};

export type SiteContact = {
  email: string;
  /** Not live yet — placeholder for a future dedicated docs site. */
  docs: string | null;
  /** Not live yet — placeholder for a future blog. */
  blog: string | null;
};

/**
 * Single source of truth for Base Radar's branding and official community
 * links. Every part of the app (landing footer, dashboard sidebar, docs)
 * should import from here rather than hardcoding a URL.
 */
export type SiteConfig = {
  name: string;
  shortName: string;
  tagline: string;
  description: string;
  /** Relative — no production domain is configured yet. */
  website: string;
  social: SocialLinks;
  contact: SiteContact;
};

export const SITE: SiteConfig = {
  name: "Base Radar",
  shortName: "BaseRadar",
  tagline: "The Intelligence Layer for the Base Ecosystem",
  description: "Open-source crypto intelligence platform for the Base ecosystem.",

  website: "/",

  social: {
    github: "https://github.com/0xbitbybyte/base-radar",
    x: "https://x.com/TheBaseRadar",
    discord: "https://discord.gg/yRBnkhjCd6",
    telegram: "https://t.me/+3yysanqJlDE1Y2Y1",
    linktree: "https://linktr.ee/thebaseradarofficial",
  },

  contact: {
    email: "thebaseradarofficial@gmail.com",
    docs: null,
    blog: null,
  },
};

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
];

export const TRUST_INDICATORS: string[] = ["Free", "Open Source", "Built for Base"];

/** `format` selects which of `lib/data/format.ts`'s shared `*Parts` formatters (the same ones `KPIRow` uses) renders `value` — the Hero preview's stat grid is a real `AnimatedNumber`/`KpiValueDisplay` consumer, not a lookalike with pre-formatted strings. */
export type DashboardStat = {
  label: string;
  value: number;
  format: "gwei" | "compactCurrency" | "compactNumber";
  delta?: string;
  trend?: "up" | "down";
};

export const DASHBOARD_STATS: DashboardStat[] = [
  { label: "Gas", value: 0.014, format: "gwei", delta: "+6%", trend: "up" },
  { label: "Active Projects", value: 2314, format: "compactNumber", delta: "+42", trend: "up" },
  { label: "TVL", value: 3_680_000_000, format: "compactCurrency", delta: "+3.4%", trend: "up" },
  { label: "24H Volume", value: 486_000_000, format: "compactCurrency", delta: "+9.2%", trend: "up" },
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
