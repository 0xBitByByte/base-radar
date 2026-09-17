// `minimumFractionDigits` is pinned to match `maximumFractionDigits` here —
// left unset, compact notation's trailing-zero trimming can resolve
// differently between Node's SSR ICU and the browser's CSR ICU for the
// same input (e.g. "$12.4B" vs "$12.40B"), causing a hydration mismatch.
// Pinning both forces identical, deterministic output in every environment.
const compactCurrency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const compactNumber = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 2,
});

const plainNumber = new Intl.NumberFormat("en-US");

// Sub-$1 tokens (the majority of altcoins) need more than whole-dollar
// precision to read as anything but "$0" — confirmed live against AERO
// ($0.4x), which rendered as a flat "$0" everywhere this formatter is used
// (KPI tile, chart axis/tooltip, ATH/ATL). Tiered by magnitude so prices
// >= $1 stay clean 2-decimal currency instead of gaining unnecessary digits.
const priceFormattersByDigits: Record<2 | 4 | 6, Intl.NumberFormat> = {
  2: new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 }),
  4: new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 4, maximumFractionDigits: 4 }),
  6: new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 6, maximumFractionDigits: 6 }),
};

export function formatCompactCurrency(value: number): string {
  return compactCurrency.format(value);
}

/** Full-precision price display (e.g. ticker rows) — never abbreviated, and never rounds a real sub-$1 price down to a misleading "$0". */
export function formatPrice(value: number): string {
  const abs = Math.abs(value);
  const digits = abs === 0 || abs >= 1 ? 2 : abs >= 0.01 ? 4 : 6;
  return priceFormattersByDigits[digits].format(value);
}

export function formatCompactNumber(value: number): string {
  return compactNumber.format(value);
}

export function formatNumber(value: number): string {
  return plainNumber.format(Math.round(value));
}

