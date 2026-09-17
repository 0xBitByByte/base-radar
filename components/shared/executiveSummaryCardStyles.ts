/**
 * V1-FIX-025 — the shared header/card treatment for the three "compact,
 * top-of-page executive summary card" widgets (`PortfolioCard`, `BriefCard`,
 * `Timeline`'s own header block): headline, "Generated <RelativeTime>"
 * timestamp, and one-line summary, byte-identical across all three before
 * this pass, each independently copy-pasting the same class strings.
 *
 * In the same "exported class-string constants, not a wrapper component"
 * shape `components/dashboard/pageHeaderStyles.ts` already established for
 * the structurally similar page-header problem, for the same reason: each
 * consumer's surrounding content genuinely differs (`PortfolioCard` adds a
 * `PortfolioHealthBadge` beside its headline that the other two don't have;
 * each uses its own differently-shaped metric-row component/props) — a
 * wrapper component would have to either grow an escape-hatch prop API for
 * that difference or strip it. What actually varied for no reason was the
 * typography, not the structure; these constants fix that without touching
 * structure.
 *
 * `EXECUTIVE_SUMMARY_CARD_CLASS`/`EXECUTIVE_SUMMARY_METRICS_ROW_CLASS` are
 * used by `PortfolioCard`/`BriefCard` only — `Timeline`'s header renders
 * directly in the page flow (no outer card) and its metrics row has its own
 * distinct treatment (`TimelineSection`), so those two constants don't apply
 * there; only the header-block trio below is shared by all three.
 */
export const EXECUTIVE_SUMMARY_CARD_CLASS =
  "flex flex-col gap-4 rounded-2xl border border-radar-light-border bg-radar-light-card p-5 dark:border-white/10 dark:bg-white/[0.02]";
export const EXECUTIVE_SUMMARY_HEADER_GROUP_CLASS = "flex flex-col gap-1";
export const EXECUTIVE_SUMMARY_TITLE_CLASS = "text-xl font-semibold text-radar-light-text dark:text-radar-white";
export const EXECUTIVE_SUMMARY_TIMESTAMP_CLASS = "text-[10.5px] whitespace-nowrap text-radar-light-muted dark:text-radar-muted";
export const EXECUTIVE_SUMMARY_SUBTITLE_CLASS = "text-sm leading-relaxed text-radar-light-muted dark:text-radar-muted";
export const EXECUTIVE_SUMMARY_METRICS_ROW_CLASS =
  "flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-radar-light-border pt-4 dark:border-white/10";
