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

const preciseCurrency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export function formatCompactCurrency(value: number): string {
  return compactCurrency.format(value);
}

/** Full-precision price display (e.g. ticker rows) — never abbreviated. */
export function formatPrice(value: number): string {
  return preciseCurrency.format(value);
}

export function formatCompactNumber(value: number): string {
  return compactNumber.format(value);
}

export function formatNumber(value: number): string {
  return plainNumber.format(Math.round(value));
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

export function formatPercent(value: number, opts?: { showSign?: boolean }): string {
  const sign = opts?.showSign !== false && value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
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
