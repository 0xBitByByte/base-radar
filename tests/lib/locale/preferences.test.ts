import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const STORAGE_KEY = "base-radar:locale-preference";

async function freshModule() {
  vi.resetModules();
  return import("@/lib/locale/preferences");
}

describe("Locale (Regional Format) preference", () => {
  beforeEach(() => window.localStorage.removeItem(STORAGE_KEY));
  afterEach(() => window.localStorage.removeItem(STORAGE_KEY));

  it("starts as the real default locale until the user says otherwise", async () => {
    const { getLocalePreference, DEFAULT_LOCALE } = await freshModule();
    expect(getLocalePreference()).toBe(DEFAULT_LOCALE);
    expect(DEFAULT_LOCALE).toBe("en-US");
  });

  it("every supported option is a real, distinct BCP-47 tag with a real label", async () => {
    const { SUPPORTED_LOCALES } = await freshModule();
    expect(SUPPORTED_LOCALES.length).toBeGreaterThanOrEqual(2);
    const tags = SUPPORTED_LOCALES.map((option) => option.locale);
    expect(new Set(tags).size).toBe(tags.length);
    for (const option of SUPPORTED_LOCALES) {
      expect(option.label.trim()).not.toBe("");
    }
  });

  it("setLocalePreference applies a real supported locale, persists, and notifies", async () => {
    const { setLocalePreference, getLocalePreference, subscribeToLocalePreference } = await freshModule();
    const listener = vi.fn();
    subscribeToLocalePreference(listener);
    setLocalePreference("de-DE");
    expect(getLocalePreference()).toBe("de-DE");
    expect(listener).toHaveBeenCalledOnce();
  });

  it("setting the same real locale again is a no-op — never a spurious notify", async () => {
    const { setLocalePreference, subscribeToLocalePreference, getLocalePreference, DEFAULT_LOCALE } = await freshModule();
    expect(getLocalePreference()).toBe(DEFAULT_LOCALE);
    const listener = vi.fn();
    subscribeToLocalePreference(listener);
    setLocalePreference(DEFAULT_LOCALE);
    expect(listener).not.toHaveBeenCalled();
  });

  it("rejects an unsupported locale string rather than silently storing it", async () => {
    const { setLocalePreference, getLocalePreference, DEFAULT_LOCALE } = await freshModule();
    // @ts-expect-error — deliberately passing a value outside SupportedLocale to prove the runtime guard, not just the type.
    setLocalePreference("xx-XX");
    expect(getLocalePreference()).toBe(DEFAULT_LOCALE);
  });

  it("persists across a simulated refresh", async () => {
    const first = await freshModule();
    first.setLocalePreference("ja-JP");
    const second = await freshModule();
    expect(second.getLocalePreference()).toBe("ja-JP");
  });

  it("a corrupted or foreign stored value falls back to the honest default", async () => {
    window.localStorage.setItem(STORAGE_KEY, "{not valid json");
    const { getLocalePreference, DEFAULT_LOCALE } = await freshModule();
    expect(() => getLocalePreference()).not.toThrow();
    expect(getLocalePreference()).toBe(DEFAULT_LOCALE);
  });

  it("a mismatched real version falls back to the honest default rather than trusting stale data", async () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 999, locale: "de-DE" }));
    const { getLocalePreference, DEFAULT_LOCALE } = await freshModule();
    expect(getLocalePreference()).toBe(DEFAULT_LOCALE);
  });

  it("a stored value naming an unsupported locale falls back to the honest default", async () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, locale: "xx-XX" }));
    const { getLocalePreference, DEFAULT_LOCALE } = await freshModule();
    expect(getLocalePreference()).toBe(DEFAULT_LOCALE);
  });
});
