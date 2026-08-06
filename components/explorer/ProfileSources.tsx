import { Suspense } from "react";

import { CheckCircle2, CircleSlash, Database, HelpCircle, XCircle, type LucideIcon } from "lucide-react";

import { ProfileSectionCard } from "@/components/explorer/ProfileSectionCard";
import { ProfileSourcesBlockscoutAsync } from "@/components/explorer/ProfileSourcesBlockscoutAsync";
import { PROVIDER_BRANDING } from "@/lib/branding/providers";
import { RelativeTime } from "@/components/shared/RelativeTime";
import { PROVIDER_NAMES, type ProviderName } from "@/lib/providers/common/types";
import { getRateLimitStatus as getGithubRateLimitStatus } from "@/lib/providers/github/service";
import { getRateLimitStatus as getDexscreenerRateLimitStatus } from "@/lib/providers/dexscreener/service";
import { getRateLimitStatus as getBlockscoutRateLimitStatus } from "@/lib/providers/blockscout/service";
import type { ContractDetailEntry } from "@/lib/providers/blockscout/service";
import { getRateLimitStatus as getCoingeckoRateLimitStatus } from "@/lib/providers/coingecko/service";
import { getRateLimitStatus as getDefillamaRateLimitStatus } from "@/lib/providers/defillama/service";
import { getRateLimitStatus as getBaseRateLimitStatus } from "@/lib/providers/base/service";
import { cn } from "@/lib/utils";
import type { Sources } from "@/lib/intelligence/types";

type ProfileSourcesProps = {
  sources: Sources;
  /** Genuinely unavailable data, scoped to what actually applies to this project (`buildThingsWeCouldntVerify`) — hidden entirely when nothing applies. */
  thingsWeCouldntVerify: string[];
  /** PR-078 §1 — real per-address Blockscout verification, already fetched for the Contracts section (`page.tsx`'s `contractDetailsPromise`) — reused here, not refetched, so the Blockscout card can show the real answer instead of the old chain-wide "most recently verified" heuristic. Only consulted when `sources.blockscout.status !== "not_configured"` (i.e. this project actually has a registered contract to check). */
  contractDetailsPromise: Promise<ContractDetailEntry[]>;
};

const STATUS_LABEL: Record<Sources[ProviderName]["status"], string> = {
  live: "Live",
  unavailable: "Unavailable",
  not_configured: "Not Configured",
};

/**
 * PR-075 — the fixed, canonical status vocabulary every provider card must
 * resolve to. Replaces PR-074's taxonomy (which had "No Asset Exists" and
 * a bare technical-error fallback) with this exact set: registry-caused
 * reasons stay separate from provider-caused ones, and every remaining
 * HTTP/network failure mode gets its own real category instead of
 * collapsing into a generic "Unavailable".
 */
const LIVE = "Live";
const RATE_LIMITED = "Rate Limited";
const PROJECT_NOT_TOKENIZED = "Project Not Tokenized";
const REGISTRY_MISSING = "Registry Missing";
const PROVIDER_UNSUPPORTED = "Provider Unsupported";
const API_ERROR = "API Error";
const NETWORK_ERROR = "Network Error";
const TIMEOUT = "Timeout";
const UNKNOWN = "Unknown";
/** PR-078 §1 — real, per-project Blockscout outcomes, replacing the old chain-wide-heuristic-driven `PROVIDER_UNSUPPORTED` label for this provider. See `classifyBlockscoutVerification`. */
const CONTRACT_NOT_VERIFIED = "Contract Not Verified";
const ADDRESS_NOT_MATCHED = "Address Not Matched";

/**
 * PR-074/PR-075 DATA INTEGRITY AUDIT — replaces generic "Unavailable"/"Not
 * Configured" wording with the precise, real reason, matched against the
 * exact, finite set of `detail` strings `lib/intelligence/sources.ts`
 * actually produces (every one confirmed live against real provider
 * responses during this audit — see that file's `matchMarket`/
 * `matchTrading`/`matchTvl`/`matchVerifiedContract`/`matchGithub`). Falls
 * back to `UNKNOWN` (never a fabricated specific-sounding category) for
 * any detail this hasn't seen before.
 */
