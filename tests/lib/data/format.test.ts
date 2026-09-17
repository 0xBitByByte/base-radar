import { describe, expect, it } from "vitest";

import { formatDateForLocale, formatNumberForLocale, formatPriceForLocale } from "@/lib/data/format";

describe("Locale-aware formatters (PR-093.03 Regional Format)", () => {
  describe("formatPriceForLocale", () => {
    it("a real US amount uses US grouping/decimal conventions", () => {
      expect(formatPriceForLocale(1234567.89, "en-US")).toBe("$1,234,567.89");
    });

    it("the same real USD amount, formatted for a real German locale, uses German grouping/decimal conventions — same currency, different presentation", () => {
      const formatted = formatPriceForLocale(1234567.89, "de-DE");
      expect(formatted).not.toBe(formatPriceForLocale(1234567.89, "en-US"));
      // German convention: "." for thousands, "," for the decimal mark.
      expect(formatted).toContain("1.234.567,89");
    });

    it("never changes the actual currency — every locale still prices in real USD", () => {
      expect(formatPriceForLocale(10, "en-US")).toContain("$");
      expect(formatPriceForLocale(10, "de-DE")).toMatch(/\$|USD/);
    });
  });

  describe("formatNumberForLocale", () => {
    it("a real large number groups differently by real locale", () => {
      const us = formatNumberForLocale(1234567, "en-US");
      const de = formatNumberForLocale(1234567, "de-DE");
      expect(us).toBe("1,234,567");
      expect(de).toBe("1.234.567");
      expect(us).not.toBe(de);
    });
  });

  describe("formatDateForLocale", () => {
    it("a real date's month/day/year ordering and script differ by real locale", () => {
      const iso = "2026-03-14T00:00:00.000Z";
      const us = formatDateForLocale(iso, "en-US");
      const jp = formatDateForLocale(iso, "ja-JP");
      expect(us).not.toBe(jp);
      expect(us).toContain("2026");
      expect(jp).toContain("2026");
    });
  });

  describe("caching does not leak state across locales", () => {
    it("repeated calls for two different real locales each keep producing their own correct, distinct output", () => {
      expect(formatPriceForLocale(1, "en-US")).not.toBe(formatPriceForLocale(1, "de-DE"));
      expect(formatPriceForLocale(1, "en-US")).toBe(formatPriceForLocale(1, "en-US"));
    });
  });
});
