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
  /** Opens in a new tab (`target="_blank" rel="noopener noreferrer"`) — real external destinations only (GitHub repo, its `docs/` folder), never in-page anchors or internal routes. */
  external?: boolean;
};

/** The real Base Radar GitHub repo's `docs/` folder — the actual documentation (API/Architecture/Design System/etc. markdown) already lives there; there's no separate hosted docs site yet, so "Docs" points at the real source rather than a fabricated URL. */
const DOCS_URL = `${SITE.social.github}/tree/main/docs`;

export const NAV_LINKS: NavLink[] = [
  { label: "Features", href: "#features" },
  { label: "Dashboard", href: "/dashboard" },
  { label: "Roadmap", href: "#roadmap" },
  { label: "Docs", href: DOCS_URL, external: true },
  { label: "GitHub", href: SITE.social.github, external: true },
];

export type FooterLinkGroup = {
  title: string;
  links: NavLink[];
};

/** PR9.3 — split the previous single "Navigation" group into Product/Company/Legal, matching the footer hierarchy of Stripe/Linear/Vercel. */
export const FOOTER_LINK_GROUPS: FooterLinkGroup[] = [
  {
    title: "Product",
    links: [
      { label: "Dashboard", href: "/dashboard" },
      { label: "Projects", href: "/dashboard/projects" },
      { label: "AI Research", href: "/dashboard/alerts" },
      { label: "Watchlists", href: "/dashboard/watchlists" },
      { label: "Roadmap", href: "#roadmap" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "/about" },
      { label: "Contact", href: "/contact" },
      { label: "Docs", href: DOCS_URL, external: true },
      { label: "GitHub", href: SITE.social.github, external: true },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy", href: "/legal/privacy" },
      { label: "Terms", href: "/legal/terms" },
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

/** Landing page "Live Intelligence Ticker" (PR9.3, replaces the old static Key Metrics grid) — same `*Parts` formatter pipeline as `DashboardStat` above, routed through the identical `AnimatedNumber`/KPI rendering `KPIRow` uses on the real dashboard. */
export type KeyMetric = {
  label: string;
  value: number;
  format: "gwei" | "compactCurrency" | "compactNumber";
};

export const TICKER_METRICS: KeyMetric[] = [
  { label: "Verified Projects", value: 2_348, format: "compactNumber" },
  { label: "Protocols", value: 412, format: "compactNumber" },
  { label: "TVL", value: 4_600_000_000, format: "compactCurrency" },
  { label: "24H Volume", value: 1_300_000_000, format: "compactCurrency" },
  { label: "Signals Today", value: 86, format: "compactNumber" },
  { label: "AI Alerts", value: 29, format: "compactNumber" },
  { label: "Narratives Tracked", value: 12, format: "compactNumber" },
  { label: "Builders Added", value: 9, format: "compactNumber" },
  { label: "Governance Votes", value: 11, format: "compactNumber" },
  { label: "Security Updates", value: 6, format: "compactNumber" },
];