function classifySourceLabel(
  status: Sources[ProviderName]["status"],
  detail: string | null,
  provider: ProviderName,
  projectIsTokenized: boolean
): string {
  if (status === "live") return LIVE;
  if (!detail) return status === "not_configured" ? REGISTRY_MISSING : UNKNOWN;

  if (detail === "Rate limit exceeded" || /request failed: (403|429)/.test(detail)) {
    return RATE_LIMITED;
  }

  // not_configured — the registry itself never gave this provider an id/
  // slug/address/repo to look up.
  if (status === "not_configured") {
    if (provider === "dexscreener" && /No dexscreenerPairAddresses configured/.test(detail)) {
      // PR-075 FINAL — `matchTrading` reaches this branch whenever this
      // project has no registered Base token *contract*, which is a
      // narrower, purely registry-side fact than "this project has no
      // token at all." A project can be genuinely, verifiably tokenized
      // (CoinGecko is live, real price/market cap on screen) while still
      // lacking a `contracts` entry or `dexscreenerPairAddresses` — that
      // combination previously rendered "Project Not Tokenized" next to a
      // real price and market cap on the same page, a real, confirmed,
      // trust-damaging contradiction (found live on Uniswap during the
      // PR-075 FINAL sign-off audit). `projectIsTokenized` (CoinGecko
      // returning live data) is the one real, non-fabricated signal this
      // component already has for "does this project actually have a
      // token" — only fall back to Project Not Tokenized when that's false.
      return projectIsTokenized ? REGISTRY_MISSING : PROJECT_NOT_TOKENIZED;
    }
    return REGISTRY_MISSING;
  }

  // unavailable — something WAS configured, but didn't resolve.
  // A configured id/slug/address that the provider doesn't recognize is,
  // at root, the same registry-data problem as nothing being configured at
  // all (stale/wrong value) — folded into REGISTRY_MISSING rather than a
  // separate "doesn't exist" bucket, per the current fixed vocabulary.
  if (/^No CoinGecko market found for id/.test(detail) || /^No DefiLlama protocol matched slug/.test(detail)) {
    return REGISTRY_MISSING;
  }
  if (/^No DexScreener pair found for the registered token contract/.test(detail)) {
    return REGISTRY_MISSING;
  }
  if (/^Configured pair address\(es\) were not found in the current trending-pairs result$/.test(detail)) {
    return PROVIDER_UNSUPPORTED;
  }
  // PR-078 §1 — the old "was this project's contract the single, chain-wide
  // most-recently-verified one on Base" branch is gone: that heuristic is
  // no longer what decides the Blockscout card's wording (see
  // `classifyBlockscoutVerification` + `ProfileSourcesBlockscoutAsync`,
  // which use the real per-address `getContractDetail` answer instead).
  // This function's blockscout-detail branches below now only ever see a
  // genuine transport failure (network/API/timeout) surfaced by that async
  // path, never the old always-almost-a-miss heuristic string.
  if (/request failed: 404/.test(detail)) {
    return REGISTRY_MISSING;
  }
  if (/request failed: 5\d{2}/.test(detail)) {
    return API_ERROR;
  }
  if (/timed out/i.test(detail)) {
    return TIMEOUT;
  }
  // `toProviderError`'s fallback branch (`common/errors.ts`) stamps any
  // non-HTTP, non-timeout failure's raw `message` straight through — real
  // network-level failures (DNS, connection refused/reset, TLS) surface
  // with these exact substrings from Node's own `fetch` implementation.
  if (/fetch failed|ECONNREFUSED|ECONNRESET|ENOTFOUND|EAI_AGAIN|network/i.test(detail)) {
    return NETWORK_ERROR;
  }

  return UNKNOWN;
}

/**
 * PR-079 Section 9 — a UI-layer-only grouping for "Things We Couldn't
 * Verify," derived purely by pattern-matching the exact, fixed set of real
 * strings `buildThingsWeCouldntVerify` (`lib/intelligence/report.ts`)
 * already produces — every one of those strings already states its own
 * real reason after an em-dash (e.g. "Discord's API requires bot-level
 * server access this app doesn't have"); this only sorts them into the
 * spec's category vocabulary so a reader can scan by cause. Deliberately
 * does not touch `lib/intelligence/report.ts` or the `string[]` shape it
 * returns — grouping is presentation only, per the standing instruction to
 * minimize changes to shared intelligence/report logic.
 */
