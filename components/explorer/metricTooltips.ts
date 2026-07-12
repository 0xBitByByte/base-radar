/**
 * The generic (no `factors`/live-breakdown) one-sentence explanations for
 * Health, Confidence, and GitHub Stars — shared by every surface that shows
 * these metrics (Grid's `ProjectCard`, Quick View's `QuickViewCommunity`, and
 * Table's `ProjectRow`) so the wording never drifts between them. Quick
 * View's Health/Confidence tooltips additionally pass the Engine's real
 * `factors` breakdown (see `ScoreBadge`), which supersedes these sentences
 * there; Grid and Table always show these as-is.
 */
export const HEALTH_SCORE_INFO_TOOLTIP =
  "A 0–100 score blending live market, TVL, and GitHub activity signals into one health read.";

export const CONFIDENCE_SCORE_INFO_TOOLTIP =
  "A 0–100 score reflecting how much live data and registry verification back this record.";

export const GITHUB_STARS_INFO_TOOLTIP = "The project's GitHub star count, sourced live from the GitHub API.";
