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

/**
 * Absolute production origin, used only for `metadataBase` and other
 * URL-based metadata fields that require a fully-qualified URL (Open
 * Graph/Twitter images, canonical links, the sitemap). No custom domain is
 * live yet, so this defaults to the project's Vercel URL; override with
 * `NEXT_PUBLIC_SITE_URL` once a production domain is assigned — no code
 * changes needed elsewhere, every consumer reads this one constant.
 */
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://base-radar.vercel.app";

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

/** SEO keywords for the root layout's `metadata.keywords`. */
export const SITE_KEYWORDS: string[] = [
  "Base",
  "Base ecosystem",
  "crypto intelligence",
  "onchain analytics",
  "DeFi tracker",
  "Base blockchain",
  "TVL tracker",
  "project discovery",
  "crypto dashboard",
];

/** `@handle` form of `SITE.social.x`, for `twitter:site`/`twitter:creator`. */
export const SITE_TWITTER_HANDLE = "@TheBaseRadar";

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
  { label: "How It Works", href: "#how-it-works" },
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
      { label: "AI Intelligence", href: "/dashboard/alerts" },
      { label: "Watchlists", href: "/dashboard/watchlists" },
      { label: "How It Works", href: "#how-it-works" },
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

/** The two CTA pairs Hero and the Final CTA both render byte-identically — one shared source so the two never drift if edited independently later. Navbar's own persistent "Launch App" button is intentionally separate (a terser, always-visible affordance) and does not read from here. */
export const LANDING_CTAS = {
  primary: { label: "Explore Base Radar", href: "/dashboard" },
  secondary: { label: "Explore Projects", href: "/dashboard/projects" },
} as const;

/**
 * Presentational fixture data for the Hero/Product Proof dashboard preview —
 * shaped after the real Dashboard's Executive Summary strip
 * (`components/dashboard/ExecutiveSummaryStrip.tsx`) and AI Command Center
 * (`components/dashboard/TodaysTopInsight.tsx`), never a live query. `format`
 * selects which of `lib/data/format.ts`'s shared `*Parts` formatters (the
 * same ones `KPIRow` uses) renders `value` — the preview's stat row is a
 * real `AnimatedNumber`/`KpiValueDisplay` consumer, not a lookalike with
 * pre-formatted strings.
 */
export type PreviewStat = {
  label: string;
  value: number;
  format: "compactCurrency" | "compactNumber";
  delta?: string;
  trend?: "up" | "down";
};

export const PREVIEW_STATS: PreviewStat[] = [
  { label: "Projects Tracked", value: 759, format: "compactNumber", delta: "+18", trend: "up" },
  { label: "Ecosystem TVL", value: 5_470_000_000, format: "compactCurrency", delta: "+3.4%", trend: "up" },
  { label: "24H Volume", value: 486_000_000, format: "compactCurrency", delta: "+9.2%", trend: "up" },
];

/** Mirrors `lib/dashboard/executiveSummary.ts`'s real `computeMarketSentiment()` output shape (a Bullish/Neutral/Bearish label plus a real "N of M categories trending" justification) — illustrative values, same shape as the real feature. */
export const PREVIEW_MARKET_SENTIMENT = {
  label: "Bullish" as const,
  justification: "3 of 5 tracked categories trending up",
};

/** Mirrors Executive Summary's real Ecosystem Health line (a verified/tracked ratio) — rendered as static text, not `AnimatedNumber` (no percent formatter exists in `lib/data/format.ts`, and a slow count-up reads oddly for a ratio like this anyway). */
export const PREVIEW_ECOSYSTEM_HEALTH = {
  percent: 42,
  detail: "of tracked projects verified",
};

/**
 * Illustrative AI Command Center cards — same real category vocabulary as
 * `lib/dashboard/commandCenter.ts`'s `RECOMMENDATION_CATEGORY_LABEL` (TVL,
 * Whale Activity, Governance, Security, Developer Activity, Market
 * Momentum), never the live `Recommendation[]` itself (that requires a real
 * signed-in session's Watchlist data, which a static marketing page never
 * has) — clearly presentational, not a fabricated live feed.
 */
export type PreviewOpportunity = {
  label: string;
  value: string;
  icon: "tvl" | "whale" | "governance" | "security" | "dev" | "momentum";
  tone: "primary" | "accent" | "success" | "warning";
};

export const PREVIEW_TOP_OPPORTUNITIES: PreviewOpportunity[] = [
  { label: "TVL", value: "Aerodrome Finance +4.2%", icon: "tvl", tone: "success" },
  { label: "Whale Activity", value: "$2.1M inflow · 12m ago", icon: "whale", tone: "warning" },
  { label: "Governance", value: "Proposal passed · Moonwell", icon: "governance", tone: "primary" },
  { label: "Security", value: "Contract verified · 1h ago", icon: "security", tone: "accent" },
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
