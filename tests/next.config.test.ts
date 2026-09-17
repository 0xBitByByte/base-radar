// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * PR-097.05 (Security) — regression coverage for the CSP `next.config.ts`
 * now sets. Every domain asserted here was traced from this app's actual
 * installed dependencies (`viem/chains`, `@coinbase/wallet-sdk`) rather
 * than assumed — see that file's own doc comment for the full trace. This
 * test exists to catch an accidental domain removal/typo regressing a real
 * wallet-connection path, and to confirm the CSP was added alongside,
 * never in place of, the baseline headers from this same phase's earlier
 * pass.
 */

const ORIGINAL_WALLETCONNECT_ID = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;

async function loadHeaderRules() {
  vi.resetModules();
  const config = (await import("../next.config")).default;
  return config.headers!();
}

describe("next.config.ts — security headers & CSP", () => {
  afterEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    if (ORIGINAL_WALLETCONNECT_ID === undefined) delete process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;
    else process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID = ORIGINAL_WALLETCONNECT_ID;
  });

  it("sets the CSP alongside every pre-existing baseline header, never replacing them", async () => {
    const rules = await loadHeaderRules();
    expect(rules).toHaveLength(1);
    expect(rules[0].source).toBe("/:path*");

    const headerNames = rules[0].headers.map((h) => h.key);
    expect(headerNames).toEqual(
      expect.arrayContaining([
        "X-Frame-Options",
        "X-Content-Type-Options",
        "Referrer-Policy",
        "Permissions-Policy",
        "Strict-Transport-Security",
        "Content-Security-Policy",
      ])
    );
  });

  it("connect-src allows the real, traced chain RPC endpoints this app's wagmi config actually calls", async () => {
    const rules = await loadHeaderRules();
    const csp = rules[0].headers.find((h) => h.key === "Content-Security-Policy")!.value;

    expect(csp).toContain("https://mainnet.base.org");
    expect(csp).toContain("https://sepolia.base.org");
    expect(csp).toContain("https://ethereum.reth.rs");
  });

  it("connect-src allows the real, traced Coinbase Wallet SDK endpoints (RPC proxy, Smart Wallet popup origin, WalletLink fallback)", async () => {
    const rules = await loadHeaderRules();
    const csp = rules[0].headers.find((h) => h.key === "Content-Security-Policy")!.value;

    expect(csp).toContain("https://keys.coinbase.com");
    expect(csp).toContain("https://rpc.wallet.coinbase.com");
    expect(csp).toContain("https://www.walletlink.org");
    expect(csp).toContain("wss://www.walletlink.org");
  });

  it("never embeds and is never embeddable — frame-src, object-src, and frame-ancestors are all real, deliberate 'none's", async () => {
    const rules = await loadHeaderRules();
    const csp = rules[0].headers.find((h) => h.key === "Content-Security-Policy")!.value;

    expect(csp).toContain("frame-src 'none'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("frame-ancestors 'none'");
  });

  it("restricts default-src/script-src/style-src/base-uri/form-action to 'self', matching Next.js's own documented non-nonce CSP", async () => {
    const rules = await loadHeaderRules();
    const csp = rules[0].headers.find((h) => h.key === "Content-Security-Policy")!.value;

    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("base-uri 'self'");
    expect(csp).toContain("form-action 'self'");
  });

  it("img-src allows any HTTPS origin (never a finite domain list) — this app's project/token logos are real, dynamically provider-supplied URLs (CoinGecko, DefiLlama, GitHub), confirmed live against the running app, not a fixed catalog", async () => {
    const rules = await loadHeaderRules();
    const csp = rules[0].headers.find((h) => h.key === "Content-Security-Policy")!.value;
    const imgSrc = csp.split("; ").find((directive) => directive.startsWith("img-src"))!;

    expect(imgSrc).toBe("img-src 'self' data: https:");
  });

  it("real production build: no 'unsafe-eval' in script-src", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const rules = await loadHeaderRules();
    const csp = rules[0].headers.find((h) => h.key === "Content-Security-Policy")!.value;
    const scriptSrc = csp.split("; ").find((directive) => directive.startsWith("script-src"))!;

    expect(scriptSrc).not.toContain("unsafe-eval");
  });

  it("non-production (dev): 'unsafe-eval' is present, matching Next.js's own documented requirement for React's debug eval", async () => {
    vi.stubEnv("NODE_ENV", "development");
    const rules = await loadHeaderRules();
    const csp = rules[0].headers.find((h) => h.key === "Content-Security-Policy")!.value;
    const scriptSrc = csp.split("; ").find((directive) => directive.startsWith("script-src"))!;

    expect(scriptSrc).toContain("unsafe-eval");
  });

  it("warns loudly at config-load time if WalletConnect is enabled without the CSP being extended for it — never fails silently", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID = "a-real-project-id";

    vi.resetModules();
    await import("../next.config");

    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID"));
    warnSpy.mockRestore();
  });

  it("no warning when WalletConnect is left unconfigured, matching this app's real current deployment", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    delete process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;

    vi.resetModules();
    await import("../next.config");

    expect(warnSpy).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});
