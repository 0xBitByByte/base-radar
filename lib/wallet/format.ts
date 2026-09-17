/** `0x12AB…98EF` — the one place an address is shortened for display, so every wallet UI surface truncates identically. */
export function shortenAddress(address: string): string {
  if (address.length <= 10) return address;
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}