export function categorizeVerificationGap(reason: string): string {
  if (/no .*integration exists|doesn't currently (track|support)|isn't (tracked|supported)/i.test(reason)) {
    return "Unsupported";
  }
  if (/not configured|no .* configured|registry/i.test(reason)) {
    return "Registry Limitation";
  }
  if (/\bAPI\b/i.test(reason)) {
    return "API Limitation";
  }
  return "Provider Limitation";
}

export type BlockscoutVerificationOutcome = {
  status: Sources[ProviderName]["status"];
  badgeLabel: string;
  description: string;
};

/**
 * PR-078 §1 — the real, per-project Blockscout verification answer, built
 * from `getContractDetail`'s per-address result (already fetched for the
 * Contracts section) instead of `sources.ts`'s old chain-wide "most
 * recently verified contract on Base" heuristic. That heuristic is real —
 * it checked something true — but the thing it checked almost never
 * matches any specific project's contract by construction, which is why it
 * read "Provider Unsupported" even for projects (confirmed live: Aave)
 * whose contract Blockscout has verified and on record. This asks the
 * right question instead: does Blockscout say THIS project's registered
 * address is verified, a real-but-unverified contract, or not a contract
 * at all.
 */
export function classifyBlockscoutVerification(entries: ContractDetailEntry[]): BlockscoutVerificationOutcome {
  if (entries.length === 0) {
    return {
      status: "not_configured",
      badgeLabel: REGISTRY_MISSING,
      description: "No Base contract address is configured on this project's registry entry — there is nothing for Blockscout to look up.",
    };
  }

  let anyVerified = false;
  let anyRealContract = false;
  let anyOk = false;
  let firstFailureDetail: string | null = null;

  for (const entry of entries) {
    if (entry.result.ok) {
      anyOk = true;
      if (entry.result.data.verified) anyVerified = true;
      if (entry.result.data.isContract) anyRealContract = true;
    } else if (!firstFailureDetail) {
      firstFailureDetail = entry.result.error.message;
    }
  }

  if (anyVerified) {
    return {
      status: "live",
      badgeLabel: LIVE,
      description: "Blockscout confirms this project's registered contract is verified — real, on-record source code and compiler metadata.",
    };
  }
  if (anyOk && anyRealContract) {
    return {
      status: "unavailable",
      badgeLabel: CONTRACT_NOT_VERIFIED,
      description:
        "Blockscout recognizes this project's registered address as a real contract, but has no verified source code on record for it. This is a real state of the contract itself, not a Blockscout limitation.",
    };
  }
  if (anyOk) {
    return {
      status: "unavailable",
      badgeLabel: ADDRESS_NOT_MATCHED,
      description:
        "The address configured in Base Radar's registry is not recognized as a smart contract by Blockscout — likely a stale or incorrect registry entry, not a provider issue.",
    };
  }

  // Every lookup failed outright (network/API/timeout/rate-limit, not a 404)
  // — reuse the same real, transport-failure classification every other
  // provider card already uses, rather than a second copy of that logic.
  return {
    status: "unavailable",
    badgeLabel: classifySourceLabel("unavailable", firstFailureDetail, "blockscout", false),
    description: describeUnavailable(firstFailureDetail, "blockscout"),
  };
}

const STATUS_ICON: Record<Sources[ProviderName]["status"], LucideIcon> = {
  live: CheckCircle2,
  unavailable: XCircle,
  not_configured: CircleSlash,
};

const STATUS_CLASS: Record<Sources[ProviderName]["status"], string> = {
  live: "text-radar-success",
  unavailable: "text-radar-danger",
  not_configured: "text-radar-light-muted dark:text-radar-muted",
};

const STATUS_BG: Record<Sources[ProviderName]["status"], string> = {
  live: "bg-radar-success/10",
  unavailable: "bg-radar-danger/10",
  not_configured: "bg-radar-light-muted/10 dark:bg-radar-muted/10",
};

/**
 * PR-074 REVIEW #8 — same generic `{ remaining, limit, resetAt }` shape
 * (`common/rate-limit.ts`'s `getRateLimitStatus`) for every non-GitHub
 * provider, keyed by `ProviderName` so `describeUnavailable` can look one up
 * without a long if/else chain. GitHub is deliberately excluded — it already
 * has a richer, response-header-based diagnostic (`authenticated`/quota-mode
 * text) via `getGithubRateLimitStatus`, handled as its own branch below.
 */
