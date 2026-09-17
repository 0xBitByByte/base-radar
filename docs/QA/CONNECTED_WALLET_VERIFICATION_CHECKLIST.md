# Connected Wallet Verification Checklist

V4-FUTURE-002A, Phase 4. For a future manual QA session with a real,
funded wallet on Base Mainnet (ideally holding: native ETH, at least one
stablecoin, at least one DeFi-protocol position, and one unpriced/unknown
token — the combination this platform's empty states and edge cases are
built around). Each row: page, interaction, expected result. Check items
off in place; this file is meant to be edited during that session, not
regenerated.

Start every session at `/dashboard/wallet/verify` with the "Using Real
Wallet Data" toggle selected (default once a wallet is connected) — the
Harness surfaces every section on one page with live Developer Assertions,
so most rows below can be verified there before also spot-checking the
real per-feature pages.

## 1. Connection & holdings discovery

- [ ] Connect wallet → `/dashboard/wallet` shows real ETH + token balances, correct USD values, correct allocation %
- [ ] Total Value matches a manual sum of the listed holdings
- [ ] An unpriced token shows "Price unknown," not a fabricated value
- [ ] Refresh button re-fetches and updates `lastUpdated`

## 2. Portfolio Intelligence / AI

- [ ] Portfolio Health score, Risk score, Diversification score all present and internally consistent (e.g., one large holding → higher concentration risk)
- [ ] Executive Summary (AI) text matches the real scores shown elsewhere on the page — no contradiction
- [ ] Recommendations list is non-empty when a real concentration/risk condition exists

## 3. Wallet Automation

- [ ] Automation Status shows real rule count / active count
- [ ] Trigger a real condition (e.g., a balance change large enough to move Health Score) → a new event appears in Recent Wallet Events within one refresh
- [ ] The new event's "Explain" button opens a real explanation referencing the real trend/history/report — not a placeholder

## 4. Wallet Analytics

- [ ] Analytics Highlights shows the single highest-priority real finding
- [ ] Switching the window selector (7d/30d/90d/all) changes Trends/Evolution/Allocation but NOT Milestones/Personal Bests/Recovery (those stay all-time, per design)
- [ ] After ≥ 2 real snapshots exist, Portfolio Trends renders real up/down arrows, not an empty state

## 5. History, Replay, Reports

- [ ] History Browser lists real snapshots grouped by day (Today/Yesterday/This Week/Earlier)
- [ ] Replay steps through real snapshots in chronological order (oldest → newest), Previous/Next/First/Latest all correct
- [ ] Snapshot Compare between two real, non-identical snapshots shows a real, non-empty diff
- [ ] Historical Report (each of 7d/30d/90d/all) shows real, non-fabricated Overview/Statistics — an empty period shows the honest empty state, not zeros dressed as facts
- [ ] Export Report (Markdown/Text/HTML) downloads a file whose content matches what's on screen

## 6. Monthly Digest

- [ ] Digest month label matches the real current calendar month
- [ ] Digest Portfolio Story section matches Cross-Feature Intelligence's own timeline for the same period (should never diverge — this is exactly what `WalletVerificationHarness`'s digest/report assertion checks synthetically; confirm it holds for real data too)
- [ ] Export Digest downloads real content

## 7. Portfolio Story Mode

- [ ] "Where You Started" shows the real FIRST ever recorded snapshot (oldest in history), not a recent one
- [ ] "Current Position" matches the real latest snapshot shown everywhere else on the page
- [ ] Key Turning Points reads chronologically forward (oldest first) and matches Cross-Feature Intelligence's real timeline entries

## 8. Guided Portfolio Review

- [ ] All 8 steps show real data matching their standalone-page equivalents (no step invents a summary the standalone section doesn't already show)
- [ ] Previous/Next/Jump all navigate correctly; Finish stamps a real completion time
- [ ] Refresh the page mid-review → progress resumes at the same step (real `localStorage` persistence)
- [ ] Leave the tab closed for a real multi-day gap, reopen → review still resumes correctly (the one behavior this sandbox cannot simulate — elapsed real time)

## 9. Smart Report Sharing

- [ ] Share dialog's Title/Summary/Description match the real report being shared
- [ ] Each toggle (History/Timeline/Recommendations/Highlights/Digest/Story) adds real, correct content to the live preview — and only when its real source exists (Digest/Story toggles disabled when genuinely unavailable)
- [ ] Copy to Clipboard produces the exact preview text (paste and compare)

## 10. AI Chat

- [ ] Every one of the 14 fixed questions produces a real answer citing real numbers/names from THIS wallet — never a generic/templated-sounding response
- [ ] "automationTriggered" question answers correctly when a real automation event exists, and gives an honest "nothing triggered yet" when none does

## 11. Cross-Feature Intelligence & Notification Explainability

- [ ] Related Activity panel's correlated-moment count matches the real Cross-Feature timeline length
- [ ] Every reference badge (History/Analytics/Report/Ask AI/Automation) on a correlated event resolves to something real when clicked/hovered — never a dead link
- [ ] A wallet-automation notification's Explain panel timeline shows real stages reached (automation → analytics → history → report/digest → AI Chat) in correct order

## 12. Wallet Verification Harness itself

- [ ] `/dashboard/wallet/verify` toggled to "Using Real Wallet Data" mounts every section above without a crash
- [ ] Developer Assertions panel reads **0** findings against real data — any non-zero finding here is a genuine bug to file, not a fixture artifact
- [ ] Toggling back to "Using Synthetic Fixtures" still works (confirms the harness didn't silently start depending on a live wallet)

## Build & release gates (re-run alongside this session)

- [ ] `tsc --noEmit` clean
- [ ] `eslint .` clean
- [ ] `vitest run` — full suite passing
- [ ] `next build` succeeds

## Explicitly not verifiable even with a real wallet, in this sandbox

- [ ] Multi-week trend/stability signals (would require real elapsed time between polls)
- [ ] A digest genuinely spanning a real calendar-month boundary
- [ ] Firefox/Safari rendering (Chromium-only tooling, same limitation as every prior QA pass in this repo — see `UAT_CHECKLIST.md`)
