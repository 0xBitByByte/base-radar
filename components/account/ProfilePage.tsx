"use client";

/**
 * V3-PROFILE-002/003 — the dedicated `/dashboard/profile` page. V3-PROFILE-002
 * built it as the modal's replacement (a form: avatar + three fields).
 * V3-PROFILE-003 evolves it into an account overview: the hero now answers
 * "who is this user" before any editable field appears, in that order. No
 * new persistence, validation, or storage in either pass — every read/write
 * still goes through the exact same `lib/account/service.ts` (via
 * `useAccount()`), `lib/wallet/*`/`useWallet()`, and
 * `lib/personalization/*`/`useWatchlists()` the rest of the app already
 * uses. This file only arranges UI.
 *
 * Section order (V3-PROFILE-003, item 8; PR-093 appends Recently Viewed and
 * Privacy & Local Data at the end): Hero (incl. Quick Actions) → Profile
 * Completion → Wallet → Identity → Preferences → Connected Accounts →
 * Recently Viewed → Privacy & Local Data — overview, then a lightweight
 * nudge, then management, with Identity (the only section that's a form)
 * pushed down and visually quieted rather than leading the page.
 *
 * Section-by-section reuse:
 *   - Hero: `useWallet()`'s already-resolved `ensName`/`chainId` and
 *     `account.updatedAt` — no new data source for any of the overview
 *     fields.
 *   - Wallet: `useWallet()` + the same `EmptyState`+`WalletButton`
 *     disconnected-state pattern `WalletPortfolioPage.tsx` already
 *     established, plus `ChainBadge`/`CopyButton`/`GlowBadge`. Release 1
 *     Phase D adds real SIWE sign-in directly into this section
 *     (`WalletAuthRow`, via `useAuthSession()`) rather than a new page —
 *     authentication has no meaning without a connected wallet, so it
 *     belongs where wallet state already lives.
 *   - Connected Accounts: `useWallet()`'s `ensName` — no new data source.
 *     Farcaster/Discord/GitHub/X have no linking backend anywhere in this
 *     app, so they're named only in this section's own description text as
 *     future candidates, never rendered as individual fake rows.
 *   - Preferences: `ThemeToggle` (icon variant) and `WatchlistSelector` +
 *     `useWatchlists()` — both already-built, already-used components.
 *   - Profile Completion: derived entirely from fields already read above
 *     (`account.avatar`, `wallet.isConnected`, `account.email`,
 *     `wallet.ensName`) plus one honest, permanently-incomplete item
 *     (Social Accounts — no backend exists to ever mark it done).
 *   - AI Preferences: intentionally renders nothing, same as V3-PROFILE-002
 *     — no real data source or natural settings location anywhere in this
 *     codebase yet.
 *   - Recently Viewed (PR-093.04): `useRecentlyViewed()`, the same
 *     `useSyncExternalStore` pattern as every other local store on this
 *     page — real Project Profile page visits, tracked by
 *     `components/explorer/RecordProjectView.tsx`.
 *   - Privacy & Local Data (PR-093.06): `lib/privacy/localData.ts`'s honest,
 *     prefix-based introspection of this device's real `localStorage` — the
 *     one genuinely buildable "Security" capability in an app with no
 *     backend, session, or device layer. See that module's own doc comment.
 *
 * Navigation (item 7): no breadcrumb was added. `Topbar.tsx`'s own doc
 * comment already records the app's real precedent here — the generic
 * route breadcrumb was removed and every flat top-level page (Dashboard,
 * Watchlists, Alerts, Automation, Settings, Notifications) was "confirmed
 * to want no breadcrumb at all"; only nested `/dashboard/projects/[slug]/*`
 * sub-routes get one (`ProjectSubpageBreadcrumb`/`ProfileBreadcrumb`).
 * `/dashboard/profile` is a flat top-level page in that same sense, so
 * adding one here would contradict this app's own documented decision
 * rather than follow it.
 *
 * Future architecture (item 9): Preferences stays inside this page for now
 * rather than being split into `/dashboard/preferences` — it's one small
 * section today, and extracting a route for two rows would be premature.
 * It already lives in its own `SectionCard`, reading only from
 * `useWatchlists()`/`next-themes`, so lifting it to its own route later is
 * moving one function and a `page.tsx`, not a rewrite. Privacy & Local Data
 * (PR-093.06) is the honest ceiling of what "Security" can be without a
 * real auth/session/device layer — see `docs/PRODUCT_BIBLE/07_ENGINEERING_ROADMAP.md`
 * for why that layer is deliberately a future, separately-sequenced release.
 */

import { useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Switch } from "@base-ui/react/switch";
import { base, baseSepolia } from "viem/chains";
import {
  AlertTriangle,
  Check,
  ChevronDown,
  Circle,
  Clock,
  Database,
  Fingerprint,
  Globe,
  History,
  KeyRound,
  Loader2,
  LogOut,
  Palette,
  ShieldCheck,
  Trash2,
  Upload,
  User,
  Wallet,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { useAccount } from "@/lib/hooks/useAccount";
import { useAuthSession } from "@/lib/hooks/useAuthSession";
import { useRecentlyViewed } from "@/lib/hooks/useRecentlyViewed";
import { useWallet } from "@/lib/hooks/useWallet";
import { useWatchlists } from "@/lib/hooks/useWatchlists";
import { clearAllLocalData, listLocalDataEntries } from "@/lib/privacy/localData";
import { getWalletExplorerAddressUrl } from "@/lib/wallet/chains";
import { shortenAddress } from "@/lib/wallet/format";
import { BIO_MAX_LENGTH, type ProfileValidationError } from "@/lib/account/types";
import { formatDateForLocale, formatNumberForLocale, formatPriceForLocale } from "@/lib/data/format";
import { useLocalePreference } from "@/lib/hooks/useLocalePreference";
import { SUPPORTED_LOCALES } from "@/lib/locale/preferences";
import { useDashboardLayoutPreferences } from "@/lib/hooks/useDashboardLayoutPreferences";
import { DASHBOARD_WIDGETS, type DashboardWidgetTier } from "@/lib/dashboard-layout/types";
import { useLinkedWallets } from "@/lib/hooks/useLinkedWallets";
import { AccountAvatar } from "@/components/account/AccountAvatar";
import { ChainBadge } from "@/components/branding/ChainBadge";
import { WalletButton } from "@/components/wallet/WalletButton";
import { WatchlistSelector } from "@/components/watchlists/WatchlistSelector";
import { CopyButton } from "@/components/ui/CopyButton";
import { EmptyState } from "@/components/ui/EmptyState";
import { GlowBadge } from "@/components/ui/GlowBadge";
import { RelativeTime } from "@/components/shared/RelativeTime";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { GLASS_SURFACE_STATIC } from "@/components/ui/glassStyles";

const FIELD_CLASS =
  "w-full rounded-xl border border-radar-light-border bg-transparent px-3 py-2.5 text-sm text-radar-light-text outline-none placeholder:text-radar-light-muted transition-colors focus-visible:ring-2 focus-visible:ring-radar-primary/50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:text-radar-white dark:placeholder:text-radar-muted";

const LABEL_CLASS = "text-xs font-medium text-radar-light-text dark:text-radar-white";

const ERROR_MESSAGES: Record<ProfileValidationError, string> = {
  "empty-name": "Display name can't be empty.",
  "empty-username": "Username can't be empty.",
  "invalid-username": "Username must be 3–20 characters — letters, numbers, and underscores only.",
  "invalid-email": "Enter a valid email address, or leave it blank.",
  "duplicate-username": "That username is already taken.",
  "bio-too-long": `Bio can't be longer than ${BIO_MAX_LENGTH} characters.`,
};

const NAME_ERRORS: ProfileValidationError[] = ["empty-name"];
const USERNAME_ERRORS: ProfileValidationError[] = ["empty-username", "invalid-username", "duplicate-username"];
const EMAIL_ERRORS: ProfileValidationError[] = ["invalid-email"];
const BIO_ERRORS: ProfileValidationError[] = ["bio-too-long"];

function FieldError({ id, errors, of }: { id: string; errors: ProfileValidationError[]; of: ProfileValidationError[] }) {
  const match = errors.find((error) => of.includes(error));
  if (!match) return null;
  return (
    <p id={id} role="alert" className="text-xs text-radar-danger">
      {ERROR_MESSAGES[match]}
    </p>
  );
}

/** The one real chain this app's wallet layer supports, resolved the same way `WalletButton.tsx`'s own trigger already does — shared here since both the Hero and the Wallet section need it. */
function chainKeyFor(chainId: number | undefined): "base" | "base-sepolia" | null {
  if (chainId === base.id) return "base";
  if (chainId === baseSepolia.id) return "base-sepolia";
  return null;
}

/**
 * The one shell every section below renders into — icon + title +
 * description header, then a bordered body — the same shape
 * `NotificationPreferencesPage.tsx` already established for
 * `/dashboard/settings/*`. Local to this file: every section here uses it,
 * but nothing outside this page does yet, so it isn't promoted to a shared
 * component until a second page actually needs the identical shape.
 */
/**
 * `collapsible`/`defaultOpen` (Bug 1 vertical-scroll fix) — an opt-in
 * extension of the same collapsed-by-default idiom this file already uses
 * twice (Identity's Avatar editor, Preferences' Dashboard Widgets panel):
 * the header (icon/title/description + optional `summary`, e.g. an item
 * count) always stays visible, only the body collapses — nothing is
 * removed, just deferred behind one click, for the two sections
 * (`RecentlyViewedSection`, `LocalDataSection`) that are reference/
 * management content rather than at-a-glance identity or wallet info.
 */
function SectionCard({
  id,
  icon: Icon,
  title,
  description,
  children,
  collapsible = false,
  defaultOpen = true,
  summary,
}: {
  id?: string;
  icon: LucideIcon;
  title: string;
  description: string;
  children: ReactNode;
  collapsible?: boolean;
  defaultOpen?: boolean;
  summary?: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const headingId = `profile-section-${title.toLowerCase().replace(/\s+/g, "-")}-heading`;
  const bodyId = `${headingId}-body`;

  const header = (
    <div className="flex items-start gap-2.5">
      <Icon className="mt-0.5 size-4 shrink-0 text-radar-primary dark:text-radar-accent" aria-hidden="true" />
      <div className="flex flex-col gap-0.5">
        <h2 id={headingId} className="text-sm font-semibold text-radar-light-text dark:text-radar-white">
          {title}
        </h2>
        <p className="text-xs text-radar-light-muted dark:text-radar-muted">{description}</p>
      </div>
    </div>
  );

  return (
    <section id={id} aria-labelledby={headingId} className={cn("flex flex-col gap-4 p-5 sm:p-6", GLASS_SURFACE_STATIC)}>
      {collapsible ? (
        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          aria-expanded={open}
          aria-controls={bodyId}
          className="flex items-start justify-between gap-3 text-left outline-none"
        >
          {header}
          <span className="mt-0.5 flex shrink-0 items-center gap-2 text-xs font-medium text-radar-light-muted dark:text-radar-muted">
            {summary}
            <ChevronDown className={cn("size-4 shrink-0 transition-transform duration-200", open && "rotate-180")} aria-hidden="true" />
          </span>
        </button>
      ) : (
        header
      )}

      {collapsible ? (
        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              id={bodyId}
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="overflow-hidden"
            >
              {children}
            </motion.div>
          )}
        </AnimatePresence>
      ) : (
        children
      )}
    </section>
  );
}

/** Same idiom `components/explorer/ProfileKeySignals.tsx` already uses for jump-to-section links — id-based `scrollIntoView`, respecting reduced motion, with a brief highlight ring so the destination is obvious even after an instant jump. */
function scrollToAndHighlight(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  el.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
  el.classList.add("ring-2", "ring-radar-primary/50", "dark:ring-radar-accent/50");
  window.setTimeout(() => el.classList.remove("ring-2", "ring-radar-primary/50", "dark:ring-radar-accent/50"), 1600);
}

const QUICK_ACTION_CLASS =
  "flex items-center gap-1.5 rounded-lg border border-radar-light-border px-2.5 py-1.5 text-xs font-medium text-radar-light-text outline-none transition-colors hover:bg-radar-light-surface focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:border-white/10 dark:text-radar-white dark:hover:bg-white/5";

/**
 * Hero — the account overview. Answers "who is this user" before anything
 * editable: large avatar, name, @username, a Guest/Connected badge, then an
 * info strip of real metadata (wallet status, network, ENS, last update) as
 * plain text rather than a form.
 *
 * V3-PROFILE-004 — Quick Actions is down to just "Change Avatar" (was:
 * Change Avatar, Open Wallet, Copy Wallet Address, View on Basescan,
 * Disconnect Wallet). The four wallet actions duplicated, verbatim, the
 * `WalletSection` immediately below it (one card away, per this page's own
 * section order) — a connected user saw "Open Wallet"/"Disconnect Wallet"
 * and effectively the same address/explorer actions twice within one
 * viewport-and-a-half. Removed rather than kept "for convenience": the
 * Wallet section is the one, first-class place those actions live now, and
 * a hero that's just an avatar, identity, and one action reads as lighter —
 * exactly what "keep the hero visually lightweight" asks for. The
 * chain/ENS/last-update info strip stays: that's a glance-vs-detail split
 * with `WalletSection` (summary here, full rows there), not a duplication
 * of the same control.
 */
function ProfileHeaderSection({
  name,
  username,
  avatar,
  isGuest,
  updatedAt,
  onOpenAvatarEditor,
  wallet,
}: {
  name: string;
  username: string;
  avatar: string | null;
  isGuest: boolean;
  updatedAt: string;
  onOpenAvatarEditor: () => void;
  wallet: ReturnType<typeof useWallet>;
}) {
  const { isConnected, ensName, chainId } = wallet;
  const chainKey = chainKeyFor(chainId);

  return (
    <div className="flex flex-col items-center gap-4 py-4 text-center">
      <AccountAvatar account={{ name, avatar }} size="2xl" />
      <div className="flex flex-col items-center gap-1">
        <h1 className="text-2xl font-semibold text-radar-light-text dark:text-radar-white">{name || "Your account"}</h1>
        {username && <p className="text-sm text-radar-light-muted dark:text-radar-muted">@{username}</p>}
      </div>

      <GlowBadge color={isGuest ? "muted" : "success"} dot={!isGuest}>
        {isGuest ? "Guest Account" : "Connected Account"}
      </GlowBadge>

      {/* Information hierarchy, not a form — real metadata only. */}
      <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 text-xs text-radar-light-muted dark:text-radar-muted">
        <span className="flex items-center gap-1.5">
          <Wallet className="size-3.5 shrink-0" aria-hidden="true" />
          {isConnected ? "Wallet Connected" : "No Wallet"}
        </span>
        {isConnected && chainKey && (
          <>
            <span aria-hidden="true">·</span>
            <ChainBadge chain={chainKey} size="sm" bare />
          </>
        )}
        {isConnected && ensName && (
          <>
            <span aria-hidden="true">·</span>
            <span className="flex items-center gap-1.5">
              <Fingerprint className="size-3.5 shrink-0" aria-hidden="true" />
              {ensName}
            </span>
          </>
        )}
        <span aria-hidden="true">·</span>
        <span className="flex items-center gap-1.5">
          <Clock className="size-3.5 shrink-0" aria-hidden="true" />
          Updated <RelativeTime iso={updatedAt} />
        </span>
      </div>

      <button type="button" onClick={onOpenAvatarEditor} className={QUICK_ACTION_CLASS}>
        <User className="size-3.5 shrink-0" aria-hidden="true" />
        Change Avatar
      </button>
    </div>
  );
}