const SHARED_RATE_LIMIT_GETTERS: Partial<Record<ProviderName, () => { remaining: number; limit: number; resetAt: string } | null>> = {
  dexscreener: getDexscreenerRateLimitStatus,
  blockscout: getBlockscoutRateLimitStatus,
  coingecko: getCoingeckoRateLimitStatus,
  defillama: getDefillamaRateLimitStatus,
  base: getBaseRateLimitStatus,
};

/** Formats a real `{remaining, limit, resetAt}` reading into the same sentence shape GitHub's diagnostic already uses. */
function describeSharedRateLimit(status: { remaining: number; limit: number; resetAt: string }): string {
  const minutesLeft = Math.max(0, Math.round((new Date(status.resetAt).getTime() - Date.now()) / 60_000));
  return `Base Radar's own request budget for this provider is exhausted — ${status.remaining}/${status.limit} requests remaining this window. Resets in ${minutesLeft} minute${minutesLeft === 1 ? "" : "s"}.`;
}

/**
 * Reads GitHub's real `x-ratelimit-*` snapshot and formats it — shared by
 * both the app's-own-throttle branch and the external-HTTP-403/429 branch
 * below, since GitHub can hit either cause and both deserve the same real
 * diagnostic. `null` when no GitHub request has populated the tracker yet.
 */
function describeGithubRateLimit(): string | null {
  const snapshot = getGithubRateLimitStatus();
  if (!snapshot) return null;
  const minutesLeft = Math.max(0, Math.round((new Date(snapshot.resetAt).getTime() - Date.now()) / 60_000));
  const mode = snapshot.authenticated ? "authenticated" : "unauthenticated (no GITHUB_TOKEN configured)";
  return `Rate limited by GitHub's public API — ${snapshot.remaining}/${snapshot.limit} requests remaining (${mode}). Resets in ${minutesLeft} minute${minutesLeft === 1 ? "" : "s"}.`;
}

/**
 * PR-078 §4 — a real, one-line diagnostic for a LIVE provider card: GitHub's
 * authenticated/unauthenticated mode plus its exact remaining/limit budget
 * (from the same `x-ratelimit-*` tracker `describeGithubRateLimit` already
 * reads), or the shared app-enforced remaining/limit for every other
 * provider that tracks one. `null` whenever nothing has actually been
 * recorded yet (e.g. this provider hasn't been called in this process) —
 * never a fabricated or estimated number.
 */
function describeLiveProviderMeta(provider: ProviderName): string | null {
  if (provider === "github") {
    const snapshot = getGithubRateLimitStatus();
    if (!snapshot) return null;
    const mode = snapshot.authenticated ? "Authenticated" : "Unauthenticated";
    return `${mode} · ${snapshot.remaining}/${snapshot.limit} per hour`;
  }
  const status = SHARED_RATE_LIMIT_GETTERS[provider]?.();
  if (!status) return null;
  return `${status.remaining}/${status.limit} requests remaining`;
}

/**
 * PR-050 final pass — every provider's HTTP failures go through the same
 * `ProviderHttpError` shape (`"${provider} request failed: ${status} ${url}"`,
 * `lib/providers/common/utilities.ts`), so a raw "Unavailable" status here
 * used to leak that technical string verbatim (e.g. GitHub's 403 from its
 * unauthenticated-API rate limit). This maps the real, already-known status
 * code embedded in that message to the actual cause — never a guess: 403/429
 * on this codebase's providers only ever means the free-tier rate limit,
 * 404 means the configured resource wasn't found, 5xx means the provider's
 * own server error, and a timeout is detected from the same message
 * `ProviderTimeoutError` always uses. Anything that doesn't match one of
 * these known shapes falls back to the original detail, unchanged.
 *
 * PR-074 REVIEW #11 — for GitHub specifically, a 403/429 is upgraded from
 * the generic rate-limit sentence to a real diagnostic reading GitHub's own
 * `x-ratelimit-*` headers (`lib/providers/github/rateLimit.ts`, populated by
 * every real GitHub request this process makes): exact remaining/limit and a
 * countdown to when it actually resets, rather than a vague "try later."
 *
 * PR-074 REVIEW #8 — the same transparency now applies to DexScreener,
 * Blockscout, CoinGecko, DefiLlama, and Base RPC via
 * `SHARED_RATE_LIMIT_GETTERS`. Two distinct causes both need a real answer
 * here, not just one: an external HTTP 403/429 from the provider's own API
 * (caught by the `httpMatch` branch below), and this app's *own*
 * app-enforced budget rejecting the call before any network request was
 * even made (`ProviderRateLimitError`'s fixed `"Rate limit exceeded"`
 * message — a different shape that never matches the HTTP-status regex, so
 * it's checked explicitly first).
 */
