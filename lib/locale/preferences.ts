/**
 * Regional Format preference — PR-093.03. Deliberately NOT a "Language"
 * setting: nothing in this app's UI text is translated, and this file adds
 * no translation framework or dependency. What it genuinely controls is
 * real, native `Intl`-driven presentation — digit grouping, decimal marks,
 * and date ordering — for the small set of locale-sensitive formatters in
 * `lib/data/format.ts` that opt into it. Every price/amount in this app is
 * genuinely USD-denominated (a crypto/DeFi intelligence product, not a
 * multi-currency one), so the selected locale changes how a USD amount is
 * written (e.g. "$1,234.56" vs "1.234,56 $"), never what currency it's in
 * — this is regional formatting, not currency conversion.
 *
 * Same `localStorage` read/write-with-a-version-guard shape every other
 * preference module in this app uses (`lib/notifications/preferences.ts`
 * is the closest sibling) — SSR-safe, falls back to the honest default
 * rather than throwing on a corrupted or foreign stored value, plus a
 * small in-memory cache and listener set so `lib/hooks/useLocalePreference.ts`
 * can bind to it with `useSyncExternalStore`.
 */

export type SupportedLocale = "en-US" | "en-GB" | "de-DE" | "fr-FR" | "ja-JP";

export type LocaleOption = {
  locale: SupportedLocale;
  /** A real, human name for the option itself — never translated, since this control's own label stays in English regardless of the selection. */
  label: string;
};

/** Every option here is a real BCP-47 tag with genuinely distinct native `Intl` output — not a placeholder list. */
export const SUPPORTED_LOCALES: LocaleOption[] = [
  { locale: "en-US", label: "English (United States)" },
  { locale: "en-GB", label: "English (United Kingdom)" },
  { locale: "de-DE", label: "Deutsch (Germany)" },
  { locale: "fr-FR", label: "Français (France)" },
  { locale: "ja-JP", label: "日本語 (Japan)" },
];

export const DEFAULT_LOCALE: SupportedLocale = "en-US";

function isSupportedLocale(value: unknown): value is SupportedLocale {
  return typeof value === "string" && SUPPORTED_LOCALES.some((option) => option.locale === value);
}

const LOCALE_PREFERENCE_STORAGE_KEY = "base-radar:locale-preference";
const LOCALE_PREFERENCE_VERSION = 1;

type PersistedLocalePreference = {
  version: number;
  locale: SupportedLocale;
};

function isValidPersistedLocalePreference(value: unknown): value is PersistedLocalePreference {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<PersistedLocalePreference>;
  return candidate.version === LOCALE_PREFERENCE_VERSION && isSupportedLocale(candidate.locale);
}

/** SSR-safe and resilient to a corrupted/foreign value under this key — either case falls back to `DEFAULT_LOCALE` rather than throwing. */
function readPersistedLocale(): SupportedLocale {
  if (typeof window === "undefined") return DEFAULT_LOCALE;

  try {
    const raw = window.localStorage.getItem(LOCALE_PREFERENCE_STORAGE_KEY);
    if (!raw) return DEFAULT_LOCALE;
    const parsed = JSON.parse(raw);
    return isValidPersistedLocalePreference(parsed) ? parsed.locale : DEFAULT_LOCALE;
  } catch {
    return DEFAULT_LOCALE;
  }
}

/** Best-effort — `localStorage.setItem` can throw (quota exceeded, private browsing); the in-memory cache stays correct for the rest of this tab's session even if it won't survive a refresh. */
function writePersistedLocale(locale: SupportedLocale): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LOCALE_PREFERENCE_STORAGE_KEY, JSON.stringify({ version: LOCALE_PREFERENCE_VERSION, locale }));
  } catch {
    // Intentionally swallowed — see doc comment above.
  }
}

let cachedLocale: SupportedLocale | null = null;
const listeners = new Set<() => void>();

function notify(): void {
  for (const listener of listeners) listener();
}

/** The one public entry point — same value returned until a real preference change happens. */
export function getLocalePreference(): SupportedLocale {
  if (!cachedLocale) {
    cachedLocale = readPersistedLocale();
  }
  return cachedLocale;
}

export function setLocalePreference(locale: SupportedLocale): void {
  if (!isSupportedLocale(locale) || getLocalePreference() === locale) return;
  cachedLocale = locale;
  writePersistedLocale(locale);
  notify();
}

/** Registers `listener` to be called after a real preference change — the exact shape `useSyncExternalStore` expects. */
export function subscribeToLocalePreference(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