type CompletionItem = { label: string; done: boolean };

/**
 * A lightweight checklist, not a percentage or a progress bar — each item
 * is backed by a real field already read elsewhere on this page
 * (`account.avatar`, `wallet.isConnected`, `account.email`,
 * `wallet.ensName`); "Social Accounts" is permanently unchecked since no
 * linking backend exists anywhere in this app to ever satisfy it. No
 * per-item borders or boxes — a single soft card with a wrapped list reads
 * as a quiet nudge, not a gamified widget.
 */
function ProfileCompletionSection({ items }: { items: CompletionItem[] }) {
  return (
    <section aria-labelledby="profile-completion-heading" className={cn("flex flex-col gap-3 p-5 sm:p-6", GLASS_SURFACE_STATIC)}>
      <h2 id="profile-completion-heading" className="text-sm font-semibold text-radar-light-text dark:text-radar-white">
        Profile Completion
      </h2>
      <ul className="flex flex-wrap gap-x-5 gap-y-2">
        {items.map((item) => (
          <li key={item.label} className="flex items-center gap-1.5 text-sm">
            {item.done ? (
              <Check className="size-4 shrink-0 text-radar-success" aria-hidden="true" />
            ) : (
              <Circle className="size-4 shrink-0 text-radar-light-muted/40 dark:text-radar-muted/40" aria-hidden="true" />
            )}
            <span className={item.done ? "text-radar-light-text dark:text-radar-white" : "text-radar-light-muted dark:text-radar-muted"}>
              {item.label}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

type SaveStatus = "idle" | "saving" | "success";

/**
 * Display Name / Username / Email + the Avatar editor, one shared form with
 * one Save — identical field/validation/avatar behavior to the modal this
 * page originally replaced, just no `onOpenChange(false)` afterward since
 * there's no dialog to close — a brief inline "Saved" confirmation instead.
 *
 * V3-PROFILE-003 (item 6) — visually quieted relative to V3-PROFILE-002:
 * Display Name no longer gets a larger/bolder treatment than
 * Username/Email. That emphasis made sense when this form *was* the whole
 * page; now the Hero already carries the primary identity emphasis, so
 * every field here reads at the same, secondary weight.
 *
 * Bio (PR-093.02) — a short, optional, plain-text field, same nullable
 * shape and local-only persistence as Email/Avatar above it. Capped at
 * `BIO_MAX_LENGTH` with the same live character counter pattern Username
 * already uses.
 */
function IdentitySection({
  account,
  updateProfile,
  validateProfile,
  showAvatarEditor,
  setShowAvatarEditor,
  onAvatarChange,
}: {
  account: ReturnType<typeof useAccount>["account"];
  updateProfile: ReturnType<typeof useAccount>["updateProfile"];
  validateProfile: ReturnType<typeof useAccount>["validateProfile"];
  showAvatarEditor: boolean;
  setShowAvatarEditor: (updater: (current: boolean) => boolean) => void;
  onAvatarChange: (avatar: string) => void;
}) {
  const [name, setName] = useState(account.name);
  const [username, setUsername] = useState(account.username);
  const [email, setEmail] = useState(account.email ?? "");
  const [bio, setBio] = useState(account.bio ?? "");
  const [avatar, setAvatar] = useState(account.avatar ?? "");
  const [errors, setErrors] = useState<ProfileValidationError[]>([]);
  const [status, setStatus] = useState<SaveStatus>("idle");

  const busy = status === "saving";
  const trimmedAvatar = avatar.trim();

  function updateAvatar(next: string) {
    setAvatar(next);
    onAvatarChange(next);
  }

  function clearErrorsFor(field: ProfileValidationError[]) {
    setErrors((current) => (current.some((error) => field.includes(error)) ? current.filter((error) => !field.includes(error)) : current));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;

    const validationErrors = validateProfile({ name, username, email, avatar, bio });
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    setErrors([]);
    setStatus("saving");
    await updateProfile({
      name: name.trim(),
      username: username.trim(),
      email: email.trim() === "" ? null : email.trim(),
      avatar: trimmedAvatar === "" ? null : trimmedAvatar,
      bio: bio.trim() === "" ? null : bio.trim(),
    });
    setStatus("success");
    window.setTimeout(() => setStatus("idle"), 1800);
  }

  return (
    <SectionCard id="profile-identity" icon={User} title="Identity" description="Your name, username, and how others see you across Base Radar.">
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
        {/* Bug 1 (vertical-scroll pass) — Display Name and Username paired into
            the same `grid-cols-1 sm:grid-cols-2` responsive-grid idiom this
            codebase already uses throughout (`ProfileExecutiveIntelligence.tsx`,
            `ProfileSources.tsx`, etc.): both are short, logically-paired
            identity fields, so putting them on one row at `sm`+ removes one
            full stacked field's height with no field, label, validation, or
            mobile behavior removed — they still stack on narrow viewports. */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="account-name" className={LABEL_CLASS}>
              Display Name
            </label>
            <input
              id="account-name"
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                clearErrorsFor(NAME_ERRORS);
              }}
              placeholder="e.g. Ada Lovelace"
              required
              disabled={busy}
              aria-invalid={errors.some((error) => NAME_ERRORS.includes(error))}
              aria-describedby="account-name-error"
              className={FIELD_CLASS}
            />
            <FieldError id="account-name-error" errors={errors} of={NAME_ERRORS} />
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="account-username" className={LABEL_CLASS}>
                Username
              </label>
              <span className="text-[11px] text-radar-light-muted dark:text-radar-muted">{username.length}/20</span>
            </div>
            <div className="relative">
              <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-radar-light-muted dark:text-radar-muted">
                @
              </span>
              <input
                id="account-username"
                value={username}
                onChange={(event) => {
                  setUsername(event.target.value);
                  clearErrorsFor(USERNAME_ERRORS);
                }}
                placeholder="ada"
                required
                maxLength={20}
                disabled={busy}
                aria-invalid={errors.some((error) => USERNAME_ERRORS.includes(error))}
                aria-describedby="account-username-error"
                className={cn(FIELD_CLASS, "pl-7")}
              />
            </div>
            <FieldError id="account-username-error" errors={errors} of={USERNAME_ERRORS} />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="account-email" className="text-xs font-medium text-radar-light-muted dark:text-radar-muted">
            Email <span className="font-normal">(optional)</span>
          </label>
          <input
            id="account-email"
            type="email"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              clearErrorsFor(EMAIL_ERRORS);
            }}
            placeholder="you@example.com"
            disabled={busy}
            aria-invalid={errors.some((error) => EMAIL_ERRORS.includes(error))}
            aria-describedby="account-email-error"
            className={FIELD_CLASS}
          />
          <FieldError id="account-email-error" errors={errors} of={EMAIL_ERRORS} />
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor="account-bio" className={LABEL_CLASS}>
              Bio <span className="font-normal">(optional)</span>
            </label>
            <span className="text-[11px] text-radar-light-muted dark:text-radar-muted">
              {bio.length}/{BIO_MAX_LENGTH}
            </span>
          </div>
          <textarea
            id="account-bio"
            value={bio}
            onChange={(event) => {
              setBio(event.target.value);
              clearErrorsFor(BIO_ERRORS);
            }}
            placeholder="A short line about what you're into on Base."
            rows={3}
            maxLength={BIO_MAX_LENGTH}
            disabled={busy}
            aria-invalid={errors.some((error) => BIO_ERRORS.includes(error))}
            aria-describedby="account-bio-error"
            className={cn(FIELD_CLASS, "resize-none")}
          />
          <FieldError id="account-bio-error" errors={errors} of={BIO_ERRORS} />
        </div>

        <div className="flex flex-col gap-2.5 border-t border-radar-light-border pt-5 dark:border-white/10">
          <span className={LABEL_CLASS}>Avatar</span>
          <button
            type="button"
            onClick={() => setShowAvatarEditor((current) => !current)}
            aria-expanded={showAvatarEditor}
            aria-controls="account-avatar-editor"
            aria-label="Change avatar"
            disabled={busy}
            className="flex items-center gap-1.5 self-start text-xs font-medium text-radar-light-text outline-none transition-colors hover:text-radar-primary focus-visible:text-radar-primary disabled:cursor-not-allowed dark:text-radar-white dark:hover:text-radar-accent"
          >
            <ChevronDown
              className={cn("size-3 shrink-0 transition-transform duration-200", showAvatarEditor && "rotate-180")}
              aria-hidden="true"
            />
            Change
          </button>

          <AnimatePresence initial={false}>
            {showAvatarEditor && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="overflow-hidden"
              >
                <div id="account-avatar-editor" className="flex flex-col gap-3 pt-1">
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="account-avatar" className="text-xs font-medium text-radar-light-muted dark:text-radar-muted">
                      Image URL
                    </label>
                    <input
                      id="account-avatar"
                      value={avatar}
                      onChange={(event) => updateAvatar(event.target.value)}
                      placeholder="https://…"
                      disabled={busy}
                      className={FIELD_CLASS}
                    />
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => updateAvatar("")}
                      disabled={busy || trimmedAvatar === ""}
                      className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-radar-light-muted outline-none transition-colors hover:bg-radar-danger/5 hover:text-radar-danger focus-visible:ring-2 focus-visible:ring-radar-primary/50 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-radar-light-muted dark:text-radar-muted"
                    >
                      <Trash2 className="size-3.5 shrink-0" aria-hidden="true" />
                      Remove avatar
                    </button>
                    <span className="flex items-center gap-1.5 text-[11px] text-radar-light-muted/80 dark:text-radar-muted/70">
                      <Upload className="size-3 shrink-0" aria-hidden="true" />
                      Upload from device — available soon
                    </span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="flex items-center justify-end border-t border-radar-light-border pt-5 dark:border-white/10">
          <button
            type="submit"
            disabled={busy}
            className="flex min-w-[8.5rem] items-center justify-center gap-1.5 rounded-lg bg-radar-primary px-3 py-1.5 text-sm font-medium text-white outline-none transition-colors hover:bg-radar-primary/90 focus-visible:ring-2 focus-visible:ring-radar-primary/50 disabled:cursor-not-allowed disabled:opacity-80 dark:bg-radar-accent dark:text-radar-bg dark:hover:bg-radar-accent/90"
          >
            {status === "saving" && <Loader2 className="size-3.5 shrink-0 animate-spin motion-reduce:animate-none" aria-hidden="true" />}
            {status === "success" && <Check className="size-3.5 shrink-0" aria-hidden="true" />}
            {status === "idle" ? "Save Changes" : status === "saving" ? "Saving…" : "Saved"}
          </button>
        </div>
      </form>
    </SectionCard>
  );
}

const WALLET_ROW_ACTION_CLASS =
  "flex items-center gap-1.5 rounded-lg border border-radar-light-border px-2.5 py-1.5 text-xs font-medium text-radar-light-text outline-none transition-colors hover:bg-radar-light-surface focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:border-white/10 dark:text-radar-white dark:hover:bg-white/5";

/**
 * V3-PROFILE-003 (item 3) — promoted to a genuinely first-class section:
 * Primary Wallet, ENS, and Network each get their own row (ENS previously
 * only replaced the address in one combined row; now it's explicit, and
 * honestly reads "Not set" rather than being silently dropped when absent),
 * plus an actions row (Open Wallet, Disconnect). Every value is still
 * `useWallet()`'s own fields — no re-derivation of anything `WalletButton`'s
 * own trigger already computes. Disconnected: the exact `EmptyState` +
 * `action={<WalletButton />}` pattern `WalletPortfolioPage.tsx` already
 * uses for this same "no wallet yet" state, not a second connector picker
 * built from scratch.
 *
 * V3-PROFILE-004 — the separate "Connection Status" row was removed. This
 * section only ever renders its connected branch once `isConnected &&
 * address` is true, and within that branch `isSupportedNetwork` is the
 * exact same condition `chainKey` (Network's own row) already resolves —
 * the two rows said "Unsupported" and "Unsupported Network" one above the
 * other. Network's badge now carries the "Unsupported Network" wording
 * itself, so the one row that changes conveys both which chain and whether
 * it's supported, instead of splitting one signal across two rows.
 *
 * "Connect Another Wallet" and "Last Connected" are both left out: this app
 * only ever tracks one connection (multi-wallet was explicitly out of scope
 * for V3-WALLET-FUTURE) and no timestamp for "when did this wallet connect"
 * is recorded anywhere — inventing either here would be a fake control.
 */
/**
 * Release 1 Phase D — real SIWE sign-in, added directly into the existing
 * Wallet section rather than a new page/dialog: authentication is
 * meaningless without a connected wallet, so it belongs exactly where
 * wallet state already lives, not as a separate "unrelated account/
 * settings UI" surface. Distinguishes every real state the session can
 * actually be in — wallet connected but not authenticated, a challenge
 * pending signature, authenticated, a real failure (with the server's own
 * safe error message), and a session that genuinely expired — rather than
 * collapsing them into a single boolean.
 */
function WalletAuthRow({ wallet, auth }: { wallet: ReturnType<typeof useWallet>; auth: ReturnType<typeof useAuthSession> }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Bug 3 (Authentication Flow) — signing out here already correctly
  // called the real `auth.signOut()`, but left the separate local Account
  // Layer profile (`useAccount()`, driving the Hero/AccountMenu's
  // name/avatar/"Guest account" label) untouched, so it kept showing
  // whatever was synced in while authenticated. Resetting it too, right
  // after the real session is revoked, keeps both in sync — the same fix
  // applied to `AccountMenu.tsx`'s Sign Out item.
  const { signOut: signOutLocalAccount } = useAccount();

  async function handleSignIn() {
    if (!wallet.address) return;
    setPending(true);
    setError(null);
    try {
      await auth.signIn(wallet.address, wallet.signMessageAsync);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Couldn't sign in. Please try again.");
    } finally {
      setPending(false);
    }
  }

  if (auth.status === "loading") {
    return (
      <div className="flex items-center justify-between gap-3 px-3.5 py-3">
        <span className="text-xs font-medium text-radar-light-muted dark:text-radar-muted">Authentication</span>
        <span className="flex items-center gap-1.5 text-sm text-radar-light-muted dark:text-radar-muted">
          <Loader2 className="size-3.5 shrink-0 animate-spin motion-reduce:animate-none" aria-hidden="true" />
          Checking session…
        </span>
      </div>
    );
  }

  if (auth.status === "authenticated") {
    return (
      <div className="flex items-center justify-between gap-3 px-3.5 py-3">
        <span className="text-xs font-medium text-radar-light-muted dark:text-radar-muted">Authentication</span>
        <div className="flex items-center gap-2">
          <GlowBadge color="success" dot>
            Signed In
          </GlowBadge>
          <button
            type="button"
            onClick={() => {
              void (async () => {
                await auth.signOut();
                await signOutLocalAccount();
              })();
            }}
            className="text-xs font-medium text-radar-light-muted underline-offset-2 outline-none transition-colors hover:text-radar-danger hover:underline focus-visible:text-radar-danger dark:text-radar-muted"
          >
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 px-3.5 py-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-medium text-radar-light-muted dark:text-radar-muted">Authentication</span>
        <div className="flex items-center gap-2">
          {auth.status === "expired" && (
            <GlowBadge color="warning" dot>
              Session Expired
            </GlowBadge>
          )}
          <button
            type="button"
            onClick={handleSignIn}
            disabled={pending}
            className="flex items-center gap-1.5 rounded-lg border border-radar-light-border px-2.5 py-1.5 text-xs font-medium text-radar-light-text outline-none transition-colors hover:bg-radar-light-surface focus-visible:ring-2 focus-visible:ring-radar-primary/50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:text-radar-white dark:hover:bg-white/5"
          >
            {pending ? (
              <Loader2 className="size-3.5 shrink-0 animate-spin motion-reduce:animate-none" aria-hidden="true" />
            ) : (
              <KeyRound className="size-3.5 shrink-0" aria-hidden="true" />
            )}
            {pending ? "Confirm in wallet…" : auth.status === "expired" ? "Sign In Again" : "Sign In"}
          </button>
        </div>
      </div>
      {error && (
        <p className="flex items-start gap-1.5 text-xs text-radar-danger" role="alert">
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}
    </div>
  );
}

function WalletSection({ wallet, auth }: { wallet: ReturnType<typeof useWallet>; auth: ReturnType<typeof useAuthSession> }) {
  const { isConnected, address, ensName, chainId, disconnect } = wallet;
  const explorerUrl = address ? getWalletExplorerAddressUrl(chainId, address) : null;
  const chainKey = chainKeyFor(chainId);

  return (
    <SectionCard icon={Wallet} title="Wallet" description="The wallet connected to Base Radar right now.">
      {!isConnected || !address ? (
        <EmptyState
          icon={Wallet}
          title="No wallet connected"
          description="Connect a wallet to see its address, network, and status here."
          action={<WalletButton />}
        />
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col divide-y divide-radar-light-border rounded-xl border border-radar-light-border dark:divide-white/10 dark:border-white/10">
            <div className="flex items-center justify-between gap-3 px-3.5 py-3">
              <span className="text-xs font-medium text-radar-light-muted dark:text-radar-muted">Primary Wallet</span>
              <div className="flex items-center gap-1.5">
                <span className="truncate text-sm font-medium text-radar-light-text dark:text-radar-white">{shortenAddress(address)}</span>
                <CopyButton value={address} label="wallet address" />
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 px-3.5 py-3">
              <span className="text-xs font-medium text-radar-light-muted dark:text-radar-muted">ENS</span>
              <span className="text-sm text-radar-light-text dark:text-radar-white">
                {ensName ?? <span className="text-radar-light-muted dark:text-radar-muted">Not set</span>}
              </span>
            </div>

            <div className="flex items-center justify-between gap-3 px-3.5 py-3">
              <span className="text-xs font-medium text-radar-light-muted dark:text-radar-muted">Network</span>
              {chainKey ? (
                <ChainBadge chain={chainKey} size="sm" />
              ) : (
                <GlowBadge color="warning" dot>
                  Unsupported Network
                </GlowBadge>
              )}
            </div>

            {explorerUrl && (
              <div className="flex items-center justify-between gap-3 px-3.5 py-3">
                <span className="text-xs font-medium text-radar-light-muted dark:text-radar-muted">Explorer Link</span>
                <a
                  href={explorerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-sm font-medium text-radar-primary outline-none transition-colors hover:text-radar-primary/80 focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:text-radar-accent dark:hover:text-radar-accent/80"
                >
                  View on Basescan
                  <Globe className="size-3.5 shrink-0" aria-hidden="true" />
                </a>
              </div>
            )}

            <WalletAuthRow wallet={wallet} auth={auth} />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link href="/dashboard/wallet" className={WALLET_ROW_ACTION_CLASS}>
              <Wallet className="size-3.5 shrink-0" aria-hidden="true" />
              Open Wallet
            </Link>
            <button
              type="button"
              onClick={() => disconnect()}
              className={cn(WALLET_ROW_ACTION_CLASS, "hover:border-radar-danger/30 hover:bg-radar-danger/5 hover:text-radar-danger")}
            >
              <LogOut className="size-3.5 shrink-0" aria-hidden="true" />
              Disconnect
            </button>
          </div>
        </div>
      )}
    </SectionCard>
  );
}

/**
 * V3-PROFILE-003 (item 5) — renamed from "Social Accounts" to "Connected
 * Accounts", ENS is the one identity this app can already, honestly
 * resolve without any backend — `useWallet()`'s `ensName` (a real `wagmi`
 * lookup against Mainnet's registry, not new data). Farcaster/Discord/
 * GitHub/X remain named only in this section's own description as future
 * candidates — those are real OAuth integrations, out of scope for this
 * slice (see the PR-093.05 decision recorded in `linkedWallets.ts`'s own
 * doc comment) — never rendered as an individual fake "Not Connected" row.
 *
 * PR-093.05 (Connected Accounts) — real Linked Wallets: additional wallet
 * addresses a signed-in user has cryptographically proven ownership of via
 * a genuine SIWE challenge+signature (`performWalletLink`, the exact same
 * primitives `WalletAuthRow`'s own sign-in flow uses), not a text field a
 * user could type any address into. Linking requires an already-connected
 * wallet (`wallet.isConnected`) — this deliberately reuses the Wallet
 * section's own connect flow above rather than building a second,
 * duplicate wallet-picker; a Guest sees an honest explanation instead of a
 * button that would just fail server-side.
 */
function ConnectedAccountsSection({ wallet, auth }: { wallet: ReturnType<typeof useWallet>; auth: ReturnType<typeof useAuthSession> }) {
  const { isConnected, ensName, address, signMessageAsync } = wallet;
  const hasEns = isConnected && Boolean(ensName);
  const isAuthenticated = auth.status === "authenticated";

  const { linkedWallets, loading, link, unlink } = useLinkedWallets(isAuthenticated);
  const linkedIdentityCount = (hasEns ? 1 : 0) + linkedWallets.length;
  const [linkStatus, setLinkStatus] = useState<"idle" | "linking" | "error">("idle");
  const [linkError, setLinkError] = useState<string | null>(null);
  const [unlinkingAddress, setUnlinkingAddress] = useState<string | null>(null);

  async function handleLink() {
    if (!address) return;
    setLinkStatus("linking");
    setLinkError(null);
    try {
      await link(address, signMessageAsync);
      setLinkStatus("idle");
    } catch (caught) {
      setLinkStatus("error");
      setLinkError(caught instanceof Error ? caught.message : "Couldn't link that wallet. Please try again.");
    }
  }

  async function handleUnlink(walletAddress: string) {
    setUnlinkingAddress(walletAddress);
    try {
      await unlink(walletAddress);
    } catch {
      // An unlink failure leaves the wallet in the real, current list —
      // never optimistically removed — so nothing further to do here.
    } finally {
      setUnlinkingAddress(null);
    }
  }

  return (
    <SectionCard
      icon={Fingerprint}
      title="Connected Accounts"
      description="Identities linked to your wallet — ENS today, with room for Farcaster, Discord, GitHub, and X as they become available."
      collapsible
      defaultOpen={false}
      summary={linkedIdentityCount > 0 ? `${linkedIdentityCount} linked` : "None linked"}
    >
      <div className="flex flex-col gap-3">
        {hasEns ? (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-radar-light-border px-3.5 py-3 dark:border-white/10">
            <span className="flex items-center gap-2.5">
              <Globe className="size-4 shrink-0 text-radar-light-muted dark:text-radar-muted" aria-hidden="true" />
              <span className="flex flex-col gap-0.5">
                <span className="text-sm font-medium text-radar-light-text dark:text-radar-white">ENS</span>
                <span className="text-xs text-radar-light-muted dark:text-radar-muted">{ensName}</span>
              </span>
            </span>
            <GlowBadge color="success" dot>
              Linked
            </GlowBadge>
          </div>
        ) : (
          <EmptyState icon={Fingerprint} title="No connected accounts yet." />
        )}

        <div className="flex flex-col gap-2.5 border-t border-radar-light-border pt-3.5 dark:border-white/10">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-medium text-radar-light-text dark:text-radar-white">Linked Wallets</span>
            {isAuthenticated && (
              <button
                type="button"
                onClick={handleLink}
                disabled={!isConnected || linkStatus === "linking"}
                className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-radar-light-text outline-none transition-colors hover:text-radar-primary focus-visible:ring-2 focus-visible:ring-radar-primary/50 disabled:cursor-not-allowed disabled:text-radar-light-muted disabled:hover:text-radar-light-muted dark:text-radar-white dark:hover:text-radar-accent dark:disabled:text-radar-muted"
              >
                {linkStatus === "linking" ? (
                  <Loader2 className="size-3.5 shrink-0 animate-spin motion-reduce:animate-none" aria-hidden="true" />
                ) : (
                  <Wallet className="size-3.5 shrink-0" aria-hidden="true" />
                )}
                Link a Wallet
              </button>
            )}
          </div>

          {!isAuthenticated ? (
            <p className="text-xs leading-relaxed text-radar-light-muted dark:text-radar-muted">
              Sign in with your wallet above to link additional wallets to your account.
            </p>
          ) : !isConnected ? (
            <p className="text-xs leading-relaxed text-radar-light-muted dark:text-radar-muted">
              Connect the wallet you want to link using the Wallet section above, then come back here.
            </p>
          ) : null}

          {linkStatus === "error" && linkError && (
            <p className="flex items-center gap-1.5 text-xs text-radar-danger">
              <AlertTriangle className="size-3.5 shrink-0" aria-hidden="true" />
              {linkError}
            </p>
          )}

          {isAuthenticated && loading && (
            <p className="flex items-center gap-1.5 text-xs text-radar-light-muted dark:text-radar-muted">
              <Loader2 className="size-3.5 shrink-0 animate-spin motion-reduce:animate-none" aria-hidden="true" />
              Loading linked wallets…
            </p>
          )}

          {isAuthenticated && !loading && linkedWallets.length === 0 && (
            <p className="text-xs text-radar-light-muted dark:text-radar-muted">No additional wallets linked yet.</p>
          )}

          {isAuthenticated && !loading && linkedWallets.length > 0 && (
            <div className="flex flex-col divide-y divide-radar-light-border rounded-xl border border-radar-light-border dark:divide-white/10 dark:border-white/10">
              {linkedWallets.map((linked) => (
                <div key={linked.address} className="flex items-center justify-between gap-3 px-3.5 py-2.5">
                  <span className="flex items-center gap-2.5">
                    <Wallet className="size-4 shrink-0 text-radar-light-muted dark:text-radar-muted" aria-hidden="true" />
                    <span className="flex flex-col gap-0.5">
                      <span className="font-mono text-xs font-medium text-radar-light-text dark:text-radar-white">
                        {shortenAddress(linked.address)}
                      </span>
                      <span className="text-[11px] text-radar-light-muted dark:text-radar-muted">
                        Linked <RelativeTime iso={linked.linkedAt} />
                      </span>
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => handleUnlink(linked.address)}
                    disabled={unlinkingAddress === linked.address}
                    aria-label={`Unlink ${shortenAddress(linked.address)}`}
                    className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-radar-light-muted outline-none transition-colors hover:bg-radar-danger/5 hover:text-radar-danger focus-visible:ring-2 focus-visible:ring-radar-primary/50 disabled:cursor-not-allowed disabled:opacity-50 dark:text-radar-muted"
                  >
                    {unlinkingAddress === linked.address ? (
                      <Loader2 className="size-3.5 shrink-0 animate-spin motion-reduce:animate-none" aria-hidden="true" />
                    ) : (
                      <Trash2 className="size-3.5 shrink-0" aria-hidden="true" />
                    )}
                    Unlink
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </SectionCard>
  );
}

/** A fixed, real calendar date for the Regional Format preview — deliberately not `new Date()`: a live "today" evaluated once during SSR and again on client hydration is exactly the kind of `Intl`-output divergence this file's own imports (`lib/data/format.ts`) already document a real, previously-fixed bug for. */
const PREVIEW_DATE_ISO = "2026-03-14T00:00:00.000Z";

/**
 * Theme (`ThemeToggle`'s `icon` variant — no second "Theme" label, since
 * this row already supplies one), Default Watchlist (`WatchlistSelector`
 * + `useWatchlists()`, exactly as `/dashboard/watchlists` already uses it —
 * the active watchlist already *is* this app's one real "default" concept),
 * and Regional Format (PR-093.03 — `useLocalePreference()`, real native
 * `Intl` formatting via `lib/data/format.ts`'s locale-aware exports; never
 * a UI-translation "Language" setting — no i18n framework or dependency
 * was added, and no interface text changes with the selection).
 *
 * Accent/Timezone stay left out: no accent-color system or timezone
 * preference exists anywhere in this codebase to wire up, and the
 * Topbar's chain chip is a hardcoded `ChainBadge`, not a switchable
 * preference — inventing storage for either here would be exactly the
 * "duplicated logic"/"persistence rewrite" this task says not to do.
 *
 * Dashboard Widgets (PR-093.04, Dashboard Customization) — real per-widget
 * show/hide, `Switch.Root` exactly as `NotificationPreferencesPage.tsx`
 * already uses for the same "on/off, persisted" shape. Deliberately
 * show/hide only, never drag-reorder: `/dashboard`'s three tiers are a
 * deliberate, documented editorial grouping (see that page's own tier
 * comments), not a flat reorderable list. Scoped to exactly the 17 widget
 * cards inside those three tiers — never the page's hero/summary furniture
 * (Welcome header, Executive Summary, Today's Top Insight, Getting
 * Started, the Brief+Portfolio row, KPI row, AI Intelligence Hub strip),
 * which stay permanently visible and out of scope for this slice.
 */
const DASHBOARD_WIDGET_TIERS: DashboardWidgetTier[] = ["Your Intelligence", "Market Signals", "Ecosystem Overview"];

function PreferencesSection() {
  const { watchlists, activeWatchlist, setActiveWatchlist } = useWatchlists();
  const { locale, setLocale } = useLocalePreference();
  const { isHidden, setHidden } = useDashboardLayoutPreferences();
  const [showDashboardWidgets, setShowDashboardWidgets] = useState(false);

  return (
    <SectionCard icon={Palette} title="Preferences" description="How Base Radar looks, which watchlist loads by default, and how dates and numbers display.">
      <div className="flex flex-col divide-y divide-radar-light-border rounded-xl border border-radar-light-border dark:divide-white/10 dark:border-white/10">
        <div className="flex items-center justify-between gap-3 px-3.5 py-3">
          <span className="text-sm font-medium text-radar-light-text dark:text-radar-white">Theme</span>
          <ThemeToggle variant="icon" />
        </div>
        <div className="flex items-center justify-between gap-3 px-3.5 py-3">
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-medium text-radar-light-text dark:text-radar-white">Default Watchlist</span>
            <span className="text-xs text-radar-light-muted dark:text-radar-muted">Loads across the Dashboard and Topbar.</span>
          </div>
          <WatchlistSelector watchlists={watchlists} activeWatchlist={activeWatchlist} onSelect={setActiveWatchlist} className="text-xs" />
        </div>
        <div className="flex items-center justify-between gap-3 px-3.5 py-3">
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-medium text-radar-light-text dark:text-radar-white">Regional Format</span>
            <span className="text-xs text-radar-light-muted dark:text-radar-muted">How dates and numbers display — not a language or translation setting.</span>
          </div>
          <select
            id="account-regional-format"
            value={locale}
            onChange={(event) => setLocale(event.target.value as (typeof SUPPORTED_LOCALES)[number]["locale"])}
            className="rounded-lg border border-radar-light-border bg-transparent px-2.5 py-1.5 text-xs text-radar-light-text outline-none transition-colors focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:border-white/10 dark:text-radar-white"
          >
            {SUPPORTED_LOCALES.map((option) => (
              <option key={option.locale} value={option.locale}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5 px-3.5 py-3">
          <span className="text-[11px] font-medium tracking-wide text-radar-light-muted uppercase dark:text-radar-muted">Preview</span>
          <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-radar-light-text dark:text-radar-white">
            <span>Date: {formatDateForLocale(PREVIEW_DATE_ISO, locale)}</span>
            <span>Amount: {formatPriceForLocale(1234567.89, locale)}</span>
            <span>Number: {formatNumberForLocale(1234567, locale)}</span>
          </div>
        </div>
        <div className="flex flex-col gap-2.5 px-3.5 py-3">
          <button
            type="button"
            onClick={() => setShowDashboardWidgets((current) => !current)}
            aria-expanded={showDashboardWidgets}
            aria-controls="dashboard-widgets-panel"
            className="flex items-center justify-between gap-3 outline-none"
          >
            <div className="flex flex-col gap-0.5 text-left">
              <span className="text-sm font-medium text-radar-light-text dark:text-radar-white">Dashboard Widgets</span>
              <span className="text-xs text-radar-light-muted dark:text-radar-muted">Choose which widgets appear on your Dashboard.</span>
            </div>
            <ChevronDown
              className={cn("size-4 shrink-0 text-radar-light-muted transition-transform duration-200 dark:text-radar-muted", showDashboardWidgets && "rotate-180")}
              aria-hidden="true"
            />
          </button>

          <AnimatePresence initial={false}>
            {showDashboardWidgets && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="overflow-hidden"
              >
                <div id="dashboard-widgets-panel" className="flex flex-col gap-4 pt-1">
                  {DASHBOARD_WIDGET_TIERS.map((tier) => (
                    <div key={tier} className="flex flex-col gap-1.5">
                      <span className="text-[11px] font-medium tracking-wide text-radar-light-muted uppercase dark:text-radar-muted">{tier}</span>
                      <div className="flex flex-col divide-y divide-radar-light-border rounded-xl border border-radar-light-border dark:divide-white/10 dark:border-white/10">
                        {DASHBOARD_WIDGETS.filter((widget) => widget.tier === tier).map((widget) => {
                          const visible = !isHidden(widget.id);
                          return (
                            <div key={widget.id} className="flex items-center justify-between gap-3 px-3.5 py-2.5">
                              <span className="text-xs font-medium text-radar-light-text dark:text-radar-white">{widget.label}</span>
                              <Switch.Root
                                checked={visible}
                                onCheckedChange={(checked) => setHidden(widget.id, !checked)}
                                aria-label={`${visible ? "Hide" : "Show"} ${widget.label} on the Dashboard`}
                                className="relative flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full bg-radar-light-border outline-none transition-colors data-[checked]:bg-radar-primary focus-visible:ring-2 focus-visible:ring-radar-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-radar-light-bg dark:bg-white/10 dark:data-[checked]:bg-radar-primary dark:focus-visible:ring-offset-radar-bg"
                              >
                                <Switch.Thumb className="block size-3.5 translate-x-0.5 rounded-full bg-radar-light-card shadow transition-transform data-[checked]:translate-x-4.5 dark:bg-radar-bg" />
                              </Switch.Root>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </SectionCard>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * PR-093.04 — Project Profile page visits recorded on this device by
 * `components/explorer/RecordProjectView.tsx`, via `useRecentlyViewed()`
 * (the same `useSyncExternalStore`-backed pattern every other local store on
 * this page uses). Already capped at 20 by `lib/research-history/storage.ts`,
 * so no pagination or "show more" is needed here.
 */
function RecentlyViewedSection() {
  const { entries, clear } = useRecentlyViewed();

  return (
    <SectionCard
      icon={History}
      title="Recently Viewed"
      description="Project Profile pages you've opened on this device, most recent first."
      collapsible
      defaultOpen={false}
      summary={entries.length > 0 ? `${entries.length} project${entries.length === 1 ? "" : "s"}` : "Empty"}
    >
      {entries.length === 0 ? (
        <EmptyState icon={History} title="No projects viewed yet." description="Open any Project Profile page and it will show up here." />
      ) : (
        <div className="flex flex-col gap-3">
          <ul className="flex flex-col divide-y divide-radar-light-border rounded-xl border border-radar-light-border dark:divide-white/10 dark:border-white/10">
            {entries.map((entry) => (
              <li key={entry.projectId} className="flex items-center justify-between gap-3 px-3.5 py-3">
                <Link
                  href={`/dashboard/projects/${entry.projectSlug}`}
                  className="truncate text-sm font-medium text-radar-light-text outline-none transition-colors hover:text-radar-primary focus-visible:text-radar-primary dark:text-radar-white dark:hover:text-radar-accent"
                >
                  {entry.projectName}
                </Link>
                <span className="shrink-0 text-xs text-radar-light-muted dark:text-radar-muted">
                  <RelativeTime iso={entry.viewedAt} />
                </span>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={clear}
            className="flex items-center gap-1.5 self-start rounded-lg px-2 py-1 text-xs font-medium text-radar-light-muted outline-none transition-colors hover:bg-radar-danger/5 hover:text-radar-danger focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:text-radar-muted"
          >
            <Trash2 className="size-3.5 shrink-0" aria-hidden="true" />
            Clear Recently Viewed
          </button>
        </div>
      )}
    </SectionCard>
  );
}

/**
 * PR-093.06 — the one honestly-buildable "Security" capability: viewing and
 * clearing exactly what Base Radar has saved on this device. See
 * `lib/privacy/localData.ts`'s own doc comment for why this reads real
 * `localStorage` by key prefix rather than a hardcoded list, and why
 * `wagmi.store`/`theme` are deliberately excluded.
 *
 * Entries are computed directly during render — the same "call the real
 * getter straight from render, no state/effect round-trip" convention
 * `useWalletHistory.ts`'s own `storageSizeBytes: getStorageSizeBytes()`
 * already established for an equivalent real-storage-size read. There's no
 * cross-tab reactivity requirement here (no `subscribe` exists in
 * `lib/privacy/localData.ts` to bind to), just an honest snapshot of "what's
 * here right now." `clearAllLocalData()` removes keys directly from
 * `localStorage`, bypassing every other module's own write path — so every
 * other store on this page (`useAccount`, `useWatchlists`, etc.) would
 * otherwise keep showing stale in-memory values after a clear. Reloading the
 * page is the simple, honest fix: every store re-reads the now-empty storage
 * from scratch, exactly as it would on this device's very first visit.
 */
function LocalDataSection() {
  const entries = listLocalDataEntries();
  const totalBytes = entries.reduce((sum, entry) => sum + entry.sizeBytes, 0);

  function handleClear() {
    if (typeof window === "undefined") return;
    const itemLabel = `${entries.length} local item${entries.length === 1 ? "" : "s"}`;
    const confirmed = window.confirm(
      `Clear all ${itemLabel} Base Radar has saved on this device — profile, watchlists, preferences, and everything else? This cannot be undone, and the page will reload.`
    );
    if (!confirmed) return;
    clearAllLocalData();
    window.location.reload();
  }

  return (
    <SectionCard
      icon={Database}
      title="Privacy & Local Data"
      description="Everything Base Radar has saved on this device — nothing leaves this browser."
      collapsible
      defaultOpen={false}
      summary={entries.length > 0 ? `${entries.length} item${entries.length === 1 ? "" : "s"} · ${formatBytes(totalBytes)}` : "Empty"}
    >
      {entries.length === 0 ? (
        <EmptyState icon={Database} title="Nothing stored on this device yet." />
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex flex-col divide-y divide-radar-light-border rounded-xl border border-radar-light-border dark:divide-white/10 dark:border-white/10">
            {entries.map((entry) => (
              <div key={entry.key} className="flex items-center justify-between gap-3 px-3.5 py-2.5">
                <span className="truncate font-mono text-xs text-radar-light-text dark:text-radar-white">{entry.key}</span>
                <span className="shrink-0 text-xs text-radar-light-muted dark:text-radar-muted">{formatBytes(entry.sizeBytes)}</span>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs text-radar-light-muted dark:text-radar-muted">
              {entries.length} item{entries.length === 1 ? "" : "s"} · {formatBytes(totalBytes)} total
            </span>
            <button
              type="button"
              onClick={handleClear}
              className="flex items-center gap-1.5 rounded-lg border border-radar-light-border px-2.5 py-1.5 text-xs font-medium text-radar-light-text outline-none transition-colors hover:border-radar-danger/30 hover:bg-radar-danger/5 hover:text-radar-danger focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:border-white/10 dark:text-radar-white"
            >
              <Trash2 className="size-3.5 shrink-0" aria-hidden="true" />
              Clear All Local Data
            </button>
          </div>
        </div>
      )}
    </SectionCard>
  );
}

export function ProfilePage() {
  // Both `useAccount()` and `useWallet()` are called exactly once here and
  // threaded down as props, rather than a second time inside
  // `IdentitySection`/each wallet-reading section — matching
  // `WalletPortfolioPage.tsx`'s own established "call the hook once at the
  // top" shape. Two or three independent `useSyncExternalStore`-backed
  // subscriptions to the same store mounting simultaneously on this page's
  // very first render reproduced a real "state update on a component that
  // hasn't mounted yet" console error — confirmed live on a hard reload,
  // and confirmed gone once every section read from one shared call instead.
  const { account, updateProfile, validateProfile } = useAccount();
  const wallet = useWallet();
  const auth = useAuthSession();
  const [avatarPreview, setAvatarPreview] = useState(account.avatar ?? "");
  const [showAvatarEditor, setShowAvatarEditor] = useState(() => Boolean(account.avatar));

  function openAvatarEditor() {
    setShowAvatarEditor(() => true);
    scrollToAndHighlight("profile-identity");
  }

  const completionItems: CompletionItem[] = [
    { label: "Avatar", done: Boolean(account.avatar) },
    { label: "Wallet Connected", done: wallet.isConnected },
    { label: "Email", done: Boolean(account.email?.trim()) },
    { label: "ENS", done: Boolean(wallet.isConnected && wallet.ensName) },
    // Permanently unchecked — no Connected Accounts backend exists yet to
    // ever satisfy this honestly. See `ConnectedAccountsSection`'s own comment.
    { label: "Social Accounts", done: false },
  ];

  return (
    // Bug 1 (vertical-scroll redesign, 2nd pass) — the fixed `[2fr_3fr]`
    // grid split from the first pass put every "overview" section in a
    // fixed left column and every "manage" section in a fixed right column,
    // which left a large dead gap under the shorter column once real
    // content varied (e.g. Connected Accounts/Recently Viewed/Local Data
    // collapsed to summaries). A fixed column *assignment* can't self-
    // correct for that — only a layout that places sections by actual
    // measured height can. CSS multi-column (`columns-2` + `break-inside-
    // avoid` per section) is the standard, dependency-free tool for exactly
    // this "auto-balance N variable-height blocks into columns" problem —
    // the browser flows sections in DOM order and moves a whole section to
    // the next column once the current one is full, targeting equal column
    // heights, instead of a hand-picked static split. No section is ever
    // torn across the column boundary. This is a first for `/dashboard/*`
    // settings pages, but it's the correct native primitive for this
    // specific problem — the existing `lg:grid-cols-[3fr_2fr]` idiom
    // (`ProfileHeader.tsx`) is for a *fixed* asymmetric split (primary
    // content + a narrower fixed sidebar), not for balancing symmetric,
    // variable-height content, so it doesn't fit this case.
    //
    // The Hero stays full-width, above the balanced area, per its own
    // "answers who is this user before anything editable" role — it isn't
    // one more block competing for column space, it's the page's anchor.
    // Below `xl` (1280px+, live-measured as the first width where `<main>`
    // has enough room — 680-936px between `lg` and `xl` is too narrow for
    // two columns to read comfortably), `columns-1` is a no-op and every
    // section just stacks in one column, identical to the page's original
    // single-column behavior.
    <div className="mx-auto flex max-w-5xl flex-col gap-6 xl:max-w-6xl">
      <ProfileHeaderSection
        name={account.name}
        username={account.username}
        avatar={avatarPreview.trim() === "" ? null : avatarPreview}
        isGuest={account.isGuest}
        updatedAt={account.updatedAt}
        onOpenAvatarEditor={openAvatarEditor}
        wallet={wallet}
      />

      <div className="columns-1 xl:columns-2 xl:gap-10">
        <div className="mb-6 break-inside-avoid">
          <ProfileCompletionSection items={completionItems} />
        </div>

        <div className="mb-6 break-inside-avoid">
          <WalletSection wallet={wallet} auth={auth} />
        </div>

        <div className="mb-6 break-inside-avoid">
          <IdentitySection
            account={account}
            updateProfile={updateProfile}
            validateProfile={validateProfile}
            showAvatarEditor={showAvatarEditor}
            setShowAvatarEditor={setShowAvatarEditor}
            onAvatarChange={setAvatarPreview}
          />
        </div>

        <div className="mb-6 break-inside-avoid">
          <PreferencesSection />
        </div>

        <div className="mb-6 break-inside-avoid">
          <ConnectedAccountsSection wallet={wallet} auth={auth} />
        </div>

        <div className="mb-6 break-inside-avoid">
          <RecentlyViewedSection />
        </div>

        <div className="mb-6 break-inside-avoid">
          <LocalDataSection />
        </div>
      </div>

      {/* V3-PROFILE-002/003 — AI Preferences is still deliberately not
          rendered: the portfolio-intelligence engine takes no
          user-configurable inputs, so there's no real data source or
          natural home for it anywhere in this codebase yet. Security's own
          extension point (this comment used to cover both) is now filled
          honestly, scoped to what's actually real on a backend-less app —
          see `LocalDataSection`'s own doc comment. */}

      {account.isGuest && (
        <p className="flex items-center gap-1.5 self-center text-xs text-radar-light-muted dark:text-radar-muted">
          <ShieldCheck className="size-3.5 shrink-0 text-radar-primary dark:text-radar-accent" aria-hidden="true" />
          Guest account — changes are stored only on this device.
        </p>
      )}
    </div>
  );
}