export function describeUnavailable(detail: string | null, provider?: ProviderName): string {
  if (!detail) return "No reason was returned for this failure.";

  if (detail === "Rate limit exceeded") {
    // PR-074 REVIEW #5 — this branch initially only checked
    // `SHARED_RATE_LIMIT_GETTERS`, which deliberately excludes "github" (it
    // has its own richer, header-based tracker below). That meant GitHub
    // hitting *this app's own* throttle — not an external 403/429 — fell
    // through to the generic sentence instead of GitHub's real
    // remaining/limit/reset numbers, a regression confirmed live: Community
    // Metrics' GitHub tiles showed the generic message while GitHub was
    // rate-limited by this app's own budget, not GitHub's API. Mirrors the
    // `provider === "github"` branch below.
    if (provider === "github") {
      const githubMessage = describeGithubRateLimit();
      if (githubMessage) return githubMessage;
    }
    const status = provider ? SHARED_RATE_LIMIT_GETTERS[provider]?.() : null;
    if (status) return describeSharedRateLimit(status);
    return "Base Radar's own request budget for this provider is exhausted for this window. This will retry automatically once it resets.";
  }

  const httpMatch = detail.match(/request failed: (\d{3})/);
  if (httpMatch) {
    const status = Number(httpMatch[1]);
    if (status === 403 || status === 429) {
      if (provider === "github") {
        const githubMessage = describeGithubRateLimit();
        if (githubMessage) return githubMessage;
      }
      const sharedStatus = provider ? SHARED_RATE_LIMIT_GETTERS[provider]?.() : null;
      if (sharedStatus) {
        return `Rate limited by this provider's public API. ${describeSharedRateLimit(sharedStatus)}`;
      }
      return "Rate-limited by this provider's public API. This will retry automatically on the next check.";
    }
    if (status === 404) {
      return "The configured resource could not be found — it may have been renamed, removed, or misconfigured in the registry.";
    }
    if (status === 401) {
      return "This provider rejected the request as unauthorized.";
    }
    if (status >= 500) {
      return "This provider's API returned a server error. This will retry automatically.";
    }
  }
  if (/timed out/i.test(detail)) {
    return "The request to this provider timed out. This will retry automatically.";
  }
  return detail;
}

/**
 * PR-050 follow-up Req 3 — a real Source Transparency panel: every provider
 * this Engine knows how to consult (`PROVIDER_NAMES`, `lib/providers/common/types.ts`),
 * shown with its actual status for THIS project — live, unavailable (was
 * checked but errored), or not configured (this project has no id/slug for
 * it) — plus the real reason (`SourceAttribution.detail`) and last-fetched
 * time when live. This is deliberately built from the raw `input.sources`
 * object (`buildProjectIntelligence`'s own per-provider attribution), not
 * `report.sourcesUsed` — that list only names providers that are currently
 * live and have a resolvable link, which can't show "unavailable" or
 * "not configured" providers at all. The Registry itself is always listed
 * separately below, since it's the one "source" this app never fetches over
 * the network — every project's identity/category/verification comes from
 * it directly, always.
 */
