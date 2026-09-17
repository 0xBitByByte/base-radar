// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";

import { resetDbSingletonForTests } from "@/lib/backend/sqlite/db";
import { resetRateLimitBucketsForTests } from "@/lib/providers/common/rate-limit";
import { POST as challengePOST } from "@/app/api/auth/challenge/route";
import { POST as verifyPOST } from "@/app/api/auth/verify/route";

function realWallet() {
  return privateKeyToAccount(generatePrivateKey());
}

function challengeRequest(address: string) {
  return new NextRequest("http://localhost:3000/api/auth/challenge", {
    method: "POST",
    headers: { "content-type": "application/json", host: "localhost:3000" },
    body: JSON.stringify({ address }),
  });
}

function verifyRequest(body: unknown) {
  return new NextRequest("http://localhost:3000/api/auth/verify", {
    method: "POST",
    headers: { "content-type": "application/json", host: "localhost:3000" },
    body: JSON.stringify(body),
  });
}

/** The real, full step-1-then-step-2 flow: a real challenge, a real signature over it, ready to POST to /verify. */
async function issueAndSign(wallet: ReturnType<typeof realWallet>) {
  const challengeResponse = await challengePOST(challengeRequest(wallet.address));
  const { message } = await challengeResponse.json();
  const signature = await wallet.signMessage({ message });
  return { message, signature };
}

const REAL_WATCHLIST = {
  id: "wl-1",
  name: "Favorites",
  description: "",
  icon: "star",
  color: "primary",
  projectIds: ["aave"],
  pinned: true,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const REAL_PREFERENCES = {
  filterDashboardByActiveWatchlist: true,
  enableSearchPrioritization: true,
  rememberActiveWatchlist: true,
  showWatchlistSelectorInTopbar: true,
};

describe("POST /api/auth/verify", () => {
  beforeEach(() => {
    process.env.SQLITE_DB_PATH = ":memory:";
    resetDbSingletonForTests();
    resetRateLimitBucketsForTests();
  });
  afterEach(() => {
    resetDbSingletonForTests();
    delete process.env.SQLITE_DB_PATH;
  });

  it("a real signature from the real challenged wallet succeeds, creates a real account, and sets a real session cookie", async () => {
    const wallet = realWallet();
    const { message, signature } = await issueAndSign(wallet);

    const response = await verifyPOST(verifyRequest({ message, signature }));
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.account.isGuest).toBe(false);
    expect(body.migration.status).toBe("none");

    const setCookie = response.headers.get("set-cookie");
    expect(setCookie).toContain("br_session=");
    expect(setCookie).toContain("HttpOnly");
  });

  it("never authenticates a bare address with no real signature at all", async () => {
    const wallet = realWallet();
    await issueAndSign(wallet); // issues a real challenge, but we never sign it

    const response = await verifyPOST(verifyRequest({ message: "not a real signed message", signature: "0x00" }));
    expect(response.status).toBe(400);
    expect(response.headers.get("set-cookie")).toBeNull();
  });

  it("rejects a real, well-formed signature from the WRONG wallet — proves address alone is never sufficient", async () => {
    const wallet = realWallet();
    const impostor = realWallet();
    const { message } = await issueAndSign(wallet);
    const impostorSignature = await impostor.signMessage({ message });

    const response = await verifyPOST(verifyRequest({ message, signature: impostorSignature }));
    expect(response.status).toBe(401);
    expect(response.headers.get("set-cookie")).toBeNull();
  });

  it("rejects replay: the same real signed challenge cannot be used to authenticate twice", async () => {
    const wallet = realWallet();
    const { message, signature } = await issueAndSign(wallet);

    const first = await verifyPOST(verifyRequest({ message, signature }));
    expect(first.status).toBe(200);

    const replay = await verifyPOST(verifyRequest({ message, signature }));
    expect(replay.status).toBe(401);
  });

  it("rejects a genuinely expired challenge, even with a real, otherwise-valid signature", async () => {
    const wallet = realWallet();
    const { message, signature } = await issueAndSign(wallet);

    // Force real expiry the same way tests/lib/backend/sqlite/challenges.test.ts
    // does — a real DB state, not something a client could fabricate.
    const { getDb } = await import("@/lib/backend/sqlite/db");
    const db = getDb();
    db.prepare("UPDATE auth_challenges SET expires_at = ? WHERE address = ?").run(
      new Date(Date.now() - 1000).toISOString(),
      wallet.address.toLowerCase()
    );

    const response = await verifyPOST(verifyRequest({ message, signature }));
    expect(response.status).toBe(401);
  });

  it("first-time sign-in with a real Guest snapshot migrates the real watchlist and preferences", async () => {
    const wallet = realWallet();
    const { message, signature } = await issueAndSign(wallet);
    const guestSnapshot = {
      account: { name: "Rin", username: "rin_dev", email: null, avatar: null, bio: null },
      watchlists: [REAL_WATCHLIST],
      preferences: REAL_PREFERENCES,
    };

    const response = await verifyPOST(verifyRequest({ message, signature, guestSnapshot }));
    expect(response.status).toBe(200);
    const body = await response.json();

    expect(body.account.name).toBe("Rin");
    expect(body.migration).toEqual({ status: "migrated", watchlistsMigrated: 1 });
  });

  it("a returning wallet with no guest snapshot signs in without triggering any migration", async () => {
    const wallet = realWallet();
    const first = await issueAndSign(wallet);
    await verifyPOST(verifyRequest(first));

    const second = await issueAndSign(wallet);
    const response = await verifyPOST(verifyRequest(second));
    const body = await response.json();
    expect(body.migration.status).toBe("none");
  });

  it("a second device's real Guest snapshot against an already-authenticated address records a real conflict, never silently overwrites the cloud account", async () => {
    const wallet = realWallet();

    const first = await issueAndSign(wallet);
    const firstBody = await (await verifyPOST(verifyRequest(first))).json();
    const originalName = firstBody.account.name;

    const second = await issueAndSign(wallet);
    const secondSnapshot = {
      account: { name: "A Totally Different Local Name", username: "different_user", email: null, avatar: null, bio: null },
      watchlists: [REAL_WATCHLIST],
      preferences: REAL_PREFERENCES,
    };
    const secondResponse = await verifyPOST(verifyRequest({ ...second, guestSnapshot: secondSnapshot }));
    const secondBody = await secondResponse.json();

    expect(secondResponse.status).toBe(200);
    expect(secondBody.migration.status).toBe("conflict");
    // The authoritative cloud account's own name must be untouched by the second device's local data.
    expect(secondBody.account.name).toBe(originalName);
  });

  it("rejects a malformed request body", async () => {
    const request = new NextRequest("http://localhost:3000/api/auth/verify", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "not json",
    });
    const response = await verifyPOST(request);
    expect(response.status).toBe(400);
  });

  it("rejects a request with no message or no signature", async () => {
    expect((await verifyPOST(verifyRequest({ signature: "0x00" }))).status).toBe(400);
    expect((await verifyPOST(verifyRequest({ message: "x" }))).status).toBe(400);
  });

  it("error responses never leak internal error details (stack traces, file paths, driver messages)", async () => {
    const response = await verifyPOST(verifyRequest({ message: "garbage", signature: "0xnotreal" }));
    const body = await response.json();
    expect(JSON.stringify(body)).not.toMatch(/\.db|node_modules|at Object|Error:/);
  });
});
