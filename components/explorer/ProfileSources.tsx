import { CheckCircle2, CircleSlash, Database, HelpCircle, XCircle, type LucideIcon } from "lucide-react";

import { ProfileSectionCard } from "@/components/explorer/ProfileSectionCard";
import { PROVIDER_BRANDING } from "@/lib/branding/providers";
import { formatRelativeTime } from "@/lib/data/format";
import { PROVIDER_NAMES, type ProviderName } from "@/lib/providers/common/types";
import { cn } from "@/lib/utils";
import type { Sources } from "@/lib/intelligence/types";

type ProfileSourcesProps = {
  sources: Sources;
  /** Genuinely unavailable data, scoped to what actually applies to this project (`buildThingsWeCouldntVerify`) — hidden entirely when nothing applies. */
  thingsWeCouldntVerify: string[];
};

const STATUS_LABEL: Record<Sources[ProviderName]["status"], string> = {
  live: "Live",
  unavailable: "Unavailable",
  not_configured: "Not Configured",
};

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
 */
function describeUnavailable(detail: string | null): string {
  if (!detail) return "No reason was returned for this failure.";
  const httpMatch = detail.match(/request failed: (\d{3})/);
  if (httpMatch) {
    const status = Number(httpMatch[1]);
    if (status === 403 || status === 429) {
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
export function ProfileSources({ sources, thingsWeCouldntVerify }: ProfileSourcesProps) {
  return (
    <ProfileSectionCard id="sources" title="Evidence & Sources" icon={Database}>
      <p className="text-xs leading-relaxed text-radar-light-muted dark:text-radar-muted">
        This is the underlying evidence behind the Health &amp; Trust score above — every source this project&apos;s report
        checks, whether it came back live, and why any source is missing.
      </p>

      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        <div className="flex items-start gap-2.5 rounded-xl border border-radar-light-border bg-radar-light-surface p-3 dark:border-white/10 dark:bg-white/[0.02]">
          <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-lg", STATUS_BG.live)}>
            <CheckCircle2 className={cn("size-4 shrink-0", STATUS_CLASS.live)} aria-hidden="true" />
          </span>
          <div className="flex min-w-0 flex-col gap-0.5">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-semibold text-radar-light-text dark:text-radar-white">Registry</span>
              <span className={cn("text-[10px] font-medium uppercase tracking-wide", STATUS_CLASS.live)}>{STATUS_LABEL.live}</span>
            </div>
            <p className="text-[11px] leading-relaxed text-radar-light-muted dark:text-radar-muted">
              Project identity, category, tags, and verification status — Base Radar&apos;s own editorial registry, always
              available.
            </p>
          </div>
        </div>

        {PROVIDER_NAMES.map((provider) => {
          const attribution = sources[provider];
          const branding = PROVIDER_BRANDING[provider];
          const StatusIcon = STATUS_ICON[attribution.status];
          return (
            <div
              key={provider}
              className="flex items-start gap-2.5 rounded-xl border border-radar-light-border bg-radar-light-surface p-3 dark:border-white/10 dark:bg-white/[0.02]"
            >
              <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-lg", STATUS_BG[attribution.status])}>
                <StatusIcon className={cn("size-4 shrink-0", STATUS_CLASS[attribution.status])} aria-hidden="true" />
              </span>
              <div className="flex min-w-0 flex-col gap-0.5">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-xs font-semibold text-radar-light-text dark:text-radar-white">{branding.label}</span>
                  <span className={cn("text-[10px] font-medium uppercase tracking-wide", STATUS_CLASS[attribution.status])}>
                    {STATUS_LABEL[attribution.status]}
                  </span>
                </div>
                <p className="text-[11px] leading-relaxed text-radar-light-muted dark:text-radar-muted">
                  {attribution.status === "live"
                    ? branding.description
                    : attribution.status === "unavailable"
                      ? describeUnavailable(attribution.detail)
                      : (attribution.detail ?? "Not consulted for this project.")}
                </p>
                {attribution.status === "live" && attribution.fetchedAt && (
                  <span className="text-[10px] text-radar-light-muted/80 dark:text-radar-muted/70">
                    Updated {formatRelativeTime(attribution.fetchedAt)}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {thingsWeCouldntVerify.length > 0 && (
        <div className="flex flex-col gap-2 border-t border-radar-light-border pt-4 dark:border-white/10">
          <div className="flex items-center gap-1.5">
            <HelpCircle className="size-3.5 shrink-0 text-radar-light-muted dark:text-radar-muted" aria-hidden="true" />
            <span className="text-[10.5px] font-semibold tracking-wider text-radar-light-muted uppercase dark:text-radar-muted">
              Things We Couldn&apos;t Verify
            </span>
          </div>
          <ul className="flex flex-col gap-1.5">
            {thingsWeCouldntVerify.map((item, index) => (
              <li key={index} className="text-sm leading-relaxed text-radar-light-text dark:text-radar-white">
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}
    </ProfileSectionCard>
  );
}
