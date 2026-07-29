# Release Checklist — PR-066

## Pre-merge

- [x] All 30 routes verified loading with zero console errors
- [x] Real user flow (sidebar navigation) verified working
- [x] Error state (invalid project slug) verified renders proper 404
- [x] `RecentTransactions` duplicate-key bug identified, reproduced, and root-caused in a fresh browser tab — **fix deferred to PR-068**, see `KNOWN_ISSUES.md`
- [x] `npx tsc --noEmit` passes
- [x] `npm run lint` passes
- [x] `npm test` — 204/204 passing
- [x] `npm run build` succeeds for all 34 routes
- [x] `docs/QA/` deliverables written (this directory)
- [x] No new features, redesigns, or architecture changes introduced
- [x] Landing page untouched
- [ ] **Not committed, not pushed** — per standing instruction, waiting for review before creating the Git commit

## Before production (non-Beta) deploy

- [ ] Set `metadataBase` in root metadata export (see `KNOWN_ISSUES.md`)
- [ ] Fix `formatRelativeTime()` hydration mismatch (PR-068)
- [ ] Consider a manual Firefox/Safari smoke test if targeting broad browser support

## Post-merge follow-ups (tracked, not blocking)

- [ ] PR-068: fix `RecentTransactions` duplicate-key bug (key by `txHash` + log index or array index) and the `formatRelativeTime()` hydration mismatch (`lib/data/format.ts`, single root-cause fix covering `IntelligenceBrief`, `WidgetCard` (~11 widgets), and `RecentTransactions`)
- [ ] Full WCAG 2.1 AA accessibility audit (contrast + keyboard + screen reader)
- [ ] Full responsive breakpoint × route matrix (tablet, landscape mobile)

## Sign-off

This PR is QA/regression validation and documentation only — no functional code changes. All build gates pass. One real bug (`RecentTransactions` duplicate keys) was identified, reproduced, and root-caused within scope, with its fix deferred to PR-068. Two additional known issues are documented and explicitly deferred per standing instruction. Ready for review.
