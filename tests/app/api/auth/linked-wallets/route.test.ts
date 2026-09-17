// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";

import { createAccountForAddress } from "@/lib/backend/sqlite/accounts";
import { getDb, resetDbSingletonForTests } from "@/lib/backend/sqlite/db";
import { createSession } from "@/lib/backend/sqlite/sessions";
import { linkWalletToAccount } from "@/lib/backend/sqlite/linkedWallets";
import { resetRateLimitBucketsForTests } from "@/lib/providers/common/rate-limit";
import { POST as challengePOST } from "@/app/api/auth/challenge/route";
import { GET, POST } from "@/app/api/auth/linked-wallets/route";

const PRIMARY_ADDRESS = "0x1234567890AbcdEF1234567890aBcdef12345678";

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

async function issueAndSign(wallet: ReturnType<typeof realWallet>) {
  const challengeResponse = await challengePOST(challengeRequest(wallet.address));
  const { message } = await challengeResponse.json();
  const signature = await wallet.signMessage({ message });
  return { message, signature };
}

function getRequest(cookie?: string) {
  return new NextRequest("http://localhost:3000/api/auth/linked-wallets", { headers: cookie ? { cookie } : {} });
}

function postRequest(body: unknown, cookie?: string) {
  return new NextRequest("http://localhost:3000/api/auth/linked-wallets", {
    method: "POST",
    headers: { "content-type": "application/json", host: "localhost:3000", ...(cookie ? { cookie } : {}) },
    body: JSON.stringify(body),
  });
}

describe("GET /api/auth/linked-wallets", () => {
  beforeEach(() => {
    process.env.SQLITE_DB_PATH = ":memory:";
    resetDbSingletonForTests();
  });
  afterEach(() => {
    resetDbSingletonForTests();
    delete process.env.SQLITE_DB_PATH;
  });

  it("requires a real session — a Guest gets a real 401, never a fabricated empty success", async () => {
    const response = await GET(getRequest());
    expect(response.status).toBe(401);
  });

  it("returns the real, current authenticated account's linked wallets", async () => {
    const db = getDb();
    const account = createAccountForAddress(db, PRIMARY_ADDRESS);
    const session = createSession(db, account.id);
    linkWalletToAccount(db, account.id, "0xAbCdEf1234567890aBcDeF1234567890AbCdEf1");

    const response = await GET(getRequest(`br_session=${session.id}`));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.linkedWallets).toHaveLength(1);
  });
});

describe("POST /api/auth/linked-wallets", () => {
  beforeEach(() => {
    process.env.SQLITE_DB_PATH = ":memory:";
    resetDbSingletonForTests();
    resetRateLimitBucketsForTests();
  });
  afterEach(() => {
    resetDbSingletonForTests();
    delete process.env.SQLITE_DB_PATH;
  });

  it("requires a real session — a Guest cannot link a wallet no matter what they sign", async () => {
    const wallet = realWallet();
    const { message, signature } = await issueAndSign(wallet);

    const response = await POST(postRequest({ message, signature }));
    expect(response.status).toBe(401);
  });

  it("a real signature from a real, genuinely-owned second wallet links it to the authenticated account", async () => {
    const db = getDb();
    const account = createAccountForAddress(db, PRIMARY_ADDRESS);
    const session = createSession(db, account.id);

    const secondWallet = realWallet();
    const { message, signature } = await issueAndSign(secondWallet);

    const response = await POST(postRequest({ message, signature }, `br_session=${session.id}`));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.wallet.address).toBe(secondWallet.address.toLowerCase());
    expect(body.linkedWallets).toHaveLength(1);
  });

  it("rejects a real, well-formed signature from the WRONG wallet — proves address alone is never sufficient here either", async () => {
    const db = getDb();
    const account = createAccountForAddress(db, PRIMARY_ADDRESS);
    const session = createSession(db, account.id);

    const claimedWallet = realWallet();
    const impostor = realWallet();
    const { message } = await issueAndSign(claimedWallet);
    const impostorSignature = await impostor.signMessage({ message });

    const response = await POST(postRequest({ message, signature: impostorSignature }, `br_session=${session.id}`));
    expect(response.status).toBe(401);
  });

  it("rejects replay: the same real signed link-challenge cannot be used twice", async () => {
    const db = getDb();
    const account = createAccountForAddress(db, PRIMARY_ADDRESS);
    const session = createSession(db, account.id);
    const secondWallet = realWallet();
    const { message, signature } = await issueAndSign(secondWallet);

    const first = await POST(postRequest({ message, signature }, `br_session=${session.id}`));
    expect(first.status).toBe(200);

    const replay = await POST(postRequest({ message, signature }, `br_session=${session.id}`));
    expect(replay.status).toBe(401);
  });

  it("refuses to link your own real primary wallet to itself, with an honest 409 and message", async () => {
    const db = getDb();
    const primaryWallet = realWallet();
    const account = createAccountForAddress(db, primaryWallet.address.toLowerCase());
    const session = createSession(db, account.id);

    const { message, signature } = await issueAndSign(primaryWallet);
    const response = await POST(postRequest({ message, signature }, `br_session=${session.id}`));

    expect(response.status).toBe(409);
    const body = await response.json();
    expect(body.error).toMatch(/already your primary wallet/i);
  });

  it("refuses to link a real wallet that is already someone else's real primary wallet, never silently merging accounts", async () => {
    const db = getDb();
    const account = createAccountForAddress(db, PRIMARY_ADDRESS);
    const session = createSession(db, account.id);

    const otherPersonsWallet = realWallet();
    createAccountForAddress(db, otherPersonsWallet.address.toLowerCase());

    const { message, signature } = await issueAndSign(otherPersonsWallet);
    const response = await POST(postRequest({ message, signature }, `br_session=${session.id}`));

    expect(response.status).toBe(409);
    const body = await response.json();
    expect(body.error).toMatch(/different Base Radar account/i);
  });
});