/** One provider card — extracted so the panel below can render the same markup for both the Registry pseudo-source and every real provider, grouped by status instead of one flat, order-of-declaration list. */
export function SourceCard({
  label,
  status,
  badgeLabel,
  description,
  fetchedAt,
  meta,
}: {
  label: string;
  status: Sources[ProviderName]["status"] | "live-registry";
  /** The precise, real reason (`classifySourceLabel`) — falls back to the coarse `STATUS_LABEL` only for the Registry pseudo-source, which has no `detail`/`provider` to classify. */
  badgeLabel?: string;
  description: string;
  fetchedAt?: string | null;
  /** PR-078 §4 — a real, already-tracked diagnostic (GitHub auth mode, remaining request budget) shown alongside "Updated Ns ago" — omitted entirely when nothing real is available, never a fabricated number. */
  meta?: string | null;
}) {
  const key = status === "live-registry" ? "live" : status;
  const StatusIcon = STATUS_ICON[key];
  return (
    <div className="flex items-start gap-2.5 rounded-xl border border-radar-light-border bg-radar-light-surface p-3 dark:border-white/10 dark:bg-white/[0.02]">
      <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-lg", STATUS_BG[key])}>
        <StatusIcon className={cn("size-4 shrink-0", STATUS_CLASS[key])} aria-hidden="true" />
      </span>
      <div className="flex min-w-0 flex-col gap-0.5">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-semibold text-radar-light-text dark:text-radar-white">{label}</span>
          <span className={cn("text-[10px] font-medium uppercase tracking-wide", STATUS_CLASS[key])}>
            {badgeLabel ?? STATUS_LABEL[key]}
          </span>
        </div>
        <p className="text-[11px] leading-relaxed text-radar-light-muted dark:text-radar-muted">{description}</p>
        {(meta || fetchedAt) && (
          <span className="text-[10px] text-radar-light-muted/80 dark:text-radar-muted/70">
            {meta}
            {meta && fetchedAt && " · "}
            {fetchedAt && (
              <>
                Updated <RelativeTime iso={fetchedAt} />
              </>
            )}
          </span>
        )}
      </div>
    </div>
  );
}

/**
 * PR-078 §1 — a neutral "still checking" placeholder for the Blockscout
 * card while `contractDetailsPromise` resolves. Wrapped by the caller in
 * `data-loading-skeleton`, the same marker every other extended-data
 * placeholder on this page uses to hold the splash screen open — so in
 * practice a real visitor never actually sees this card; it's only ever
 * present in the underlying HTML for the brief window before hydration
 * completes. Deliberately neutral rather than reusing the old "Provider
 * Unsupported" wording, so even that brief window never states a verdict
 * this component hasn't actually confirmed yet.
 */
function BlockscoutCheckingFallback() {
  return (
    <SourceCard
      label={PROVIDER_BRANDING.blockscout.label}
      status="unavailable"
      badgeLabel="Checking…"
      description="Looking up this project's registered contract on Blockscout…"
    />
  );
}

