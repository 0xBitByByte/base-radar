# V4-HISTORY-FUTURE — Research Only

**Status: research, not a commitment or a spec. No production code was written for this document.**

Scope: evaluate 10 possible future capabilities that only become viable *after* V4-HISTORY-001 ships real, persisted, cross-session `AutomationSnapshot` history. Today (V4-ANALYTICS-001C), history is session-only — every topic below assumes real persistence already exists.

For each topic: architecture impact, required persistence, complexity, ROI, dependencies, and which layer (History / Analytics / AI) should own it, per the ownership model frozen in `docs/ARCHITECTURE.md`'s "Wallet Portfolio Pipeline" section.

---

## 1. Highlight lifecycle (New / Ongoing / Resolved)

**What**: track a highlight (e.g. "High Risk") across its full life — first detected, still active, resolved — instead of today's stateless "does this condition hold right now" read.

**Architecture impact**: moderate. `lib/wallet-analytics/highlights.ts` is currently pure and stateless (rebuilt fresh from a snapshot array every call). Lifecycle requires comparing THIS run's highlights against the PREVIOUS run's persisted highlights — a new kind of diff, one level above `AutomationDiff`.

**Required persistence**: a `highlightId → {firstSeenAt, lastSeenAt, status}` record per History-tracked highlight `dedupeKey`. Real state, not derivable from a single snapshot array alone (though derivable by replaying the whole history on each read — see complexity note).

**Complexity**: Medium. The naive approach (replay `buildAnalyticsHighlights` over every prefix of history and diff consecutive runs) is O(n²) in the worst case for a long history — needs either a persisted lifecycle table (avoids replay) or an incremental single-pass algorithm.

**ROI**: High — this is the single most requested-feeling gap in the current design (a highlight is currently "of the moment," with no memory of how long a problem has persisted).

**Dependencies**: V4-HISTORY-001 (needs real persisted history to diff against).

**Owner**: **History**. Highlights themselves stay owned by Analytics (`buildAnalyticsHighlights` keeps computing the *current* set); lifecycle state (first-seen/resolved timestamps) is pure bookkeeping about persisted records, not a new scoring concept — exactly the "persistence and replay only" boundary the freeze established.

---

## 2. Historical confidence explanation