/** PR-084.07 — the one address-truncation recipe (`0x1234…abcd`) five separate Explorer/Profile components had each independently re-pasted. */
export function shortenAddress(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function formatGwei(value: number): string {
  return `${value.toFixed(3)} gwei`;
}

/**
 * A formatted value split into the pieces `KpiValueDisplay` renders with
 * independent emphasis — the numeral (`integer`/`decimal`) as the hero,
 * everything else (`prefix`/`suffix`/`unit`) demoted to secondary color.
 * `decimal` includes its leading `.` (e.g. `".00"`); `integer` includes any
 * thousands grouping (e.g. `"1,234"`).
 */
export type KpiValueParts = {
  prefix?: string;
  integer: string;
  decimal?: string;
  suffix?: string;
  unit?: string;
};

/** Buckets `Intl.NumberFormat#formatToParts` output into `KpiValueParts` — shared by every compact-notation parts formatter below so a new one is a one-line wrapper, not a re-implementation. */
function partsFromFormatter(value: number, formatter: Intl.NumberFormat): KpiValueParts {
  let prefix = "";
  let integer = "";
  let decimal = "";
  let suffix = "";
  // Multi-letter currency identifiers (e.g. "BTC", "ETH") emit a `literal`
  // separator (a space) between the code and the numeral — which side of
  // the number it belongs to depends on whether we've seen the integer yet.
  let sawInteger = false;

  for (const part of formatter.formatToParts(value)) {
    switch (part.type) {
      case "currency":
        prefix += part.value;
        break;
      case "minusSign":
        integer = part.value + integer;
        sawInteger = true;
        break;
      case "integer":
      case "group":
        integer += part.value;
        sawInteger = true;
        break;
      case "decimal":
      case "fraction":
        decimal += part.value;
        break;
      case "compact":
        suffix += part.value;
        break;
      case "literal":
        if (sawInteger) suffix += part.value;
        else prefix += part.value;
        break;
      default:
        break;
    }
  }

  return { prefix: prefix || undefined, integer, decimal: decimal || undefined, suffix: suffix || undefined };
}

export function formatCompactCurrencyParts(value: number): KpiValueParts {
  return partsFromFormatter(value, compactCurrency);
}

export function formatCompactNumberParts(value: number): KpiValueParts {
  return partsFromFormatter(value, compactNumber);
}

export function formatGweiParts(value: number): KpiValueParts {
  const [integer, fraction] = value.toFixed(3).split(".");
  return { integer, decimal: `.${fraction}`, unit: "gwei" };
}

/**
 * The value-format vocabulary used across `Kpi`, `DashboardStat`, and
 * `KeyMetric` — each names its currency case slightly differently
 * ("currency" vs "compactCurrency"), so this union covers both rather than
 * forcing one of those types to rename its field.
 */
export type KpiValueFormat = "currency" | "compactCurrency" | "number" | "compactNumber" | "gwei";

/** One shared lookup for the `formatterFor()` that used to be hand-duplicated in KPIRow.tsx, KeyMetrics.tsx, and Hero.tsx. */
export function formatterForKpiFormat(format: KpiValueFormat): (value: number) => KpiValueParts {
  if (format === "currency" || format === "compactCurrency") return formatCompactCurrencyParts;
  if (format === "gwei") return formatGweiParts;
  return formatCompactNumberParts;
}

export function formatPercent(value: number, opts?: { showSign?: boolean }): string {
  const sign = opts?.showSign !== false && value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}

/** Plain calendar-date display (e.g. "Jan 15, 2021") — for real, non-relative dates like a token's genesis date or a repo's creation date. */
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

export function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(diffMs / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

/**
 * PR-093.03 (Regional Format) — locale-parameterized variants of `formatDate`/
 * `formatPrice`/`formatNumber` above, added rather than changing those
 * functions' own behavior: every existing caller of the plain, hardcoded-
 * `"en-US"` exports keeps its exact current output, everywhere in the app,
 * including any server-rendered call site — this file's own top-of-file
 * comment already documents a real, previously-fixed SSR/CSR hydration
 * mismatch from `Intl` formatting differing between environments, so
 * nothing here makes an existing formatter silently locale-dependent.
 * These variants are for a caller that already has a real, explicit
 * locale in hand (the Regional Format preference, read client-side via
 * `useLocalePreference()`) — never an implicit global.
 *
 * Currency stays fixed at USD regardless of locale — every amount in this
 * app is genuinely USD-denominated, so the locale changes how a USD amount
 * is written (grouping/decimal marks), never what currency it's in. This
 * is regional formatting, not currency conversion.
 *
 * Formatter instances are cached per locale (mirroring the module-level
 * "construct once, reuse" formatters above) rather than rebuilt on every
 * call.
 */
const priceFormattersByLocale = new Map<string, Intl.NumberFormat>();
const numberFormattersByLocale = new Map<string, Intl.NumberFormat>();
const dateFormattersByLocale = new Map<string, Intl.DateTimeFormat>();

function priceFormatterFor(locale: string): Intl.NumberFormat {
  let formatter = priceFormattersByLocale.get(locale);
  if (!formatter) {
    formatter = new Intl.NumberFormat(locale, { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 });
    priceFormattersByLocale.set(locale, formatter);
  }
  return formatter;
}

function numberFormatterFor(locale: string): Intl.NumberFormat {
  let formatter = numberFormattersByLocale.get(locale);
  if (!formatter) {
    formatter = new Intl.NumberFormat(locale);
    numberFormattersByLocale.set(locale, formatter);
  }
  return formatter;
}

function dateFormatterFor(locale: string): Intl.DateTimeFormat {
  let formatter = dateFormattersByLocale.get(locale);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(locale, { year: "numeric", month: "short", day: "numeric" });
    dateFormattersByLocale.set(locale, formatter);
  }
  return formatter;
}

/** Full-precision USD price display for an explicit, caller-supplied locale — see the doc comment above. */
export function formatPriceForLocale(value: number, locale: string): string {
  return priceFormatterFor(locale).format(value);
}

/** Plain, non-currency number display for an explicit, caller-supplied locale. */
export function formatNumberForLocale(value: number, locale: string): string {
  return numberFormatterFor(locale).format(Math.round(value));
}

/** Plain calendar-date display for an explicit, caller-supplied locale — same fields as `formatDate` above, just locale-aware. */
export function formatDateForLocale(iso: string, locale: string): string {
  return dateFormatterFor(locale).format(new Date(iso));
}