export function ProfileSources({ sources, thingsWeCouldntVerify, contractDetailsPromise }: ProfileSourcesProps) {
  // PR-074 FINAL POLISH — "make it feel like an observability dashboard":
  // a real, computed live/total count up top so the panel's overall health
  // reads in one glance, and providers grouped Live-first / Degraded-second
  // instead of one flat list in `PROVIDER_NAMES` declaration order — the
  // grouping itself is the signal (the reviewer's own framing: "status,
  // failure reason, retry expectation... without overwhelming the user").
  const liveCount = PROVIDER_NAMES.filter((p) => sources[p].status === "live").length;
  const liveProviders = PROVIDER_NAMES.filter((p) => sources[p].status === "live");
  const degradedProviders = PROVIDER_NAMES.filter((p) => sources[p].status !== "live");

  return (
    <ProfileSectionCard id="sources" title="Evidence & Sources" icon={Database}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <p className="text-xs leading-relaxed text-radar-light-muted dark:text-radar-muted">
          This is the underlying evidence behind the Health &amp; Trust score above — every source this project&apos;s
          report checks, whether it came back live, and why any source is missing.
        </p>
        <span className="shrink-0 text-[10.5px] font-semibold tracking-wide text-radar-light-muted uppercase dark:text-radar-muted">
          {liveCount + 1} of {PROVIDER_NAMES.length + 1} live
        </span>
      </div>

      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        <SourceCard
          label="Registry"
          status="live-registry"
          description="Project identity, category, tags, and verification status — Base Radar's own editorial registry, always available."
        />
        {liveProviders.map((provider) => {
          // PR-078 §1 — even in the (rare, fast-path) case blockscout
          // already reads "live", still swap in the real per-address
          // answer once it resolves, for the same reason the degraded-list
          // branch below does: the fast-path status is the coarse "most
          // recently verified on Base" heuristic, not this project's own
          // real verification state.
          if (provider === "blockscout") {
            return (
              <Suspense key={provider} fallback={<span data-loading-skeleton="true" className="contents"><BlockscoutCheckingFallback /></span>}>
                <ProfileSourcesBlockscoutAsync detailsPromise={contractDetailsPromise} />
              </Suspense>
            );
          }
          const attribution = sources[provider];
          const branding = PROVIDER_BRANDING[provider];
          // PR-075 — `status: "live"` covers both a genuinely fresh success
          // and real-but-stale cached data (see `matchGithub`); this is the
          // one place that distinction has to stay visible rather than
          // both reading as an identical green "Live" card.
          return (
            <SourceCard
              key={provider}
              label={branding.label}
              status="live"
              badgeLabel={attribution.stale ? "Stale" : undefined}
              description={attribution.stale ? (attribution.detail ?? branding.description) : branding.description}
              fetchedAt={attribution.fetchedAt}
              meta={describeLiveProviderMeta(provider)}
            />
          );
        })}
      </div>

      {degradedProviders.length > 0 && (
        <div className="flex flex-col gap-2 border-t border-radar-light-border pt-3 dark:border-white/10">
          <span className="text-[10.5px] font-semibold tracking-wider text-radar-light-muted uppercase dark:text-radar-muted">
            Degraded ({degradedProviders.length})
          </span>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {degradedProviders.map((provider) => {
              const attribution = sources[provider];
              const branding = PROVIDER_BRANDING[provider];
              // PR-078 §1 — blockscout with a registered contract to check
              // (i.e. not the "no contract configured" case, which the
              // static card below already describes correctly) gets the
              // real per-address answer instead of the old chain-wide
              // heuristic's near-always-a-miss "Provider Unsupported".
              if (provider === "blockscout" && attribution.status !== "not_configured") {
                return (
                  <Suspense key={provider} fallback={<span data-loading-skeleton="true" className="contents"><BlockscoutCheckingFallback /></span>}>
                    <ProfileSourcesBlockscoutAsync detailsPromise={contractDetailsPromise} />
                  </Suspense>
                );
              }
              const failureReason =
                attribution.status === "unavailable"
                  ? describeUnavailable(attribution.detail, provider)
                  : (attribution.detail ?? "Not consulted for this project.");
              // PR-079 Section 8 — a degraded card only ever showed why it
              // failed; appending what the provider would normally
              // contribute (the same `branding.description` live cards
              // already show) means a reader learns what's actually
              // missing, not just that something broke.
              const description = `${failureReason} Normally provides: ${branding.description}`;
              const badgeLabel = classifySourceLabel(attribution.status, attribution.detail, provider, sources.coingecko.status === "live");
              return (
                <SourceCard
                  key={provider}
                  label={branding.label}
                  status={attribution.status}
                  badgeLabel={badgeLabel}
                  description={description}
                />
              );
            })}
          </div>
        </div>
      )}

      {thingsWeCouldntVerify.length > 0 && (
        <div className="flex flex-col gap-3 border-t border-radar-light-border pt-4 dark:border-white/10">
          <div className="flex items-center gap-1.5">
            <HelpCircle className="size-3.5 shrink-0 text-radar-light-muted dark:text-radar-muted" aria-hidden="true" />
            <span className="text-[10.5px] font-semibold tracking-wider text-radar-light-muted uppercase dark:text-radar-muted">
              Things We Couldn&apos;t Verify
            </span>
          </div>
          {Object.entries(
            thingsWeCouldntVerify.reduce<Record<string, string[]>>((groups, item) => {
              const category = categorizeVerificationGap(item);
              (groups[category] ??= []).push(item);
              return groups;
            }, {})
          ).map(([category, items]) => (
            <div key={category} className="flex flex-col gap-1.5">
              <span className="text-[10px] font-medium tracking-wide text-radar-light-muted/70 uppercase dark:text-radar-muted/60">
                {category}
              </span>
              <ul className="flex flex-col gap-1.5">
                {items.map((item, index) => (
                  <li key={index} className="text-sm leading-relaxed text-radar-light-text dark:text-radar-white">
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </ProfileSectionCard>
  );
}
