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
