"use client";

/**
 * React binding for `lib/locale/preferences.ts` — the same
 * `useSyncExternalStore` pattern every other preference hook in this app
 * uses (`lib/hooks/useNotificationPreferences.ts` is the closest sibling).
 * `getServerSnapshot` returns `DEFAULT_LOCALE` — the same value a fresh
 * client render sees before `localStorage` has been read — so hydration
 * never mismatches even when a real stored preference differs from the
 * default.
 */

import { useCallback, useSyncExternalStore } from "react";

import { DEFAULT_LOCALE, getLocalePreference, setLocalePreference, subscribeToLocalePreference, type SupportedLocale } from "@/lib/locale/preferences";

function getServerSnapshot(): SupportedLocale {
  return DEFAULT_LOCALE;
}

export function useLocalePreference() {
  const locale = useSyncExternalStore(subscribeToLocalePreference, getLocalePreference, getServerSnapshot);

  const setLocale = useCallback((next: SupportedLocale) => setLocalePreference(next), []);

  return { locale, setLocale };
}