**What**: for a past date, explain WHY `TrendConfidence` was what it was at that time (not just today's).

**Architecture impact**: none beyond persistence — `TrendConfidenceDetail` (V4-ANALYTICS-001A Phase 3) already carries `confidenceReason`/`snapshotCount`/`timeSpanDays`/`consistencyScore` computed fresh each run. "Historical" confidence explanation is just re-running `buildTrends()` over a historical slice of persisted snapshots — the exact same function, a different `history` array.

**Required persistence**: the full snapshot array itself (already the core of V4-HISTORY-001 — no new field needed).

**Complexity**: Small. Zero new calculation; this is a UI feature (a date picker) over already-existing, already-tested logic.

**ROI**: Medium — nice for trust/transparency, not a headline feature on its own.

**Dependencies**: V4-HISTORY-001 only.

**Owner**: **Analytics** (the calculation is `buildTrends()`, unchanged); **History** only supplies the historical slice of snapshots to run it over.

---

## 3. Weekly / Monthly analytics digest

**What**: an automatically-assembled "here's what happened this week" summary, likely surfaced via notification or email-style digest.

**Architecture impact**: Low for the analytics math (`buildAnalyticsExecutiveSummary`, `ChangeFrequency`, `buildAnalyticsHighlights` already answer "what happened" for any given window — `AnalyticsWindow` already has `"7d"`/`"30d"`). The real new work is a delivery mechanism (a scheduled job, a notification, an email template) — outside Analytics' scope entirely.

**Required persistence**: history across the digest period (7/30 real days) — needs V4-HISTORY-001. Also needs a "last digest sent" cursor to avoid re-sending the same period.

**Complexity**: Medium — the analytics side is nearly free (reuse `buildWalletAnalytics(history, events, "7d"/"30d", now)`); the delivery side (scheduling, formatting, notification integration) is the real cost and is a Notification-system concern, not Analytics.

**ROI**: Medium-High for retention (a periodic "come back and look" hook), assuming notification infrastructure can carry it cheaply.

**Dependencies**: V4-HISTORY-001, plus the existing Notification System (`lib/automation/` — a different module, see the architecture doc's naming-collision note) or a new scheduled-job mechanism.

**Owner**: **Analytics** owns the digest CONTENT (a thin new `buildAnalyticsDigest()` composing already-existing outputs — no new calculation); delivery/scheduling belongs to whichever notification/automation layer already owns outbound messaging, not to History.

---

## 4. Highlight categories (Risk / Growth / Allocation / Stability / Recovery)

**What**: group the existing 9 `HighlightType`s into 5 user-facing categories for filtering/grouping in the UI.

**Architecture impact**: trivial. This is a pure display-layer mapping — `HighlightType → HighlightCategory` is a static lookup table, the same shape as every other `*_META`/`*_LABEL` record already in `walletAnalyticsMeta.ts`. No new calculation, no new field required on `AnalyticsHighlight` unless the category itself needs to be queryable/filterable server-side (in which case add one `category` field to the type, still just a static derivation from `type`).

**Required persistence**: none — this doesn't need History at all, could ship independent of it.

**Complexity**: Small.

**ROI**: Low-Medium on its own; mostly valuable as a building block FOR topic 3 (digest) and topic 9 (achievements) rather than standalone.

**Dependencies**: none (could ship today, against V4-ANALYTICS-001B's existing `highlights.ts`).

**Owner**: **Analytics** — it's a static classification of Analytics' own existing `HighlightType` union, the same kind of thing `HIGHLIGHT_TYPE_PRIORITY` already is.

---

## 5. Historical comparison between any two dates

**What**: "show me how my portfolio changed between March 1 and April 1" — an arbitrary two-point comparison, not just oldest-vs-newest-in-window.

**Architecture impact**: Low. `buildTrends`/`buildPortfolioEvolution`/`buildBiggestChange`/`buildAllocationAnalytics` already operate on "the array you hand them" — comparing two arbitrary dates is just `filterHistoryByWindow`-style date-range filtering (already exists in `window.ts`, just needs an arbitrary start+end variant instead of the 5 fixed presets) producing a 2-snapshot (or bounded) array to feed into the SAME existing functions.

**Required persistence**: real history spanning both dates — V4-HISTORY-001.

**Complexity**: Small-Medium — mostly a new `AnalyticsWindow`-adjacent type (`{ from: string; to: string }` custom range) and a `filterHistoryByRange()` sibling to `filterHistoryByWindow()`; the downstream engine composition is unchanged.

**ROI**: Medium-High — natural, expected functionality once real history exists ("what changed since I last checked").

**Dependencies**: V4-HISTORY-001.

**Owner**: **Analytics** — a genuine extension of the existing window-filtering pattern, not persistence logic.

---

## 6. Portfolio replay slider

**What**: a UI slider scrubbing through historical snapshots, showing the full Analytics view "as of" any past point.

**Architecture impact**: Low for Analytics (this is `buildWalletAnalytics(history.slice(0, i), events.slice(0, j), "all", historicalNow)` — already-existing composition, called with a truncated array). The real complexity is entirely UI/UX (a scrubber component, smooth transitions, performance of re-rendering the full Analytics page per slider tick).

**Required persistence**: dense-enough history to make scrubbing feel meaningful (this is a UX/product question — how often does History actually capture snapshots — more than an architecture one).

**Complexity**: Medium (UI-heavy, not Analytics-logic-heavy). Performance matters most here: re-running `buildWalletAnalytics` on every slider tick needs to stay well within the already-established sub-300ms budget for real-time dragging to feel smooth — likely wants debouncing, not a new caching layer inside Analytics itself.

**ROI**: Medium — a genuinely delightful, demo-able feature, but more "wow" than daily utility for most users.

**Dependencies**: V4-HISTORY-001.

**Owner**: **Analytics** for the computation (unchanged, just called with a truncated array); the slider/scrubber UI is a Wallet-page component, not a new lib layer.

---

## 7. Portfolio seasons (Accumulation / Growth / Recovery / Defensive)

**What**: classify STRETCHES of history into a small set of named "seasons," e.g. "you were in a Recovery season from March to May."

**Architecture impact**: Medium-High — this is the one topic that risks becoming a genuinely NEW scoring concept if not scoped carefully. A defensible, non-duplicative design would build seasons entirely from already-existing Analytics outputs (a season = a stretch dominated by a given `Trend` direction pattern + `PortfolioStabilityLevel`, e.g. "Growth" = mostly-improving health/value + moderately-to-highly-active stability; "Defensive" = stable/declining risk improving while value flat) — i.e. a rule-based classifier over EXISTING trend/stability data, not a new score. This must be scoped as "Wallet Analytics' own downstream classification," never as a new intelligence engine, to stay consistent with this pipeline's repeatedly-enforced "no new scores" rule.

**Required persistence**: substantial history — seasons only mean something over weeks/months, so this is the topic most dependent on History actually being *used* for a long time, not just existing.

**Complexity**: Large — needs careful rule design (avoiding overfitting "season" boundaries to noise), plus almost certainly a smoothing/hysteresis mechanism so seasons don't flip on every minor blip (a real design problem, not just an engineering one).

**ROI**: Medium — narratively appealing, but risks feeling arbitrary/gimmicky if the classification doesn't hold up to real usage; needs real user history to validate before committing engineering time.

**Dependencies**: V4-HISTORY-001, and ideally topic 1 (Highlight lifecycle) or similar sustained-state tracking as a technical precedent.

**Owner**: **Analytics**, with an explicit warning: this is the topic most likely to accidentally become "a second intelligence engine" if implemented carelessly — any real implementation should be reviewed against that risk before it starts, the same way this session's own Analytics phases were.

---

## 8. Goal tracking

**What**: let a user set a target (e.g. "reach a Health Score of 85" or "get Diversification above 70") and track progress toward it.

**Architecture impact**: High — this is qualitatively different from everything else in this list: it requires NEW user-authored data (the goal itself) with no existing Analytics equivalent, not just new views over existing history. Progress-tracking itself is cheap (compare a goal's target metric against the metric's current/historical trend, already-existing data) but the goal object itself is new state nobody currently owns.

**Required persistence**: goal definitions (metric, target value, created date, optional deadline) PLUS history to show progress — needs both real user-generated state and V4-HISTORY-001.

**Complexity**: Large — new CRUD surface (create/edit/delete goals), new UI, and a genuinely new "is this goal met" evaluation that, while simple per-goal, is a new kind of computation this pipeline doesn't have a precedent for (comparing a live metric against a user-set threshold, closer in spirit to Automation's rule-matching than to Analytics' history-summarizing).

**ROI**: Medium — valuable for engagement, but is really a distinct feature area (closer to a personal-finance app's goal-tracking, not intrinsic to "analytics of what already happened").

**Dependencies**: V4-HISTORY-001 for progress history; independently needs its own persistence for goal definitions regardless of History's shape.

**Owner**: **mostly outside this pipeline** — goal definitions belong to a new, dedicated module (closer to Wallet Automation's "user-configurable rule" pattern than to Analytics' "derive from what happened"); Analytics would only ever be asked "what's the current/historical value of metric X," never asked to know about goals itself.

---

## 9. Achievement system

**What**: badges/awards for real milestones (e.g. "30 days tracked," "First Recovery," "Diversification Master").

**Architecture impact**: Medium — mechanically very similar to Milestones/Personal Bests (V4-ANALYTICS-001A) and Highlights (V4-ANALYTICS-001B): a fixed, deterministic set of rules evaluated against real Analytics/History output (`milestones`, `personalBests`, `recoveries`, `changeFrequency` already provide most of the raw material). The new piece is PERSISTING which achievements have already been "unlocked" (an achievement, unlike a Milestone, shouldn't un-unlock if the underlying metric later regresses).

**Required persistence**: an `achievementId → unlockedAt` record per user — real, durable state, the same shape as topic 1's lifecycle tracking.

**Complexity**: Medium — the rule evaluation is cheap and reuses existing outputs almost entirely; the complexity is in persistence (once unlocked, stays unlocked) and avoiding it becoming a duplicate scoring system.

**ROI**: Medium — a lightweight, low-risk engagement mechanic, since it's additive celebration rather than a core information surface.

**Dependencies**: V4-HISTORY-001 (for anything time-based, like "30 days tracked"); could ship a SMALL initial set (e.g. "First Recovery," "First Personal Best") using only session-scoped detection as a preview, but the durable "stays unlocked forever" guarantee genuinely needs real persistence.

**Owner**: **History** for the unlock-state persistence (exactly the same "owns no metric, only persists a fact other layers computed" boundary as topic 1); **Analytics** for defining what each achievement's real, derivable trigger condition is (reusing `milestones`/`personalBests`/`recoveries`, never inventing a new score).

---

## 10. Cross-device synchronized history

**What**: the same wallet's history available identically whether checked from a phone or a laptop.

**Architecture impact**: High, but almost entirely OUTSIDE Analytics/History's own logic — this is a backend/sync/auth problem (whose account owns this wallet's history, where it's stored, how conflicts between two devices both appending snapshots concurrently are resolved) layered UNDER whatever V4-HISTORY-001 builds, not an extension of it. `lib/wallet-analytics/serialization.ts` (this phase's `serializeAnalyticsSnapshot`/`deserializeAnalyticsSnapshot`) is directly relevant here — it's the exact real, version-aware wire format a sync layer would transmit — but the sync mechanism itself (a backend service, conflict resolution, auth-to-wallet binding) is a different system entirely.

**Required persistence**: server-side storage keyed by wallet address (or authenticated account), not just local/browser persistence — a materially bigger lift than V4-HISTORY-001's likely local-first scope.

**Complexity**: Extra Large — real backend infrastructure, auth considerations (is a connected wallet enough identity, or does this need a real account system this app may not have yet), and conflict resolution for concurrent multi-device writes.

**ROI**: Medium-High long-term (expected behavior for any serious product), but High complexity/cost relative to the other 9 topics — likely the last of this list to actually get built, and probably deserves its own dedicated planning phase rather than being folded into V4-HISTORY-001 itself.

**Dependencies**: V4-HISTORY-001 (needs a real local history/serialization format to sync in the first place — which this phase's Phase 3/4 work already establishes the foundation for), plus whatever account/auth system this app decides to build or adopt.

**Owner**: **History**, but explicitly flagged as its own, larger sub-project — not a natural "and also" extension of V4-HISTORY-001's likely local-persistence scope.

---

## Summary table

| # | Topic | Complexity | ROI | Needs V4-HISTORY-001 | Owner |
|---|---|---|---|---|---|
| 1 | Highlight lifecycle | Medium | High | Yes | History (state) + Analytics (logic) |
| 2 | Historical confidence explanation | Small | Medium | Yes | Analytics |
| 3 | Weekly/Monthly digest | Medium | Medium-High | Yes | Analytics (content) + Notifications (delivery) |
| 4 | Highlight categories | Small | Low-Medium | No | Analytics |
| 5 | Historical comparison (any 2 dates) | Small-Medium | Medium-High | Yes | Analytics |
| 6 | Portfolio replay slider | Medium | Medium | Yes | Analytics (logic) + Wallet page (UI) |
| 7 | Portfolio seasons | Large | Medium | Yes | Analytics (⚠️ scope-creep risk) |
| 8 | Goal tracking | Large | Medium | Yes (for progress) | New module (not Analytics/History) |
| 9 | Achievement system | Medium | Medium | Yes (for durability) | History (state) + Analytics (rules) |
| 10 | Cross-device sync | Extra Large | Medium-High | Yes | History (own sub-project) |

**Cheapest, highest-confidence next steps if any of these get greenlit**: #4 (Highlight categories) needs no History dependency and could ship anytime; #2 and #5 are the smallest genuinely new Analytics work once real History exists, since both reuse 100% of already-shipped computation.

**Topic requiring the most care**: #7 (Portfolio seasons) is the one most likely to violate this pipeline's own "never a second intelligence engine" rule if scoped loosely — any real design pass for it should start by re-reading this document's ownership table, not by designing a new score.
